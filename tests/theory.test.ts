import { describe, it, expect } from 'vitest';
import { PROGRESSIONS } from '../src/data/progressions';
import { chordNotes, degreeToChord, diatonicChords, DIATONIC_KEY_PAIRS, DIATONIC_KEYS, displayName, guitarShape, noteNames, parseChord, relativeTonic } from '../src/lib/theory';

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
    expect(parseChord('E♭m')).toEqual({ root: 3, quality: 'm', bass: null });
    expect(parseChord('F♯')).toEqual({ root: 6, quality: '', bass: null });
    expect(parseChord('E♯dim')).toEqual({ root: 5, quality: 'dim', bass: null });
    expect(parseChord('E#dim')).toEqual({ root: 5, quality: 'dim', bass: null });
    expect(parseChord('B♯')).toEqual({ root: 0, quality: '', bass: null });
    expect(parseChord('B#')).toEqual({ root: 0, quality: '', bass: null });
    expect(parseChord('C♭')).toEqual({ root: 11, quality: '', bass: null });
    expect(parseChord('Cb')).toEqual({ root: 11, quality: '', bass: null });
    expect(parseChord('Fb')).toEqual({ root: 4, quality: '', bass: null });
    expect(parseChord('Fº')).toEqual({ root: 5, quality: 'dim', bass: null });
    expect(parseChord('F°')).toEqual({ root: 5, quality: 'dim', bass: null });
    expect(parseChord('Bm7b5')).toEqual({ root: 11, quality: 'm7b5', bass: null });
    expect(parseChord('Bm7♭5')).toEqual({ root: 11, quality: 'm7b5', bass: null });
    expect(chordNotes('Fº')).toEqual([5, 8, 11]);
    expect(chordNotes('Bm7♭5')).toEqual([11, 14, 17, 21]);
    expect(chordNotes('Csus2')).toEqual([0, 2, 7]);
    expect(chordNotes('Gsus4')).toEqual([7, 12, 14]);
  });

  it('spells diatonic triads with the correct scale letters and qualities', () => {
    const cases = [
      ['F#', 'major', ['F♯', 'G♯m', 'A♯m', 'B', 'C♯', 'D♯m', 'E♯dim']],
      ['Db', 'major', ['D♭', 'E♭m', 'Fm', 'G♭', 'A♭', 'B♭m', 'Cdim']],
      ['C', 'major', ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']],
      ['A', 'minor', ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']],
      ['Eb', 'minor', ['E♭m', 'Fdim', 'G♭', 'A♭m', 'B♭m', 'C♭', 'D♭']],
      ['F#', 'minor', ['F♯m', 'G♯dim', 'A', 'Bm', 'C♯m', 'D', 'E']],
    ] as const;

    for (const [tonic, mode, expected] of cases) {
      expect(diatonicChords(tonic, mode).map((chord) => chord.name)).toEqual(expected);
    }

    expect(diatonicChords('C', 'major').map(({ degree, quality }) => [degree, quality])).toEqual([
      ['I', 'major'], ['ii', 'minor'], ['iii', 'minor'], ['IV', 'major'], ['V', 'major'], ['vi', 'minor'], ['vii°', 'diminished'],
    ]);
    expect(diatonicChords('A', 'minor').map(({ degree, quality }) => [degree, quality])).toEqual([
      ['i', 'minor'], ['ii°', 'diminished'], ['III', 'major'], ['iv', 'minor'], ['v', 'minor'], ['VI', 'major'], ['VII', 'major'],
    ]);
  });

  it('offers the specified twelve major and minor keys', () => {
    expect(DIATONIC_KEYS.major).toEqual(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F']);
    expect(DIATONIC_KEYS.minor).toEqual(['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'Bb', 'F', 'C', 'G', 'D']);
    for (const mode of ['major', 'minor'] as const) {
      for (const tonic of DIATONIC_KEYS[mode]) {
        const chords = diatonicChords(tonic, mode);
        expect(chords, `${tonic} ${mode}`).toHaveLength(7);
        for (const chord of chords) {
          const parsed = parseChord(chord.id);
          const intervals = chord.quality === 'major' ? [0, 4, 7] : chord.quality === 'minor' ? [0, 3, 7] : [0, 3, 6];
          const actualPitches = chordNotes(chord.id).map((note) => note % 12).sort((a, b) => a - b);
          const expectedPitches = intervals.map((interval) => (parsed.root + interval) % 12).sort((a, b) => a - b);
          expect(actualPitches, `${tonic} ${mode} ${chord.id}`).toEqual(expectedPitches);
          expect(chord.id).not.toMatch(/[♯♭]/);
        }
      }
    }
  });

  it('returns the paired relative key in both directions', () => {
    for (const pair of DIATONIC_KEY_PAIRS) {
      expect(relativeTonic(pair.major, 'major')).toEqual({ tonic: pair.minor, mode: 'minor' });
      expect(relativeTonic(pair.minor, 'minor')).toEqual({ tonic: pair.major, mode: 'major' });
    }
    expect(diatonicChords('D#', 'minor').map((chord) => chord.name)).toEqual([
      'D♯m', 'E♯dim', 'F♯', 'G♯m', 'A♯m', 'B', 'C♯',
    ]);
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

  it('guitarShape transposes diminished triads', () => {
    expect(guitarShape('C#dim')).toEqual([-1, 4, 5, 6, 5, -1]);
    expect(guitarShape('E♯dim')).toEqual([-1, 8, 9, 10, 9, -1]);
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
