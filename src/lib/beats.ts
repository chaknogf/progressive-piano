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

export interface PatternFigure {
  beat: number;
  step: number;
  durationSteps: number;
  rest: boolean;
}

/** Converts an active/inactive 16th-step pattern into notes and leading rests per beat. */
export function patternToFigures(
  pattern: readonly boolean[],
  stepsPerBeat = 4,
): PatternFigure[] {
  if (!Number.isInteger(stepsPerBeat) || stepsPerBeat < 1) {
    throw new RangeError('stepsPerBeat debe ser un entero positivo');
  }

  const figures: PatternFigure[] = [];
  const beatCount = Math.ceil(pattern.length / stepsPerBeat);
  for (let beat = 0; beat < beatCount; beat++) {
    const start = beat * stepsPerBeat;
    const end = Math.min(start + stepsPerBeat, pattern.length);
    const active = pattern.flatMap((enabled, step) =>
      enabled && step >= start && step < end ? [step] : [],
    );

    if (active.length === 0) {
      figures.push({ beat, step: start, durationSteps: end - start, rest: true });
      continue;
    }
    if (active[0] > start) {
      figures.push({ beat, step: start, durationSteps: active[0] - start, rest: true });
    }
    active.forEach((step, index) => {
      figures.push({
        beat,
        step,
        durationSteps: (active[index + 1] ?? end) - step,
        rest: false,
      });
    });
  }
  return figures;
}
