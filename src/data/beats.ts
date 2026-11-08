export interface BeatGenre {
  name: string;
  bpm: number;
  swing: number;
  patterns: string[];
  chords: string[];
  description: string;
}

export const BEAT_GENRES: BeatGenre[] = [
  { name: 'House / four-on-the-floor', bpm: 124, swing: 0, patterns: ['x...x...x...x...', '....x.......x...', '................', '..x...x...x...x.', '................'], chords: ['Am7', 'Dm7', 'Am7', 'Dm7'], description: 'Sirve también para techno, synthwave y disco. Kick en los 4 tiempos; clap o caja en el 2 y el 4 (backbeat); hi-hat abierto en el contratiempo (las “y”), la clave del groove house.' },
  { name: 'Boom bap / hip-hop clásico', bpm: 90, swing: 20, patterns: ['x......x.x......', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', '................'], chords: ['Dm7', 'G7', 'Cmaj7', 'A7'], description: 'Ritmo sincopado con swing. El kick va en el 1, con un segundo kick desplazado antes del 3; la caja es seca y pesada en el 2 y el 4.' },
  { name: 'Trap / drill', bpm: 140, swing: 0, patterns: ['x..x......x.....', '........x.......', 'xxxxxxxxxxxxxxxx', '................', '................'], chords: ['Am', 'G', 'F', 'E'], description: '130–160 BPM en medio tiempo, dominado por el sub-bajo 808. La caja o el clap cae en el tercer tiempo.' },
  { name: 'Reggaetón / dembow', bpm: 95, swing: 0, patterns: ['x...x...x...x...', '...x.x.....x.x..', '................', '................', '................'], chords: ['C', 'G', 'Am', 'F'], description: 'Kick en los cuatro tiempos y caja, palo o rimshot en un patrón sincopado (el dembow).' },
  { name: 'Afrobeat / pop latino', bpm: 105, swing: 0, patterns: ['x.....x.....x...', '................', 'xxxxxxxxxxxxxxxx', '................', '..x.x..x..x.x..x'], chords: ['Am', 'F', 'G', 'G'], description: 'Polirritmia orgánica: las congas usan el tumbao.' },
  { name: 'Rock / pop', bpm: 110, swing: 0, patterns: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', '................'], chords: ['C', 'Bb', 'F', 'C'], description: 'Pop: I – V – vi – IV. Rock: power chords y modo mixolidio.' },
];

export const BEAT_INSTRUMENTS = ['Kick', 'Caja / Clap', 'Hat cerrado', 'Hat abierto', 'Conga'];

export interface HarmonyCard {
  title: string;
  chords: string;
  harmony: string;
  beat: string;
}

export const HARMONY_CARDS: HarmonyCard[] = [
  { title: 'Lo-fi (hip-hop, chill, study)', chords: 'Dm7 G7 Cmaj7 A7', harmony: 'Acordes de jazz extendidos con conducción de voces suave.', beat: 'Kick profundo y comprimido; caja o rimshot apagado.' },
  { title: 'House (deep, tech, progressive)', chords: 'Am7 Dm7 Am7 Dm7', harmony: 'Stabs de piano eléctrico o sintetizador.', beat: 'Four-on-the-floor limpio, clap en el 2 y el 4.' },
  { title: 'Tribal / latin house', chords: 'Am Bb Am Bb', harmony: 'Progresiones menores oscuras o modales.', beat: 'Kick constante; congas y bongós con síncopas.' },
  { title: 'Electro / synthwave / cyberpunk', chords: 'C Bb Am Ab', harmony: 'Progresiones oscuras y cinemáticas.', beat: 'Kick electrónico pesado; caja con gated reverb.' },
  { title: 'Trap', chords: 'Am G F E', harmony: 'Melodías oscuras y menores.', beat: '808 con glide; hats rápidos.' },
  { title: 'Reggaetón / urbano', chords: 'C G Am F', harmony: 'Progresiones pop de 4 acordes.', beat: 'Kick en cuatro tiempos y dembow.' },
  { title: 'Rock y pop', chords: 'C Bb F C', harmony: 'Pop I – V – vi – IV; rock power chords.', beat: 'Batería real: kick en 1 y 3, caja en 2 y 4.' },
];