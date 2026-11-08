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

export interface FxConfig {
  /** High-pass filter cutoff in Hz. */
  hp: number;
  /** Peaking filter frequency in Hz. */
  bf: number;
  /** Peaking filter gain in dB. */
  bg: number;
  /** Peaking filter Q. */
  bq: number;
  /** High-shelf gain in dB at 10 kHz. */
  sg: number;
  /** Reverb pre-delay in ms. */
  pd: number;
  /** Reverb decay (RT60) in seconds. */
  dc: number;
  /** Wet mix, 0–1. */
  wet: number;
}

const DEFAULT_CONFIG: SynthConfig = {
  waveform: 'triangle',
  adsr: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.6 },
};

const DEFAULT_FX: FxConfig = {
  hp: 20,
  bf: 1000,
  bg: 0,
  bq: 1,
  sg: 0,
  pd: 20,
  dc: 1.2,
  wet: 0,
};

let config: SynthConfig = { ...DEFAULT_CONFIG, adsr: { ...DEFAULT_CONFIG.adsr } };
let fx: FxConfig = { ...DEFAULT_FX };

export function getConfig(): SynthConfig {
  return { waveform: config.waveform, adsr: { ...config.adsr } };
}

type ConfigListener = (config: SynthConfig) => void;
const configListeners = new Set<ConfigListener>();

export function onSynthConfigChange(listener: ConfigListener): () => void {
  configListeners.add(listener);
  return () => configListeners.delete(listener);
}

function emitConfig(): void {
  const snapshot = getConfig();
  configListeners.forEach((listener) => listener(snapshot));
}

export function setWaveform(waveform: Waveform): void {
  config.waveform = waveform;
  syncGlobal();
  emitConfig();
}

export function setAdsr(partial: Partial<Adsr>): void {
  config.adsr = { ...config.adsr, ...partial };
  syncGlobal();
  emitConfig();
}

export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG, adsr: { ...DEFAULT_CONFIG.adsr } };
  syncGlobal();
  emitConfig();
}

export function getFx(): FxConfig {
  return { ...fx };
}

export function setFx(partial: Partial<FxConfig>): void {
  fx = { ...fx, ...partial };
  if (busNodes) applyFx();
  syncGlobal();
}

/** Regenerates the reverb impulse response after changing the decay time. */
export function rebuildImpulse(): void {
  if (busNodes) busNodes.convolver.buffer = impulseResponse();
}

export function resetFx(): void {
  fx = { ...DEFAULT_FX };
  if (busNodes) {
    rebuildImpulse();
    applyFx();
  }
  syncGlobal();
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

interface BusNodes {
  input: GainNode;
  hp: BiquadFilterNode;
  pk: BiquadFilterNode;
  sh: BiquadFilterNode;
  dry: GainNode;
  wet: GainNode;
  delay: DelayNode;
  convolver: ConvolverNode;
  master: GainNode;
}

let busNodes: BusNodes | null = null;

function impulseResponse(): AudioBuffer {
  const ctx = audioContext();
  const length = Math.max(1, Math.floor(ctx.sampleRate * fx.dc));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
  }
  return buffer;
}

function applyFx(): void {
  if (!busNodes) return;
  const ctx = audioContext();
  const when = ctx.currentTime;
  const set = (param: AudioParam, value: number): void => {
    param.setTargetAtTime(value, when, 0.02);
  };
  set(busNodes.hp.frequency, fx.hp);
  set(busNodes.pk.frequency, fx.bf);
  set(busNodes.pk.gain, fx.bg);
  set(busNodes.pk.Q, fx.bq);
  set(busNodes.sh.gain, fx.sg);
  set(busNodes.delay.delayTime, fx.pd / 1000);
  set(busNodes.wet.gain, fx.wet);
  set(busNodes.dry.gain, 1 - fx.wet * 0.5);
}

