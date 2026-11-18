// Motor puro de sesiones de retos: sin APIs del navegador, para poder probarlo
// con Vitest. La UI (ChallengeSession.astro) solo maneja el estado que sale de aquí.

export type ChallengeKind =
  | "oir_elegir"
  | "ver_tocar"
  | "tocar_validar"
  | "tocar_pulso";
export type ChallengeInput = "pantalla" | "microfono" | "midi";

/** Configuración del metrónomo en los retos `tocar_pulso`. */
export interface PulsePattern {
  bpm: number;
  golpes: number;
  /** Margen aceptado alrededor de cada clic, en milisegundos. */
  toleranciaMs?: number;
}

/** Tolerancia por defecto para considerar un pulso «en hora». */
export const DEFAULT_PULSE_TOLERANCE_MS = 180;

export interface Challenge {
  id: string;
  modulo: string;
  tipo: ChallengeKind;
  enunciado: string;
  opciones: string[];
  validacion: string;
  pista: string;
  explicacion: string;
  entrada: ChallengeInput;
  /** Nota MIDI objetivo en retos `ver_tocar` y `tocar_validar`. */
  midi?: number;
  /** Notas MIDI que se reproducen al mostrar el reto. */
  audio?: number[];
  /** Configuración del metrónomo en los retos `tocar_pulso`. */
  pulso?: PulsePattern;
}

export interface ChallengeSession {
  modulo: string;
  /** Cola de ids pendientes. El primero es el reto activo. */
  queue: string[];
  answered: string[];
  correct: string[];
  /** Ids que se volvieron a encolar al final de la sesión (repetición espaciada). */
  requeued: string[];
  /** Veces que se resolvió cada reto (1 como máximo si no se falló). */
  attempts: Record<string, number>;
}

export interface SessionStats {
  answered: number;
  correct: number;
  total: number;
  ratio: number;
  complete: boolean;
  perfect: boolean;
}

/** Umbral de la Etapa 1 para marcar un módulo como completado. */
export const PASS_RATIO = 0.7;
/** Intentos permitidos antes de dejar un reto para el final de la sesión. */
export const MAX_ATTEMPTS = 3;

export function challengesForModule(
  challenges: readonly Challenge[],
  modulo: string,
): Challenge[] {
  return challenges.filter((challenge) => challenge.modulo === modulo);
}

export function createSession(
  challenges: readonly Challenge[],
  modulo: string,
): ChallengeSession {
  return {
    modulo,
    queue: challengesForModule(challenges, modulo).map((challenge) => challenge.id),
    answered: [],
    correct: [],
    requeued: [],
    attempts: {},
  };
}

export function currentChallenge(
  session: ChallengeSession,
  challenges: readonly Challenge[],
): Challenge | null {
  const id = session.queue[0];
  if (!id) return null;
  return challenges.find((challenge) => challenge.id === id) ?? null;
}

/**
 * Registra el desenlace del reto activo: lo saca de la cola y, si se falló,
 * lo vuelve a encolar una sola vez al final (repetición espaciada simple).
 */
export function recordOutcome(
  session: ChallengeSession,
  id: string,
  correct: boolean,
): ChallengeSession {
  if (session.queue[0] !== id) return session;

  const queue = session.queue.slice(1);
  const requeued = [...session.requeued];
  if (!correct && !requeued.includes(id)) {
    queue.push(id);
    requeued.push(id);
  }

  return {
    ...session,
    queue,
    answered: session.answered.includes(id)
      ? session.answered
      : [...session.answered, id],
    correct:
      correct && !session.correct.includes(id)
        ? [...session.correct, id]
        : session.correct,
    requeued,
    attempts: {
      ...session.attempts,
      [id]: (session.attempts[id] ?? 0) + 1,
    },
  };
}

export function sessionStats(session: ChallengeSession): SessionStats {
  const total = new Set(session.answered).size;
  const correct = new Set(session.correct).size;
  const ratio = total ? correct / total : 0;
  return {
    answered: session.answered.length,
    correct,
    total,
    ratio,
    complete: session.queue.length === 0,
    perfect: total > 0 && correct === total,
  };
}

/** true cuando la sesión supera el umbral de aprobado del módulo. */
export function isPassed(stats: SessionStats): boolean {
  return stats.total > 0 && stats.ratio >= PASS_RATIO;
}

/** Progreso 0–1 para la barra de pasos, contando los reencolados. */
export function sessionProgress(session: ChallengeSession, stepCount: number): number {
  const done = session.answered.length;
  const total = Math.max(stepCount, done);
  return total ? Math.min(1, done / total) : 0;
}

// ── Retos de pulso (tocar_pulso) ────────────────────────────────────────
// Lógica sin APIs del navegador: la UI solo compara marcas de tiempo (ms)
// relativas al inicio del metrónomo con estos valores.

/** Milisegundos entre golpes consecutivos. */
export function pulseInterval(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new RangeError("El BPM debe ser un número positivo");
  }
  return 60000 / bpm;
}

/** Tolerancia efectiva: la del patrón o, si falta, la predeterminada. */
export function pulseTolerance(pattern: PulsePattern): number {
  return pattern.toleranciaMs ?? DEFAULT_PULSE_TOLERANCE_MS;
}

/** Marca de tiempo esperada (ms desde el inicio) para cada golpe. */
export function pulseTimes(pattern: PulsePattern): number[] {
  if (!Number.isInteger(pattern.golpes) || pattern.golpes < 1) {
    throw new RangeError("golpes debe ser un entero positivo");
  }
  const interval = pulseInterval(pattern.bpm);
  return Array.from({ length: pattern.golpes }, (_, index) => index * interval);
}

/** true cuando el golpe del usuario cae dentro de la ventana aceptada. */
export function isPulseOnTime(
  tapMs: number,
  expectedMs: number,
  toleranceMs = DEFAULT_PULSE_TOLERANCE_MS,
): boolean {
  if (!Number.isFinite(tapMs) || !Number.isFinite(expectedMs)) return false;
  return Math.abs(tapMs - expectedMs) <= toleranceMs;
}

/** true cuando ya pasó la ventana del golpe y hay que avanzar al siguiente. */
export function isPulsePassed(
  nowMs: number,
  expectedMs: number,
  toleranceMs = DEFAULT_PULSE_TOLERANCE_MS,
): boolean {
  if (!Number.isFinite(nowMs) || !Number.isFinite(expectedMs)) return false;
  return nowMs > expectedMs + toleranceMs;
}
