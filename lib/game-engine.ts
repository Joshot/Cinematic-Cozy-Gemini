import * as THREE from 'three';
import {
  GraphicsSettings,
  InteractionTarget,
  TimeOfDayPreset,
  WeatherPreset,
} from './types';
import { soundscape } from './audio-engine';
import { createTerrain, TerrainSystem } from './terrain';
import { createVegetation, VegetationSystem } from './vegetation';
import { createArchitecture, ArchitectureSystem } from './architecture';
import { createSkyAndWeather, SkyWeatherSystem } from './sky-weather';
import { createAnimals, AnimalSystem } from './animals';

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  onInteractionChange?: (target: InteractionTarget | null) => void;
  onSittingChange?: (isSitting: boolean) => void;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private canvas: HTMLCanvasElement;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;

  // Subsystems
  private terrain: TerrainSystem;
  private vegetation: VegetationSystem;
  private architecture: ArchitectureSystem;
  private skyWeather: SkyWeatherSystem;
  private animals: AnimalSystem;

  // Player & Controls State (Spawn on the carriage path looking towards the homestead)
  private playerPos = new THREE.Vector3(0, 1.7, 26);
  private playerVel = new THREE.Vector3();
  private yaw = 0; // Face north down the farm road toward the farmhouse
  private pitch = 0;
  private isPointerLocked = false;
  private isSitting = false;
  private sittingSeatPos: THREE.Vector3 | null = null;

  // Key States
  private keys: Record<string, boolean> = {
    KeyW: false,
    KeyS: false,
    KeyA: false,
    KeyD: false,
    ShiftLeft: false,
    ShiftRight: false,
    Space: false,
  };

  // Movement & Head Bob
  private distanceTraveled = 0;
  private footstepAccumulator = 0;
  private currentBobOffset = new THREE.Vector3();
  private eyeHeight = 1.72;

  // Graphics Settings
  private settings: GraphicsSettings = {
    preset: 'high',
    shadowQuality: 'high',
    grassDensity: 1.0,
    viewDistance: 280,
    antiAliasing: true,
    bloom: true,
    windStrength: 1.0,
    fov: 75,
    mouseSensitivity: 1.2,
    headBobIntensity: 0.6,
  };

  // Interactions
  private currentTarget: InteractionTarget | null = null;
  private onInteractionChange?: (target: InteractionTarget | null) => void;
  private onSittingChange?: (isSitting: boolean) => void;

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas;
    this.onInteractionChange = options.onInteractionChange;
    this.onSittingChange = options.onSittingChange;
    this.clock = new THREE.Clock();

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, aspect, 0.1, this.settings.viewDistance);
    this.camera.rotation.order = 'YXZ';

    // High Quality WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02; // Natural crisp daylight exposure
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize Subsystems
    this.terrain = createTerrain(this.scene);
    this.vegetation = createVegetation(this.scene, this.terrain.getHeight, this.settings.grassDensity);
    this.architecture = createArchitecture(this.scene, this.terrain.getHeight);
    this.skyWeather = createSkyAndWeather(this.scene);
    this.animals = createAnimals(this.scene, this.terrain.getHeight);

    // Initial position on terrain path
    this.playerPos.y = this.terrain.getHeight(this.playerPos.x, this.playerPos.z) + this.eyeHeight;
    this.camera.position.copy(this.playerPos);

    // Event listeners
    this.setupEventListeners();

    // Start loop
    this.animate();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  public requestPointerLock() {
    this.canvas.requestPointerLock?.();
  }

  public exitPointerLock() {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock?.();
    }
  }

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  };

  private onResize = () => {
    if (!this.canvas) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked) return;

    const sens = 0.0016 * this.settings.mouseSensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;

    const maxPitch = Math.PI * 0.44;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code in this.keys) {
      this.keys[e.code] = true;
      if (this.isSitting && (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'Space')) {
        this.standUp();
      }
    }

    if (e.code === 'KeyE') {
      this.triggerCurrentInteraction();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code in this.keys) {
      this.keys[e.code] = false;
    }
  };

  public triggerCurrentInteraction() {
    if (!this.currentTarget) return;

    const target = this.currentTarget;
    if (target.type === 'animal') {
      this.animals.petAnimal(target.id);
      target.actionText = 'Calm & Contented';
      this.onInteractionChange?.(target);
    } else if (target.type === 'gate') {
      const isOpen = this.architecture.toggleGate(target.id);
      soundscape.playGateCreak(target.position[0], target.position[1], target.position[2]);
      target.actionText = isOpen ? 'Close Gate' : 'Open Gate';
      this.onInteractionChange?.(target);
    } else if (target.type === 'bench') {
      if (this.isSitting) {
        this.standUp();
      } else {
        this.sitDown(target.position);
      }
    }
  }

  public sitDown(seatPos: [number, number, number]) {
    this.isSitting = true;
    this.sittingSeatPos = new THREE.Vector3(seatPos[0], seatPos[1] + 0.65, seatPos[2]);
    this.onSittingChange?.(true);
  }

  public standUp() {
    this.isSitting = false;
    this.sittingSeatPos = null;
    this.onSittingChange?.(false);
  }

  public applyGraphicsSettings(newSettings: Partial<GraphicsSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    if (newSettings.fov !== undefined) {
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
    }

    if (newSettings.viewDistance !== undefined) {
      this.camera.far = this.settings.viewDistance;
      this.camera.updateProjectionMatrix();
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 1.3 / this.settings.viewDistance;
      }
    }

    if (newSettings.shadowQuality !== undefined) {
      if (this.settings.shadowQuality === 'off') {
        this.renderer.shadowMap.enabled = false;
      } else {
        this.renderer.shadowMap.enabled = true;
        const res =
          this.settings.shadowQuality === 'low'
            ? 1024
            : this.settings.shadowQuality === 'medium'
            ? 2048
            : 4096;
        this.skyWeather.dirLight.shadow.mapSize.set(res, res);
        this.skyWeather.dirLight.shadow.map?.dispose();
        this.skyWeather.dirLight.shadow.map = null;
      }
    }

    if (newSettings.preset !== undefined) {
      switch (newSettings.preset) {
        case 'low':
          this.renderer.setPixelRatio(1.0);
          this.camera.far = 160;
          break;
        case 'medium':
          this.renderer.setPixelRatio(1.2);
          this.camera.far = 220;
          break;
        case 'high':
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
          this.camera.far = 280;
          break;
        case 'ultra':
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
          this.camera.far = 340;
          break;
        case 'cinematic':
          this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
          this.camera.far = 400;
          break;
      }
      this.camera.updateProjectionMatrix();
    }
  }

  public setTimeOfDay(time: TimeOfDayPreset) {
    this.skyWeather.setTimeOfDay(time);
  }

  public setWeather(weather: WeatherPreset) {
    this.skyWeather.setWeather(weather);
    soundscape.setRainActive(weather === 'gentleRain');
  }

  private updateMovement(delta: number) {
    if (this.isSitting) {
      if (this.sittingSeatPos) {
        this.playerPos.lerp(this.sittingSeatPos, 0.12);
        this.camera.position.copy(this.playerPos);
      }
      return;
    }

    const isShift = this.keys.ShiftLeft || this.keys.ShiftRight;
    const moveSpeed = isShift ? 4.3 : 2.6; // Relaxed human walking pace

    // Calculate move vector relative to camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const inputDir = new THREE.Vector3();
    if (this.keys.KeyW) inputDir.add(forward);
    if (this.keys.KeyS) inputDir.sub(forward);
    if (this.keys.KeyD) inputDir.add(right);
    if (this.keys.KeyA) inputDir.sub(right);

    const isMoving = inputDir.lengthSq() > 0.001;
    if (isMoving) {
      inputDir.normalize();
      this.playerVel.x = inputDir.x * moveSpeed;
      this.playerVel.z = inputDir.z * moveSpeed;
    } else {
      this.playerVel.x *= Math.max(0, 1 - delta * 12);
      this.playerVel.z *= Math.max(0, 1 - delta * 12);
    }

    // Apply movement
    const nextX = this.playerPos.x + this.playerVel.x * delta;
    const nextZ = this.playerPos.z + this.playerVel.z * delta;

    // Expanded world boundary clamp (up to 190m in each direction)
    const bound = 190;
    this.playerPos.x = Math.max(-bound, Math.min(bound, nextX));
    this.playerPos.z = Math.max(-bound, Math.min(bound, nextZ));

    // Follow terrain elevation smoothly
    const groundY = this.terrain.getHeight(this.playerPos.x, this.playerPos.z);
    const targetY = groundY + this.eyeHeight;
    this.playerPos.y = THREE.MathUtils.lerp(this.playerPos.y, targetY, 0.18);

    // Footsteps & Distance
    const currentSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (currentSpeed > 0.4) {
      const stepDist = currentSpeed * delta;
      this.distanceTraveled += stepDist;
      this.footstepAccumulator += stepDist;

      const stepInterval = isShift ? 1.4 : 1.85;
      if (this.footstepAccumulator >= stepInterval) {
        this.footstepAccumulator = 0;
        const surf = this.terrain.getSurface(this.playerPos.x, this.playerPos.z);
        soundscape.playFootstep(surf, isShift);
      }
    }

    // Subtle human head bobbing
    const bobFactor = this.settings.headBobIntensity;
    if (currentSpeed > 0.4 && bobFactor > 0.01) {
      const bobFreq = isShift ? 8.5 : 6.0;
      const bobTime = this.distanceTraveled * (bobFreq / moveSpeed);
      this.currentBobOffset.y = Math.sin(bobTime) * 0.032 * bobFactor;
      this.currentBobOffset.x = Math.cos(bobTime * 0.5) * 0.018 * bobFactor;
    } else {
      const t = this.clock.getElapsedTime();
      this.currentBobOffset.y = Math.sin(t * 1.8) * 0.007;
      this.currentBobOffset.x = Math.cos(t * 0.9) * 0.003;
    }

    this.camera.position.copy(this.playerPos).add(this.currentBobOffset);
  }

  private updateInteractions() {
    const candidateTargets: InteractionTarget[] = [];

    this.architecture.interactables.forEach((item) => {
      const d = Math.hypot(item.position[0] - this.playerPos.x, item.position[2] - this.playerPos.z);
      if (d <= item.distance) {
        candidateTargets.push({ ...item, distance: d });
      }
    });

    const animalTargets = this.animals.getInteractables(this.playerPos);
    candidateTargets.push(...animalTargets);

    candidateTargets.sort((a, b) => a.distance - b.distance);
    const nearest = candidateTargets.length > 0 ? candidateTargets[0] : null;

    if (nearest?.id !== this.currentTarget?.id || nearest?.actionText !== this.currentTarget?.actionText) {
      this.currentTarget = nearest;
      this.onInteractionChange?.(this.currentTarget);
    }
  }

  private updateAudioListener() {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const up = this.camera.up;

    soundscape.updateListenerPosition(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
      forward.x,
      forward.y,
      forward.z,
      up.x,
      up.y,
      up.z
    );

    // Global environmental wind field calculation
    const t = this.clock.getElapsedTime();
    const windGust = 1.0 + Math.sin(t * 0.22) * 0.38 + Math.cos(t * 0.06) * 0.22;
    soundscape.updateWindIntensity(windGust * this.settings.windStrength);
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    this.updateMovement(delta);
    this.terrain.updateWater(elapsed);
    this.vegetation.update(elapsed, this.settings.windStrength);
    this.skyWeather.update(delta);
    this.animals.update(delta, this.playerPos);
    this.updateInteractions();
    this.updateAudioListener();

    this.renderer.render(this.scene, this.camera);
  };

  public getPlayerPosition(): THREE.Vector3 {
    return this.playerPos.clone();
  }

  public getIsSitting(): boolean {
    return this.isSitting;
  }

  public resetToEntrance() {
    this.playerPos.set(0, 1.7, 26);
    this.yaw = 0;
    this.pitch = 0;
    this.playerPos.y = this.terrain.getHeight(0, 26) + this.eyeHeight;
    this.camera.position.copy(this.playerPos);
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    this.vegetation.dispose();
    this.architecture.dispose();
    this.skyWeather.dispose();
    this.animals.dispose();
    this.renderer.dispose();
    soundscape.dispose();
  }
}
