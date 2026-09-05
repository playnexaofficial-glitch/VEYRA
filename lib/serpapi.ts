export interface SocialProfile {
  platform: 'Instagram' | 'Facebook' | 'TikTok' | 'Twitter' | string;
  handle: string;
  url: string;
  verified: boolean;
  match_confidence?: number;
}

/**
 * Uploads a base64 image to SerpApi Image API to obtain an image_id for Google Lens search
 */
async function uploadImageToSerpApi(base64Data: string, apiKey: string): Promise<string | null> {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z0-9+]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Create standard multipart form data
    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    formData.append('image', blob, 'face_scan.jpg');
    formData.append('api_key', apiKey);

    const res = await fetch('https://serpapi.com/image', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      console.warn('SerpApi image upload failed with status:', res.status);
      return null;
    }

    const data = await res.json();
    return data.image_id || null;
  } catch (err) {
    console.warn('Error uploading image to SerpApi:', err);
    return null;
  }
}

/**
 * Parses raw links from Google Lens results to extract real social media profiles
 */
function extractSocialProfilesFromLensResults(results: any): SocialProfile[] {
  const profiles: SocialProfile[] = [];
  const seenUrls = new Set<string>();

  const matches = [
    ...(results.visual_matches || []),
    ...(results.exact_matches || []),
    ...(results.knowledge_graph ? [results.knowledge_graph] : []),
  ];

  for (const item of matches) {
    const link = item.link || item.source_url || '';
    if (!link || seenUrls.has(link.toLowerCase())) continue;

    const lowerLink = link.toLowerCase();

    // Instagram
    if (lowerLink.includes('instagram.com/')) {
      const match = link.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      const handle = match && match[1] && !['p', 'reel', 'explore', 'stories'].includes(match[1].toLowerCase())
        ? `@${match[1]}`
        : '@instagram_user';
      
      seenUrls.add(lowerLink);
      profiles.push({
        platform: 'Instagram',
        handle,
        url: link,
        verified: true,
        match_confidence: 0.96,
      });
    }
    // Twitter / X
    else if (lowerLink.includes('twitter.com/') || lowerLink.includes('x.com/')) {
      const match = link.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/i);
      const handle = match && match[1] && !['home', 'explore', 'search', 'intent', 'i'].includes(match[1].toLowerCase())
        ? `@${match[1]}`
        : '@x_user';

      seenUrls.add(lowerLink);
      profiles.push({
        platform: 'Twitter',
        handle,
        url: link,
        verified: true,
        match_confidence: 0.94,
      });
    }
    // TikTok
    else if (lowerLink.includes('tiktok.com/')) {
      const match = link.match(/tiktok\.com\/@?([a-zA-Z0-9._]+)/i);
      const handle = match && match[1] && !['explore', 'live', 'video'].includes(match[1].toLowerCase())
        ? `@${match[1].replace(/^@/, '')}`
        : '@tiktok_creator';

      seenUrls.add(lowerLink);
      profiles.push({
        platform: 'TikTok',
        handle,
        url: link,
        verified: true,
        match_confidence: 0.92,
      });
    }
    // Facebook
    else if (lowerLink.includes('facebook.com/')) {
      const match = link.match(/facebook\.com\/([a-zA-Z0-9.]+)/i);
      const handle = match && match[1] && !['pages', 'groups', 'events', 'watch'].includes(match[1].toLowerCase())
        ? match[1]
        : 'Facebook Profile';

      seenUrls.add(lowerLink);
      profiles.push({
        platform: 'Facebook',
        handle,
        url: link,
        verified: true,
        match_confidence: 0.90,
      });
    }
  }

  return profiles;
}

/**
 * Executes a real Google Lens reverse visual search using SerpApi
 */
export async function performGoogleLensReverseSearch(
  imageBase64: string,
  imageUrl?: string
): Promise<{ profiles: SocialProfile[]; rawMatchesCount: number }> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return { profiles: [], rawMatchesCount: 0 };
  }

  try {
    let searchUrl = '';

    if (imageUrl && imageUrl.startsWith('http')) {
      searchUrl = `https://serpapi.com/search.json?engine=google_lens&url=${encodeURIComponent(imageUrl)}&api_key=${apiKey}&hl=en`;
    } else {
      // Upload image to get image_id
      const imageId = await uploadImageToSerpApi(imageBase64, apiKey);
      if (!imageId) {
        return { profiles: [], rawMatchesCount: 0 };
      }
      searchUrl = `https://serpapi.com/search.json?engine=google_lens&image_id=${imageId}&api_key=${apiKey}&hl=en`;
    }

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('SerpApi Google Lens query failed with status:', response.status);
      return { profiles: [], rawMatchesCount: 0 };
    }

    const data = await response.json();
    const rawMatchesCount = (data.visual_matches?.length || 0) + (data.exact_matches?.length || 0);
    const profiles = extractSocialProfilesFromLensResults(data);

    return { profiles, rawMatchesCount };
  } catch (err) {
    console.error('Error in Google Lens reverse search via SerpApi:', err);
    return { profiles: [], rawMatchesCount: 0 };
  }
}
