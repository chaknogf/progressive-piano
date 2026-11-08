import type { FingerPracticeChord } from '../data/chords';

export interface FingerPlacement {
  fret: number;
  finger: number;
}

export interface FingerPracticeResult {
  incorrectStrings: number[];
  suggestions: string[];
}

/** Checks the fret/open/muted positions and returns ergonomic fingering suggestions. */
export function validateFingerPractice(
  chord: FingerPracticeChord,
  placements: readonly (FingerPlacement | null)[],
  muted: readonly boolean[],
): FingerPracticeResult {
  const incorrectStrings: number[] = [];
  const suggestions: string[] = [];

  for (let stringIndex = 0; stringIndex < chord.frets.length; stringIndex++) {
    const expectedFret = chord.frets[stringIndex];
    const placement = placements[stringIndex] ?? null;
    const isMuted = muted[stringIndex] ?? false;
    const correctPosition = expectedFret < 0
      ? placement === null && isMuted
      : expectedFret === 0
        ? placement === null && !isMuted
        : placement?.fret === expectedFret;

    if (!correctPosition) {
      incorrectStrings.push(stringIndex);
      continue;
    }

    const expectedFinger = chord.fingers[stringIndex];
    if (expectedFret > 0 && placement && placement.finger !== expectedFinger) {
      suggestions.push(`cuerda ${6 - stringIndex}: dedo ${expectedFinger}`);
    }
  }

  return { incorrectStrings, suggestions };
}
