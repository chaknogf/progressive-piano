import { describe, expect, it } from "vitest";
import challengesData from "../src/data/challenges.json";
import {
  challengesForModule,
  createSession,
  currentChallenge,
  DEFAULT_PULSE_TOLERANCE_MS,
  isPassed,
  isPulseOnTime,
  isPulsePassed,
  pulseInterval,
  pulseTimes,
  pulseTolerance,
  recordOutcome,
  sessionStats,
  type Challenge,
  type PulsePattern,
} from "../src/lib/challenges";

const challenges: Challenge[] = [
  {
    id: "m1_a",
    modulo: "M1",
    tipo: "oir_elegir",
    enunciado: "A?",
    opciones: ["A", "B"],
    validacion: "A",
    pista: "p",
    explicacion: "e",
    entrada: "pantalla",
  },
  {
    id: "m1_b",
    modulo: "M1",
    tipo: "ver_tocar",
    enunciado: "B?",
    opciones: [],
    validacion: "Do",
    pista: "p",
    explicacion: "e",
    entrada: "pantalla",
    midi: 60,
  },
  {
    id: "m2_a",
    modulo: "M2",
    tipo: "tocar_validar",
    enunciado: "C?",
    opciones: [],
    validacion: "La4",
    pista: "p",
    explicacion: "e",
    entrada: "microfono",
    midi: 69,
  },
];

describe("motor de retos", () => {
  it("filtra los retos por módulo y crea la cola", () => {
    expect(challengesForModule(challenges, "M1").map((c) => c.id)).toEqual([
      "m1_a",
      "m1_b",
    ]);
    const session = createSession(challenges, "M1");
    expect(session.queue).toEqual(["m1_a", "m1_b"]);
    expect(currentChallenge(session, challenges)?.id).toBe("m1_a");
  });

  it("vuelve a encolar un reto fallado una sola vez al final", () => {
    let session = createSession(challenges, "M1");
    session = recordOutcome(session, "m1_a", false);
    expect(session.queue).toEqual(["m1_b", "m1_a"]);
    expect(session.requeued).toEqual(["m1_a"]);

    session = recordOutcome(session, "m1_b", true);
    expect(session.queue).toEqual(["m1_a"]);

    // Un segundo fallo del mismo reto no lo duplica en la cola.
    session = recordOutcome(session, "m1_a", false);
    expect(session.queue).toEqual([]);
    expect(session.requeued).toEqual(["m1_a"]);
  });

  it("calcula aciertos y aplica el umbral del 70%", () => {
    let session = createSession(challenges, "M1");
    session = recordOutcome(session, "m1_a", true);
    session = recordOutcome(session, "m1_b", false);
    const stats = sessionStats(session);
    expect(stats).toMatchObject({ total: 2, correct: 1, ratio: 0.5 });
    expect(isPassed(stats)).toBe(false);

    let passed = createSession(challenges, "M1");
    passed = recordOutcome(passed, "m1_a", true);
    passed = recordOutcome(passed, "m1_b", true);
    expect(isPassed(sessionStats(passed))).toBe(true);
  });

  it("ignora desenlaces de un reto que no está activo", () => {
    const session = createSession(challenges, "M1");
    expect(recordOutcome(session, "m1_b", true)).toBe(session);
  });
});

