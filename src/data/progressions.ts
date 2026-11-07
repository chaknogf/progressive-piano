export type Category = 'pop' | 'act' | 'cla' | 'ele' | 'lat' | 'jaz' | 'bal';

export const CATEGORIES: Record<Category, string> = {
  pop: 'Pop y rock 80s–hoy',
  act: 'Música actual',
  cla: 'Clásica y romántica',
  ele: 'Electrónica',
  lat: 'Latina',
  jaz: 'Sinatra / jazz',
  bal: 'Baladas en inglés',
};

export interface Progression {
  category: Category;
  title: string;
  degrees: string;
  chords: string[];
  songs: string;
  description: string;
}

export const PROGRESSIONS: Progression[] = [
  { category: 'pop', title: 'El bucle antémico', degrees: 'I – V – vi – IV', chords: ['C', 'G', 'Am', 'F'], songs: 'Don’t Stop Believin’ (Journey), With Or Without You (U2), Someone Like You (Adele), Despacito', description: 'La reina del pop desde los 80: equilibrio perfecto entre tensión y resolución.' },
  { category: 'pop', title: 'Épica menor', degrees: 'vi – IV – I – V', chords: ['Am', 'F', 'C', 'G'], songs: 'Zombie (The Cranberries), Complicated (Avril Lavigne), Apologize (OneRepublic)', description: 'Empieza en el relativo menor: más sombría, nostálgica y dramática.' },
  { category: 'pop', title: 'Cadencia andaluza', degrees: 'i – ♭VII – ♭VI – V', chords: ['Am', 'G', 'F', 'E'], songs: 'Sultans of Swing (Dire Straits), Smooth (Santana), Hips Don’t Lie (Shakira)', description: 'Bajo descendente con gran tensión dramática.' },
  { category: 'pop', title: 'R&B / neo-soul ii–V–I', degrees: 'ii – V – I', chords: ['Dm7', 'G7', 'Cmaj7'], songs: 'Sunday Morning (Maroon 5), Bruno Mars, Alicia Keys, Daniel Caesar', description: 'Armonía de jazz con séptimas y novenas.' },
  { category: 'pop', title: 'Mixolidia / power', degrees: 'I – ♭VII – IV – I', chords: ['C', 'Bb', 'F', 'C'], songs: 'Sweet Child O’ Mine (Guns N’ Roses), Clocks (Coldplay), Born in the U.S.A. (Springsteen)', description: 'El ♭VII (intercambio modal) da una sonoridad heroica.' },
  { category: 'pop', title: 'Bajo descendente', degrees: 'I – V/VII – vi – V – IV – I/III – ii – V', chords: ['C', 'G/B', 'Am', 'G', 'F', 'C/E', 'Dm', 'G'], songs: 'Tears in Heaven (Clapton), Perfect (Ed Sheeran)', description: 'Para piano y guitarra acústica: el bajo baja paso a paso.' },
  { category: 'act', title: 'Bucle urbano / reguetón', degrees: 'i – ♭VI – ♭VII', chords: ['Am', 'F', 'G'], songs: 'Bad Bunny, Rauw Alejandro, Rosalía, Karol G, Billie Eilish', description: 'Tres acordes en bucle continuo que sostienen el ritmo.' },
  { category: 'act', title: 'Royal Road (J-Pop)', degrees: 'IV – V – iii – vi', chords: ['Fmaj7', 'G7', 'Em7', 'Am'], songs: 'Anime openings, baladas K-Pop, Olivia Rodrigo', description: 'Resolución suspendida, nostálgica y brillante.' },
  { category: 'act', title: 'Grunge / alt-rock 90s', degrees: 'I – ♭III – IV – ♭VI', chords: ['C', 'Eb', 'F', 'Ab'], songs: 'In Bloom y Lithium (Nirvana), Say It Ain’t So (Weezer)', description: 'Acordes prestados del modo menor dan peso y dinamismo.' },
  { category: 'act', title: 'Variante Creep', degrees: 'I – III – IV – iv', chords: ['C', 'E', 'F', 'Fm'], songs: 'Creep (Radiohead)', description: 'El IV mayor pasa a menor: un giro agridulce célebre.' },
  { category: 'act', title: 'Plagal / indie pop', degrees: 'IV – I – vi – V', chords: ['F', 'C', 'Am', 'G'], songs: 'Riptide (Vance Joy), As It Was (Harry Styles), Clairo, Mac DeMarco', description: 'Oscila entre F y C: ambiente etéreo y relajado.' },
  { category: 'act', title: 'Neo-soul / lofi', degrees: 'vi7 – ii7 – V7 – Imaj7', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7'], songs: 'SZA, Frank Ocean, Tyler, The Creator, Steve Lacy', description: 'Un acorde secundario añade tensión elegante.' },
  { category: 'act', title: 'El Canon', degrees: 'I – V – vi – iii – IV – I – IV – V', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], songs: 'Memories (Maroon 5), Graduation (Vitamin C), Basket Case (Green Day)', description: 'Basada en Pachelbel: la balada romántica por excelencia.' },
  { category: 'cla', title: 'Cadencia ii – V – I', degrees: 'ii – V – I', chords: ['Dm', 'G7', 'C'], songs: 'Bach, Mozart, Beethoven, Chopin', description: 'Pilar de la música clásica para cerrar frases (a menudo precedida de I 6/4 – V7 – I).' },
  { category: 'cla', title: 'Círculo de quintas', degrees: 'iii – vi – ii – V – I', chords: ['Em', 'Am', 'Dm', 'G7', 'C'], songs: 'Bach, Vivaldi; base de Hey Jude (The Beatles)', description: 'Cada acorde cae una quinta.' },
  { category: 'cla', title: 'Giro romántico', degrees: 'I – vi – IV – iv', chords: ['C', 'Am', 'F', 'Fm'], songs: 'Chopin, Liszt, Tchaikovsky', description: 'El IV menor aporta melancolía puramente romántica.' },
  { category: 'ele', title: 'Trance / EDM anthem', degrees: 'vi – IV – I – V', chords: ['Am', 'F', 'C', 'G'], songs: 'Armin van Buuren, Tiësto, Avicii', description: 'Euforia masiva en build-ups y drops.' },
  { category: 'ele', title: 'Deep house', degrees: 'i7 – iv7', chords: ['Am7', 'Dm7'], songs: 'Disclosure, Ben Böhmer', description: 'Dos acordes con séptimas en bucle: cálido y bailable.' },
  { category: 'ele', title: 'Synthwave', degrees: 'I – ♭VII – vi – ♭VI', chords: ['C', 'Bb', 'Am', 'Ab'], songs: 'The Midnight, Kavinsky (Nightcall)', description: 'Nostalgia futurista de los 80.' },
  { category: 'lat', title: 'Tumbao de salsa', degrees: 'i7 – IV7', chords: ['Am7', 'D7'], songs: 'Héctor Lavoe, Celia Cruz, Marc Anthony', description: 'Base de la salsa sobre un groove sincopado.' },
  { category: 'lat', title: 'Bolero', degrees: 'I – Idim7 – ii7 – V7', chords: ['C', 'C#dim7', 'Dm7', 'G7'], songs: 'Luis Miguel, Armando Manzanero, Los Panchos', description: 'El dim7 de paso conecta acordes cromáticamente.' },
  { category: 'lat', title: 'Rumba flamenca', degrees: 'i – ♭VII – ♭VI – V', chords: ['Am', 'G', 'F', 'E'], songs: 'Gipsy Kings, Estopa, Shakira, Juanes', description: 'Cadencia andaluza: motor de la rumba y el pop latino.' },
  { category: 'jaz', title: 'Jazz romántico', degrees: 'vi7 – ii7 – V7 – Imaj7 – IVmaj7 – viiø7 – III7', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7'], songs: 'Fly Me to the Moon, Autumn Leaves, All the Things You Are', description: 'Dominantes secundarias y extensiones; voicings sin quinta.' },
  { category: 'jaz', title: 'Puente AABA', degrees: 'Imaj7 – I♯dim7 – ii7 – V7 → IVmaj7 – iv7 – Imaj7', chords: ['Cmaj7', 'C#dim7', 'Dm7', 'G7', 'Fmaj7', 'Fm7', 'Cmaj7'], songs: 'My Way, Night and Day, Unforgettable', description: 'El puente pasa al subdominante menor para dramatizar.' },
  { category: 'bal', title: 'Lamento romántico', degrees: 'I – V/VII – vi – V – IV – I/III – ii7 – V7', chords: ['C', 'G/B', 'Am', 'C/G', 'F', 'C/E', 'Dm7', 'G7'], songs: 'Careless Whisper, Right Here Waiting, Against All Odds', description: 'El bajo desciende mientras la tónica se sostiene.' },
  { category: 'bal', title: 'Gran poder vocal', degrees: 'I – V – vi – IV → ii7 – V7sus4 – V7 – I', chords: ['C', 'G', 'Am', 'F', 'Dm7', 'Gsus4', 'G7', 'C'], songs: 'I Will Always Love You, My Heart Will Go On, I Don’t Want to Miss a Thing', description: 'Suspensión sus4 justo antes del clímax.' },
  { category: 'bal', title: 'Piano-pop minimalista', degrees: 'I – vi – IV – V', chords: ['C', 'Am', 'F', 'G'], songs: 'Someone Like You (Adele), Stay With Me (Sam Smith), All of Me (John Legend)', description: 'Cuatro acordes: la voz lleva la dinámica.' },
  { category: 'bal', title: 'Retro-soul en 6/8', degrees: 'I – iii – IV – iv', chords: ['C', 'Em', 'F', 'Fm'], songs: 'Perfect (Ed Sheeran), When I Was Your Man (Bruno Mars)', description: 'Compás de 6/8 con sabor R&B clásico.' },
];

export interface Mode {
  id: string;
  name: string;
  steps: number[];
  emotion: string;
  description: string;
  degrees: string;
  progression: Array<[number, string]>;
}

export const MODES: Mode[] = [
  { id: 'lidio', name: 'Lidio', steps: [0, 2, 4, 6, 7, 9, 11], emotion: 'Asombro, sueño, magia', description: 'Como el mayor pero con la 4.ª aumentada (♯4): flota y suena fantástico, sin pesadez.', degrees: 'I – II – I – II', progression: [[0, 'maj7'], [2, ''], [0, 'maj7'], [2, '']] },
  { id: 'jonico', name: 'Jónico (mayor)', steps: [0, 2, 4, 5, 7, 9, 11], emotion: 'Alegría, luz, estabilidad', description: 'La escala mayor: brillante y resuelta, la base del pop festivo.', degrees: 'I – IV – V – I', progression: [[0, ''], [5, ''], [7, ''], [0, '']] },
  { id: 'mixo', name: 'Mixolidio', steps: [0, 2, 4, 5, 7, 9, 10], emotion: 'Heroico, relajado, rockero', description: 'Mayor con 7.ª menor (♭7): el ♭VII da un aire heroico o nostálgico.', degrees: 'I – ♭VII – IV – I', progression: [[0, ''], [10, ''], [5, ''], [0, '']] },
  { id: 'dorico', name: 'Dórico', steps: [0, 2, 3, 5, 7, 9, 10], emotion: 'Melancolía con esperanza, “cool”', description: 'Menor con 6.ª mayor: triste pero no hundido; muy usado en jazz, funk y soul.', degrees: 'i – IV – i – ♭VII', progression: [[0, 'm'], [5, ''], [0, 'm'], [10, '']] },
  { id: 'eolico', name: 'Eólico (menor natural)', steps: [0, 2, 3, 5, 7, 8, 10], emotion: 'Tristeza, nostalgia, drama', description: 'La escala menor natural: sombría e introspectiva. La épica menor Am – F – C – G vive aquí.', degrees: 'i – ♭VI – ♭III – ♭VII', progression: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
  { id: 'frigio', name: 'Frigio', steps: [0, 1, 3, 5, 7, 8, 10], emotion: 'Oscuridad, tensión, dramatismo', description: 'Menor con 2.ª menor (♭2): el semitono sobre la tónica da un color oscuro, flamenco y metalero.', degrees: 'i – ♭II – i – ♭VII', progression: [[0, 'm'], [1, ''], [0, 'm'], [10, '']] },
  { id: 'locrio', name: 'Locrio', steps: [0, 1, 3, 5, 6, 8, 10], emotion: 'Inestabilidad, inquietud', description: 'Su 5.ª es disminuida: la tónica es un acorde disminuido y nunca termina de asentarse.', degrees: 'i° – ♭II – ♭iii – i°', progression: [[0, 'dim'], [1, ''], [3, 'm'], [0, 'dim']] },
];

export { OPEN_SHAPES, E_SHAPES, A_SHAPES } from '../lib/theory';