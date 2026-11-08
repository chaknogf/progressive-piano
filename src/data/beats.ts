export interface BeatGenre {
  name: string;
  bpm: number;
  swing: number;
  patterns: string[];
  chords: string[];
  description: string;
}

export const BEAT_GENRES: BeatGenre[] = [
  {
    name: 'House / four-on-the-floor',
    bpm: 124,
    swing: 0,
    patterns: ['x...x...x...x...', '....x.......x...', '................', '..x...x...x...x.', '................'],
    chords: ['Am7', 'Dm7', 'Am7', 'Dm7'],
    description:
      'Sirve también para techno, synthwave y disco. Kick en los 4 tiempos; clap o caja en el 2 y el 4 (backbeat); hi-hat abierto en el contratiempo (las “y”), la clave del groove house. Los toms casi no van en el patrón: se colocan al final del compás 4 u 8 como fill descendente (agudo → medio → grave) para avisar un cambio de sección.',
  },
  {
    name: 'Boom bap / hip-hop clásico',
    bpm: 90,
    swing: 20,
    patterns: ['x......x.x......', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', '................'],
    chords: ['Dm7', 'G7', 'Cmaj7', 'A7'],
    description:
      'Ritmo sincopado con swing. El kick va en el 1, con un segundo kick desplazado antes del 3; la caja es seca y pesada en el 2 y el 4. Congas o bongós en los huecos libres dan textura orgánica.',
  },
  {
    name: 'Trap / drill',
    bpm: 140,
    swing: 0,
    patterns: ['x..x......x.....', '........x.......', 'xxxxxxxxxxxxxxxx', '................', '................'],
    chords: ['Am', 'G', 'F', 'E'],
    description:
      '130–160 BPM en medio tiempo, dominado por el sub-bajo 808. La caja o el clap cae en el tercer tiempo, no en el 2 y el 4. Los hi-hats llevan el peso creativo: de corcheas a ráfagas de semicorcheas o fusas con pitch rolls. Los rimshots acentúan contra-ritmos antes de la caja.',
  },
  {
    name: 'Reggaetón / dembow',
    bpm: 95,
    swing: 0,
    patterns: ['x...x...x...x...', '...x.x.....x.x..', '................', '................', '................'],
    chords: ['C', 'G', 'Am', 'F'],
    description:
      'Kick en los cuatro tiempos y caja, palo o rimshot en un patrón sincopado (el dembow) que da el vaivén característico. Congas y woodblocks rellenan con percusión seca.',
  },
  {
    name: 'Afrobeat / pop latino',
    bpm: 105,
    swing: 0,
    patterns: ['x.....x.....x...', '................', 'xxxxxxxxxxxxxxxx', '................', '..x.x..x..x.x..x'],
    chords: ['Am', 'F', 'G', 'G'],
    description:
      'Polirritmia orgánica: las congas usan el tumbao (golpe abierto + palma o dedo) en lugar de una caja pesada, y el shaker mantiene el pulso. Las claves marcan el marco temporal (3-2 o 2-3), y los toms se afinan melódicamente para construir el patrón junto al kick.',
  },
  {
    name: 'Rock / pop',
    bpm: 110,
    swing: 0,
    patterns: ['x.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', '................', '................'],
    chords: ['C', 'Bb', 'F', 'C'],
    description:
      'Kick orgánico en el 1 y el 3 (en el pop bailable, en los cuatro tiempos) y caja brillante en el 2 y el 4. Los toms son la clave de los breaks y fills (del tom agudo al floor tom); el crash abre cada sección y el ride lleva el pulso en las partes intensas.',
  },
];

export const BEAT_INSTRUMENTS = ['Kick', 'Caja / Clap', 'Hat cerrado', 'Hat abierto', 'Conga'];

export interface HarmonyCard {
  title: string;
  chords: string;
  harmony: string;
  beat: string;
}

export const HARMONY_CARDS: HarmonyCard[] = [
  {
    title: 'Lo-fi (hip-hop, chill, study)',
    chords: 'Dm7 G7 Cmaj7 A7',
    harmony:
      'Acordes de jazz extendidos (maj7, m9, dominante 11, add9) con conducción de voces muy suave. Progresiones cíclicas y nostálgicas, por ejemplo ii7 – V7 – Imaj7 – VI7.',
    beat: 'Kick profundo y comprimido, de low-end cálido. Caja o rimshot apagado en el 2 y el 4, algo corrido del pulso exacto para sonar humano. Hi-hats lentos con crackle de vinilo y lluvia; sin toms agresivos, a lo sumo shakers o madera de fondo.',
  },
  {
    title: 'House (deep, tech, progressive)',
    chords: 'Am7 Dm7 Am7 Dm7',
    harmony:
      'Stabs de piano eléctrico (Rhodes, Wurlitzer) o de sintetizador tipo órgano M1. Acordes de 4 notas con inversiones limpias que entran a contratiempo.',
    beat: 'Four-on-the-floor limpio, con el bajo comprimido por sidechain cada vez que golpea el kick. Clap en el 2 y el 4 con capa brillante y reverb plate corta; hat cerrado en las “y” y hat abierto en el pulso débil para dar aire antes de los drops.',
  },
  {
    title: 'Tribal / latin house',
    chords: 'Am Bb Am Bb',
    harmony:
      'Progresiones menores oscuras o modales (frigio, menor armónica), con una nota pedal repetida en el bajo mientras la armonía fluctúa.',
    beat: 'Kick constante en 4/4, pero mandan las congas, bongós y tumbadoras con síncopas hiperactivas. Shakers, whistles y cowbells cortan en medios-altos para crear una atmósfera cálida y de alta energía.',
  },
  {
    title: 'Electro / synthwave / cyberpunk',
    chords: 'C Bb Am Ab',
    harmony:
      'Progresiones oscuras, cinemáticas y épicas inspiradas en los 80, con modos eólico y dórico y tríadas con novena añadida.',
    beat: 'Kick electrónico y pesado (estilo TR-808 o LinnDrum). Caja o clap con gated reverb para un sonido enorme y espacial; hats en semicorcheas mecánicas con paneos rápidos y rimshots sintéticos.',
  },
  {
    title: 'Trap',
    chords: 'Am G F E',
    harmony:
      'Melodías oscuras y menores (armónicas o frigias) con flautas, pianos de cola tristes o bells con octavador y reversa.',
    beat: 'El 808 manda y se desliza (glide) de nota en nota con saturación armónica. Caja o clap agudo y cortante en el tercer tiempo; hats rápidos e impredecibles, con tresillos y fusas programadas como rolls.',
  },
  {
    title: 'Reggaetón / urbano',
    chords: 'C G Am F',
    harmony:
      'Progresiones pop de 4 acordes (I – vi – IV – V o variaciones menores) con plucks suaves, guitarras acústicas procesadas o pianos eléctricos modernos.',
    beat: 'Kick en los cuatro tiempos y el patrón sincopado del dembow, que empuja el cuerpo adelante y atrás. Woodblocks, rimshots y percusión latina digital rellenan los huecos.',
  },
  {
    title: 'Rock y pop',
    chords: 'C Bb F C',
    harmony:
      'Pop: I – V – vi – IV, con ganchos melódicos inmediatos. Rock: power chords (raíz y quinta), pentatónicas y modo mixolidio con el ♭VII (de Do mayor a Si bemol mayor) para un sonido crudo y de estadio.',
    beat: 'Batería real: kick en el 1 y el 3 en el rock (cuatro tiempos en el pop bailable) y caja en el 2 y el 4. Los toms hacen los breaks y fills entre estrofa y coro; el crash abre secciones y el ride lleva el pulso en lo intenso.',
  },
];