describe("validación de pulso", () => {
  const pattern: PulsePattern = { bpm: 80, golpes: 4, toleranciaMs: 200 };

  it("calcula el intervalo y las marcas esperadas desde el inicio", () => {
    expect(pulseInterval(80)).toBe(750);
    expect(pulseInterval(120)).toBe(500);
    expect(pulseTimes(pattern)).toEqual([0, 750, 1500, 2250]);
    expect(pulseTimes({ bpm: 100, golpes: 3 })).toEqual([0, 600, 1200]);
  });

  it("usa la tolerancia del patrón o la predeterminada", () => {
    expect(pulseTolerance(pattern)).toBe(200);
    expect(pulseTolerance({ bpm: 90, golpes: 4 })).toBe(DEFAULT_PULSE_TOLERANCE_MS);
  });

  it("acepta golpes dentro de la ventana y rechaza los que se pasan", () => {
    expect(isPulseOnTime(740, 750, 200)).toBe(true);
    expect(isPulseOnTime(940, 750, 200)).toBe(true);
    expect(isPulseOnTime(951, 750, 200)).toBe(false);
    expect(isPulseOnTime(549, 750, 200)).toBe(false);
    expect(isPulsePassed(950, 750, 200)).toBe(false);
    expect(isPulsePassed(951, 750, 200)).toBe(true);
    expect(isPulseOnTime(Number.NaN, 750, 200)).toBe(false);
  });

  it("rechaza patrones inválidos", () => {
    expect(() => pulseInterval(0)).toThrow(RangeError);
    expect(() => pulseTimes({ bpm: 80, golpes: 0 })).toThrow(RangeError);
  });
});

describe("banco de retos de las Etapas 2–3", () => {
  const bank = challengesData.challenges as unknown as Challenge[];
  const expected = {
    M1: 8, M2: 7, M3: 8,
    M4: 5, M5: 5, M6: 5, M7: 5, M8: 5,
    M9: 5, M10: 5, M11: 5, M12: 5, M13: 5,
  } as const;

  it("incluye 50 retos nuevos repartidos entre M4 y M13", () => {
    expect(bank).toHaveLength(73);
    for (const [modulo, count] of Object.entries(expected)) {
      expect(challengesForModule(bank, modulo), modulo).toHaveLength(count);
    }
    expect(new Set(bank.map((challenge) => challenge.id)).size).toBe(bank.length);
  });

  it("cubre los cuatro tipos de interacción", () => {
    const tipos = new Set(bank.map((challenge) => challenge.tipo));
    expect([...tipos].sort()).toEqual([
      "oir_elegir",
      "tocar_pulso",
      "tocar_validar",
      "ver_tocar",
    ]);
    expect(bank.filter((challenge) => challenge.tipo === "tocar_pulso")).toHaveLength(8);
  });

  it("prioriza micrófono y MIDI en M4–M13", () => {
    const pending = bank.filter((challenge) =>
      ["M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12", "M13"].includes(challenge.modulo),
    );
    expect(pending).toHaveLength(50);
    expect(pending.filter((challenge) => challenge.tipo === "tocar_validar")).toHaveLength(17);
    expect(pending.filter((challenge) => challenge.tipo === "ver_tocar")).toHaveLength(19);
    for (const challenge of pending) {
      if (challenge.tipo === "tocar_validar") {
        expect(challenge.entrada, challenge.id).toBe("microfono");
      }
      if (challenge.tipo === "ver_tocar") {
        expect(challenge.entrada, challenge.id).toBe("midi");
      }
    }
  });

  it("mantiene los campos obligatorios y patrones de pulso válidos", () => {
    for (const challenge of bank) {
      expect(challenge.id, challenge.id).toBeTruthy();
      expect(challenge.enunciado, challenge.id).toBeTruthy();
      expect(challenge.pista, challenge.id).toBeTruthy();
      expect(challenge.explicacion, challenge.id).toBeTruthy();
      expect(challenge.validacion, challenge.id).toBeTruthy();
      expect(["pantalla", "microfono", "midi"], challenge.id).toContain(challenge.entrada);
      if (challenge.tipo === "oir_elegir") {
        expect(challenge.opciones, challenge.id).toContain(challenge.validacion);
      }
      if (challenge.tipo === "tocar_pulso") {
        expect(challenge.pulso, challenge.id).toBeDefined();
        expect(pulseTimes(challenge.pulso!), challenge.id).toHaveLength(
          challenge.pulso!.golpes,
        );
      }
      if (challenge.tipo === "ver_tocar" || challenge.tipo === "tocar_validar") {
        expect(challenge.midi, challenge.id).toEqual(expect.any(Number));
      }
    }
  });
});
