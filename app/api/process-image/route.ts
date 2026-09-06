import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseClient, SearchHistoryRecord } from "@/lib/supabase";
import { performGoogleLensReverseSearch, SocialProfile } from "@/lib/serpapi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export interface SocialLink {
  platform: string;
  handle: string;
  url: string;
  verified?: boolean;
  match_confidence?: number;
}

export interface ProcessImageResponse {
  success: boolean;
  facialDescription: string;
  distinctiveFeatures: string[];
  overallScore: number;
  symmetry: {
    score: number;
    label: string;
    note: string;
  };
  skinRadiance: {
    score: number;
    label: string;
    note: string;
  };
  proportions: {
    score: number;
    label: string;
    note: string;
  };
  vitality: {
    score: number;
    label: string;
    note: string;
  };
  keyObservations: string[];
  recommendations: string[];
  matched: boolean;
  source: "supabase_cache" | "google_lens_reverse_search" | "gemini_fresh_scan";
  matchedRecordId?: string | null;
  similarityScore?: number;
  socialLinks: SocialLink[];
  supabaseStatus: "connected" | "unconfigured" | "table_not_found" | "error";
  timestamp: string;
}

// Simple token/jaccard overlap similarity between two facial descriptions
function calculateDescriptionSimilarity(desc1: string, desc2: string): number {
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);

  const tokens1 = new Set(normalize(desc1));
  const tokens2 = new Set(normalize(desc2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? Number((intersection / union).toFixed(3)) : 0;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isOverloadedOrRateLimited(errMsg: string): boolean {
  const lower = errMsg.toLowerCase();
  return (
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("high demand") ||
    lower.includes("service unavailable") ||
    lower.includes("unavailable") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit") ||
    lower.includes("overloaded") ||
    lower.includes("capacity")
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request payload." },
        { status: 400 }
      );
    }

    const imageBase64Raw = body.imageBase64 || body.image;
    const imageUrl = body.imageUrl || body.url;
    const mimeType = body.mimeType || "image/jpeg";

    if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid base64 image data is required in 'imageBase64' or 'image'." },
        { status: 400 }
      );
    }

    // Strip Data URI scheme if provided (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = imageBase64Raw.replace(/^data:image\/[a-z0-9+]+;base64,/, "").trim();

    if (cleanBase64.length < 50) {
      return NextResponse.json(
        { success: false, error: "Base64 image content is corrupted or too short." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 5) {
      return NextResponse.json(
        {
          success: false,
          errorType: "GEMINI_KEY_MISSING",
          error: "Gemini API key is missing or unconfigured. Please add a valid GEMINI_API_KEY in the Settings menu.",
        },
        { status: 401 }
      );
    }

    // 1. Initialize Gemini API Client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // 2. Query Gemini for precise biometric vector & facial description
    const prompt = `Analyze this face image with extreme optical accuracy.
Generate a structured biometric profile and a dense, discriminative text vector description capturing key facial landmarks (interpupillary axis, nasal bridge contour, zygomatic arch prominence, mandibular angle, dermal texture, ocular curvature).

Return ONLY a valid JSON object matching this structure:
{
  "facialDescription": "Detailed 2-3 sentence morphological description of face structure, unique proportions, bone landmarks, and skin attributes for biometric indexing.",
  "distinctiveFeatures": [
    "High zygomatic definition with 14mm lateral cheek projection",
    "Straight nasal dorsum with acute nasolabial angle",
    "Almond ocular aperture with balanced epicanthic fold"
  ],
  "overallScore": 94,
  "symmetry": {
    "score": 95,
    "label": "Bilateral Equilibrium",
    "note": "Optimal orbital alignment with 0.98 horizontal baseline congruence."
  },
  "skinRadiance": {
    "score": 92,
    "label": "Diffuse Luminance",
    "note": "Uniform light diffusion across malar planes with minimal micro-texture variance."
  },
  "proportions": {
    "score": 96,
    "label": "Golden Ratio 1:1.618",
    "note": "Upper, middle, and lower facial thirds conform precisely to neoclassical canons."
  },
  "vitality": {
    "score": 93,
    "label": "Peak Vitality",
    "note": "High optical alertness and robust micro-circulation indicator."
  },
  "keyObservations": [
    "Clean mandibular definition with balanced lateral projection",
    "Even diffused light reflectance along the nasal bridge and malar plane",
    "Neutral horizontal brow alignment with optimal pupillary distance"
  ],
  "recommendations": [
    "Maintain circadian hydration protocol to enhance dermal micro-reflection",
    "Targeted lymphatic release along the temporal-mandibular perimeter"
  ]
}`;

    let parsedGemini: {
      facialDescription: string;
      distinctiveFeatures: string[];
      overallScore: number;
      symmetry: { score: number; label: string; note: string };
      skinRadiance: { score: number; label: string; note: string };
      proportions: { score: number; label: string; note: string };
      vitality: { score: number; label: string; note: string };
      keyObservations: string[];
      recommendations: string[];
    } = null as any;

    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-flash-latest",
    ];

    const MAX_RETRIES = 3;
    let lastGeminiError: string = "";
    let generationSuccess = false;

    modelLoop: for (const modelName of candidateModels) {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const geminiResponse = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
            config: {
              responseMimeType: "application/json",
            },
          });

          const responseText = geminiResponse.text;
          if (!responseText) {
            throw new Error(`Empty response received from ${modelName}.`);
          }

          parsedGemini = JSON.parse(responseText);
          generationSuccess = true;
          break modelLoop;
        } catch (geminiError: unknown) {
          const gErr = geminiError as { message?: string; status?: number; code?: string | number };
          const errMsg = gErr?.message || String(geminiError);
          lastGeminiError = errMsg;

          // If auth or permission error, do not retry with the same key
          if (
            errMsg.includes("403") ||
            errMsg.includes("PERMISSION_DENIED") ||
            errMsg.includes("API key not valid") ||
            errMsg.includes("401") ||
            errMsg.includes("UNAUTHENTICATED")
          ) {
            console.error(`Fatal authentication/permission error on ${modelName}:`, errMsg);
            break modelLoop;
          }

          // If 503 (high demand / service unavailable) or 429 (rate limited / resource exhausted), retry with exponential backoff
          if (isOverloadedOrRateLimited(errMsg) && attempt < MAX_RETRIES) {
            // Exponential backoff: 1s, 2s, 4s + slight random jitter
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 300);
            console.warn(
              `[Gemini High Demand/Overloaded] Attempt ${attempt + 1}/${MAX_RETRIES + 1} for ${modelName} received temporary capacity limit: "${errMsg}". Retrying in ${backoffMs}ms with exponential backoff...`
            );
            await delay(backoffMs);
            continue;
          }

          console.warn(`Model ${modelName} attempt ${attempt + 1} error:`, errMsg);
          break; // Switch to next candidate model if non-transient or exhausted retries
        }
      }
    }

    if (!generationSuccess) {
      console.error("Gemini API Error in /api/process-image after retries:", lastGeminiError);

      if (
        isOverloadedOrRateLimited(lastGeminiError) ||
        lastGeminiError.includes("503") ||
        lastGeminiError.includes("429")
      ) {
        return NextResponse.json(
          {
            success: false,
            errorType: "GEMINI_OVERLOADED",
            error: "AI servers are currently at peak capacity. Please try again in a moment.",
          },
          { status: 503 }
        );
      }

      if (lastGeminiError.includes("403") || lastGeminiError.includes("PERMISSION_DENIED") || lastGeminiError.includes("permission")) {
        return NextResponse.json(
          {
            success: false,
            errorType: "GEMINI_PERMISSION_DENIED",
            error: "Gemini API 403 (Permission Denied). Please ensure your GEMINI_API_KEY is active and has access to the Gemini API.",
          },
          { status: 403 }
        );
      }

      if (lastGeminiError.includes("API key not valid") || lastGeminiError.includes("401") || lastGeminiError.includes("UNAUTHENTICATED")) {
        return NextResponse.json(
          {
            success: false,
            errorType: "GEMINI_KEY_INVALID",
            error: "Invalid Gemini API key. Please check your GEMINI_API_KEY in the Secrets panel.",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          errorType: "GEMINI_GENERATION_FAILED",
          error: "AI servers are currently at peak capacity. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    // 3. Connect to Supabase and query 'search_history' table
    let matched = false;
    let source: "supabase_cache" | "google_lens_reverse_search" | "gemini_fresh_scan" = "gemini_fresh_scan";
    let matchedRecordId: string | null = null;
    let similarityScore: number = 0;
    let socialLinks: SocialLink[] = [];
    let supabaseStatus: "connected" | "unconfigured" | "table_not_found" | "error" = "unconfigured";

    const supabase = getSupabaseClient();

    if (supabase) {
      try {
        const { data: records, error: queryError } = await supabase
          .from("search_history")
          .select("id, face_description, social_links, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (queryError) {
          console.warn("Supabase query error on 'search_history':", queryError.message);
          if (queryError.code === "42P01") {
            supabaseStatus = "table_not_found";
          } else {
            supabaseStatus = "error";
          }
        } else {
          supabaseStatus = "connected";

          if (records && records.length > 0) {
            let highestSimilarity = 0;
            let bestMatch: SearchHistoryRecord | null = null;

            for (const record of records) {
              if (record.face_description) {
                const sim = calculateDescriptionSimilarity(
                  parsedGemini.facialDescription,
                  record.face_description
                );
                if (sim > highestSimilarity) {
                  highestSimilarity = sim;
                  bestMatch = record;
                }
              }
            }

            // If a highly similar facial description exists (threshold >= 0.40)
            if (bestMatch && highestSimilarity >= 0.40) {
              matched = true;
              source = "supabase_cache";
              matchedRecordId = bestMatch.id || null;
              similarityScore = highestSimilarity;
              socialLinks = (bestMatch.social_links as SocialLink[]) || [];
            }
          }
        }
      } catch (sbErr) {
        console.warn("Supabase execution exception:", sbErr);
        supabaseStatus = "error";
      }
    }

    // 4. If NOT found in Supabase cache, perform real Google Lens Reverse Search via SerpApi
    if (!matched) {
      const lensResult = await performGoogleLensReverseSearch(cleanBase64, imageUrl);
      if (lensResult.profiles && lensResult.profiles.length > 0) {
        socialLinks = lensResult.profiles;
        source = "google_lens_reverse_search";
      }

      // 5. Automatically and silently save to Supabase 'search_history' for future caching
      if (supabase && supabaseStatus === "connected") {
        try {
          await supabase.from("search_history").insert({
            face_description: parsedGemini.facialDescription,
            social_links: socialLinks,
            created_at: new Date().toISOString(),
          });
        } catch (insertErr) {
          console.warn("Could not insert to search_history table:", insertErr);
        }
      }
    }

    const finalResponse: ProcessImageResponse = {
      success: true,
      facialDescription: parsedGemini.facialDescription,
      distinctiveFeatures: parsedGemini.distinctiveFeatures || [],
      overallScore: parsedGemini.overallScore || 94,
      symmetry: parsedGemini.symmetry,
      skinRadiance: parsedGemini.skinRadiance,
      proportions: parsedGemini.proportions,
      vitality: parsedGemini.vitality,
      keyObservations: parsedGemini.keyObservations || [],
      recommendations: parsedGemini.recommendations || [],
      matched,
      source,
      matchedRecordId,
      similarityScore: matched ? similarityScore : undefined,
      socialLinks,
      supabaseStatus,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(finalResponse);
  } catch (error: unknown) {
    const errorObj = error as { message?: string; status?: number };
    console.error("Error in /api/process-image:", errorObj);
    return NextResponse.json(
      {
        success: false,
        error: errorObj?.message || "An unexpected error occurred during facial image processing.",
      },
      { status: 500 }
    );
  }
}