function bus(): GainNode {
  const ctx = audioContext();
  if (busNodes) return busNodes.input;

  const input = ctx.createGain();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  const pk = ctx.createBiquadFilter();
  pk.type = 'peaking';
  const sh = ctx.createBiquadFilter();
  sh.type = 'highshelf';
  sh.frequency.value = 10000;
  const dry = ctx.createGain();
  const wet = ctx.createGain();
  const delay = ctx.createDelay(0.2);
  const convolver = ctx.createConvolver();
  const master = ctx.createGain();

  input.connect(hp);
  hp.connect(pk);
  pk.connect(sh);
  sh.connect(dry);
  sh.connect(delay);
  delay.connect(convolver);
  convolver.connect(wet);
  dry.connect(master);
  wet.connect(master);
  master.connect(ctx.destination);

  busNodes = { input, hp, pk, sh, dry, wet, delay, convolver, master };
  convolver.buffer = impulseResponse();
  applyFx();
  return input;
}

export function scheduleTone(semitone: number, when: number, duration: number): void {
  scheduleNoteImpl(semitone, when, duration);
}

function scheduleNoteImpl(semitone: number, when: number, duration: number): void {
  const ctx = audioContext();
  const { waveform, adsr } = getConfig();
  // The default Piano patch uses a decaying, slightly inharmonic harmonic
  // stack. A triangle oscillator has an unnaturally steady tone, while a
  // struck piano loses its upper partials quickly after the hammer attack.
  if (waveform === 'triangle') {
    schedulePianoNote(ctx, semitone, when, duration, adsr.release);
    return;
  }

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
  gain.connect(bus());
  osc.start(when);
  osc.stop(releaseEnd + 0.05);
}

function schedulePianoNote(ctx: AudioContext, semitone: number, when: number, duration: number, release: number): void {
  const fundamental = freq(semitone);
  const output = bus();
  const note = ctx.createGain();
  const body = ctx.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.value = Math.min(9000, Math.max(1800, fundamental * 18));
  body.Q.value = 0.55;
  note.gain.setValueAtTime(0.0001, when);
  note.gain.linearRampToValueAtTime(0.19, when + 0.004);
  note.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.9, duration + release));
  note.connect(body);
  body.connect(output);

  // Stiff strings have slightly stretched overtones, which gives the sound
  // more of a piano character than a single oscillator waveform.
  const partials = [1, 0.48, 0.27, 0.17, 0.11, 0.075, 0.05, 0.035];
  partials.forEach((level, index) => {
    const harmonic = index + 1;
    const oscillator = ctx.createOscillator();
    const partialGain = ctx.createGain();
    const stretch = 1 + 0.00012 * harmonic * harmonic;
    const decay = Math.max(0.16, 2.8 / (harmonic ** 0.72));
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(fundamental * harmonic * stretch, when);
    partialGain.gain.setValueAtTime(level, when);
    partialGain.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    oscillator.connect(partialGain);
    partialGain.connect(note);
    oscillator.start(when);
    oscillator.stop(when + decay + 0.02);
  });

  // A very short, filtered hammer transient supplies the attack of a struck
  // key without adding an external sample or dependency.
  const transientLength = Math.max(1, Math.floor(ctx.sampleRate * 0.018));
  const transient = ctx.createBuffer(1, transientLength, ctx.sampleRate);
  const samples = transient.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length) ** 2;
  }
  const hammer = ctx.createBufferSource();
  const hammerFilter = ctx.createBiquadFilter();
  const hammerGain = ctx.createGain();
  hammer.buffer = transient;
  hammerFilter.type = 'bandpass';
  hammerFilter.frequency.value = Math.min(5200, Math.max(1400, fundamental * 7));
  hammerFilter.Q.value = 0.8;
  hammerGain.gain.setValueAtTime(0.028, when);
  hammerGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.018);
  hammer.connect(hammerFilter);
  hammerFilter.connect(hammerGain);
  hammerGain.connect(body);
  hammer.start(when);
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

function syncGlobal(): void {
  if (typeof window === 'undefined') return;
  (window as any).__synthConfig = getConfig();
  (window as any).__fxConfig = getFx();
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
