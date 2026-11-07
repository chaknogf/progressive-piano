export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Adsr {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthConfig {
  waveform: Waveform;
  adsr: Adsr;
}

const DEFAULT_CONFIG: SynthConfig = {
  waveform: 'triangle',
  adsr: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.3 },
};

let config: SynthConfig = { ...DEFAULT_CONFIG, adsr: { ...DEFAULT_CONFIG.adsr } };

export function getConfig(): SynthConfig {
  return { waveform: config.waveform, adsr: { ...config.adsr } };
}

export function setWaveform(waveform: Waveform): void {
  config.waveform = waveform;
}

export function setAdsr(partial: Partial<Adsr>): void {
  config.adsr = { ...config.adsr, ...partial };
}

export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG, adsr: { ...DEFAULT_CONFIG.adsr } };
}

let context: AudioContext | null = null;

export function audioContext(): AudioContext {
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio no soportado');
    context = new Ctor();
  }
  return context;
}

function freq(semitone: number): number {
  return 261.63 * 2 ** (semitone / 12);
}

function scheduleNote(semitone: number, when: number, duration: number): void {
  const ctx = audioContext();
  const { waveform, adsr } = getConfig();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveform;
  osc.frequency.value = freq(semitone);
  const attackEnd = when + Math.max(0.001, adsr.attack);
  const decayEnd = attackEnd + Math.max(0.001, adsr.decay);
  const releaseEnd = when + duration + Math.max(0.001, adsr.release);
  gain.gain.cancelScheduledValues(when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(1, attackEnd);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, adsr.sustain), decayEnd);
  gain.gain.setValueAtTime(Math.max(0.0001, adsr.sustain), when + duration);
  gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(releaseEnd + 0.05);
}

export function playChord(notes: number[], duration = 1.2): void {
  try {
    const ctx = audioContext();
    const when = ctx.currentTime + 0.05;
    notes.forEach((n) => scheduleNote(n, when, duration));
  } catch (error) {
    console.error('No se pudo reproducir el acorde', error);
  }
}

export function playSequence(sequence: number[][], gap = 0, length = 1.2): void {
  try {
    const ctx = audioContext();
    let time = ctx.currentTime + 0.05;
    sequence.forEach((chord) => {
      chord.forEach((semitone, index) => {
        scheduleNote(semitone, time + index * gap, 1.1);
      });
      time += length;
    });
  } catch (error) {
    console.error('No se pudo reproducir la secuencia', error);
  }
}

export const PRESETS: Record<string, SynthConfig> = {
  Piano: { waveform: 'triangle', adsr: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.6 } },
  Órgano: { waveform: 'square', adsr: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.1 } },
  Cuerdas: { waveform: 'sawtooth', adsr: { attack: 0.25, decay: 0.2, sustain: 0.7, release: 0.8 } },
  Flauta: { waveform: 'sine', adsr: { attack: 0.1, decay: 0.15, sustain: 0.6, release: 0.4 } },
};