'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '@/lib/game-engine';
import {
  AudioSettings,
  GraphicsSettings,
  InteractionTarget,
  TimeOfDayPreset,
  WeatherPreset,
} from '@/lib/types';
import { soundscape } from '@/lib/audio-engine';
import { MainMenu } from './MainMenu';
import { SettingsModal } from './SettingsModal';
import { CreditsModal } from './CreditsModal';
import { InteractionPrompt } from './InteractionPrompt';
import { Camera, Volume2, VolumeX, Eye } from 'lucide-react';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<InteractionTarget | null>(null);
  const [isSitting, setIsSitting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Settings States
  const [graphics, setGraphics] = useState<GraphicsSettings>({
    preset: 'cinematic',
    shadowQuality: 'ultra',
    grassDensity: 1.0,
    viewDistance: 400,
    antiAliasing: true,
    bloom: true,
    windStrength: 1.0,
    fov: 75,
    mouseSensitivity: 1.2,
    headBobIntensity: 0.65,
  });

  const [audio, setAudio] = useState<AudioSettings>({
    masterVolume: 0.8,
    natureVolume: 0.75,
    footstepVolume: 0.65,
    animalVolume: 0.7,
    ambientMusicVolume: 0.25,
    ambientMusicEnabled: false,
  });

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayPreset>('afternoon');
  const [weather, setWeather] = useState<WeatherPreset>('sunny');

  // Initialize GameEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine({
      canvas: canvasRef.current,
      onInteractionChange: (target) => setCurrentTarget(target),
      onSittingChange: (sitting) => setIsSitting(sitting),
    });
    engineRef.current = engine;

    // Bulletproof pointer lock cursor management — eliminates black circle bug
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      if (isLocked) {
        document.body.classList.add('pointer-locked');
        canvasRef.current?.classList.add('cursor-hidden');
      } else {
        document.body.classList.remove('pointer-locked');
        canvasRef.current?.classList.remove('cursor-hidden');
        if (!isPhotoMode) {
          setIsMenuOpen(true);
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);

    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        // Toggle photo / meditative mode
        setIsPhotoMode((prev) => !prev);
      }
      if (e.code === 'Escape' && isPhotoMode) {
        setIsPhotoMode(false);
        setIsMenuOpen(true);
      }
    };
    document.addEventListener('keydown', handleGlobalKey);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('keydown', handleGlobalKey);
      document.body.classList.remove('pointer-locked');
      engine.dispose();
      engineRef.current = null;
    };
  }, [isPhotoMode]);

  // Handlers for settings updates
  const handleUpdateGraphics = useCallback((newSettings: Partial<GraphicsSettings>) => {
    setGraphics((prev) => {
      const updated = { ...prev, ...newSettings };
      engineRef.current?.applyGraphicsSettings(updated);
      return updated;
    });
  }, []);

  const handleUpdateAudio = useCallback((newSettings: Partial<AudioSettings>) => {
    setAudio((prev) => {
      const updated = { ...prev, ...newSettings };
      soundscape.updateSettings(updated);
      return updated;
    });
  }, []);

  const handleSetTimeOfDay = useCallback((tod: TimeOfDayPreset) => {
    setTimeOfDay(tod);
    engineRef.current?.setTimeOfDay(tod);
  }, []);

  const handleSetWeather = useCallback((w: WeatherPreset) => {
    setWeather(w);
    engineRef.current?.setWeather(w);
  }, []);

  const handleStartWalk = () => {
    soundscape.init();
    setIsMenuOpen(false);
    setHasStartedOnce(true);
    engineRef.current?.requestPointerLock();
  };

  const handleCanvasClick = () => {
    if (!isMenuOpen && !isSettingsOpen && !isCreditsOpen) {
      soundscape.init();
      engineRef.current?.requestPointerLock();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      soundscape.updateSettings({ masterVolume: audio.masterVolume });
      setIsMuted(false);
    } else {
      soundscape.updateSettings({ masterVolume: 0 });
      setIsMuted(true);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-zinc-950 font-sans">
      {/* 3D Canvas — NO crosshair, NO reticle, NO cursor indicators */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        tabIndex={-1}
        className={`w-full h-full block outline-none ${
          isMenuOpen || isSettingsOpen || isCreditsOpen ? 'cursor-default' : 'cursor-none cursor-hidden'
        }`}
        style={{ cursor: isMenuOpen || isSettingsOpen || isCreditsOpen ? 'default' : 'none' }}
      />

      {/* In-Game Minimal Overlay (Hidden in Photo Mode or when Menu is open) */}
      {!isMenuOpen && !isPhotoMode && (
        <>
          <InteractionPrompt target={currentTarget} isSitting={isSitting} />

          {/* Discreet Top Right Corner Controls */}
          <div className="fixed top-5 right-5 z-20 flex items-center gap-2">
            <button
              onClick={() => setIsPhotoMode(true)}
              className="p-2.5 rounded-lg bg-black/35 hover:bg-black/60 text-white/70 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
              title="Photo / Contemplation Mode (P)"
              aria-label="Photo mode"
            >
              <Camera className="w-4 h-4" />
            </button>

            <button
              onClick={toggleMute}
              className="p-2.5 rounded-lg bg-black/35 hover:bg-black/60 text-white/70 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              aria-label="Toggle audio mute"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                engineRef.current?.exitPointerLock();
                setIsMenuOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-black/35 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md border border-white/10 text-xs font-medium tracking-wide transition-colors"
            >
              Menu
            </button>
          </div>
        </>
      )}

      {/* Photo Mode Quiet Hint */}
      {isPhotoMode && (
        <div className="fixed bottom-6 right-6 z-30 pointer-events-none">
          <div className="px-4 py-2 bg-black/30 backdrop-blur-md rounded-md text-white/60 text-xs tracking-wider border border-white/10 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>Contemplation Mode · Press P or ESC to exit</span>
          </div>
        </div>
      )}

      {/* Main Menu */}
      <MainMenu
        isOpen={isMenuOpen}
        hasStartedOnce={hasStartedOnce}
        onStartWalk={handleStartWalk}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCredits={() => setIsCreditsOpen(true)}
        onResetPosition={() => {
          engineRef.current?.resetToEntrance();
          handleStartWalk();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        graphics={graphics}
        onUpdateGraphics={handleUpdateGraphics}
        audio={audio}
        onUpdateAudio={handleUpdateAudio}
        timeOfDay={timeOfDay}
        onSetTimeOfDay={handleSetTimeOfDay}
        weather={weather}
        onSetWeather={handleSetWeather}
      />

      {/* Credits Modal */}
      <CreditsModal isOpen={isCreditsOpen} onClose={() => setIsCreditsOpen(false)} />
    </div>
  );
}
