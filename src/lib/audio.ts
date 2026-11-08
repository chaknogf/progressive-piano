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
  adsr: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.6 },
};

let config: SynthConfig = { ...DEFAULT_CONFIG, adsr: { ...DEFAULT_CONFIG.adsr } };

export function getConfig(): SynthConfig {
  return { waveform: config.waveform, adsr: { ...config.adsr } };
}

export function setWaveform(waveform: Waveform): void {
  config.waveform = waveform;
  syncGlobal();
}

export function setAdsr(partial: Partial<Adsr>): void {
  config.adsr = { ...config.adsr, ...partial };
  syncGlobal();
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

export function scheduleTone(semitone: number, when: number, duration: number): void {
  scheduleNoteImpl(semitone, when, duration);
}

function scheduleNoteImpl(semitone: number, when: number, duration: number): void {
  const ctx = audioContext();
  const { waveform, adsr } = getConfig();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const peak = 0.14;
  const attackEnd = when + Math.max(0.001, adsr.attack);
  const decayEnd = attackEnd + Math.max(0.001, adsr.decay);
  const holdEnd = when + Math.max(duration, adsr.attack + adsr.decay);
  const releaseEnd = holdEnd + Math.max(0.001, adsr.release);
  osc.type = waveform;
  osc.frequency.value = freq(semitone);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, attackEnd);
  gain.gain.linearRampToValueAtTime(peak * adsr.sustain + 0.0001, decayEnd);
  gain.gain.setValueAtTime(peak * adsr.sustain + 0.0001, holdEnd);
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
    notes.forEach((n) => scheduleNoteImpl(n, when, duration));
    (window as any).__pulseLogo?.();
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
        scheduleNoteImpl(semitone, time + index * gap, 1.1);
      });
      time += length;
    });
    (window as any).__pulseLogo?.();
  } catch (error) {
    console.error('No se pudo reproducir la secuencia', error);
  }
}

function syncGlobal() {
  if (typeof window === 'undefined') return;
  (window as any).__synthConfig = getConfig();
  (window as any).__scheduleTone = (semitone: number, when: number, duration: number) => {
    scheduleNoteImpl(semitone, when, duration);
  };
}
syncGlobal();

export const PRESETS: Record<string, SynthConfig> = {
  Piano: { waveform: 'triangle', adsr: { attack: 0.005, decay: 0.6, sustain: 0.2, release: 0.5 } },
  Pad: { waveform: 'sawtooth', adsr: { attack: 1.2, decay: 0.5, sustain: 0.8, release: 1.5 } },
  Bajo: { waveform: 'square', adsr: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.15 } },
  Lead: { waveform: 'sawtooth', adsr: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.3 } },
};