export type TimeOfDayPreset = 'morning' | 'midday' | 'afternoon' | 'sunset' | 'night';

export type WeatherPreset = 'sunny' | 'partlyCloudy' | 'overcast' | 'gentleRain';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  grassDensity: number; // 0.2 to 1.0
  viewDistance: number; // 80 to 280
  antiAliasing: boolean;
  bloom: boolean;
  windStrength: number; // 0.2 to 1.5
  fov: number; // 60 to 95
  mouseSensitivity: number; // 0.5 to 2.5
  headBobIntensity: number; // 0.0 to 1.0
}

export interface AudioSettings {
  masterVolume: number; // 0 to 1
  natureVolume: number; // 0 to 1
  footstepVolume: number; // 0 to 1
  animalVolume: number; // 0 to 1
  ambientMusicVolume: number; // 0 to 1 (default 0)
  ambientMusicEnabled: boolean; // default false
}

export interface InteractionTarget {
  id: string;
  type: 'animal' | 'gate' | 'bench' | 'water' | 'flower';
  name: string;
  description: string;
  position: [number, number, number];
  distance: number;
  actionText: string;
  canPet?: boolean;
  canSit?: boolean;
  canToggle?: boolean;
}

export type AnimalSpecies = 'cow' | 'sheep' | 'goat' | 'chicken';

export type AnimalState = 'idle' | 'walk' | 'graze' | 'lookAround' | 'rest';

export interface AnimalEntity {
  id: string;
  species: AnimalSpecies;
  subType?: string; // e.g. "Holstein", "Jersey"
  position: { x: number; y: number; z: number };
  rotation: number;
  targetRotation: number;
  state: AnimalState;
  stateTimer: number;
  stateDuration: number;
  speed: number;
  headAngle: number;
  tailAngle: number;
  legPhase: number;
  soundTimer: number;
  boundingRadius: number;
  isPetted?: boolean;
  petTimer?: number;
}
