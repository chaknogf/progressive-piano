// Etapa 3B · Biblioteca de Melodías y Práctica MIDI.
// Lógica pura: tipos del catálogo, validación de altura (octava exacta en
// melodía, clases de nota en acordes), puntuación rítmica y XP.

export interface MelodyNote {
  beat: number;
  midi: number;
  duration: number;
  label: string;
}

export interface ChordEvent {
  beat: number;
  duration: number;
  symbol: string;
  midi: number[];
}

export type Difficulty = "Principiante" | "Intermedio";
export type PracticeMode = "melody" | "chords";

export interface Melody {
  id: string;
  title: string;
  difficulty: Difficulty;
  bpm: number;
  meter: number;
  key: string;
  melodyTrack: MelodyNote[];
  chordTrack: ChordEvent[];
}

/** Evento de audio para escuchar una pieza completa (melodía + acompañamiento). */
export interface AuditionEvent {
  midi: number;
  start: number;
  dur: number;
  vel: number;
  /** true en las notas de la melodía: la UI las usa para seguir el resaltado. */
  focus: boolean;
}

/**
 * Convierte una pieza en eventos reproducibles: la melodía al frente y los
 * acordes una octava más abajo y más suaves, como colchón armónico.
 */
export function auditionEvents(melody: Melody): AuditionEvent[] {
  const lead = melody.melodyTrack.map((note) => ({
    midi: note.midi,
    start: note.beat,
    dur: note.duration,
    vel: 0.85,
    focus: true,
  }));
  const pad = melody.chordTrack.flatMap((chord) =>
    chord.midi.map((midi) => ({
      midi: Math.max(36, midi - 12),
      start: chord.beat,
      dur: chord.duration,
      vel: 0.4,
      focus: false,
    })),
  );
  return [...lead, ...pad];
}

export interface PracticeHit {
  expected: number[];
  played: number[];
  expectedBeat: number;
  playedBeat: number;
  correct: boolean;
}

export interface PracticeResult {
  total: number;
  correct: number;
  melodicAccuracy: number;
  rhythmicAccuracy: number;
  accuracy: number;
  xp: number;
  stars: 1 | 2 | 3;
}

export const NOTE_NAMES = [
  "Do", "Do♯", "Re", "Re♯", "Mi", "Fa",
  "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si",
] as const;

/** Nombre completo con octava, p. ej. 60 → «Do4». */
export function noteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octave}`;
}

/** Duración total de una pista en pulsos. */
export function trackLength(events: { beat: number; duration: number }[]): number {
  return events.reduce((max, event) => Math.max(max, event.beat + event.duration), 0);
}

/** Evento cuya ventana temporal contiene el pulso indicado. */
export function eventAtBeat<T extends { beat: number; duration: number }>(
  events: T[],
  beat: number,
): T | undefined {
  return events.find((event) => beat >= event.beat && beat < event.beat + event.duration);
}

/** En melodía la octava importa: MIDI 60 (Do4) no equivale a 72 (Do5). */
export function matchesNote(midi: number, expectedMidi: number): boolean {
  return midi === expectedMidi;
}

/**
 * En acordes se comparan clases de nota, no octavas: C4–E4–G4 y C5–E5–G5
 * son el mismo acorde. `played` debe contener al menos las notas esperadas.
 */
export function matchesChord(played: number[], expected: number[]): boolean {
  if (!expected.length || played.length < expected.length) return false;
  const expectedPcs = new Set(expected.map((midi) => ((midi % 12) + 12) % 12));
  const playedPcs = new Set(played.map((midi) => ((midi % 12) + 12) % 12));
  return [...expectedPcs].every((pc) => playedPcs.has(pc));
}

/** Precisión rítmica 0–1; dos pulsos de desvío o más puntúan cero. */
export function rhythmAccuracy(expectedBeat: number, playedBeat: number): number {
  const error = Math.abs(playedBeat - expectedBeat);
  return Math.max(0, Math.min(1, 1 - error / 2));
}

/**
 * Nota final: 70 % melodía + 30 % ritmo. El XP escala con la dificultad y
 * da un bonus por pieza perfecta.
 */
export function evaluatePerformance(
  hits: PracticeHit[],
  difficulty: Difficulty,
): PracticeResult {
  const total = hits.length;
  if (!total) {
    return {
      total: 0,
      correct: 0,
      melodicAccuracy: 0,
      rhythmicAccuracy: 0,
      accuracy: 0,
      xp: 0,
      stars: 1,
    };
  }
  const correct = hits.filter((hit) => hit.correct).length;
  const melodicAccuracy = correct / total;
  const rhythmicAccuracy =
    hits.reduce((sum, hit) => sum + rhythmAccuracy(hit.expectedBeat, hit.playedBeat), 0) / total;
  const accuracy = Math.round((0.7 * melodicAccuracy + 0.3 * rhythmicAccuracy) * 100);
  const base = difficulty === "Intermedio" ? 40 : 25;
  const xp = Math.round((accuracy / 100) * base) + (accuracy === 100 ? 10 : 0);
  const stars: 1 | 2 | 3 = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
  return { total, correct, melodicAccuracy, rhythmicAccuracy, accuracy, xp, stars };
}

/** Id estable para no otorgar dos veces el XP de la misma pieza/modo. */
export function practiceRewardId(melodyId: string, mode: PracticeMode): string {
  return `melody:${melodyId}:${mode}`;
}
