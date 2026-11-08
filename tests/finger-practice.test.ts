import { describe, expect, it } from 'vitest';
import { FINGER_PRACTICE_CHORDS } from '../src/data/chords';
import { validateFingerPractice } from '../src/lib/finger-practice';

describe('finger practice validation', () => {
  it('accepts the fret, open-string, and muted-string layout for each of the ten chords', () => {
    for (const chord of FINGER_PRACTICE_CHORDS) {
      const placements = chord.frets.map((fret, index) =>
        fret > 0 ? { fret, finger: chord.fingers[index] } : null,
      );
      const muted = chord.frets.map((fret) => fret < 0);
      expect(validateFingerPractice(chord, placements, muted).incorrectStrings).toEqual([]);
    }
  });

  it('marks only incorrect strings and suggests the reference fingering', () => {
    const chord = FINGER_PRACTICE_CHORDS.find(({ name }) => name === 'Am')!;
    const placements = chord.frets.map((fret, index) =>
      fret > 0 ? { fret: fret + (index === 2 ? 1 : 0), finger: 4 } : null,
    );
    const result = validateFingerPractice(chord, placements, chord.frets.map((fret) => fret < 0));

    expect(result.incorrectStrings).toEqual([2]);
    expect(result.suggestions).toEqual(['cuerda 3: dedo 3', 'cuerda 2: dedo 1']);
  });
});
