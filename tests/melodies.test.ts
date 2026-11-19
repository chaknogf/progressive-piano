import { describe, expect, it } from 'vitest';
import { MELODY_CATALOG_VERSION, melodies } from '../src/data/melodies/index';
import {
  auditionEvents,
  eventAtBeat,
  evaluatePerformance,
  matchesChord,
  matchesNote,
  noteName,
  practiceRewardId,
  rhythmAccuracy,
  trackLength,
  type PracticeHit,
} from '../src/lib/melodies';


describe('biblioteca de melodías', () => {
  it('prepara la audición: melodía al frente, acordes graves y suaves detrás', () => {
    for (const melody of melodies) {
      const events = auditionEvents(melody);
      const lead = events.filter((event) => event.focus);
      const pad = events.filter((event) => !event.focus);
      expect(lead, melody.id).toHaveLength(melody.melodyTrack.length);
      expect(pad, melody.id).toHaveLength(
        melody.chordTrack.reduce((total, chord) => total + chord.midi.length, 0),
      );
      expect(lead[0], melody.id).toMatchObject({
        midi: melody.melodyTrack[0].midi,
        start: melody.melodyTrack[0].beat,
        dur: melody.melodyTrack[0].duration,
      });
      expect(pad.every((event) => event.vel < lead[0].vel), melody.id).toBe(true);
      expect(pad.every((event) => event.midi < lead[0].midi), melody.id).toBe(true);
      expect(pad.every((event) => event.start >= 0 && event.dur > 0), melody.id).toBe(true);
    }
  });

  it('descubre un JSON por pieza, ordena por order y no expone metadatos', () => {
    expect(MELODY_CATALOG_VERSION).toBe(1);
    expect(melodies.map((melody) => melody.id).slice(0, 5)).toEqual([
      'twinkle', 'ode', 'silent-night', 'pop-loop', 'minuet',
    ]);
    expect(new Set(melodies.map((melody) => melody.id)).size).toBe(melodies.length);
    expect(melodies.every((melody) => !('order' in melody))).toBe(true);
  });

  it('incluye al menos 5 piezas con los campos obligatorios', () => {
    expect(melodies.length).toBeGreaterThanOrEqual(5);
    expect(new Set(melodies.map((melody) => melody.id)).size).toBe(melodies.length);
    for (const melody of melodies) {
      expect(melody.id, melody.id).toBeTruthy();
      expect(melody.title, melody.id).toBeTruthy();
      expect(['Principiante', 'Intermedio']).toContain(melody.difficulty);
      expect(melody.bpm).toBeGreaterThanOrEqual(50);
      expect(melody.melodyTrack.length, melody.id).toBeGreaterThan(0);
      expect(melody.chordTrack.length, melody.id).toBeGreaterThan(0);
    }
  });

  it('mantiene tiempos y alturas coherentes en ambas pistas', () => {
    for (const melody of melodies) {
      for (const track of [melody.melodyTrack, melody.chordTrack]) {
        track.forEach((event, index) => {
          expect(event.duration, `${melody.id} evento ${index}`).toBeGreaterThan(0);
          expect(event.beat, `${melody.id} evento ${index}`).toBeGreaterThanOrEqual(0);
          if (index > 0) {
            const previous = track[index - 1];
            expect(event.beat, `${melody.id} evento ${index}`).toBeGreaterThanOrEqual(previous.beat + previous.duration);
          }
        });
      }
      for (const note of melody.melodyTrack) {
        expect(note.midi).toBeGreaterThanOrEqual(36);
        expect(note.midi).toBeLessThanOrEqual(84);
        expect(note.label).toBeTruthy();
      }
      for (const chord of melody.chordTrack) {
        expect(chord.symbol).toBeTruthy();
        expect(chord.midi.length).toBeGreaterThanOrEqual(3);
        // Se admite duplicar la fundamental en otra octava (arreglos con bajo doblado).
        expect(new Set(chord.midi.map((midi) => midi % 12)).size).toBeGreaterThanOrEqual(3);
      }
      expect(trackLength(melody.melodyTrack) % melody.meter, melody.id).toBe(0);
      expect(trackLength(melody.chordTrack) % melody.meter, melody.id).toBe(0);
    }
  });

  it('busca el evento activo en un pulso dado', () => {
    const melody = melodies[0];
    expect(eventAtBeat(melody.melodyTrack, 0)?.midi).toBe(melody.melodyTrack[0].midi);
    expect(eventAtBeat(melody.melodyTrack, 6.5)?.midi).toBe(67);
    expect(eventAtBeat(melody.melodyTrack, 999)).toBeUndefined();
  });
});

describe('motor de validación MIDI', () => {
  it('exige la octava exacta en modo melodía', () => {
    expect(matchesNote(60, 60)).toBe(true);
    expect(matchesNote(72, 60)).toBe(false);
    expect(matchesNote(67, 72)).toBe(false);
  });

  it('acepta acordes en cualquier octava, pero no notas faltantes', () => {
    const c = [60, 64, 67];
    expect(matchesChord([60, 64, 67], c)).toBe(true);
    expect(matchesChord([72, 76, 79], c)).toBe(true);
    expect(matchesChord([60, 64], c)).toBe(false);
    expect(matchesChord([60, 64, 71], c)).toBe(false);
  });

  it('puntúa el ritmo con tolerancia de dos pulsos', () => {
    expect(rhythmAccuracy(8, 8)).toBe(1);
    expect(rhythmAccuracy(8, 9)).toBe(0.5);
    expect(rhythmAccuracy(8, 10.5)).toBe(0);
  });

  it('calcula precisión, estrellas y XP por acierto melódico y rítmico', () => {
    const perfect: PracticeHit[] = [
      { expected: [60], played: [60], expectedBeat: 0, playedBeat: 0, correct: true },
      { expected: [67], played: [67], expectedBeat: 1, playedBeat: 1, correct: true },
    ];
    const result = evaluatePerformance(perfect, 'Principiante');
    expect(result.accuracy).toBe(100);
    expect(result.stars).toBe(3);
    expect(result.xp).toBe(35); // 25 base + 10 de pieza perfecta

    const mixed: PracticeHit[] = [
      ...perfect,
      { expected: [69], played: [71], expectedBeat: 2, playedBeat: 4, correct: false },
    ];
    const lower = evaluatePerformance(mixed, 'Intermedio');
    expect(lower.accuracy).toBeLessThan(100);
    expect(lower.melodicAccuracy).toBeCloseTo(2 / 3);
    expect(lower.xp).toBeLessThan(50);
    expect(evaluatePerformance([], 'Principiante').accuracy).toBe(0);
  });

  it('nombra notas con octava y genera ids de recompensa estables', () => {
    expect(noteName(60)).toBe('Do4');
    expect(noteName(69)).toBe('La4');
    expect(noteName(72)).toBe('Do5');
    expect(practiceRewardId('twinkle', 'melody')).toBe('melody:twinkle:melody');
  });
});
