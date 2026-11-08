export interface BaseChord {
  chord: string;
  degree: string;
  name: string;
}

export const BASE_CHORDS: BaseChord[] = [
  { chord: 'C', degree: 'I', name: 'Tónica' },
  { chord: 'Dm', degree: 'ii', name: 'Supertónica' },
  { chord: 'Em', degree: 'iii', name: 'Mediante' },
  { chord: 'F', degree: 'IV', name: 'Subdominante' },
  { chord: 'G', degree: 'V', name: 'Dominante' },
  { chord: 'Am', degree: 'vi', name: 'Superdominante (relativo menor)' },
  { chord: 'Bdim', degree: 'vii°', name: 'Sensible' },
];

export interface FingerPracticeChord {
  name: string;
  label: string;
  /** Frets from low E to high e; -1 means muted and 0 means open. */
  frets: readonly number[];
  /** Suggested finger for each string, from low E to high e. */
  fingers: readonly number[];
}

export const FINGER_PRACTICE_CHORDS: readonly FingerPracticeChord[] = [
  { name: 'Em', label: 'Mi menor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  { name: 'Am', label: 'La menor', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  { name: 'E', label: 'Mi mayor', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  { name: 'A', label: 'La mayor', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  { name: 'D', label: 'Re mayor', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  { name: 'C', label: 'Do mayor', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  { name: 'G', label: 'Sol mayor', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  { name: 'Dm', label: 'Re menor', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  { name: 'G7', label: 'Sol séptima', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  { name: 'F', label: 'Fa mayor (con cejilla)', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1] },
];
