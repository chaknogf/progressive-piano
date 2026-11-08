import { describe, it, expect } from 'vitest';
import { barDuration, stepDuration, stepTime } from '../src/lib/beats';

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