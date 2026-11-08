export const NOTE_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
export const NOTE_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SCALE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export type Quality = '' | 'm' | '7' | 'm7' | 'maj7' | 'dim7' | 'm7b5' | 'sus4' | 'dim';

export const INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
};

export interface ParsedChord {
  root: number;
  quality: string;
  bass: number | null;
}

export type ScaleMode = 'major' | 'minor';
export type TriadQuality = 'major' | 'minor' | 'diminished';

export const DIATONIC_KEY_PAIRS = [
  { major: 'C', minor: 'A' },
  { major: 'G', minor: 'E' },
  { major: 'D', minor: 'B' },
  { major: 'A', minor: 'F#' },
  { major: 'E', minor: 'C#' },
  { major: 'B', minor: 'G#' },
  { major: 'F#', minor: 'D#' },
  { major: 'Db', minor: 'Bb' },
  { major: 'Ab', minor: 'F' },
  { major: 'Eb', minor: 'C' },
  { major: 'Bb', minor: 'G' },
  { major: 'F', minor: 'D' },
] as const;

export const DIATONIC_KEYS: Record<ScaleMode, readonly string[]> = {
  major: DIATONIC_KEY_PAIRS.map((pair) => pair.major),
  minor: DIATONIC_KEY_PAIRS.map((pair) => pair.minor),
};

export interface DiatonicChord {
  degree: string;
  quality: TriadQuality;
  /** ASCII chord symbol for parsing, note generation, guitar shapes, and audio. */
  id: string;
  /** Typographic chord symbol for the interface. */
  name: string;
  rootId: string;
  root: string;
}

const DIATONIC_SCALES: Record<ScaleMode, { intervals: number[]; qualities: TriadQuality[]; degrees: string[] }> = {
  major: {
    intervals: [0, 2, 4, 5, 7, 9, 11],
    qualities: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
    degrees: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  },
  minor: {
    intervals: [0, 2, 3, 5, 7, 8, 10],
    qualities: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
    degrees: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
  },
};

