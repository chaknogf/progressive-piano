import { describe, it, expect } from 'vitest';
import { chordNotes, degreeToChord, displayName, guitarShape, noteNames, parseChord } from '../src/lib/theory';

describe('theory', () => {
  it('parseChord', () => {
    expect(parseChord('Cmaj7')).toEqual({ root: 0, quality: 'maj7', bass: null });
    expect(parseChord('G/B')).toEqual({ root: 7, quality: '', bass: 11 });
  });

  it('chordNotes Am inversion 1', () => {
    expect(chordNotes('Am', 1)).toEqual([12, 16, 21]);
    expect(noteNames(chordNotes('Am', 1))).toEqual(['C', 'E', 'A']);
  });

  it('degreeToChord', () => {
    expect(degreeToChord('vi', 7)).toBe('Em');
    expect(degreeToChord('I', 0)).toBe('C');
    expect(degreeToChord('♭VII', 0)).toBe('Bb');
  });

  it('guitarShape Bb', () => {
    expect(guitarShape('Bb')).toEqual([-1, 1, 3, 3, 3, 1]);
  });

  it('displayName', () => {
    expect(displayName('Bb')).toBe('B♭');
    expect(displayName('C#')).toBe('C♯');
  });
});