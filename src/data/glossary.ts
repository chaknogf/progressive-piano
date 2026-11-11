export interface GlossaryEntry {
  term: string;
  definition: string;
  english?: string;
  category: 'armonia' | 'ritmo' | 'piano' | 'guitarra' | 'produccion';
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Tónica', definition: 'Nota o acorde de reposo y principal resolución de una tonalidad.', english: 'Tonic', category: 'armonia' },
  { term: 'Subdominante', definition: 'Cuarto grado de la escala, encargado de alejar la tensión de la tónica.', english: 'Subdominant', category: 'armonia' },
  { term: 'Dominante', definition: 'Quinto grado de la escala, genera máxima tensión hacia la tónica.', english: 'Dominant', category: 'armonia' },
  { term: 'Diatónico', definition: 'Pertenece estrictamente a la escala de la tonalidad actual.', english: 'Diatonic', category: 'armonia' },
  { term: 'Enarmonía', definition: 'Dos notas con nombres distintos que suenan idénticas.', english: 'Enharmonic', category: 'armonia' },
  { term: 'Armadura', definition: 'Conjunto de sostenidos o bemoles al inicio del pentagrama.', english: 'Key signature', category: 'armonia' },
  { term: 'Relativo', definition: 'Tonalidad menor que comparte la misma armadura que una mayor.', english: 'Relative', category: 'armonia' },
  { term: 'Paralelo', definition: 'Tonalidad mayor y menor que comparten la misma tónica.', english: 'Parallel', category: 'armonia' },
  { term: 'Cadencia', definition: 'Fórmula conclusiva que cierra una frase musical.', english: 'Cadence', category: 'armonia' },
  { term: 'Préstamo modal', definition: 'Uso de acordes de la tonalidad paralela.', english: 'Modal interchange', category: 'armonia' },
  { term: 'Voicing', definition: 'La distribución específica de las notas de un acorde.', english: 'Voicing', category: 'armonia' },
  { term: 'Sus', definition: 'Acorde suspendido sin tercera (sus2 / sus4).', english: 'Suspended', category: 'armonia' },
  { term: 'Maj7', definition: 'Acorde con séptima mayor.', english: 'Major 7th', category: 'armonia' },
  { term: 'Dominante secundaria', definition: 'Acorde dominante que apunta a un grado que no es la tónica.', english: 'Secondary dominant', category: 'armonia' },
  { term: 'Modos', definition: 'Escalas derivadas de la escala mayor (Dórico, Frigio, etc.).', english: 'Modes', category: 'armonia' },
  { term: 'Vamp', definition: 'Repetición cíclica de una progresión corta de acordes.', english: 'Vamp', category: 'armonia' },
  { term: 'BPM', definition: 'Golpes por minuto, medida de velocidad del tempo.', english: 'Beats per minute', category: 'ritmo' },
  { term: 'Compás', definition: 'Estructura métrica que divide la música en partes iguales.', english: 'Time signature', category: 'ritmo' },
  { term: 'Semicorchea', definition: 'Figura rítmica que vale la mitad de una corchea.', english: 'Sixteenth note', category: 'ritmo' },
  { term: 'Backbeat', definition: 'Acento en los tiempos 2 y 4 del compás.', english: 'Backbeat', category: 'ritmo' },
  { term: 'Swing', definition: 'Sensación rítmica con corcheas de duración desigual o "con bote".', english: 'Swing', category: 'ritmo' },
  { term: 'Cejilla', definition: 'Técnica de guitarra para presionar múltiples cuerdas con un solo dedo.', english: 'Barre', category: 'guitarra' },
  { term: 'Capo', definition: 'Pinza trasteadora para cambiar la tonalidad de la guitarra.', english: 'Capo / Capodastro', category: 'guitarra' },
  { term: 'Velocity', definition: 'Intensidad con la que se dispara una nota MIDI.', english: 'Velocity', category: 'produccion' },
  { term: 'CC', definition: 'Mensajes de control continuo en MIDI.', english: 'Control Change', category: 'produccion' },
  { term: 'Quantize', definition: 'Corrección automática de la posición rítmica en el secuenciador.', english: 'Quantization', category: 'produccion' },
  { term: 'Piano roll', definition: 'Cuadrícula de edición de notas musicales por altura y tiempo.', english: 'Piano roll', category: 'produccion' },
  { term: 'Pre-delay', definition: 'Tiempo antes de que comience el efecto de reverberación.', english: 'Pre-delay', category: 'produccion' },
  { term: 'RT60', definition: 'Tiempo que tarda el sonido en decaer 60 dB.', english: 'RT60', category: 'produccion' },
  { term: 'Wet/Dry', definition: 'Balance entre la señal procesada y la señal original.', english: 'Wet/Dry mix', category: 'produccion' },
  { term: 'Q', definition: 'Factor de ancho de banda o resonancia en un ecualizador.', english: 'Q factor', category: 'produccion' },
  { term: 'Shelf', definition: 'Tipo de filtro de ecualización que atenúa o realza frecuencias desde un punto límite.', english: 'Shelving filter', category: 'produccion' },
  { term: 'Kick / Bombo', definition: 'Tambor principal de graves en la batería.', english: 'Kick drum', category: 'produccion' },
  { term: 'Snare / Caja', definition: 'Tambor central de golpe brillante y seco.', english: 'Snare drum', category: 'produccion' },
  { term: 'Hi-hat', definition: 'Platos de charles de la batería.', english: 'Hi-hat', category: 'produccion' },
];