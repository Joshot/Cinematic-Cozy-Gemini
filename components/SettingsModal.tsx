'use client';

import React, { useState } from 'react';
import {
  AudioSettings,
  GraphicsPreset,
  GraphicsSettings,
  TimeOfDayPreset,
  WeatherPreset,
} from '@/lib/types';
import { X, Sliders, Sun, Volume2, Eye } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphics: GraphicsSettings;
  onUpdateGraphics: (settings: Partial<GraphicsSettings>) => void;
  audio: AudioSettings;
  onUpdateAudio: (settings: Partial<AudioSettings>) => void;
  timeOfDay: TimeOfDayPreset;
  onSetTimeOfDay: (tod: TimeOfDayPreset) => void;
  weather: WeatherPreset;
  onSetWeather: (w: WeatherPreset) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  graphics,
  onUpdateGraphics,
  audio,
  onUpdateAudio,
  timeOfDay,
  onSetTimeOfDay,
  weather,
  onSetWeather,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'atmosphere' | 'graphics' | 'audio'>('atmosphere');

  if (!isOpen) return null;

  const presets: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra', 'cinematic'];
  const times: { id: TimeOfDayPreset; label: string }[] = [
    { id: 'morning', label: 'Morning Mist' },
    { id: 'midday', label: 'Bright Midday' },
    { id: 'afternoon', label: 'Warm Afternoon' },
    { id: 'sunset', label: 'Golden Hour' },
    { id: 'night', label: 'Starry Night' },
  ];
  const weathers: { id: WeatherPreset; label: string }[] = [
    { id: 'sunny', label: 'Tranquil Sun' },
    { id: 'partlyCloudy', label: 'Drifting Clouds' },
    { id: 'overcast', label: 'Soft Overcast' },
    { id: 'gentleRain', label: 'Gentle Rain' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-700/60 rounded-xl shadow-2xl text-zinc-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-light tracking-wide text-zinc-100">Farm Exploration Settings</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Customize visual atmosphere, rendering quality, and soundscape</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-zinc-800/80 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('atmosphere')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'atmosphere'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Atmosphere & Time</span>
          </button>

          <button
            onClick={() => setActiveTab('graphics')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'graphics'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Graphics & Realism</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === 'audio'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Sound & Camera</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
          {/* TAB 1: ATMOSPHERE & TIME */}
          {activeTab === 'atmosphere' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3 block">
                  Time of Day
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {times.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onSetTimeOfDay(t.id)}
                      className={`px-3.5 py-3 text-left rounded-lg border text-sm transition-all ${
                        timeOfDay === t.id
                          ? 'bg-amber-500/15 border-amber-400/80 text-amber-200 font-medium'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-3 block">
                  Weather State
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {weathers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => onSetWeather(w.id)}
                      className={`px-3.5 py-3 text-left rounded-lg border text-sm transition-all ${
                        weather === w.id
                          ? 'bg-amber-500/15 border-amber-400/80 text-amber-200 font-medium'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Environmental Wind Strength
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(graphics.windStrength * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.8"
                  step="0.1"
                  value={graphics.windStrength}
                  onChange={(e) => onUpdateGraphics({ windStrength: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  Modulates the swaying motion of grass blades, crop stalks, and tree canopies.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: GRAPHICS & REALISM */}
          {activeTab === 'graphics' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2.5 block">
                  Quality Preset
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map((p) => (
                    <button
                      key={p}
                      onClick={() => onUpdateGraphics({ preset: p })}
                      className={`py-2 px-2 text-center capitalize rounded-lg border text-xs tracking-wide transition-all ${
                        graphics.preset === p
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-medium'
                          : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Field of View (FOV)
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">{graphics.fov}°</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="1"
                  value={graphics.fov}
                  onChange={(e) => onUpdateGraphics({ fov: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Horizon View Distance
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">{graphics.viewDistance}m</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="300"
                  step="20"
                  value={graphics.viewDistance}
                  onChange={(e) => onUpdateGraphics({ viewDistance: parseInt(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Dynamic Shadows</div>
                    <div className="text-xs text-zinc-400">Soft PCF shadow maps</div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateGraphics({
                        shadowQuality: graphics.shadowQuality === 'off' ? 'high' : 'off',
                      })
                    }
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      graphics.shadowQuality !== 'off'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/40'
                    }`}
                  >
                    {graphics.shadowQuality !== 'off' ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-200">Anti-Aliasing</div>
                    <div className="text-xs text-zinc-400">Smooth edge filtering</div>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-950/40 rounded border border-emerald-800/30">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO & CAMERA */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Master Volume
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(audio.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.masterVolume}
                  onChange={(e) => onUpdateAudio({ masterVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Nature Ambiance (Wind, Birds, Foliage)
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(audio.natureVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.natureVolume}
                  onChange={(e) => onUpdateAudio({ natureVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Footsteps & Ground Friction
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(audio.footstepVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.footstepVolume}
                  onChange={(e) => onUpdateAudio({ footstepVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Animals (Cows, Sheep, Goats, Hens)
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(audio.animalVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audio.animalVolume}
                  onChange={(e) => onUpdateAudio({ animalVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-zinc-800/40 border border-zinc-700/40 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-zinc-200">Subtle Ambient Music Drone</div>
                  <div className="text-xs text-zinc-400">Gentle meditative background pad (default OFF)</div>
                </div>
                <button
                  onClick={() =>
                    onUpdateAudio({
                      ambientMusicEnabled: !audio.ambientMusicEnabled,
                      ambientMusicVolume: 0.25,
                    })
                  }
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    audio.ambientMusicEnabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/40'
                  }`}
                >
                  {audio.ambientMusicEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Mouse Sensitivity
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {graphics.mouseSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={graphics.mouseSensitivity}
                  onChange={(e) =>
                    onUpdateGraphics({ mouseSensitivity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                    Walking Head Bob Intensity
                  </label>
                  <span className="text-xs text-zinc-400 font-mono">
                    {Math.round(graphics.headBobIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={graphics.headBobIntensity}
                  onChange={(e) =>
                    onUpdateGraphics({ headBobIntensity: parseFloat(e.target.value) })
                  }
                  className="w-full accent-amber-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium tracking-wide bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg transition-colors"
          >
            Apply & Return
          </button>
        </div>
      </div>
    </div>
  );
}
