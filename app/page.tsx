'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Viewfinder } from '@/components/Viewfinder';
import { AnalyzingState } from '@/components/AnalyzingState';
import { AnalysisReport } from '@/components/AnalysisReport';
import type { ProcessImageResponse } from '@/app/api/process-image/route';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'unknown_device';
  let id = localStorage.getItem('veyra_device_id');
  if (!id) {
    id = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    localStorage.setItem('veyra_device_id', id);
  }
  return id;
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessImageResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCapture = async (base64Image: string) => {
    setCapturedImage(base64Image);
    setStatus('analyzing');
    setErrorMsg(null);

    const deviceId = getOrCreateDeviceId();

    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
          deviceId: deviceId,
          device_id: deviceId,
        }),
      });

      const rawText = await response.text();
      let data: ProcessImageResponse & { error?: string; errorType?: string };
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('AI servers are currently at peak capacity. Please try again in a moment.');
      }

      if (!response.ok || !data.success) {
        if (
          response.status === 503 ||
          response.status === 429 ||
          data.errorType === 'GEMINI_OVERLOADED' ||
          data.errorType === 'GEMINI_RATE_LIMITED' ||
          data.error?.toLowerCase().includes('503') ||
          data.error?.toLowerCase().includes('high demand') ||
          data.error?.toLowerCase().includes('capacity') ||
          data.error?.toLowerCase().includes('overloaded') ||
          data.error?.toLowerCase().includes('unavailable') ||
          data.error?.toLowerCase().includes('rate limit')
        ) {
          throw new Error('AI servers are currently at peak capacity. Please try again in a moment.');
        }

        // Clean any raw json or technical syntax if present
        let cleanErr = data.error || 'Biometric analysis could not be completed. Please try again in a moment.';
        if (
          cleanErr.startsWith('{') ||
          cleanErr.includes('"error"') ||
          cleanErr.includes('<!doctype') ||
          cleanErr.includes('Unexpected token')
        ) {
          cleanErr = 'AI servers are currently at peak capacity. Please try again in a moment.';
        }
        throw new Error(cleanErr);
      }

      setResult(data);
      setStatus('complete');
    } catch (err: unknown) {
      console.error('Scan processing error:', err);
      const error = err as { message?: string };
      let displayMsg = error?.message || 'AI servers are currently at peak capacity. Please try again in a moment.';
      const lower = displayMsg.toLowerCase();
      if (
        lower.includes('503') ||
        lower.includes('429') ||
        lower.includes('high demand') ||
        lower.includes('resource_exhausted') ||
        lower.includes('unavailable') ||
        lower.includes('capacity') ||
        lower.includes('overloaded') ||
        lower.includes('unexpected token') ||
        displayMsg.startsWith('{') ||
        displayMsg.includes('"error"') ||
        displayMsg.includes('<!doctype')
      ) {
        displayMsg = 'AI servers are currently at peak capacity. Please try again in a moment.';
      }
      setErrorMsg(displayMsg);
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setCapturedImage(null);
    setResult(null);
    setErrorMsg(null);
  };

  return (
    <main className="min-h-dvh w-full bg-black text-white flex flex-col items-center justify-between px-4 sm:px-6 relative overflow-hidden">
      {/* Top Header with Text-based Minimal Logo */}
      <Header onReset={handleReset} showReset={status === 'complete' || status === 'error'} />

      {/* Main Content Area */}
      <div className="w-full max-w-sm flex-1 flex flex-col justify-center my-auto py-6">
        {status === 'idle' && (
          <Viewfinder onCapture={handleCapture} isAnalyzing={false} />
        )}

        {status === 'analyzing' && (
          <AnalyzingState imagePreview={capturedImage} />
        )}

        {status === 'complete' && result && (
          <AnalysisReport
            result={result}
            imagePreview={capturedImage}
            onReset={handleReset}
          />
        )}

        {status === 'error' && (
          <div className="w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-900 flex flex-col items-center justify-center p-8 text-center">
            <span className="text-[10px] tracking-[0.25em] text-neutral-400 uppercase font-mono mb-3">
              Authentication & Optical Status
            </span>
            <p className="text-xs font-light text-neutral-300 mb-6 leading-relaxed">
              {errorMsg || 'Unable to complete biometric processing.'}
            </p>
            <button
              id="retry-scan-btn"
              type="button"
              onClick={handleReset}
              className="w-full py-3.5 rounded-full bg-white text-black font-medium text-xs tracking-widest uppercase hover:bg-neutral-200 transition-colors active:scale-[0.98]"
            >
              Restart Scan
            </button>
          </div>
        )}
      </div>

      {/* Minimal Footer Signature with Abundant Negative Space */}
      <footer className="w-full py-6 flex items-center justify-between text-[10px] tracking-widest text-neutral-500 uppercase font-mono select-none px-2 max-w-sm">
        <span>VEYRA OPTICAL 3.8</span>
        <span>TRUE BLACK</span>
      </footer>
    </main>
  );
}
