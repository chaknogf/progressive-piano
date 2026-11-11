export const PROGRESS_KEY = 'progressive-music:progress';

export interface ModuleProgress {
  completed: boolean;
  score?: number;
  updatedAt: number;
}

export type ProgressMap = Record<string, ModuleProgress>;

export function readProgress(): ProgressMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeProgress(map: ProgressMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* ignore storage errors (private mode, quota) */
  }
}

export function setModuleProgress(id: string, patch: Partial<ModuleProgress>): ModuleProgress {
  const map = readProgress();
  const current = map[id] ?? { completed: false, updatedAt: 0 };
  const next: ModuleProgress = { ...current, ...patch, updatedAt: Date.now() };
  map[id] = next;
  writeProgress(map);
  return next;
}

export function getModuleProgress(id: string): ModuleProgress {
  return readProgress()[id] ?? { completed: false, updatedAt: 0 };
}

export function isModuleCompleted(id: string): boolean {
  return Boolean(readProgress()[id]?.completed);
}