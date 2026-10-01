'use client';

import React from 'react';
import { X } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900/95 border border-zinc-700/60 rounded-xl shadow-2xl text-zinc-100 overflow-hidden p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Close credits"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl font-light tracking-wide text-zinc-100">Pastoral: Countryside Farm</h2>
          <p className="text-xs text-zinc-400">An interactive nature relaxation exploration experience</p>
        </div>

        <div className="space-y-4 text-xs text-zinc-300 leading-relaxed border-t border-b border-zinc-800 py-5">
          <p>
            Designed as a peaceful sanctuary where you can escape daily noise, slow down, and walk through an authentic countryside farm.
          </p>
          <div className="space-y-2 pt-2">
            <div className="flex justify-between">
              <span className="text-zinc-500">Core Experience</span>
              <span className="text-zinc-200">Slow-Paced Nature Exploration</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Visual Engine</span>
              <span className="text-zinc-200">Physically Based WebGL Rendering</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Acoustic Design</span>
              <span className="text-zinc-200">Procedural 3D Spatial Audio Synthesis</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Animal AI</span>
              <span className="text-zinc-200">Autonomous Organic State Machine</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-medium tracking-wide bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors border border-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
