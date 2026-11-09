import { describe, it, expect } from 'vitest';
import {
  centsBetween,
  createPitchDetector,
  foldToReference,
  freqToMidi,
  hz,
  matchString,
  nearestMidiForPitchClass,
  noteName,
  pitchClassOf,
} from '../src/lib/tuner';

const SAMPLE_RATE = 44100;
const FFT = 8192;

function tone(freq: number, harmonics: number[] = [1]): Float32Array {
  const buf = new Float32Array(FFT);
  for (let i = 0; i < buf.length; i += 1) {
    let value = 0;
    harmonics.forEach((amplitude, harmonic) => {
      value +=
        amplitude *
        Math.sin(
          (2 * Math.PI * freq * (harmonic + 1) * i) / SAMPLE_RATE,
        );
    });
    buf[i] = value / harmonics.reduce((sum, amplitude) => sum + amplitude, 0);
  }
  return buf;
}

describe('tuner', () => {
  it('convierte entre MIDI y frecuencia', () => {
    expect(hz(69)).toBe(440);
    expect(hz(69, 432)).toBe(432);
    expect(freqToMidi(440)).toBe(69);
    expect(freqToMidi(432, 432)).toBe(69);
    expect(hz(40)).toBeCloseTo(82.41, 1);
    expect(pitchClassOf(40)).toBe(4);
    expect(noteName(40)).toBe('Mi2');
    expect(noteName(64)).toBe('Mi4');
  });

  it('calcula cents y octavas cercanas', () => {
    expect(centsBetween(440, 440)).toBe(0);
    expect(centsBetween(442, 440)).toBeCloseTo(7.85, 1);
    expect(foldToReference(164.82, 82.41)).toEqual({
      freq: 82.41,
      octave: 1,
      cents: 0,
    });
    expect(foldToReference(329.63, 82.41).octave).toBe(2);
  });

  it('elige la nota cromática más cercana a una octava', () => {
    expect(nearestMidiForPitchClass(9, 60)).toBe(57); // La3, no La4
    expect(nearestMidiForPitchClass(9, 64)).toBe(69); // La4
    expect(nearestMidiForPitchClass(0, 60)).toBe(60);
  });

  it('empareja cuerdas incluso si solo se capta el segundo armónico', () => {
    const strings = [40, 45, 50, 55, 59, 64].map((midi) => hz(midi));
    expect(matchString(hz(40), strings)?.index).toBe(0); // Mi2
    expect(matchString(hz(45), strings)?.index).toBe(1); // La2
    expect(matchString(hz(64), strings)?.index).toBe(5); // Mi4
    expect(matchString(hz(40) * 2, strings)?.index).toBe(0); // Mi2 con armónico
    expect(matchString(hz(50) * 2, strings)?.index).toBe(2); // Re3 con armónico
  });

  it('mantiene la cuerda anterior si la lectura sigue cerca (histéresis)', () => {
    const strings = [110, 113]; // dos objetivos separados ~47 cents
    const nearBorder = 111.5;
    expect(matchString(nearBorder, strings)?.index).toBe(1);
    expect(matchString(nearBorder, strings, 0)?.index).toBe(0);
  });

  it('detecta tonos puros y con armónicos', () => {
    const detect = createPitchDetector();

    const lowE = detect(tone(82.41), SAMPLE_RATE);
    expect(lowE).not.toBeNull();
    expect(lowE!.freq).toBeCloseTo(82.41, 1);
    expect(lowE!.clarity).toBeGreaterThan(0.8);

    const a = detect(tone(110), SAMPLE_RATE);
    expect(a).not.toBeNull();
    expect(a!.freq).toBeCloseTo(110, 1);

    const highE = detect(tone(329.63), SAMPLE_RATE);
    expect(highE).not.toBeNull();
    expect(highE!.freq).toBeCloseTo(329.63, 1);

    const harmonicLowE = detect(tone(82.41, [1, 0.7, 0.4]), SAMPLE_RATE);
    expect(harmonicLowE).not.toBeNull();
    expect(harmonicLowE!.freq).toBeCloseTo(82.41, 1);
  });

  it('rechaza silencio y ruido', () => {
    const detect = createPitchDetector();
    expect(detect(new Float32Array(FFT), SAMPLE_RATE)).toBeNull();

    let seed = 123456789;
    const noise = new Float32Array(FFT);
    for (let i = 0; i < noise.length; i += 1) {
      seed = (1103515245 * seed + 12345) % 2147483648;
      noise[i] = (seed / 2147483648 - 0.5) * 0.3;
    }
    const reading = detect(noise, SAMPLE_RATE);
    expect(reading === null || reading.clarity < 0.65).toBe(true);
  });
});
