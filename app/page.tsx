'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Viewfinder } from '@/components/Viewfinder';
import { AnalyzingState } from '@/components/AnalyzingState';
import { AnalysisReport } from '@/components/AnalysisReport';
import type { ProcessImageResponse } from '@/app/api/process-image/route';

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessImageResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCapture = async (base64Image: string) => {
    setCapturedImage(base64Image);
    setStatus('analyzing');
    setErrorMsg(null);

    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Optical processing failed.');
      }

      setResult(data);
      setStatus('complete');
    } catch (err: unknown) {
      console.error('Scan processing error:', err);
      const error = err as { message?: string };
      setErrorMsg(error?.message || 'Biometric stream interrupted. Please retry.');
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
        <span>OPTICAL ENGINE 3.8</span>
        <span>TRUE BLACK</span>
      </footer>
    </main>
  );
}
