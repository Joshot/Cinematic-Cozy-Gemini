import { AudioSettings } from './types';

export type FootstepSurface = 'grass' | 'dirt' | 'wood' | 'water' | 'stone';

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Master and Category Gain Nodes
  private masterGain: GainNode | null = null;
  private natureGain: GainNode | null = null;
  private footstepGain: GainNode | null = null;
  private animalGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Continuous Sound Generators
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private foliageGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  // Ambient Drone / Music
  private musicOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];

  // Internal state
  private birdTimer: NodeJS.Timeout | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    natureVolume: 0.75,
    footstepVolume: 0.65,
    animalVolume: 0.7,
    ambientMusicVolume: 0.25,
    ambientMusicEnabled: false,
  };

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Create gain hierarchy
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.settings.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.natureGain = this.ctx.createGain();
      this.natureGain.gain.setValueAtTime(this.settings.natureVolume, this.ctx.currentTime);
      this.natureGain.connect(this.masterGain);

      this.footstepGain = this.ctx.createGain();
      this.footstepGain.gain.setValueAtTime(this.settings.footstepVolume, this.ctx.currentTime);
      this.footstepGain.connect(this.masterGain);

      this.animalGain = this.ctx.createGain();
      this.animalGain.gain.setValueAtTime(this.settings.animalVolume, this.ctx.currentTime);
      this.animalGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(
        this.settings.ambientMusicEnabled ? this.settings.ambientMusicVolume : 0,
        this.ctx.currentTime
      );
      this.musicGain.connect(this.masterGain);

      // Start continuous ambient nodes
      this.startContinuousWind();
      this.startContinuousWater();
      this.startContinuousRain();
      this.startBirdSchedule();

      this.isInitialized = true;
    } catch (err) {
      console.warn('AudioContext initialization deferred:', err);
    }
  }

  public updateSettings(newSettings: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    if (this.masterGain && newSettings.masterVolume !== undefined) {
      this.masterGain.gain.setTargetAtTime(newSettings.masterVolume, t, 0.05);
    }
    if (this.natureGain && newSettings.natureVolume !== undefined) {
      this.natureGain.gain.setTargetAtTime(newSettings.natureVolume, t, 0.05);
    }
    if (this.footstepGain && newSettings.footstepVolume !== undefined) {
      this.footstepGain.gain.setTargetAtTime(newSettings.footstepVolume, t, 0.05);
    }
    if (this.animalGain && newSettings.animalVolume !== undefined) {
      this.animalGain.gain.setTargetAtTime(newSettings.animalVolume, t, 0.05);
    }
    if (this.musicGain) {
      const vol = this.settings.ambientMusicEnabled ? this.settings.ambientMusicVolume : 0;
      this.musicGain.gain.setTargetAtTime(vol, t, 0.2);
    }

    if (this.settings.ambientMusicEnabled && this.musicOscillators.length === 0) {
      this.startAmbientMusic();
    } else if (!this.settings.ambientMusicEnabled && this.musicOscillators.length > 0) {
      this.stopAmbientMusic();
    }
  }

  // Generate pink/brown noise buffer for natural organic sounds
  private createNoiseBuffer(durationSeconds = 5): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * durationSeconds;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  private startContinuousWind() {
    if (!this.ctx || !this.natureGain) return;
    const noiseBuffer = this.createNoiseBuffer(6);
    if (!noiseBuffer) return;

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
    this.windFilter = filter;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    this.windGain = gain;

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.natureGain);

    // Leaves / foliage rustle layer (higher bandpass)
    const foliageSource = this.ctx.createBufferSource();
    foliageSource.buffer = noiseBuffer;
    foliageSource.loop = true;

    const foliageFilter = this.ctx.createBiquadFilter();
    foliageFilter.type = 'bandpass';
    foliageFilter.frequency.setValueAtTime(1800, this.ctx.currentTime);
    foliageFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const foliageGain = this.ctx.createGain();
    foliageGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    this.foliageGain = foliageGain;

    foliageSource.connect(foliageFilter);
    foliageFilter.connect(foliageGain);
    foliageGain.connect(this.natureGain);

    noiseSource.start();
    foliageSource.start();
  }

  private startContinuousWater() {
    if (!this.ctx || !this.natureGain) return;
    const noiseBuffer = this.createNoiseBuffer(5);
    if (!noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    this.waterGain = gain;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.natureGain);

    source.start();
  }

  private startContinuousRain() {
    if (!this.ctx || !this.natureGain) return;
    const noiseBuffer = this.createNoiseBuffer(4);
    if (!noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime); // silent by default until gentleRain weather
    this.rainGain = gain;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.natureGain);

    source.start();
  }

  public setRainActive(active: boolean) {
    if (!this.ctx || !this.rainGain) return;
    const target = active ? 0.35 : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 1.2);
  }

  public updateWindIntensity(windIntensity: number) {
    if (!this.ctx || !this.windFilter || !this.windGain || !this.foliageGain) return;
    const t = this.ctx.currentTime;
    const clamped = Math.max(0.1, Math.min(2.0, windIntensity));
    const targetFreq = 220 + clamped * 320;
    const targetWindGain = 0.18 + clamped * 0.22;
    const targetFoliageGain = 0.03 + clamped * 0.09;

    this.windFilter.frequency.setTargetAtTime(targetFreq, t, 0.2);
    this.windGain.gain.setTargetAtTime(targetWindGain, t, 0.2);
    this.foliageGain.gain.setTargetAtTime(targetFoliageGain, t, 0.2);
  }

  public updateListenerPosition(
    posX: number, posY: number, posZ: number,
    forwardX: number, forwardY: number, forwardZ: number,
    upX: number, upY: number, upZ: number
  ) {
    if (!this.ctx || !this.ctx.listener) return;
    const listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    if (listener.positionX) {
      listener.positionX.setTargetAtTime(posX, t, 0.05);
      listener.positionY.setTargetAtTime(posY, t, 0.05);
      listener.positionZ.setTargetAtTime(posZ, t, 0.05);
      listener.forwardX.setTargetAtTime(forwardX, t, 0.05);
      listener.forwardY.setTargetAtTime(forwardY, t, 0.05);
      listener.forwardZ.setTargetAtTime(forwardZ, t, 0.05);
      listener.upX.setTargetAtTime(upX, t, 0.05);
      listener.upY.setTargetAtTime(upY, t, 0.05);
      listener.upZ.setTargetAtTime(upZ, t, 0.05);
    } else {
      listener.setPosition(posX, posY, posZ);
      listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
  }

  private createPanner(x: number, y: number, z: number, refDist = 5, maxDist = 60): PannerNode | null {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDist;
    panner.maxDistance = maxDist;
    panner.rolloffFactor = 1.1;
    panner.coneInnerAngle = 360;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else {
      panner.setPosition(x, y, z);
    }
    return panner;
  }

  public playFootstep(surface: FootstepSurface, isSprinting = false) {
    if (!this.ctx || !this.footstepGain) return;
    const t = this.ctx.currentTime;
    const pitchVariation = 0.92 + Math.random() * 0.16;
    const volScale = isSprinting ? 1.25 : 1.0;

    if (surface === 'grass') {
      // Soft rustling brush step
      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.18, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
      }
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 * pitchVariation, t);
      filter.Q.setValueAtTime(1.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35 * volScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.footstepGain);
      noise.start(t);
    } else if (surface === 'dirt') {
      // Crisp earthy impact
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110 * pitchVariation, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.4 * volScale, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      // Earthy grit noise
      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.025));
      }
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 * pitchVariation, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.22 * volScale, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.footstepGain);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.footstepGain);

      osc.start(t);
      osc.stop(t + 0.13);
      noise.start(t);
    } else if (surface === 'wood') {
      // Hollow porch floorboard thump
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190 * pitchVariation, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.14);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.45 * volScale, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(oscGain);
      oscGain.connect(this.footstepGain);
      osc.start(t);
      osc.stop(t + 0.15);
    } else if (surface === 'stone') {
      // Hard crisp rock impact
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320 * pitchVariation, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.38 * volScale, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.06, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.012));
      }
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800 * pitchVariation, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25 * volScale, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(oscGain);
      oscGain.connect(this.footstepGain);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.footstepGain);

      osc.start(t);
      osc.stop(t + 0.09);
      noise.start(t);
    } else {
      // Water splash
      const noise = this.ctx.createBufferSource();
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
      }
      noise.buffer = buf;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 * pitchVariation, t);
      filter.Q.setValueAtTime(3.0, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4 * volScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.footstepGain);
      noise.start(t);
    }
  }

  // Realistic Procedural Birdsong
  public playBirdChirp(x?: number, y?: number, z?: number) {
    if (!this.ctx || !this.natureGain) return;
    const t = this.ctx.currentTime;

    const baseFreq = 2200 + Math.random() * 1200;
    const syllables = 2 + Math.floor(Math.random() * 3);

    let destinationNode: AudioNode = this.natureGain;
    if (x !== undefined && y !== undefined && z !== undefined) {
      const panner = this.createPanner(x, y, z, 10, 80);
      if (panner) {
        panner.connect(this.natureGain);
        destinationNode = panner;
      }
    }

    let syllableTime = t;
    for (let i = 0; i < syllables; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const f1 = baseFreq + (Math.random() * 400 - 200);
      const f2 = f1 + (Math.random() * 600 - 200);

      osc.frequency.setValueAtTime(f1, syllableTime);
      osc.frequency.linearRampToValueAtTime(f2, syllableTime + 0.06);

      gain.gain.setValueAtTime(0.001, syllableTime);
      gain.gain.linearRampToValueAtTime(0.18, syllableTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, syllableTime + 0.07);

      osc.connect(gain);
      gain.connect(destinationNode);

      osc.start(syllableTime);
      osc.stop(syllableTime + 0.08);

      syllableTime += 0.09 + Math.random() * 0.05;
    }
  }

  private startBirdSchedule() {
    const trigger = () => {
      if (this.ctx && this.ctx.state === 'running') {
        const angle = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 35;
        this.playBirdChirp(Math.cos(angle) * dist, 8 + Math.random() * 8, Math.sin(angle) * dist);
      }
      const nextDelay = 3500 + Math.random() * 6000;
      this.birdTimer = setTimeout(trigger, nextDelay);
    };
    this.birdTimer = setTimeout(trigger, 3000);
  }

  // Realistic Procedural Animal Vocalizations
  public playCowMoo(x: number, y: number, z: number) {
    if (!this.ctx || !this.animalGain) return;
    const t = this.ctx.currentTime;
    const panner = this.createPanner(x, y, z, 4, 50);
    if (!panner) return;
    panner.connect(this.animalGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const basePitch = 95 + Math.random() * 20;
    osc.frequency.setValueAtTime(basePitch, t);
    osc.frequency.linearRampToValueAtTime(basePitch + 25, t + 0.4);
    osc.frequency.linearRampToValueAtTime(basePitch - 15, t + 1.4);

    // Formant filter (warm bovine vowel)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(320, t + 1.4);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.32, t + 0.3);
    gain.gain.linearRampToValueAtTime(0.24, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    osc.start(t);
    osc.stop(t + 1.65);
  }

  public playSheepBaa(x: number, y: number, z: number) {
    if (!this.ctx || !this.animalGain) return;
    const t = this.ctx.currentTime;
    const panner = this.createPanner(x, y, z, 3, 40);
    if (!panner) return;
    panner.connect(this.animalGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const basePitch = 220 + Math.random() * 40;
    osc.frequency.setValueAtTime(basePitch, t);
    osc.frequency.linearRampToValueAtTime(basePitch - 30, t + 0.8);

    // Tremolo LFO for sheep flutter
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(7.5, t);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.12, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, t);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    osc.start(t);
    lfo.start(t);
    osc.stop(t + 0.9);
    lfo.stop(t + 0.9);
  }

  public playGoatBleat(x: number, y: number, z: number) {
    if (!this.ctx || !this.animalGain) return;
    const t = this.ctx.currentTime;
    const panner = this.createPanner(x, y, z, 3, 40);
    if (!panner) return;
    panner.connect(this.animalGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const basePitch = 340 + Math.random() * 50;
    osc.frequency.setValueAtTime(basePitch, t);
    osc.frequency.linearRampToValueAtTime(basePitch + 20, t + 0.15);
    osc.frequency.linearRampToValueAtTime(basePitch - 40, t + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950, t);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    osc.start(t);
    osc.stop(t + 0.58);
  }

  public playChickenCluck(x: number, y: number, z: number) {
    if (!this.ctx || !this.animalGain) return;
    const t = this.ctx.currentTime;
    const panner = this.createPanner(x, y, z, 2, 25);
    if (!panner) return;
    panner.connect(this.animalGain);

    const pulses = 2 + Math.floor(Math.random() * 3);
    let pulseT = t;

    for (let i = 0; i < pulses; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const f = 480 + Math.random() * 100;
      osc.frequency.setValueAtTime(f, pulseT);
      osc.frequency.exponentialRampToValueAtTime(f * 0.6, pulseT + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, pulseT);
      gain.gain.exponentialRampToValueAtTime(0.001, pulseT + 0.09);

      osc.connect(gain);
      gain.connect(panner);

      osc.start(pulseT);
      osc.stop(pulseT + 0.1);
      pulseT += 0.11 + Math.random() * 0.04;
    }
  }

  public playGateCreak(x: number, y: number, z: number) {
    if (!this.ctx || !this.footstepGain) return;
    const t = this.ctx.currentTime;
    const panner = this.createPanner(x, y, z, 2, 30);
    if (!panner) return;
    panner.connect(this.footstepGain);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.linearRampToValueAtTime(360, t + 0.35);
    osc.frequency.linearRampToValueAtTime(240, t + 0.65);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(6.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(panner);

    osc.start(t);
    osc.stop(t + 0.75);
  }

  // Gentle meditative ambient chords (OFF by default)
  private startAmbientMusic() {
    if (!this.ctx || !this.musicGain) return;
    this.stopAmbientMusic();

    const chordFreqs = [146.83, 220.0, 261.63, 329.63, 440.0]; // D minor 9 / peaceful pastoral drone
    chordFreqs.forEach((freq) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 3.0);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();

      this.musicOscillators.push({ osc, gain });
    });
  }

  private stopAmbientMusic() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicOscillators.forEach(({ osc, gain }) => {
      try {
        gain.gain.linearRampToValueAtTime(0.0001, t + 1.5);
        osc.stop(t + 1.6);
      } catch {}
    });
    this.musicOscillators = [];
  }

  public dispose() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    this.stopAmbientMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.isInitialized = false;
  }
}

export const soundscape = new SoundscapeEngine();
