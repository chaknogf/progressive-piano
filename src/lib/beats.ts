export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

export function swingOffset(stepIndex: number, swing: number, bpm: number): number {
  if (stepIndex % 2 === 0) return 0;
  return (swing / 100) * stepDuration(bpm);
}

export function stepTime(bpm: number, swing: number, stepIndex: number): number {
  return stepDuration(bpm) + swingOffset(stepIndex, swing, bpm);
}

export function barDuration(bpm: number, swing: number, steps = 16): number {
  let total = 0;
  for (let i = 0; i < steps; i++) total += stepTime(bpm, swing, i);
  return total;
}