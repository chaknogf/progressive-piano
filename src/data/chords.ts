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
