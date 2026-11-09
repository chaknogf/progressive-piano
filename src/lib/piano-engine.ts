// src/lib/piano-engine.ts
// Motor de piano de cola con Web Audio: cuerdas con parciales inarmónicos,
// golpe de martillo, pedal de sustain, reverb de sala (convolución) y eco ping-pong.

export type PianoEvent = {
  midi: number;
  /** Inicio en pulsos desde el comienzo (0 = primer pulso). */
  start: number;
  /** Duración en pulsos. */
  dur: number;
  /** Velocidad 0..1. */
  vel?: number;
  /** Si es true, dispara onNote con el índice entre los eventos "focus". */
  focus?: boolean;
};

export type PianoCallbacks = {
  onNote?: (index: number) => void;
  onEnd?: () => void;
};

/** Pequeño margen antes del primer sonido; la UI lo usa para sincronizar. */
export const START_DELAY = 0.12;

type Engine = { ctx: AudioContext; input: GainNode; noise: AudioBuffer };
type Voice = { stop: (when: number) => void };

let engine: Engine | null = null;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const pre = Math.floor(rate * 0.018);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let low = 0;
    for (let i = pre; i < length; i++) {
      const t = (i - pre) / (length - pre);
      // Las frecuencias agudas se apagan antes que las graves, como en una sala real.
      const coef = 0.9 * (1 - t) + 0.1;
      low += (Math.random() * 2 - 1 - low) * coef;
      data[i] = low * Math.exp(-t * 6.2);
    }
  }
  return buffer;
}

function getEngine(): Engine {
  if (engine) return engine;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC({ latencyHint: "interactive" });

  const input = ctx.createGain();
  const mix = ctx.createGain();

  // Señal directa
  const dry = ctx.createGain();
  dry.gain.value = 0.85;
  input.connect(dry);
  dry.connect(mix);

  // Reverb de sala grande
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx, 3.6);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.38;
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 0.9;
  input.connect(reverbSend);
  reverbSend.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(mix);

  // Eco ping-pong suave y oscuro
  const echoSend = ctx.createGain();
  echoSend.gain.value = 0.01;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  const delayL = ctx.createDelay(1.5);
  const delayR = ctx.createDelay(1.5);
  delayL.delayTime.value = 0.32;
  delayR.delayTime.value = 0.42;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.18;
  const panL = ctx.createStereoPanner();
  const panR = ctx.createStereoPanner();
  panL.pan.value = -0.65;
  panR.pan.value = 0.65;
  input.connect(echoSend);
  echoSend.connect(tone);
  tone.connect(delayL);
  delayL.connect(delayR);
  delayR.connect(feedback);
  feedback.connect(delayL);
  delayL.connect(panL);
  delayR.connect(panR);
  panL.connect(mix);
  panR.connect(mix);

  // Compresor suave + volumen general
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 24;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;
  const master = ctx.createGain();
  master.gain.value = 0.9;
  mix.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);

  // Ruido para el golpe del martillo
  const noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.01), ctx.sampleRate);
  const noiseData = noise.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  engine = { ctx, input, noise };
  return engine;
}

const PARTIAL_AMPS = [1, 0.5, 0.3, 0.18, 0.1, 0.06];
const INHARMONICITY = 0.0004;

