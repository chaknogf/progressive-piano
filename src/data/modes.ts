export interface Mode {
  id: string;
  name: string;
  scale: number[];
  emotion: string;
  description: string;
  degrees: string;
  progression: Array<[number, string]>;
}

export const MODES: Mode[] = [
  { id: 'lidio', name: 'Lidio', scale: [0, 2, 4, 6, 7, 9, 11], emotion: 'Asombro, sueño, magia', description: 'Como el mayor pero con la 4.ª aumentada (♯4): flota y suena fantástico, sin pesadez.', degrees: 'I – II – I – II', progression: [[0, 'maj7'], [2, ''], [0, 'maj7'], [2, '']] },
  { id: 'jonico', name: 'Jónico (mayor)', scale: [0, 2, 4, 5, 7, 9, 11], emotion: 'Alegría, luz, estabilidad', description: 'La escala mayor: brillante y resuelta, la base del pop festivo.', degrees: 'I – IV – V – I', progression: [[0, ''], [5, ''], [7, ''], [0, '']] },
  { id: 'mixo', name: 'Mixolidio', scale: [0, 2, 4, 5, 7, 9, 10], emotion: 'Heroico, relajado, rockero', description: 'Mayor con 7.ª menor (♭7): el ♭VII da un aire heroico o nostálgico.', degrees: 'I – ♭VII – IV – I', progression: [[0, ''], [10, ''], [5, ''], [0, '']] },
  { id: 'dorico', name: 'Dórico', scale: [0, 2, 3, 5, 7, 9, 10], emotion: 'Melancolía con esperanza, “cool”', description: 'Menor con 6.ª mayor: triste pero no hundido; muy usado en jazz, funk y soul.', degrees: 'i – IV – i – ♭VII', progression: [[0, 'm'], [5, ''], [0, 'm'], [10, '']] },
  { id: 'eolico', name: 'Eólico (menor natural)', scale: [0, 2, 3, 5, 7, 8, 10], emotion: 'Tristeza, nostalgia, drama', description: 'La escala menor natural: sombría e introspectiva. La épica menor Am – F – C – G vive aquí.', degrees: 'i – ♭VI – ♭III – ♭VII', progression: [[0, 'm'], [8, ''], [3, ''], [10, '']] },
  { id: 'frigio', name: 'Frigio', scale: [0, 1, 3, 5, 7, 8, 10], emotion: 'Oscuridad, tensión, dramatismo', description: 'Menor con 2.ª menor (♭2): el semitono sobre la tónica da un color oscuro, flamenco y metalero.', degrees: 'i – ♭II – i – ♭VII', progression: [[0, 'm'], [1, ''], [0, 'm'], [10, '']] },
  { id: 'locrio', name: 'Locrio', scale: [0, 1, 3, 5, 6, 8, 10], emotion: 'Inestabilidad, inquietud', description: 'Su 5.ª es disminuida: la tónica es un acorde disminuido y nunca termina de asentarse.', degrees: 'i° – ♭II – ♭iii – i°', progression: [[0, 'dim'], [1, ''], [3, 'm'], [0, 'dim']] },
];
