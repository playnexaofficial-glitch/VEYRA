'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  showReset?: boolean;
  onOpenHistory?: () => void;
}

export function Header({ onReset, showReset, onOpenHistory }: HeaderProps) {
  return (
    <header className="w-full pt-8 pb-4 px-6 flex items-center justify-between select-none">
      <div 
        id="app-brand"
        onClick={onReset}
        className="flex flex-col cursor-pointer group"
      >
        <span className="text-xs tracking-[0.35em] font-medium text-white uppercase transition-opacity duration-300 group-hover:opacity-80">
          VEYRA
        </span>
        <span className="text-[9px] tracking-[0.25em] text-neutral-400 uppercase font-light">
          INTELLIGENCE
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenHistory && (
          <button
            id="header-history-btn"
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 text-[11px] tracking-widest text-neutral-300 hover:text-white uppercase font-normal transition-colors py-1 px-3 rounded-full bg-neutral-950 border border-neutral-900 hover:border-neutral-800 active:scale-95"
            title="Scan Archive"
          >
            <Clock className="w-3 h-3 text-neutral-400" />
            <span>History</span>
          </button>
        )}

        {showReset && (
          <button
            id="header-reset-btn"
            onClick={onReset}
            className="text-[11px] tracking-widest text-neutral-300 hover:text-white uppercase font-normal transition-colors py-1 px-2.5 rounded-full bg-neutral-900/60 active:scale-95"
          >
            New Scan
          </button>
        )}
        <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-900">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[10px] tracking-widest text-neutral-300 uppercase font-mono">
            SYS.READY
          </span>
        </div>
      </div>
    </header>
  );
}
