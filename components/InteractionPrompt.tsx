'use client';

import React from 'react';
import { InteractionTarget } from '@/lib/types';

interface InteractionPromptProps {
  target: InteractionTarget | null;
  isSitting: boolean;
}

export function InteractionPrompt({ target, isSitting }: InteractionPromptProps) {
  if (isSitting) {
    return (
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 pointer-events-none z-30">
        <div className="px-5 py-2.5 bg-black/40 backdrop-blur-md rounded-md text-white/90 text-sm tracking-wide shadow-lg border border-white/10 transition-all duration-300">
          <span className="font-medium text-amber-200">Resting peacefully</span>
          <span className="mx-2 text-white/30">|</span>
          <span className="text-white/70">Press W or Space to stand up</span>
        </div>
      </div>
    );
  }

  if (!target) return null;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 pointer-events-none z-30">
      <div className="px-5 py-2.5 bg-black/45 backdrop-blur-md rounded-md text-white/95 text-sm tracking-wide shadow-lg border border-white/10 flex items-center gap-3">
        <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs font-mono font-semibold text-white">
          E
        </kbd>
        <span className="font-medium">{target.actionText}</span>
        <span className="text-white/40 text-xs hidden sm:inline">({target.name})</span>
      </div>
    </div>
  );
}
