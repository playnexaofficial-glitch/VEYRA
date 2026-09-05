'use client';

import React, { useEffect, useState } from 'react';

const ANALYSIS_PHASES = [
  'Calibrating orbital symmetry',
  'Mapping neoclassical facial planes',
  'Evaluating dermal light reflectance',
  'Computing volumetric balance',
  'Synthesizing biometric index',
];

interface AnalyzingStateProps {
  imagePreview?: string | null;
}

export function AnalyzingState({ imagePreview }: AnalyzingStateProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % ANALYSIS_PHASES.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      id="analyzing-state-container"
      className="relative w-full max-w-sm aspect-[4/5] mx-auto rounded-3xl overflow-hidden bg-black flex flex-col items-center justify-center p-8 select-none"
    >
      {/* Background with minimal blur and captured frame if present */}
      {imagePreview && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-lg scale-105 transition-all duration-1000"
          style={{ backgroundImage: `url(${imagePreview})` }}
        />
      )}

      {/* Titanium Optical Calibration Lines */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Subtle Horizontal & Vertical Axis Guides */}
        <div className="absolute w-24 h-[1px] bg-neutral-700/40" />
        <div className="absolute h-24 w-[1px] bg-neutral-700/40" />
        
        {/* Minimal Scanning Laser */}
        <div className="absolute inset-x-8 h-[1px] bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-scan" />
      </div>

      {/* Central Minimalist Analysis Text */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Sleek Analyzing... Text */}
        <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] text-white uppercase mb-2">
          Analyzing...
        </h2>
        
        {/* Sub-phase text with smooth transition */}
        <p className="text-[12px] tracking-[0.15em] text-neutral-400 font-mono uppercase h-5 transition-all duration-300">
          {ANALYSIS_PHASES[phaseIndex]}
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-32 h-[2px] bg-neutral-900 rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-blue-500/90 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    </div>
  );
}
