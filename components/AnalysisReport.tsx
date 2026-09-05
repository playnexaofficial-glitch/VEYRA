'use client';

import React, { useState } from 'react';
import type { ProcessImageResponse } from '@/app/api/process-image/route';
import { ArrowLeft, Check, Copy, ExternalLink, Database, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AnalysisReportProps {
  result: ProcessImageResponse;
  imagePreview?: string | null;
  onReset: () => void;
}

export function AnalysisReport({ result, imagePreview, onReset }: AnalysisReportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const text = `VEYRA BIOMETRIC PROFILE\nOverall Score: ${result.overallScore}/100\nVector: ${result.facialDescription}\n\nSymmetry: ${result.symmetry?.score}% - ${result.symmetry?.label}\nRadiance: ${result.skinRadiance?.score}% - ${result.skinRadiance?.label}\nProportions: ${result.proportions?.score}% - ${result.proportions?.label}\nVitality: ${result.vitality?.score}% - ${result.vitality?.label}\nSocial Links: ${result.socialLinks?.length ? result.socialLinks.map(l => `${l.platform}: ${l.handle}`).join(', ') : 'None'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const metrics = [
    { key: 'symmetry', title: 'Symmetry Index', data: result.symmetry },
    { key: 'skinRadiance', title: 'Dermal Radiance', data: result.skinRadiance },
    { key: 'proportions', title: 'Neoclassical Canons', data: result.proportions },
    { key: 'vitality', title: 'Vitality Index', data: result.vitality },
  ];

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col pb-12 select-none">
      {/* Top Bar with Back / New Scan */}
      <div className="flex items-center justify-between mb-6">
        <button
          id="back-to-scanner-btn"
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs tracking-wider uppercase font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Scanner</span>
        </button>

        <button
          id="copy-report-btn"
          type="button"
          onClick={handleCopySummary}
          className="flex items-center gap-1.5 text-xs tracking-wider uppercase font-medium text-neutral-400 hover:text-white transition-colors py-1 px-3 rounded-full bg-neutral-900/60"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-neutral-400" />
              <span>Copy Vector</span>
            </>
          )}
        </button>
      </div>

      {/* Intelligence Source / Cache Status Badge */}
      <div className="mb-6 flex justify-center">
        {result.matched ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/40 border border-blue-800/40 text-[10px] tracking-widest uppercase font-mono text-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Supabase Cache Hit ({(result.similarityScore ? (result.similarityScore * 100).toFixed(0) : 98)}%)</span>
          </div>
        ) : result.source === 'google_lens_reverse_search' ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/30 border border-blue-900/30 text-[10px] tracking-widest uppercase font-mono text-blue-300">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Reverse Visual Search & Cached</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950 border border-neutral-800/80 text-[10px] tracking-widest uppercase font-mono text-neutral-400">
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <span>
              {result.supabaseStatus === 'connected'
                ? 'Vector Stored in Supabase'
                : 'Facial Vector Generated'}
            </span>
          </div>
        )}
      </div>

      {/* Hero Score Presentation */}
      <div className="flex flex-col items-center text-center mb-6">
        {imagePreview && (
          <div className="relative w-20 h-20 rounded-full overflow-hidden mb-4 bg-neutral-900 ring-1 ring-neutral-800">
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${imagePreview})` }}
            />
          </div>
        )}

        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extralight tracking-tight text-white font-mono">
            {result.overallScore}
          </span>
          <span className="text-sm font-light text-neutral-500 font-mono">
            /100
          </span>
        </div>

        <span className="text-[11px] tracking-[0.25em] text-blue-400 uppercase font-medium mt-1">
          Harmony Quotient
        </span>
      </div>

      {/* Social Media Profiles List (Clean, minimalist list: platform name, username, minimal verified tick mark) */}
      {result.socialLinks && result.socialLinks.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-neutral-950 border border-neutral-900/80">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono">
              Identified Profiles
            </span>
            <span className="text-[10px] font-mono text-neutral-600 uppercase">
              {result.socialLinks.length} {result.socialLinks.length === 1 ? 'Match' : 'Matches'}
            </span>
          </div>

          <div className="divide-y divide-neutral-900">
            {result.socialLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between py-3 px-1.5 first:pt-1 last:pb-1 group hover:bg-neutral-900/30 rounded-lg transition-colors"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white tracking-tight">
                      {link.platform}
                    </span>
                    {/* Minimal verified tick mark */}
                    <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" strokeWidth={2.5} />
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    {link.handle}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-neutral-600 group-hover:text-neutral-300 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Facial Text Vector / Morphological Description */}
      <div className="mb-6 p-4 rounded-2xl bg-neutral-950 border border-neutral-900/80">
        <h3 className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono mb-2">
          Facial Vector Descriptor
        </h3>
        <p className="text-xs font-light text-neutral-300 leading-relaxed font-sans">
          {result.facialDescription}
        </p>
      </div>

      {/* Distinctive Features */}
      {result.distinctiveFeatures && result.distinctiveFeatures.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono mb-2.5 px-1">
            Distinctive Morphometrics
          </h3>
          <div className="space-y-2">
            {result.distinctiveFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-900/40 text-xs font-light text-neutral-300 leading-relaxed flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 mt-1.5 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Core Parameter Cards */}
      <div className="space-y-3 mb-6">
        {metrics.map(({ key, title, data }) => (
          <div
            key={key}
            id={`metric-card-${key}`}
            className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900/80 flex flex-col justify-between transition-colors hover:border-neutral-800"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs tracking-wider uppercase font-medium text-neutral-300">
                {title}
              </span>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-sm font-medium text-white">{data?.score ?? 90}</span>
                <span className="text-[10px] text-neutral-500">%</span>
              </div>
            </div>

            {/* Subtle Progress Bar */}
            <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${data?.score ?? 90}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-400 font-mono">{data?.label}</span>
            </div>
            <p className="text-[11px] font-light text-neutral-500 leading-normal mt-1">
              {data?.note}
            </p>
          </div>
        ))}
      </div>

      {/* Key Analytical Observations */}
      {result.keyObservations && result.keyObservations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono mb-2.5 px-1">
            Optical Observations
          </h3>
          <div className="space-y-2">
            {result.keyObservations.map((obs, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-900/40 text-xs font-light text-neutral-300 leading-relaxed flex items-start gap-2.5"
              >
                <span className="text-[10px] font-mono text-neutral-500 mt-0.5">0{idx + 1}</span>
                <span>{obs}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Action Button: 'New Scan' */}
      <button
        id="scan-again-btn"
        type="button"
        onClick={onReset}
        className="w-full py-4 rounded-full bg-white text-black font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] shadow-none"
      >
        Scan Another Subject
      </button>
    </div>
  );
}
