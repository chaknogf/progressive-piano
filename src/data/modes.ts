export interface SuggestedListening {
  title: string;
  artist: string;
  note: string;
  source: string;
  sourceLabel: string;
  status: 'verificado' | 'orientativo';
}

export type ModeMelodyNote = readonly [semitones: number, beats: number];
export type ModeAccompaniment = readonly [notes: readonly number[], start: number, duration: number];

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
  bpm: number;
  accompaniment: readonly ModeAccompaniment[];
  listen: SuggestedListening[];
}

const chord = (root: number, minor = false, extra: number[] = []): number[] => [
  root - 24, root - 17, root - 12 + (minor ? 3 : 4), root - 5, ...extra,
];
const diminishedChord = (root: number): number[] => [root - 24, root - 9, root - 6];

export const MODES: Mode[] = [
  {
    id: 'lidio',
    name: 'Lidio',
    scale: [0, 2, 4, 6, 7, 9, 11],
    emotion: 'Magia, misterio y asombro etéreo',
    description: 'Como la escala mayor pero con la 4.ª aumentada (♯4): genera una sensación flotante, ingrávida y sobrenatural.',
    degrees: 'I – II – I – II',
    formula: '1 – 2 – 3 – ♯4 – 5 – 6 – 7',
    characteristic: 3,
    progression: [[0, 'maj7'], [2, ''], [0, 'maj7'], [2, '']],
    bpm: 140,
    melody: [
      [0, 1],    // B / E (Tónica)
      [5, 1.5],  // E / A (4.ª justa)
      [8, 0.5],  // G / C (3.ª menor / salto expresivo)
      [7, 1],    // F# / B (3.ª mayor / aproximación)
      [5, 2],    // E / A 
      [12, 1],   // B / E (Octava)
      [10, 2],   // A / D 
      [7, 2.5],  // F# / B 
      [5, 1],    // E / A
      [8, 1.5],  // G / C
      [7, 0.5],  // F# / B
      [6, 1],    // F / A# (♯4 Lidia - Nota característica de la magia)
      [3, 2],    // D# / G
      [6, 1],    // F / A# (♯4 Lidia)
      [0, 3]     // Resolución en Tónica
    ],
    accompaniment: [
      [chord(0, false, [-1]), 0, 8],
      [chord(2), 8, 4],
      [chord(0, false, [-1]), 12, 6]
    ],
    listen: [
      {
        title: "Hedwig's Theme (Harry Potter)",
        artist: 'John Williams',
        note: 'El motivo inicial en la celesta utiliza la 4.ª aumentada para crear la clásica atmósfera mágica e ingrávida de Hogwarts.',
        source: 'https://en.wikipedia.org/wiki/Hedwig%27s_Theme',
        sourceLabel: 'Análisis armónico de John Williams · Color Lidio/Armónico',
        status: 'orientativo'
      }
    ],
  },
  {
    id: 'jonico', name: 'Jónico (mayor)', scale: [0, 2, 4, 5, 7, 9, 11],
    emotion: 'Alegría, luz, estabilidad',
    description: 'La escala mayor: brillante y resuelta, la base del pop festivo.',
    degrees: 'I – IV – V – I', formula: '1 – 2 – 3 – 4 – 5 – 6 – 7', characteristic: 3,
    progression: [[0, ''], [5, ''], [7, ''], [0, '']],
    bpm: 100,
    melody: [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, .5], [2, 2]],
    accompaniment: [[chord(0), 0, 4], [chord(5), 4, 4], [chord(7), 8, 4], [chord(0), 12, 4]],
    listen: [],
  },
  {
    id: 'mixo', name: 'Mixolidio', scale: [0, 2, 4, 5, 7, 9, 10],
    emotion: 'Heroico, relajado, rockero',
    description: 'Mayor con 7.ª menor (♭7): el ♭VII da un aire heroico o nostálgico.',
    degrees: 'I – ♭VII – IV – I', formula: '1 – 2 – 3 – 4 – 5 – 6 – ♭7', characteristic: 6,
    progression: [[0, ''], [10, ''], [5, ''], [0, '']],
    bpm: 104,
    melody: [[0, .5], [4, .5], [7, 1], [10, 2], [10, 1], [9, .5], [7, .5], [5, 2], [5, 1], [9, 1], [12, 1], [9, 1], [10, 1.5], [7, .5], [0, 2]],
    accompaniment: [[chord(0), 0, 4], [chord(10), 4, 4], [chord(5), 8, 4], [chord(0), 12, 4]],
    listen: [{ title: "Sweet Child O' Mine", artist: "Guns N' Roses", note: 'Referencia de rock mixolidio según un análisis citado por TIME; no se reproduce su melodía aquí.', source: 'https://time.com/6091944/lorde-solar-power/', sourceLabel: 'TIME · análisis de modos en el pop', status: 'verificado' }],
  },
  {
    id: 'dorico',
    name: 'Dórico',
    scale: [0, 2, 3, 5, 7, 9, 10],
    emotion: 'Heroísmo épico, aventura y melancolía con fuerza',
    description: 'Una escala menor pero con la 6.ª mayor natural: elimina la pesadez triste y le otorga un carácter de valentía, galope y acción.',
    degrees: 'i – IV – v – i',
    formula: '1 – 2 – ♭3 – 4 – 5 – 6 – ♭7',
    characteristic: 5, // La 6.ª mayor natural
    progression: [[0, 'm'], [5, ''], [0, 'm'], [10, '']],
    bpm: 140,
    melody: [
      // Primera frase: La – Do – Ré – Ré (con el empuje rítmico correcto)
      [9, 0.4], [12, 0.4], [14, 0.8], [14, 0.4], [14, 0.4],
      // Ré – Mi – Fa – Fa
      [15, 0.4], [17, 0.8], [17, 0.4], [17, 0.4],
      // Fa – Sol – Mi – Mi
      [19, 0.4], [15, 0.8], [15, 0.4], [14, 0.4],
      // Ré – Do – Do – Ré (Pausa al final del motivo)
      [12, 0.4], [12, 0.4], [14, 1.2],

      // Segunda frase (Repetición con variación de cierre)
      [9, 0.4], [12, 0.4], [14, 0.8], [14, 0.4], [14, 0.4],
      [15, 0.4], [17, 0.8], [17, 0.4], [17, 0.4],
      [19, 0.4], [15, 0.8], [15, 0.4], [14, 0.4],
      [12, 0.4], [14, 1.6],

      // Tercera frase: El desarrollo agudo y dramático (La – La# – Sol...)
      [9, 0.4], [12, 0.4], [14, 0.8], [14, 0.4], [14, 0.4],
      [17, 0.4], [19, 0.8], [19, 0.4], [19, 0.4],
      [21, 0.4], [22, 0.8], [22, 0.4], [21, 0.4], [19, 0.4], [21, 1.2],
      [14, 0.4], [15, 0.4], [17, 0.8], [19, 0.4], [21, 0.8],
      [14, 0.4], [17, 0.4], [15, 0.8], [17, 0.4], [14, 0.4], [15, 1.6]
    ],
    accompaniment: [
      [chord(0, true), 0, 8],
      [chord(5), 8, 4],
      [chord(0, true), 12, 6]
    ],
    listen: [
      {
        title: "He's a Pirate (Piratas del Caribe)",
        artist: 'Klaus Badelt / Hans Zimmer',
        note: 'El motivo épico completo de la melodía utiliza las notas del modo dórico para generar una atmósfera de acción, mar abierto y heroísmo.',
        source: 'https://en.wikipedia.org/wiki/He%27s_a_Pirate',
        sourceLabel: 'Análisis de bandas sonoras · Modo Dórico',
        status: 'orientativo'
      }
    ]
  },
  {
    id: 'eolio-zelda',
    name: 'Eólico (Menor Natural - Fantasía Épica)',
    scale: [0, 2, 3, 5, 7, 8, 10],
    emotion: 'Nostalgia mística, misterio ancestral y melancolía aventurera',
    description: 'Muy utilizado en la música de videojuegos y fantasía clásica. Aprovecha la escala menor natural para evocar ruinas antiguas, magia y secretos ocultos.',
    degrees: 'i – iv – V – i',
    formula: '1 – 2 – ♭3 – 4 – 5 – ♭6 – ♭7',
    characteristic: 8, // La 6.ª bemol (♭6)
    progression: [[0, 'm'], [5, 'm'], [7, ''], [0, 'm']],
    bpm: 135,
    melody: [
      // Inspirado en el motivo de Song of Storms (Modo Eólico / Menor)
      [4, 0.5],  // Mi
      [2, 0.5],  // Re
      [0, 1.0],  // Do
      [4, 0.5],  // Mi
      [2, 0.5],  // Re
      [0, 1.0],  // Do
      [-1, 0.5], // Si grave
      [2, 0.5],  // Re
      [0, 0.5],  // Do
      [-1, 0.5], // Si grave
      [-3, 1.0], // Sol grave
      [-1, 2.0]  // Si (Resolución mística)
    ],
    accompaniment: [
      [chord(0, true), 0, 4],  // Am
      [chord(5, true), 4, 4],  // Dm
      [chord(7, false), 8, 4], // E (Dominante o mayor modal)
      [chord(0, true), 12, 4]  // Am
    ],
    listen: [
      {
        title: "Song of Storms (The Legend of Zelda: Ocarina of Time)",
        artist: 'Koji Kondo',
        note: 'La utilización de intervalos menores naturales y patrones modales en bucle refuerza la atmósfera mágica y el misticismo del universo de Zelda.',
        source: 'https://en.wikipedia.org/wiki/Music_of_The_Legend_of_Zelda:_Ocarina_of_Time',
        sourceLabel: 'Análisis de bandas sonoras · Koji Kondo',
        status: 'orientativo'
      }
    ]
  },
  {
    id: 'frigio', name: 'Frigio', scale: [0, 1, 3, 5, 7, 8, 10],
    emotion: 'Oscuridad, tensión, dramatismo',
    description: 'Menor con 2.ª menor (♭2): el semitono sobre la tónica da un color oscuro, flamenco y metalero. Am – G – F – E es la cadencia andaluza; en Mi frigio se oye como iv – ♭III – ♭II – I, con tónica mayor.',
    degrees: 'i – ♭VII – ♭VI – V', formula: '1 – ♭2 – ♭3 – 4 – 5 – ♭6 – ♭7', characteristic: 1,
    progression: [[0, 'm'], [10, ''], [8, ''], [7, '']],
    bpm: 88,
    melody: [[7, 1], [8, .5], [7, .5], [5, 1], [3, 1], [1, 1], [0, 1], [1, 1], [3, 1], [3, 1], [5, 1], [7, 1], [8, 1], [5, 1], [3, .5], [1, .5], [0, 3]],
    accompaniment: [[chord(0, true), 0, 4], [chord(10), 4, 4], [chord(8), 8, 4], [chord(7), 12, 5]],
    listen: [{ title: 'Stray Cat Strut', artist: 'Stray Cats', note: 'Orientativo: la fuente documenta Cm–B♭7–A♭7–G7 en Do menor; es un descenso cromático con dominante, no se etiqueta aquí como obra íntegramente frigia.', source: 'https://www.jonmaclennan.com/blog/stray-cat-strut-chords', sourceLabel: 'Análisis de acordes · Jon MacLennan', status: 'orientativo' }],
  },
  {
    id: 'locrio', name: 'Locrio', scale: [0, 1, 3, 5, 6, 8, 10],
    emotion: 'Inestabilidad, inquietud',
    description: 'Su 5.ª es disminuida: la tónica es un acorde disminuido y nunca termina de asentarse.',
    degrees: 'i° – ♭II – ♭iii', formula: '1 – ♭2 – ♭3 – 4 – ♭5 – ♭6 – ♭7', characteristic: 4,
    progression: [[0, 'dim'], [1, ''], [3, 'm']],
    bpm: 70,
    melody: [[0, 1], [3, 1], [6, 1], [3, 1], [8, 1], [6, 1], [5, 1], [3, 1], [1, 1], [3, 1], [6, 1], [5, 1], [3, 1], [1, 1], [0, 2]],
    accompaniment: [[diminishedChord(0), 0, 4], [chord(1), 4, 4], [chord(3, true), 8, 8]],
    listen: [],
  },
];
