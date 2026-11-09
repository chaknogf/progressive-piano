// Utilidades puras del afinador: nombres de nota, conversión de alturas,
// detección de tono (YIN) y emparejamiento con cuerdas. Sin APIs del navegador,
// para poder probarlas con Vitest.

export const NOTE_NAMES = [
  'Do',
  'Do♯',
  'Re',
  'Re♯',
  'Mi',
  'Fa',
  'Fa♯',
  'Sol',
  'Sol♯',
  'La',
  'La♯',
  'Si',
] as const;

export const A4_HZ = 440;

/** Frecuencia de una nota MIDI (La4 = 69 = 440 Hz). */
export function hz(midi: number, a4 = A4_HZ): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

/** Nota MIDI (con decimales) de una frecuencia. */
export function freqToMidi(freq: number, a4 = A4_HZ): number {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Clase de altura 0–11 de una nota MIDI. */
export function pitchClassOf(midi: number): number {
  return ((Math.round(midi) % 12) + 12) % 12;
}

/** Nombre en español con octava, por ejemplo 40 → "Mi2". */
export function noteName(midi: number): string {
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[pitchClassOf(rounded)]}${Math.floor(rounded / 12) - 1}`;
}

/** Diferencia en cents entre una frecuencia y su objetivo. */
export function centsBetween(freq: number, target: number): number {
  return 1200 * Math.log2(freq / target);
}

/**
 * Lleva `freq` a la octava más cercana a `reference` y devuelve también el
 * desplazamiento aplicado. Sirve para corregir errores de octava (un micrófono
 * que capta sobre todo el segundo armónico) sin cambiar la nota detectada.
 */
export function foldToReference(
  freq: number,
  reference: number,
): { freq: number; octave: number; cents: number } {
  const octave = Math.round(Math.log2(freq / reference));
  const folded = freq / 2 ** octave;
  return { freq: folded, octave, cents: centsBetween(folded, reference) };
}

/** Nota MIDI de la clase `pitchClass` más cercana a `nearMidi`. */
export function nearestMidiForPitchClass(
  pitchClass: number,
  nearMidi: number,
): number {
  return Math.round((nearMidi - pitchClass) / 12) * 12 + pitchClass;
}

export interface StringMatch {
  /** Índice dentro de la lista de objetivos. */
  index: number;
  /** Desviación en cents, ya corregida de octava. */
  cents: number;
  /** Octavas que hubo que desplazar la frecuencia detectada. */
  octave: number;
  /** Frecuencia detectada llevada a la octava del objetivo. */
  foldedFreq: number;
}

// Preferimos suponer que el micrófono captó un armónico por encima del
// fundamental (octave > 0) antes que un subarmónico por debajo (octave < 0).
const OCTAVE_ABOVE_PENALTY = 18;
const OCTAVE_BELOW_PENALTY = 45;
const KEEP_PREVIOUS_CENTS = 60;

/**
 * Elige la cuerda/objetivo más probable para una frecuencia detectada,
 * comparando también sus octavas. Con `previousIndex` mantiene la cuerda
 * anterior mientras la lectura siga razonablemente cerca (histéresis).
 */
export function matchString(
  freq: number,
  targets: readonly number[],
  previousIndex: number | null = null,
): StringMatch | null {
  if (!targets.length || !Number.isFinite(freq) || freq <= 0) return null;

  let best: StringMatch | null = null;
  let bestScore = Infinity;
  targets.forEach((target, index) => {
    const folded = foldToReference(freq, target);
    const penalty =
      folded.octave > 0
        ? folded.octave * OCTAVE_ABOVE_PENALTY
        : folded.octave < 0
          ? -folded.octave * OCTAVE_BELOW_PENALTY
          : 0;
    const score = Math.abs(folded.cents) + penalty;
    if (score < bestScore) {
      bestScore = score;
      best = {
        index,
        cents: folded.cents,
        octave: folded.octave,
        foldedFreq: folded.freq,
      };
    }
  });

  if (
    best &&
    previousIndex !== null &&
    previousIndex >= 0 &&
    previousIndex < targets.length &&
    best.index !== previousIndex
  ) {
    const previous = foldToReference(freq, targets[previousIndex]);
    if (Math.abs(previous.cents) < KEEP_PREVIOUS_CENTS) {
      return {
        index: previousIndex,
        cents: previous.cents,
        octave: previous.octave,
        foldedFreq: previous.freq,
      };
    }
  }

  return best;
}

export interface PitchReading {
  freq: number;
  /** 0–1; cuanto más alto, más periódica (y fiable) es la señal. */
  clarity: number;
}

export interface PitchDetectorOptions {
  minHz?: number;
  maxHz?: number;
  /** Umbral del mínimo de la función de diferencia acumulada (YIN). */
  threshold?: number;
}

/**
 * Crea un detector YIN reutilizable. Mantiene el buffer de trabajo entre
 * llamadas para no reservar memoria en cada frame de audio.
 */
export function createPitchDetector(options: PitchDetectorOptions = {}) {
  const minHz = options.minHz ?? 55;
  const maxHz = options.maxHz ?? 1200;
  const threshold = options.threshold ?? 0.15;
  let cmnd = new Float32Array(1024);

  return function detect(
    buf: Float32Array,
    sampleRate: number,
  ): PitchReading | null {
    const half = buf.length >> 1;
    if (!half || !sampleRate) return null;

    const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
    const maxTau = Math.min(half - 2, Math.floor(sampleRate / minHz));
    if (maxTau <= minTau) return null;
    if (cmnd.length < maxTau + 2) cmnd = new Float32Array(maxTau + 2);

    // Diferencia cuadrática media normalizada acumulada (CMNDF de YIN).
    let running = 0;
    cmnd[0] = 1;
    for (let tau = 1; tau <= maxTau + 1; tau += 1) {
      let sum = 0;
      for (let i = 0; i < half; i += 1) {
        const d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      running += sum;
      cmnd[tau] = running === 0 ? 1 : (sum * tau) / running;
    }

    // Primer mínimo local por debajo del umbral: el período fundamental.
    let tau = -1;
    for (let t = minTau; t <= maxTau; t += 1) {
      if (
        cmnd[t] < threshold &&
        cmnd[t] <= cmnd[t - 1] &&
        cmnd[t] <= cmnd[t + 1]
      ) {
        tau = t;
        break;
      }
    }

    // Sin mínimo claro: usar el mejor candidato si la señal aún es periódica.
    if (tau === -1) {
      let best = minTau;
      for (let t = minTau + 1; t <= maxTau; t += 1) {
        if (cmnd[t] < cmnd[best]) best = t;
      }
      if (cmnd[best] > 0.4) return null;
      tau = best;
    }

    // Si la mitad o un tercio del período también son mínimos válidos, el
    // candidato era un múltiplo (error de octava hacia abajo): quedarse con el
    // período más corto.
    for (const divisor of [2, 3]) {
      const sub = Math.round(tau / divisor);
      if (sub < minTau || sub > maxTau) continue;
      if (
        cmnd[sub] < threshold &&
        cmnd[sub] <= cmnd[sub - 1] &&
        cmnd[sub] <= cmnd[sub + 1]
      ) {
        tau = sub;
        break;
      }
    }

    const s0 = cmnd[tau - 1];
    const s1 = cmnd[tau];
    const s2 = cmnd[tau + 1];
    const denom = s0 - 2 * s1 + s2;
    const shift = denom !== 0 ? (s0 - s2) / (2 * denom) : 0;
    const better = tau + Math.max(-0.5, Math.min(0.5, shift));
    const freq = sampleRate / better;
    if (!Number.isFinite(freq) || freq < minHz || freq > maxHz) return null;

    return { freq, clarity: 1 - s1 };
  };
}