function startVoice(
  e: Engine,
  dest: AudioNode,
  midi: number,
  when: number,
  dur: number,
  vel: number,
): Voice {
  const { ctx } = e;
  const f0 = 440 * 2 ** ((midi - 69) / 12);
  const noteLen = Math.max(0.08, dur);
  // Con el pedal pisado, la nota se apaga lentamente al soltar la tecla.
  const releaseTau = midi < 60 ? 0.42 : 0.28;
  // Las notas graves resuenan mucho más tiempo que las agudas.
  const slowTau = clamp(3.4 * 2 ** (-(midi - 60) / 20), 0.9, 8);
  const stopAt = when + Math.min(noteLen + releaseTau * 8, 16);
  const level = vel * 0.13;

  const release = ctx.createGain();
  release.gain.setValueAtTime(1, when + noteLen);
  release.gain.setTargetAtTime(0, when + noteLen, releaseTau);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = Math.min(14000, 1800 + vel * 3500 + f0 * 3);
  lowpass.Q.value = 0.4;

  const pan = ctx.createStereoPanner();
  pan.pan.value = clamp((midi - 66) / 40, -0.7, 0.7);

  lowpass.connect(release);
  release.connect(pan);
  pan.connect(dest);

  const oscillators: AudioScheduledSourceNode[] = [];

  PARTIAL_AMPS.forEach((amp, index) => {
    const n = index + 1;
    const freq = f0 * n * Math.sqrt(1 + INHARMONICITY * n * n);
    if (freq > 9000) return;

    const gain = ctx.createGain();
    const peak = level * amp * (n === 1 ? 0.6 : 1);
    const fastTau = 0.18 / (1 + 0.5 * (n - 1));
    const tau = slowTau / (1 + 0.9 * (n - 1));
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.004);
    gain.gain.setTargetAtTime(peak * 0.4, when + 0.004, fastTau);
    gain.gain.setTargetAtTime(0, when + 0.7, tau);
    gain.connect(lowpass);

    const strings = n === 1 ? [0, 1.8] : [0]; // dos cuerdas ligeramente desafinadas
    for (const cents of strings) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(gain);
      osc.start(when);
      osc.stop(stopAt);
      oscillators.push(osc);
    }
  });

  // Golpe seco del martillo
  const hammer = ctx.createBufferSource();
  hammer.buffer = e.noise;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = Math.min(f0 * 4, 5000);
  band.Q.value = 0.8;
  const hammerGain = ctx.createGain();
  hammerGain.gain.setValueAtTime(level * 0.9, when);
  hammerGain.gain.setTargetAtTime(0, when, 0.012);
  hammer.connect(band);
  band.connect(hammerGain);
  hammerGain.connect(lowpass);
  hammer.start(when, Math.random() * 0.3);
  hammer.stop(when + 0.08);

  const first = oscillators[0];
  if (first) {
    first.onended = () => {
      release.disconnect();
      pan.disconnect();
    };
  }

  return {
    stop(time: number) {
      for (const osc of oscillators) {
        try {
          osc.stop(time);
        } catch {
          /* ya detenido */
        }
      }
    },
  };
}

/** Reproduce una secuencia de eventos con programación anticipada. Devuelve la función de cancelación. */
export function playPiano(
  events: PianoEvent[],
  bpm: number,
  callbacks: PianoCallbacks = {},
): () => void {
  const e = getEngine();
  const { ctx } = e;
  void ctx.resume();

  const secondsPerBeat = 60 / bpm;
  const t0 = ctx.currentTime + START_DELAY;

  let focusCounter = 0;
  const queue = events
    .map((event) => ({ event, focusIndex: event.focus ? focusCounter++ : -1 }))
    .sort((a, b) => a.event.start - b.event.start);

  const endBeat = events.reduce((max, ev) => Math.max(max, ev.start + ev.dur), 0);
  const endTime = t0 + endBeat * secondsPerBeat;

  const bus = ctx.createGain();
  bus.connect(e.input);

  const voices = new Set<Voice>();
  const timeouts = new Set<number>();
  let cursor = 0;
  let finished = false;
  let intervalId = 0;

  const LOOKAHEAD = 0.35;

  function finish(cancelled: boolean): void {
    if (finished) return;
    finished = true;
    window.clearInterval(intervalId);
    if (cancelled) {
      timeouts.forEach((id) => window.clearTimeout(id));
      timeouts.clear();
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0, now, 0.04);
      voices.forEach((voice) => voice.stop(now + 0.4));
      window.setTimeout(() => bus.disconnect(), 600);
    } else {
      // Dejamos que la cola de reverb y eco se apague sola.
      window.setTimeout(() => bus.disconnect(), 9000);
    }
    callbacks.onEnd?.();
  }

  function pump(): void {
    if (finished) return;
    const now = ctx.currentTime;
    while (cursor < queue.length) {
      const item = queue[cursor];
      const when = t0 + item.event.start * secondsPerBeat;
      if (when > now + LOOKAHEAD) break;
      const startAt = Math.max(when, now);
      const voice = startVoice(
        e,
        bus,
        item.event.midi,
        startAt,
        item.event.dur * secondsPerBeat,
        item.event.vel ?? 0.8,
      );
      voices.add(voice);
      if (item.focusIndex >= 0) {
        const index = item.focusIndex;
        const id = window.setTimeout(
          () => {
            timeouts.delete(id);
            if (!finished) callbacks.onNote?.(index);
          },
          Math.max(0, (when - now) * 1000),
        );
        timeouts.add(id);
      }
      cursor++;
    }
    if (cursor >= queue.length && now >= endTime) finish(false);
  }

  intervalId = window.setInterval(pump, 30);
  pump();

  return () => finish(true);
}

/** Toca una sola nota (para probar las teclas). */
export function playNote(midi: number, seconds = 1.1, vel = 0.8): void {
  const e = getEngine();
  void e.ctx.resume();
  startVoice(e, e.input, midi, e.ctx.currentTime + 0.005, seconds, vel);
}
