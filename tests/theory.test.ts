import { describe, it, expect } from 'vitest';
import { PROGRESSIONS } from '../src/data/progressions';
import { chordNotes, degreeToChord, displayName, guitarShape, noteNames, parseChord } from '../src/lib/theory';

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const ROMAN_INDEX: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

function degreeRoot(degree: string, tonic: number): number {
  const match = /^(♭|♯)?([ivIV]+)(.*)$/.exec(degree);
  if (!match) throw new Error(`Grado no reconocido: ${degree}`);
  const offset = MAJOR_SCALE[ROMAN_INDEX[match[2].toUpperCase()]];
  const accidental = match[1] === '♭' ? -1 : match[1] === '♯' ? 1 : 0;
  return (tonic + offset + accidental + 12) % 12;
}

function degreeTokens(degrees: string): string[] {
  return degrees.split(/\s*(?:–|→)\s*/).filter(Boolean);
}

function hasMinorQuality(quality: string): boolean {
  return quality === 'm' || quality === 'm7' || quality === 'm7b5';
}

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

  it('declared degrees match every catalog chord in C major or A minor', () => {
    for (const progression of PROGRESSIONS) {
      const degrees = degreeTokens(progression.degrees);
      expect(degrees, progression.title).toHaveLength(progression.chords.length);

      // Most catalog examples use C major; minor-key loops use A as the reference tonic.
      const first = parseChord(progression.chords[0]);
      const firstDegree = /^(?:♭|♯)?([ivIV]+)(.*)$/.exec(degrees[0]);
      if (!firstDegree) throw new Error(`Grado no reconocido en ${progression.title}`);
      const tonic = first.root === degreeRoot(degrees[0], 9) ? 9 : 0;

      progression.chords.forEach((chordName, index) => {
        const chord = parseChord(chordName);
        const degree = /^(?:♭|♯)?([ivIV]+)(.*)$/.exec(degrees[index]);
        expect(degree, `${progression.title}: ${degrees[index]}`).not.toBeNull();
        expect(chord.root, `${progression.title}: ${chordName} vs ${degrees[index]}`).toBe(
          degreeRoot(degrees[index], tonic),
        );

        const isLowercase = degree![1] === degree![1].toLowerCase();
        const isDiminished = degree![2].startsWith('°') || degree![2].startsWith('ø');
        if (isDiminished) {
          expect(['dim', 'dim7', 'm7b5']).toContain(chord.quality);
        } else if (degree![2].startsWith('sus')) {
          expect(chord.quality).toBe('sus4');
        } else {
          expect(hasMinorQuality(chord.quality), `${progression.title}: calidad ${chordName}`).toBe(isLowercase);
        }

        const figure = degree![2].match(/⁶⁴|⁶/)?.[0];
        if (figure) {
          expect(chord.bass, `${progression.title}: bajo de ${chordName}`).not.toBeNull();
          const inversion = figure === '⁶⁴' ? 2 : 1;
          const intervals = chord.quality === 'm' || chord.quality === 'm7' ? [0, 3, 7] : [0, 4, 7];
          expect((chord.bass! - chord.root + 12) % 12).toBe(intervals[inversion]);
        }
      });
    }
  });
});