/** Build the seven diatonic triads with letter spelling derived from the scale. */
export function diatonicChords(tonic: string, mode: ScaleMode): DiatonicChord[] {
  const normalizedTonic = tonic.replaceAll('♯', '#').replaceAll('♭', 'b');
  const tonicMatch = /^([A-G])([#b]?)$/.exec(normalizedTonic);
  if (!tonicMatch) throw new Error(`Tonalidad no válida: ${tonic}`);

  const tonicLetter = tonicMatch[1];
  const tonicLetterIndex = SCALE_LETTERS.indexOf(tonicLetter);
  const tonicPitch = pitchClass(normalizedTonic);
  const scale = DIATONIC_SCALES[mode];

  return scale.intervals.map((interval, index) => {
    const letter = SCALE_LETTERS[(tonicLetterIndex + index) % SCALE_LETTERS.length];
    const expectedPitch = (tonicPitch + interval) % 12;
    const naturalPitch = PITCH_CLASS[letter];
    let alteration = (expectedPitch - naturalPitch + 12) % 12;
    if (alteration > 6) alteration -= 12;
    const accidental = alteration > 0 ? '♯'.repeat(alteration) : '♭'.repeat(-alteration);
    const root = `${letter}${accidental}`;
    const quality = scale.qualities[index];
    const suffix = quality === 'minor' ? 'm' : quality === 'diminished' ? 'dim' : '';
    const rootId = root.replaceAll('♯', '#').replaceAll('♭', 'b');

    return { degree: scale.degrees[index], quality, id: `${rootId}${suffix}`, name: `${root}${suffix}`, rootId, root };
  });
}

export function relativeTonic(tonic: string, mode: ScaleMode): { tonic: string; mode: ScaleMode } {
  const pair = DIATONIC_KEY_PAIRS.find((candidate) => candidate[mode] === tonic);
  if (!pair) throw new Error(`Tonalidad sin pareja relativa: ${tonic} ${mode}`);
  return mode === 'major'
    ? { tonic: pair.minor, mode: 'minor' }
    : { tonic: pair.major, mode: 'major' };
}

export function pitchClass(token: string): number {
  const base = PITCH_CLASS[token[0]];
  if (base === undefined) return 0;
  const accidental = token[1] === '#' || token[1] === '♯' ? 1 : token[1] === 'b' || token[1] === '♭' ? -1 : 0;
  return (((base + accidental) % 12) + 12) % 12;
}

export function parseChord(name: string): ParsedChord {
  const normalized = name
    .replaceAll('♯', '#')
    .replaceAll('♭', 'b')
    .replace(/[º°]$/, 'dim');
  const match = /^([A-G][b#]?)([^/]*)(?:\/([A-G][b#]?))?$/.exec(normalized);
  if (!match) return { root: 0, quality: '', bass: null };
  return {
    root: pitchClass(match[1]),
    quality: match[2],
    bass: match[3] ? pitchClass(match[3]) : null,
  };
}

export const displayName = (name: string): string =>
  name
    .replace(/^([A-G])b/, '$1♭')
    .replace(/\/([A-G])b/, '/$1♭')
    .replace(/#/g, '♯')
    .replace('b5', '♭5');

export function chordNotes(name: string, inversion = 0): number[] {
  const chord = parseChord(name);
  const intervals = INTERVALS[chord.quality] ?? INTERVALS[''];
  const notes = intervals.map((i) => chord.root + i);
  for (let i = 0; i < inversion; i++) notes[i] += 12;
  notes.sort((a, b) => a - b);
  if (chord.bass != null) {
    let bass = chord.bass;
    while (bass >= notes[0]) bass -= 12;
    notes.unshift(bass);
  }
  return notes;
}

export function noteNames(notes: number[]): string[] {
  return notes.map((n) => NOTE_LETTERS[((n % 12) + 12) % 12]);
}

export function keyboardSvg(notes: number[], lo?: number, hi?: number): string {
  const low = lo ?? Math.floor(Math.min(...notes) / 12) * 12;
  const high = hi ?? Math.ceil((Math.max(...notes) + 1) / 12) * 12;
  const WHITE = 22;
  const pressed = new Set(notes);
  const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
  let whites = '';
  let blacks = '';
  let i = 0;
  for (let semitone = low; semitone < high; semitone++) {
    const pc = ((semitone % 12) + 12) % 12;
    const on = pressed.has(semitone);
    if (whiteKeys.includes(pc)) {
      whites += `<rect x="${i * WHITE}" y="0" width="${WHITE}" height="84" class="wk${on ? ' on' : ''}" role="img" aria-label="${NOTE_NAMES[pc]}"/>`;
      if (on) whites += `<text x="${i * WHITE + WHITE / 2}" y="76" class="t">${NOTE_NAMES[pc]}</text>`;
      i++;
    } else {
      blacks += `<rect x="${i * WHITE - 7}" y="0" width="14" height="50" class="bk${on ? ' on' : ''}" role="img" aria-label="${NOTE_NAMES[pc]}"/>`;
    }
  }
  return `<svg viewBox="0 0 ${i * WHITE} 86" class="kb" aria-label="Teclado de piano">${whites}${blacks}</svg>`;
}

export const OPEN_SHAPES: Record<string, number[]> = {
  Bdim: [-1, 2, 3, 4, 3, -1],
  C: [-1, 3, 2, 0, 1, 0],
  Am: [-1, 0, 2, 2, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  F: [1, 3, 3, 2, 1, 1],
  Dm: [-1, -1, 0, 2, 3, 1],
  Em: [0, 2, 2, 0, 0, 0],
  E: [0, 2, 2, 1, 0, 0],
  D: [-1, -1, 0, 2, 3, 2],
  A: [-1, 0, 2, 2, 2, 0],
  G7: [3, 2, 0, 0, 0, 1],
  E7: [0, 2, 0, 1, 0, 0],
  D7: [-1, -1, 0, 2, 1, 2],
  Cmaj7: [-1, 3, 2, 0, 0, 0],
  Fmaj7: [-1, -1, 3, 2, 1, 0],
  Am7: [-1, 0, 2, 0, 1, 0],
  Dm7: [-1, -1, 0, 2, 1, 1],
  Em7: [0, 2, 0, 0, 0, 0],
};

export const E_SHAPES: Record<string, number[]> = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
};

export const A_SHAPES: Record<string, number[]> = {
  '': [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
};

export function guitarShape(name: string): number[] | null {
  const base = name.split('/')[0];
  if (OPEN_SHAPES[base]) return OPEN_SHAPES[base];
  const chord = parseChord(name);
  if (chord.quality === 'dim') {
    const offset = (chord.root - pitchClass('B') + 12) % 12;
    return OPEN_SHAPES.Bdim.map((fret) => (fret < 0 ? fret : fret + offset));
  }
  const eShape = E_SHAPES[chord.quality];
  const aShape = A_SHAPES[chord.quality];
  if (!eShape && !aShape) return null;
  const ePos = (chord.root + 8) % 12;
  const aPos = (chord.root + 3) % 12;
  let chosen: { shape: number[]; fret: number } | null = null;
  if (aShape && (aPos < ePos || !eShape)) chosen = { shape: aShape, fret: aPos };
  else if (eShape) chosen = { shape: eShape, fret: ePos };
  if (!chosen) return null;
  return chosen.shape.map((f) => (f < 0 ? f : f + chosen.fret));
}

export function guitarSvg(frets: number[] | null): string {
  if (!frets) {
    return '<p class="mut">Sin diagrama de guitarra (forma poco común).</p>';
  }
  const played = frets.filter((x) => x > 0);
  const min = played.length ? Math.min(...played) : 1;
  const max = played.length ? Math.max(...played) : 1;
  const base = max <= 4 ? 1 : min;
  let strings = '';
  for (let i = 0; i < 6; i++) {
    strings += `<line x1="${22 + i * 18}" y1="30" x2="${22 + i * 18}" y2="140" class="ln"/>`;
    strings += `<text x="${22 + i * 18}" y="154" class="sn">${'EADGBe'[i]}</text>`;
  }
  let fretLines = '';
  for (let j = 0; j <= 5; j++) {
    fretLines += `<line x1="22" y1="${30 + j * 22}" x2="112" y2="${30 + j * 22}" class="${j === 0 && base === 1 ? 'nut' : 'ln'}"/>`;
  }
  frets.forEach((x, i) => {
    const cx = 22 + i * 18;
    if (x < 0) strings += `<text x="${cx}" y="22" class="g">✕</text>`;
    else if (x === 0) strings += `<circle cx="${cx}" cy="18" r="4.5" class="o"/>`;
    else strings += `<circle cx="${cx}" cy="${30 + (x - base) * 22 + 11}" r="7.5" class="d"/>`;
  });
  if (base > 1) strings += `<text x="116" y="45" class="fn">${base}</text>`;
  return `<svg viewBox="0 0 140 160" class="gt" aria-label="Diagrama de guitarra">${strings}${fretLines}</svg>`;
}

const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_INDEX: Record<string, number> = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };

export function degreeToChord(degree: string, keyIndex: number): string {
  const match = /^(♭?)([ivIV]+)$/.exec(degree.trim());
  if (!match) return 'C';
  const step = SCALE_STEPS[DEGREE_INDEX[match[2].toUpperCase()] ?? 0];
  const offset = step - (match[1] ? 1 : 0);
  const root = FLAT_NAMES[((keyIndex + offset) % 12 + 12) % 12];
  return root + (match[2] === match[2].toLowerCase() ? 'm' : '');
}

// Alias for components that expect the original name.
export const displayNote = displayName;
