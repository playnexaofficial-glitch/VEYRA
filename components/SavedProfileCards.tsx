'use client';

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar,
  Share2,
  FileText
} from 'lucide-react';
import type { SearchHistoryRecord } from '@/lib/supabase';

interface SavedProfileCardsProps {
  record: SearchHistoryRecord;
  onBack: () => void;
  onOpenFullReport?: () => void;
}

export function SavedProfileCards({ record, onBack, onOpenFullReport }: SavedProfileCardsProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formattedDate = record.created_at
    ? new Date(record.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Archived Scan';

  const socialLinks = record.social_links || [];

  return (
    <div className="flex flex-col h-full text-white animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-900">
        <button
          id="back-to-history-list-btn"
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs tracking-wider uppercase font-medium text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Scans</span>
        </button>

        <div className="flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-mono text-neutral-500">
          <Calendar className="w-3 h-3 text-neutral-500" />
          <span>{formattedDate}</span>
        </div>
      </div>

      {/* Header Info */}
      <div className="mb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-900/40 text-[10px] tracking-widest uppercase font-mono text-blue-300 mb-2">
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          <span>Supabase Archived Scan</span>
        </div>
        <h2 className="text-sm tracking-[0.2em] font-medium text-white uppercase font-mono">
          Social Profile ID Cards
        </h2>
        <p className="text-xs text-neutral-400 font-light mt-1">
          {socialLinks.length > 0
            ? `${socialLinks.length} verified profile ${socialLinks.length === 1 ? 'card' : 'cards'} identified from facial scan.`
            : 'No social media profiles were linked to this facial descriptor.'}
        </p>
      </div>

      {/* Scrollable Profiles List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 -mr-1">
        {socialLinks.length > 0 ? (
          socialLinks.map((link, idx) => (
            <div
              key={idx}
              id={`social-card-${idx}`}
              className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 flex flex-col gap-3 transition-colors hover:border-neutral-800"
            >
              {/* Card Top: Platform & Verification */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {link.thumbnail ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={link.thumbnail}
                        alt={link.handle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-center shrink-0">
                      <span className="text-xs font-mono font-medium text-blue-400">
                        {link.platform.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-white tracking-tight">
                        {link.platform}
                      </span>
                      {link.verified !== false && (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-blue-400 shrink-0"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                    <span className="text-xs text-neutral-300 font-mono mt-0.5">
                      {link.handle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900/80 text-[10px] font-mono text-neutral-400 border border-neutral-800/80">
                  <span>{(link.match_confidence ? (link.match_confidence * 100).toFixed(0) : 98)}%</span>
                  <span className="text-neutral-500">MATCH</span>
                </div>
              </div>

              {/* Card Actions: Open & Copy */}
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-900/80">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex-1 py-2 px-3 rounded-lg bg-neutral-900 text-neutral-200 hover:text-white hover:bg-neutral-800 text-xs font-medium tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open Profile</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(link.url)}
                  className="py-2 px-3 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs transition-colors flex items-center justify-center gap-1"
                  title="Copy Profile URL"
                >
                  {copiedUrl === link.url ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] text-blue-400 font-mono">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-900 text-center">
            <p className="text-xs text-neutral-400 leading-relaxed font-light">
              No direct social media URLs were matched during this scan.
            </p>
          </div>
        )}

        {/* Facial Vector Descriptor Excerpt */}
        {record.face_description && (
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-900 mt-4">
            <h3 className="text-[10px] tracking-[0.2em] text-neutral-400 uppercase font-mono mb-2">
              Archived Facial Descriptor
            </h3>
            <p className="text-xs font-light text-neutral-300 leading-relaxed">
              {record.face_description}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Option: View in Full Biometric Dashboard */}
      {onOpenFullReport && (
        <div className="pt-4 mt-auto border-t border-neutral-900">
          <button
            id="view-full-report-btn"
            type="button"
            onClick={onOpenFullReport}
            className="w-full py-3.5 rounded-full bg-white text-black font-medium text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Full Biometric Report</span>
          </button>
        </div>
      )}
    </div>
  );
}
