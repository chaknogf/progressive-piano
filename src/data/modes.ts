export interface SuggestedListening {
  title: string;
  artist: string;
  note: string;
  source: string;
  sourceLabel: string;
  status: 'verificado' | 'orientativo';
}

export type ModeMelodyNote = readonly [semitones: number, beats: number];

export interface Mode {
  id: string;
  name: string;
  scale: number[];
  emotion: string;
  description: string;
  degrees: string;
  formula: string;
  /** Zero-based index in `scale` for the degree that most clearly colors the mode. */
  characteristic: number;
  progression: Array<[number, string]>;
  melody: readonly ModeMelodyNote[];
  listen: SuggestedListening[];
}

export const MODES: Mode[] = [
  {
    id: 'lidio', name: 'Lidio', scale: [0, 2, 4, 6, 7, 9, 11],
    emotion: 'Asombro, sueño, magia',
    description: 'Como el mayor pero con la 4.ª aumentada (♯4): flota y suena fantástico, sin pesadez.',
    degrees: 'I – II – I – II', formula: '1 – 2 – 3 – ♯4 – 5 – 6 – 7', characteristic: 3,
    progression: [[0, 'maj7'], [2, ''], [0, 'maj7'], [2, '']],
    melody: [[0, .5], [4, .5], [7, .5], [11, .5], [14, .5], [18, .5], [16, .5], [12, 1.5]],
    listen: [{ title: 'Dreams', artist: 'Fleetwood Mac', note: 'Orientativo: se suele escuchar el vaivén de acordes como color lidio; la lectura modal depende de dónde se perciba el centro tonal.', source: 'https://wp.nyu.edu/musedlab/2016/03/08/musical-simples-teenage-dream/', sourceLabel: 'NYU Music Experience Design Lab · análisis Lydian I–II', status: 'orientativo' }],
  },
  {
    id: 'jonico', name: 'Jónico (mayor)', scale: [0, 2, 4, 5, 7, 9, 11],
    emotion: 'Alegría, luz, estabilidad',
    description: 'La escala mayor: brillante y resuelta, la base del pop festivo.',
    degrees: 'I – IV – V – I', formula: '1 – 2 – 3 – 4 – 5 – 6 – 7', characteristic: 3,
    progression: [[0, ''], [5, ''], [7, ''], [0, '']],
    melody: [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, .5], [2, 2]],
    listen: [],
  },
  {
    id: 'mixo', name: 'Mixolidio', scale: [0, 2, 4, 5, 7, 9, 10],
    emotion: 'Heroico, relajado, rockero',
    description: 'Mayor con 7.ª menor (♭7): el ♭VII da un aire heroico o nostálgico.',
    degrees: 'I – ♭VII – IV – I', formula: '1 – 2 – 3 – 4 – 5 – 6 – ♭7', characteristic: 6,
    progression: [[0, ''], [10, ''], [5, ''], [0, '']],
    melody: [[0, .5], [4, .5], [7, .5], [10, 1], [9, .5], [7, .5], [5, .5], [0, 1.5]],
    listen: [{ title: "Sweet Child O' Mine", artist: "Guns N' Roses", note: 'Referencia de rock mixolidio según un análisis citado por TIME; no se reproduce su melodía aquí.', source: 'https://time.com/6091944/lorde-solar-power/', sourceLabel: 'TIME · análisis de modos en el pop', status: 'verificado' }],
  },
  {
    id: 'dorico', name: 'Dórico', scale: [0, 2, 3, 5, 7, 9, 10],
    emotion: 'Melancolía con esperanza, “cool”',
    description: 'Menor con 6.ª mayor: triste pero no hundido; muy usado en jazz, funk y soul.',
    degrees: 'i – IV – i – ♭VII', formula: '1 – 2 – ♭3 – 4 – 5 – 6 – ♭7', characteristic: 5,
    progression: [[0, 'm'], [5, ''], [0, 'm'], [10, '']],
    melody: [[0, .5], [3, .5], [7, .5], [9, 1], [7, .5], [5, .5], [3, .5], [0, 1.5]],
    listen: [
      { title: 'So What', artist: 'Miles Davis', note: 'La composición alterna secciones en Re dórico y Mi♭ dórico.', source: 'https://webcontent.indianhills.edu/_myhills/courses/MUS205/documents/lu09_davis.pdf', sourceLabel: 'Indian Hills Community College · guía de escucha', status: 'verificado' },
      { title: 'Scarborough Fair', artist: 'Tradicional · versión de Simon & Garfunkel', note: 'La melodía tradicional se cita como ejemplo dórico.', source: 'https://stewarthendrickson.com/HendricksonPublications/55.Sage-encyclopedia-of-music-and-culture.p1459.pdf', sourceLabel: 'SAGE Encyclopedia of Music and Culture', status: 'verificado' },
    ],
  },
  {
    id: 'eolico', name: 'Eólico (menor natural)', scale: [0, 2, 3, 5, 7, 8, 10],
    emotion: 'Tristeza, nostalgia, drama',
    description: 'La escala menor natural: sombría e introspectiva. La épica menor Am – F – C – G vive aquí.',
    degrees: 'i – ♭VI – ♭III – ♭VII', formula: '1 – 2 – ♭3 – 4 – 5 – ♭6 – ♭7', characteristic: 5,
    progression: [[0, 'm'], [8, ''], [3, ''], [10, '']],
    melody: [[0, .5], [3, .5], [7, .5], [8, 1], [7, .5], [3, .5], [2, .5], [0, 1.5]],
    listen: [],
  },
  {
    id: 'frigio', name: 'Frigio', scale: [0, 1, 3, 5, 7, 8, 10],
    emotion: 'Oscuridad, tensión, dramatismo',
    description: 'Menor con 2.ª menor (♭2): el semitono sobre la tónica da un color oscuro, flamenco y metalero. Am – G – F – E es la cadencia andaluza; en Mi frigio se oye como iv – ♭III – ♭II – I, con tónica mayor.',
    degrees: 'i – ♭VII – ♭VI – V', formula: '1 – ♭2 – ♭3 – 4 – 5 – ♭6 – ♭7', characteristic: 1,
    progression: [[0, 'm'], [10, ''], [8, ''], [4, '']],
    melody: [[0, .5], [1, .5], [0, .5], [3, 1], [5, .5], [3, .5], [1, .5], [0, 1.5]],
    listen: [{ title: 'Stray Cat Strut', artist: 'Stray Cats', note: 'Orientativo: la fuente documenta Cm–B♭7–A♭7–G7 en Do menor; es un descenso cromático con dominante, no se etiqueta aquí como obra íntegramente frigia.', source: 'https://www.jonmaclennan.com/blog/stray-cat-strut-chords', sourceLabel: 'Análisis de acordes · Jon MacLennan', status: 'orientativo' }],
  },
  {
    id: 'locrio', name: 'Locrio', scale: [0, 1, 3, 5, 6, 8, 10],
    emotion: 'Inestabilidad, inquietud',
    description: 'Su 5.ª es disminuida: la tónica es un acorde disminuido y nunca termina de asentarse.',
    degrees: 'i° – ♭II – ♭iii', formula: '1 – ♭2 – ♭3 – 4 – ♭5 – ♭6 – ♭7', characteristic: 4,
    progression: [[0, 'dim'], [1, ''], [3, 'm']],
    melody: [[0, .5], [1, .5], [3, .5], [6, 1], [3, .5], [1, .5], [0, 1.5]],
    listen: [],
  },
];
