'use client';

import React from 'react';
import { Compass, Settings, Info, RotateCcw } from 'lucide-react';

interface MainMenuProps {
  isOpen: boolean;
  hasStartedOnce: boolean;
  onStartWalk: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  onResetPosition?: () => void;
}

export function MainMenu({
  isOpen,
  hasStartedOnce,
  onStartWalk,
  onOpenSettings,
  onOpenCredits,
  onResetPosition,
}: MainMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all duration-500">
      <div className="w-full max-w-md mx-4 p-8 text-center bg-zinc-950/75 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-md">
        {/* Title */}
        <div className="mb-8">
          <span className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80 font-medium block mb-2">
            Countryside Exploration
          </span>
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-zinc-100 font-serif">
            Pastoral
          </h1>
          <p className="text-xs text-zinc-400 mt-2.5 max-w-xs mx-auto leading-relaxed">
            Walk, observe, listen, and unwind in a quiet rural farm sanctuary.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 max-w-xs mx-auto">
          <button
            onClick={onStartWalk}
            className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-sm tracking-wider uppercase transition-all duration-200 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2.5"
          >
            <Compass className="w-4 h-4" />
            <span>{hasStartedOnce ? 'Resume Walk' : 'Start Walk'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-3 px-6 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-medium text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2.5"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={onOpenCredits}
            className="w-full py-3 px-6 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-medium text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2.5"
          >
            <Info className="w-4 h-4 text-zinc-400" />
            <span>About & Credits</span>
          </button>

          {hasStartedOnce && onResetPosition && (
            <button
              onClick={onResetPosition}
              className="w-full py-2.5 px-6 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 font-medium text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to Farm Entrance</span>
            </button>
          )}
        </div>

        {/* Quiet controls hint */}
        <div className="mt-8 pt-5 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex justify-center items-center gap-4">
          <span>W A S D to walk</span>
          <span className="text-zinc-600">·</span>
          <span>Mouse to look</span>
          <span className="text-zinc-600">·</span>
          <span>Shift to pace</span>
          <span className="text-zinc-600">·</span>
          <span>ESC for menu</span>
        </div>
      </div>
    </div>
  );
}
