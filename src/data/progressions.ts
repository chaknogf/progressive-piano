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

export interface ProgressionSource {
  label: string;
  url: string;
}

export interface Progression {
  category: Category;
  title: string;
  degrees: string;
  chords: string[];
  songs: string;
  level: 'inicial' | 'intermedio' | 'avanzado';
  description: string;
  sources?: ProgressionSource[];
}

export const PROGRESSIONS: Progression[] = [
  { category: 'pop', title: 'El bucle antémico', degrees: 'I – V – vi – IV', chords: ['C', 'G', 'Am', 'F'], songs: '', level: 'inicial', description: 'Cuatro acordes frecuentes en el pop, con equilibrio entre tensión y resolución.' },
  { category: 'pop', title: 'Épica menor', degrees: 'vi – IV – I – V', chords: ['Am', 'F', 'C', 'G'], songs: '', level: 'inicial', description: 'Empieza en el relativo menor: una sonoridad más sombría y nostálgica.' },
  { category: 'act', title: 'Cadencia andaluza', degrees: 'i – ♭VII – ♭VI – V', chords: ['Am', 'G', 'F', 'E'], songs: 'Stray Cat Strut (orientativo, transpuesto), A Hazy Shade of Winter (transpuesta), Sultans of Swing (transpuesta)', level: 'intermedio', description: 'Am–G–F–E puede leerse como i–♭VII–♭VI–V en La menor; en Mi frigio es iv–♭III–♭II–I, con la tónica E en acorde mayor.', sources: [{ label: 'Stray Cat Strut · acordes', url: 'https://www.jonmaclennan.com/blog/stray-cat-strut-chords' }, { label: 'A Hazy Shade of Winter · análisis de progresión', url: 'https://www.vintageguitar.com/40324/fretprints-paul-simon/' }, { label: 'Sultans of Swing · partitura/tablatura', url: 'https://www.johnputnam.org/JPdocs/Sultans%20of%20Swing%20TAB.pdf' }] },
  { category: 'pop', title: 'R&B / neo-soul ii–V–I', degrees: 'ii7 – V7 – Imaj7', chords: ['Dm7', 'G7', 'Cmaj7'], songs: '', level: 'intermedio', description: 'Progresión de jazz con séptimas que resuelve en la tónica.' },
  { category: 'pop', title: 'Mixolidia / power', degrees: 'I – ♭VII – IV – I', chords: ['C', 'Bb', 'F', 'C'], songs: 'Sweet Child O’ Mine (Guns N’ Roses), transpuesta a Do', level: 'intermedio', description: 'En Re mixolidio, el acorde ♭VII (Do) aporta un color rockero; la secuencia del catálogo está transpuesta a Do.', sources: [{ label: 'Análisis armónico y acordes', url: 'https://www.nathanielschool.com/lessons/how-to-play-sweet-child-o-mine-on-piano/' }] },
  { category: 'act', title: 'Bucle menor ♭VI – ♭VII (pop urbano)', degrees: 'i – ♭VI – ♭VII', chords: ['Am', 'F', 'G'], songs: '', level: 'inicial', description: 'La armonía es un bucle menor sencillo; el reguetón se define por el ritmo dembow (ver capítulo de beats), no por una progresión armónica concreta.' },
  { category: 'act', title: 'Royal Road (J-Pop)', degrees: 'IVmaj7 – V7 – iii7 – vi', chords: ['Fmaj7', 'G7', 'Em7', 'Am'], songs: '', level: 'intermedio', description: 'Resolución suspendida, nostálgica y brillante.' },
  { category: 'act', title: 'Grunge / alt-rock 90s', degrees: 'I – ♭III – IV – ♭VI', chords: ['C', 'Eb', 'F', 'Ab'], songs: '', level: 'intermedio', description: 'Progresión válida como ejemplo de préstamo modal del modo menor.' },
  { category: 'act', title: 'Variante Creep', degrees: 'I – III – IV – iv', chords: ['C', 'E', 'F', 'Fm'], songs: 'Creep (Radiohead), orientativo: transpuesta y simplificada', level: 'intermedio', description: 'El III mayor prestado conduce a IV; luego IV pasa a menor.', sources: [{ label: 'Fender Play · acordes de Creep', url: 'https://www.fender.com/play/lessons/creep' }] },
  { category: 'act', title: 'Bucle IV – I – vi – V', degrees: 'IV – I – vi – V', chords: ['F', 'C', 'Am', 'G'], songs: '', level: 'inicial', description: 'Bucle de cuatro acordes. La cadencia plagal propiamente dicha es solo IV – I.' },
  { category: 'act', title: 'Neo-soul / lofi', degrees: 'vi7 – ii7 – V7 – Imaj7', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7'], songs: '', level: 'intermedio', description: 'Un ciclo de séptimas que conduce desde el relativo menor hasta la tónica.' },
  { category: 'cla', title: 'El Canon', degrees: 'I – V – vi – iii – IV – I – IV – V', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G'], songs: '', level: 'intermedio', description: 'Ciclo armónico asociado a la chacona de Pachelbel.' },
  { category: 'cla', title: 'Cadencia ii – V – I', degrees: 'ii – V7 – I', chords: ['Dm', 'G7', 'C'], songs: '', level: 'inicial', description: 'Cadencia tonal frecuente para cerrar frases.' },
  { category: 'cla', title: 'Círculo de quintas', degrees: 'iii – vi – ii – V – I', chords: ['Em', 'Am', 'Dm', 'G7', 'C'], songs: '', level: 'intermedio', description: 'Cada fundamental avanza una quinta descendente hasta la tónica.' },
  { category: 'cla', title: 'Giro romántico', degrees: 'I – vi – IV – iv', chords: ['C', 'Am', 'F', 'Fm'], songs: '', level: 'intermedio', description: 'El IV menor prestado aporta un matiz melancólico.' },
  { category: 'ele', title: 'Deep house', degrees: 'i7 – iv7', chords: ['Am7', 'Dm7'], songs: '', level: 'inicial', description: 'Dos acordes menores con séptima en un vamp.' },
  { category: 'ele', title: 'Synthwave', degrees: 'I – ♭VII – vi – ♭VI', chords: ['C', 'Bb', 'Am', 'Ab'], songs: '', level: 'intermedio', description: 'El movimiento descendente y los acordes prestados crean un color nostálgico.' },
  { category: 'lat', title: 'Montuno (vamp dórico)', degrees: 'i7 – IV7', chords: ['Am7', 'D7'], songs: '', level: 'intermedio', description: 'Am7–D7 forma un vamp dórico. Tumbao nombra un patrón rítmico, no una progresión armónica.' },
  { category: 'lat', title: 'Bolero', degrees: 'I – ♯I°7 – ii7 – V7', chords: ['C', 'C#dim7', 'Dm7', 'G7'], songs: '', level: 'avanzado', description: 'El acorde disminuido de Do♯ funciona como sensible secundaria que conduce a Re menor.' },
  { category: 'jaz', title: 'Jazz romántico', degrees: 'vi7 – ii7 – V7 – Imaj7 – IVmaj7 – viiø7 – III7', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7'], songs: '', level: 'avanzado', description: 'Ciclo con extensiones y dominante secundaria al final.' },
  { category: 'jaz', title: 'Puente AABA', degrees: 'Imaj7 – ♯I°7 – ii7 – V7 → IVmaj7 – iv7 – Imaj7', chords: ['Cmaj7', 'C#dim7', 'Dm7', 'G7', 'Fmaj7', 'Fm7', 'Cmaj7'], songs: '', level: 'avanzado', description: 'El acorde ♯I°7 enlaza cromáticamente con ii7; el tramo final usa subdominante menor.' },
  { category: 'bal', title: 'Lamento romántico', degrees: 'I – V⁶ – vi – I⁶⁴ – IV – I⁶ – ii7 – V7', chords: ['C', 'G/B', 'Am', 'C/G', 'F', 'C/E', 'Dm7', 'G7'], songs: '', level: 'intermedio', description: 'El bajo desciende mientras la armonía enlaza inversiones de tónica y dominante.' },
  { category: 'bal', title: 'Gran poder vocal', degrees: 'I – V – vi – IV → ii7 – V7sus4 – V7 – I', chords: ['C', 'G', 'Am', 'F', 'Dm7', 'Gsus4', 'G7', 'C'], songs: '', level: 'intermedio', description: 'Una suspensión sus4 retrasa la resolución dominante antes del regreso a la tónica.' },
  { category: 'bal', title: 'Piano-pop minimalista', degrees: 'I – vi – IV – V', chords: ['C', 'Am', 'F', 'G'], songs: '', level: 'inicial', description: 'Cuatro acordes sencillos dejan espacio para que destaque la melodía.' },
];