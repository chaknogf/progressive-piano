import { describe, expect, it } from 'vitest';
import { MODES } from '../src/data/modes';

describe('mode examples', () => {
  it('keeps the modes in luminous-to-dark order', () => {
    expect(MODES.map((mode) => mode.id)).toEqual([
      'lidio', 'jonico', 'mixo', 'dorico', 'eolico', 'frigio', 'locrio',
    ]);
  });

  it('keeps every melody note inside its mode and every duration positive', () => {
    for (const mode of MODES) {
      for (const [semitones, beats] of mode.melody) {
        expect(mode.scale, `${mode.name}: ${semitones}`).toContain((semitones % 12 + 12) % 12);
        expect(beats, `${mode.name}: duration`).toBeGreaterThan(0);
      }
    }
  });
});
