'use client';

/**
 * SoundController
 * Web Audio API synthesizer for the Bee Queen Curtail luxury experience.
 * Synthesizes rich ambient chimes, soft fabric breeze swooshes, and tactile luxury clicks
 * with zero external assets, fast loading, and strict volume normalization.
 */
class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private ambientGain: GainNode | null = null;
  private ambientInterval: any = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (!muted) {
      this.initCtx();
      this.startAmbient();
      this.playChime(660);
    } else {
      this.stopAmbient();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Tactile luxury micro-click for interactive elements (buttons, swatches, tabs)
   */
  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (_) {}
  }

  /**
   * Soft fabric swoosh sound on 3D rotation, swatch swap, or slider adjustment
   */
  public playFabricSwoosh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.25; // 250ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      // Pink-ish soft filtered noise
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.15;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1100, this.ctx.currentTime + 0.15);
      filter.frequency.exponentialRampToValueAtTime(350, this.ctx.currentTime + 0.25);
      filter.Q.value = 2.5;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(this.ctx.currentTime);
      whiteNoise.stop(this.ctx.currentTime + 0.26);
    } catch (_) {}
  }

  /**
   * Royal temple wind chime harmonic tone
   */
  public playChime(baseFreq = 528) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const harmonics = [1, 2.02, 3.05, 4.2];
      const gains = [0.035, 0.015, 0.008, 0.004];

      harmonics.forEach((h, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, this.ctx.currentTime);

        gain.gain.setValueAtTime(gains[idx], this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 2.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 2.3);
      });
    } catch (_) {}
  }

  private startAmbient() {
    this.stopAmbient();
    if (this.isMuted) return;

    // Periodic gentle chimes
    const chimes = [528, 660, 792, 880, 1056];
    this.ambientInterval = setInterval(() => {
      if (this.isMuted) return;
      const freq = chimes[Math.floor(Math.random() * chimes.length)];
      this.playChime(freq);
    }, 18000);
  }

  private stopAmbient() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }
}

export const soundCtrl = new SoundController();
