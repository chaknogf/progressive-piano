export const REWARD_KEY = 'progressive-music:state:v1';

export interface RewardState {
  version: 1;
  xp: number;
  streak: number;
  maxStreak: number;
  auralCorrect: number;
  playCorrect: number;
  awardedQuestions: string[];
  awardedModules: string[];
  badges: string[];
  soundEnabled: boolean;
}

const DEFAULT_STATE: RewardState = {
  version: 1,
  xp: 0,
  streak: 0,
  maxStreak: 0,
  auralCorrect: 0,
  playCorrect: 0,
  awardedQuestions: [],
  awardedModules: [],
  badges: [],
  soundEnabled: false,
};

export const LEVELS = [
  { name: 'Aprendiz', min: 0 },
  { name: 'Intérprete', min: 100 },
  { name: 'Armonista', min: 250 },
  { name: 'Arreglista', min: 500 },
  { name: 'Compositor', min: 1000 },
] as const;

export function readRewardState(): RewardState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = window.localStorage.getItem(REWARD_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<RewardState>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) return { ...DEFAULT_STATE };
    return {
      ...DEFAULT_STATE,
      ...parsed,
      awardedQuestions: Array.isArray(parsed.awardedQuestions) ? parsed.awardedQuestions : [],
      awardedModules: Array.isArray(parsed.awardedModules) ? parsed.awardedModules : [],
      badges: Array.isArray(parsed.badges) ? parsed.badges : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function writeRewardState(state: RewardState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(REWARD_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors */
  }
}

export function getLevel(xp: number): { name: string; next: number | null; progress: number } {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (xp >= level.min) current = level;
    else break;
  }
  const index = LEVELS.indexOf(current);
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
  const span = next ? next.min - current.min : 1;
  const progress = next ? Math.min(1, (xp - current.min) / span) : 1;
  return { name: current.name, next: next?.min ?? null, progress };
}

export function awardQuestionXp(questionId: string, attempt: 1 | 2, isAural: boolean, isPlay: boolean): number {
  const state = readRewardState();
  if (state.awardedQuestions.includes(questionId)) return 0;
  const gain = attempt === 1 ? 10 : 5;
  state.xp += gain;
  state.awardedQuestions.push(questionId);
  state.streak += 1;
  if (state.streak > state.maxStreak) state.maxStreak = state.streak;
  if (state.streak > 0 && state.streak % 3 === 0) state.xp += 5;
  if (isAural) state.auralCorrect += 1;
  if (isPlay) state.playCorrect += 1;
  if (state.playCorrect >= 1 && !state.badges.includes('Primer acorde')) state.badges.push('Primer acorde');
  if (state.auralCorrect >= 10 && !state.badges.includes('Oído atento')) state.badges.push('Oído atento');
  if (state.maxStreak >= 10 && !state.badges.includes('Racha de 10')) state.badges.push('Racha de 10');
  writeRewardState(state);
  return gain + (state.streak % 3 === 0 ? 5 : 0);
}

export function breakStreak(): void {
  const state = readRewardState();
  state.streak = 0;
  writeRewardState(state);
}

export function awardModuleBonus(moduleId: string, perfect: boolean): number {
  const state = readRewardState();
  if (state.awardedModules.includes(moduleId)) return 0;
  let gain = 50;
  if (perfect) gain += 25;
  state.xp += gain;
  state.awardedModules.push(moduleId);
  const badge = `Módulo ${moduleId.toUpperCase()}`;
  if (!state.badges.includes(badge)) state.badges.push(badge);
  writeRewardState(state);
  return gain;
}

export function resetRewardState(): void {
  writeRewardState({ ...DEFAULT_STATE });
}

export function playSuccessSound(): void {
  const state = readRewardState();
  if (!state.soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* ignore */
  }
}
