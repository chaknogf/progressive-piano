import { describe, it, expect } from 'vitest';
import { barDuration, patternToFigures, stepDuration, stepTime } from '../src/lib/beats';

describe('beats scheduler', () => {
  it('stepDuration at 120 BPM', () => {
    expect(stepDuration(120)).toBeCloseTo(0.125, 5);
  });
  it('swing adds offset on odd steps', () => {
    const base = stepDuration(120);
    expect(stepTime(120, 0, 1)).toBeCloseTo(base, 5);
    expect(stepTime(120, 50, 1)).toBeGreaterThan(base);
    expect(stepTime(120, 50, 0)).toBeCloseTo(base, 5);
  });
  it('barDuration sums 16 steps', () => {
    const dur = barDuration(120, 0, 16);
    expect(dur).toBeCloseTo(2, 5);
  });
});

describe('pattern notation conversion', () => {
  it('converts 16th-step lengths to note figures and leading rests within each beat', () => {
    const pattern = [false, true, false, false, true, false, true, true];
    expect(patternToFigures(pattern)).toEqual([
      { beat: 0, step: 0, durationSteps: 1, rest: true },
      { beat: 0, step: 1, durationSteps: 3, rest: false },
      { beat: 1, step: 4, durationSteps: 2, rest: false },
      { beat: 1, step: 6, durationSteps: 1, rest: false },
      { beat: 1, step: 7, durationSteps: 1, rest: false },
    ]);
  });

  it('emits a full-beat rest for an empty beat and handles a partial final beat', () => {
    expect(patternToFigures([false, false, false, false, true])).toEqual([
      { beat: 0, step: 0, durationSteps: 4, rest: true },
      { beat: 1, step: 4, durationSteps: 1, rest: false },
    ]);
  });
});
