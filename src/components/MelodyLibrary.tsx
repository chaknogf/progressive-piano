// src/components/MelodyLibrary.tsx
// Etapa 3B · Isla Preact de la biblioteca de melodías y práctica MIDI.
// Acepta teclado QWERTY, pantalla y controladores MIDI por Web MIDI API.
import { useEffect, useRef, useState } from 'preact/hooks';
import type {
  ChordEvent,
  Melody,
  MelodyNote,
  PracticeHit,
  PracticeMode,
  PracticeResult,
} from '../lib/melodies';
import {
  auditionEvents,
  evaluatePerformance,
  matchesChord,
  matchesNote,
  noteName,
  practiceRewardId,
  trackLength,
} from '../lib/melodies';
import { awardPracticeXp } from '../lib/rewards';
import { audioContext } from '../lib/audio';
import { playNote, playPiano } from '../lib/piano-engine';

interface Props {
  melodies: Melody[];
}

type Screen = 'menu' | 'mode' | 'play' | 'result';
type TrackEvent = MelodyNote | ChordEvent;

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_KEYS = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
];
// Cuatro octavas (Do2–Do6, MIDI 36–84): cubre los registros graves de las piezas
// del catálogo y deja margen para melodías nuevas. QWERTY sigue en el centro (Do4–Sol5).
const FIRST_MIDI = 36;
const LAST_MIDI = 84;
const ALL_MIDIS = Array.from({ length: LAST_MIDI - FIRST_MIDI + 1 }, (_, i) => FIRST_MIDI + i);
const WHITE_MIDIS = ALL_MIDIS.filter((midi) => WHITE_PCS.includes(midi % 12));
const BLACK_WIDTH = 3.4;
const BLACK_MIDIS = ALL_MIDIS.filter((midi) => !WHITE_PCS.includes(midi % 12)).map((midi) => ({
  midi,
  left: (WHITE_MIDIS.filter((white) => white < midi).length / WHITE_MIDIS.length) * 100 - BLACK_WIDTH / 2,
}));

// Dos octavas en el centro del teclado: z–m = Do4–Si4, q–t = Do5–Sol5.
const QWERTY: Record<string, number> = {
  z: 60, s: 61, x: 62, d: 63, c: 64, v: 65, g: 66, b: 67, h: 68, n: 69, j: 70, m: 71,
  q: 72, '2': 73, w: 74, '3': 75, e: 76, r: 77, '5': 78, t: 79,
};
const KEY_HINT: Record<number, string> = Object.entries(QWERTY).reduce<Record<number, string>>(
  (hints, [key, midi]) => {
    hints[midi] = key.toUpperCase();
    return hints;
  },
  {},
);

function isChord(event: TrackEvent): event is ChordEvent {
  return Array.isArray((event as ChordEvent).midi);
}

function expectedMidis(event: TrackEvent): number[] {
  return isChord(event) ? event.midi : [(event as MelodyNote).midi];
}

function eventLabel(event: TrackEvent): string {
  if (isChord(event)) return event.symbol;
  return `${event.label} (${noteName(event.midi)})`;
}

/** Feedback de tempo: el pulso esperado contra el real. */
function timingHint(expectedBeat: number, playedBeat: number): string {
  const error = playedBeat - expectedBeat;
  if (Math.abs(error) <= 0.2) return 'En hora ✓';
  return `${error < 0 ? 'Adelantado' : 'Atrasado'} ${Math.abs(error).toFixed(2)} pulsos`;
}

function clickMetronome(accent: boolean): void {
  try {
    const ctx = audioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1180 : 820;
    gain.gain.setValueAtTime(accent ? 0.08 : 0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* el metrónomo es opcional si no hay Web Audio */
  }
}

export default function MelodyLibrary({ melodies }: Props) {
  const [screen, setScreenState] = useState<Screen>('menu');
  const [selected, setSelectedState] = useState<Melody | null>(null);
  const [mode, setModeState] = useState<PracticeMode | null>(null);
  const [bpm, setBpmState] = useState(96);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoopState] = useState(true);
  const [cycle, setCycle] = useState(1);
  const [beat, setBeat] = useState(0);
  const [step, setStepState] = useState(0);
  const [hits, setHitsState] = useState<PracticeHit[]>([]);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [feedback, setFeedback] = useState('Elige una pieza para empezar.');
  const [midiStatus, setMidiStatus] = useState('MIDI: conectando…');
  const [demoActive, setDemoActiveState] = useState(false);
  const [lastPlayed, setLastPlayed] = useState<number[]>([]);
  const [wasCorrect, setWasCorrect] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState(-1);

  const screenRef = useRef<Screen>('menu');
  const selectedRef = useRef<Melody | null>(null);
  const modeRef = useRef<PracticeMode | null>(null);
  const bpmRef = useRef(96);
  const loopRef = useRef(true);
  const stepRef = useRef(0);
  const hitsRef = useRef<PracticeHit[]>([]);
  const missesRef = useRef(0);
  const chordBufferRef = useRef<number[]>([]);
  const elapsedRef = useRef({ accumulated: 0, startedAt: 0, running: false });
  const metronomeRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const highlightTimerRef = useRef<number | null>(null);
  const demoActiveRef = useRef(false);
  const demoTimersRef = useRef<number[]>([]);
  const previewCancelRef = useRef<(() => void) | null>(null);
  const previewTokenRef = useRef(0);

  function setScreen(next: Screen) {
    screenRef.current = next;
    setScreenState(next);
  }
  function setSelected(next: Melody | null) {
    selectedRef.current = next;
    setSelectedState(next);
  }
  function setMode(next: PracticeMode | null) {
    modeRef.current = next;
    setModeState(next);
  }
  function setBpm(next: number) {
    bpmRef.current = next;
    setBpmState(next);
    // Cambiar de tempo a mitad de vuelta reinicia el reloj para no mezclar pulsos.
    const clock = elapsedRef.current;
    if (clock.running) {
      clock.accumulated = 0;
      clock.startedAt = performance.now();
      beatCountRef.current = 0;
      startMetronome();
      // La demo se programa en pulsos: al cambiar el BPM hay que rearmarla.
      if (demoActiveRef.current) startDemo();
    }
  }
  function setLoop(next: boolean) {
    loopRef.current = next;
    setLoopState(next);
  }
  function setDemoActive(next: boolean) {
    demoActiveRef.current = next;
    setDemoActiveState(next);
  }
  function setStep(next: number) {
    stepRef.current = next;
    setStepState(next);
  }
  function setHits(next: PracticeHit[]) {
    hitsRef.current = next;
    setHitsState(next);
  }

  /** Corta una audición en curso (o evita que una anterior pise la nueva). */
  function stopPreview() {
    previewTokenRef.current += 1;
    previewCancelRef.current?.();
    previewCancelRef.current = null;
    setPreviewId(null);
    setPreviewStep(-1);
  }

  /**
   * Escucha la pieza completa una sola vez: melodía + acordes al BPM propio.
   * `playPiano` termina solo al acabar el track; pulsar de nuevo lo detiene.
   */
  function togglePreview(melody: Melody) {
    if (previewId === melody.id) {
      stopPreview();
      return;
    }
    stopPreview();
    const token = previewTokenRef.current;
    setPreviewId(melody.id);
    setPreviewStep(-1);
    previewCancelRef.current = playPiano(auditionEvents(melody), melody.bpm, {
      onNote: (index) => {
        if (previewTokenRef.current === token) setPreviewStep(index);
      },
      onEnd: () => {
        if (previewTokenRef.current !== token) return;
        previewCancelRef.current = null;
        setPreviewId(null);
        setPreviewStep(-1);
      },
    });
  }

  function track(): TrackEvent[] {
    const melody = selectedRef.current;
    if (!melody) return [];
    return modeRef.current === 'chords' ? melody.chordTrack : melody.melodyTrack;
  }

  function elapsedBeats(): number {
    const clock = elapsedRef.current;
    const ms = clock.accumulated + (clock.running ? performance.now() - clock.startedAt : 0);
    return ms / (60_000 / bpmRef.current);
  }

  function stopMetronome() {
    if (metronomeRef.current !== null) window.clearInterval(metronomeRef.current);
    metronomeRef.current = null;
  }

  function startMetronome() {
    stopMetronome();
    const interval = 60_000 / bpmRef.current;
    metronomeRef.current = window.setInterval(() => {
      const meter = selectedRef.current?.meter ?? 4;
      const current = beatCountRef.current % meter;
      clickMetronome(current === 0);
      setBeat(current);
      beatCountRef.current += 1;
    }, interval);
  }

  function pause() {
    const clock = elapsedRef.current;
    if (clock.running) clock.accumulated += performance.now() - clock.startedAt;
    clock.running = false;
    stopMetronome();
    stopDemo();
    setPlaying(false);
  }

  function play() {
    const clock = elapsedRef.current;
    // Play siempre arranca desde el principio para que la demo y el teclado coincidan.
    clock.accumulated = 0;
    clock.startedAt = performance.now();
    clock.running = true;
    beatCountRef.current = 0;
    setBeat(0);
    startMetronome();
    setPlaying(true);
    startDemo();
    setFeedback('Mira cómo se toca: el teclado toca la melodía. Después, repite tú.');
  }

  function reset() {
    pause();
    elapsedRef.current.accumulated = 0;
    beatCountRef.current = 0;
    chordBufferRef.current = [];
    missesRef.current = 0;
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    setLastPlayed([]);
    setWasCorrect(true);
    setHits([]);
    setStep(0);
    setCycle(1);
    setBeat(0);
    setResult(null);
    setEarnedXp(0);
    setFeedback('Listo. Pulsa ▶ y sigue la cascada.');
  }

  /** Cierra una vuelta y reinicia el recorrido sin cortar el metrónomo. */
  function completeCycle() {
    const misses: PracticeHit[] = Array.from({ length: missesRef.current }, () => ({
      expected: [],
      played: [],
      expectedBeat: 0,
      playedBeat: 0,
      correct: false,
    }));
    setHits([...hitsRef.current, ...misses]);
    missesRef.current = 0;
    chordBufferRef.current = [];
    const clock = elapsedRef.current;
    clock.accumulated = 0;
    clock.startedAt = performance.now();
    beatCountRef.current = 0;
    setStep(0);
    setCycle(cycle + 1);
    setFeedback(`Vuelta ${cycle + 1} en marcha · mantén el pulso de ${bpmRef.current} BPM.`);
  }

  function finish() {
    pause();
    const melody = selectedRef.current;
    if (!melody) return;
    const misses: PracticeHit[] = Array.from({ length: missesRef.current }, () => ({
      expected: [],
      played: [],
      expectedBeat: 0,
      playedBeat: 0,
      correct: false,
    }));
    const final = evaluatePerformance([...hitsRef.current, ...misses], melody.difficulty);
    const xp = awardPracticeXp(practiceRewardId(melody.id, modeRef.current ?? 'melody'), final.xp);
    setResult(final);
    setEarnedXp(xp);
    setScreen('result');
    setFeedback(`Precisión ${final.accuracy}% · ${final.correct}/${final.total} aciertos.`);
  }

  function highlight(midis: number[], correct: boolean, ms = 1200) {
    setLastPlayed(midis);
    setWasCorrect(correct);
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    // 1,2 s para que el acierto/fallo se vea con calma (y sobreviva a un frame lento).
    highlightTimerRef.current = window.setTimeout(() => setLastPlayed([]), ms);
  }

  function stopDemo(): void {
    demoTimersRef.current.forEach((id) => window.clearTimeout(id));
    demoTimersRef.current = [];
    if (demoActiveRef.current) setDemoActive(false);
  }

  /** Mantiene visible la nota tocada aunque el teclado tenga cuatro octavas. */
  function scrollKeysIntoView(midis: number[]): void {
    const scrollEl = document.getElementById('ml-keys-scroll');
    const targetMidi = midis[Math.floor(midis.length / 2)] ?? midis[0];
    if (!scrollEl || targetMidi === undefined) return;
    const keyEl = scrollEl.querySelector<HTMLElement>(`[data-ml-midi="${targetMidi}"]`);
    if (!keyEl) return;
    const left = keyEl.offsetLeft - scrollEl.clientWidth / 2 + keyEl.offsetWidth / 2;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollEl.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /**
   * Demo automática: suena y resalta cada nota en su pulso exacto con el metrónomo.
   * Al terminar, el reloj vuelve a cero para que la práctica empiece en el paso 1.
   */
  function startDemo(): void {
    stopDemo();
    const active = track();
    if (!active.length) return;
    setDemoActive(true);
    setStep(0);
    const msPerBeat = 60_000 / bpmRef.current;

    active.forEach((event, index) => {
      const midis = expectedMidis(event);
      const timer = window.setTimeout(() => {
        if (!demoActiveRef.current) return;
        const seconds = Math.max(0.15, (event.duration * msPerBeat) / 1000);
        midis.forEach((midi) => playNote(midi, seconds, 0.65));
        highlight(midis, true, Math.min(1200, Math.round(seconds * 1000) + 180));
        setStep(Math.min(index + 1, active.length - 1));
        scrollKeysIntoView(midis);
      }, event.beat * msPerBeat);
      demoTimersRef.current.push(timer);
    });

    const endTimer = window.setTimeout(() => {
      if (!demoActiveRef.current) return;
      stopDemo();
      const clock = elapsedRef.current;
      clock.accumulated = 0;
      clock.startedAt = performance.now();
      beatCountRef.current = 0;
      setBeat(0);
      setStep(0);
      setLastPlayed([]);
      chordBufferRef.current = [];
      setFeedback('Demo terminada. Ahora toca tú la nota resaltada.');
    }, trackLength(active) * msPerBeat + 250);
    demoTimersRef.current.push(endTimer);
  }

  function handleNote(midi: number) {
    // Tocar una tecla toma el control: corta la demo y empieza la práctica en el paso 1.
    if (demoActiveRef.current) {
      stopDemo();
      const clock = elapsedRef.current;
      clock.accumulated = 0;
      clock.startedAt = performance.now();
      beatCountRef.current = 0;
      setBeat(0);
      setStep(0);
      setFeedback('Tu turno: sigue la nota resaltada.');
    }
    const current = track();
    const event = current[stepRef.current];
    if (!event) return;

    if (modeRef.current === 'melody') {
      const note = event as MelodyNote;
      const correct = matchesNote(midi, note.midi);
      highlight([midi], correct);
      playNote(midi, 0.5, 0.75);
      if (!correct) {
        missesRef.current += 1;
        setFeedback(`Casi 🎹 — esperaba ${note.label} (${noteName(note.midi)}). Prueba otra vez.`);
        return;
      }
      const playedBeat = elapsedBeats();
      setHits([...hitsRef.current, {
        expected: [note.midi],
        played: [midi],
        expectedBeat: note.beat,
        playedBeat,
        correct: true,
      }]);
      setFeedback(`¡Bien! ${note.label} (${noteName(midi)}). ${timingHint(note.beat, playedBeat)}`);
    } else {
      const chord = event as ChordEvent;
      const expectedPcs = new Set(chord.midi.map((note) => ((note % 12) + 12) % 12));
      if (!expectedPcs.has(((midi % 12) + 12) % 12)) {
        chordBufferRef.current = [];
        highlight([midi], false);
        missesRef.current += 1;
        setFeedback(`Casi 🎹 — el compás pide ${chord.symbol}. Prueba sus notas.`);
        return;
      }
      const buffer = chordBufferRef.current;
      if (!buffer.includes(midi)) buffer.push(midi);
      highlight([...buffer], true);
      playNote(midi, 0.7, 0.7);
      if (!matchesChord(buffer, chord.midi)) {
        setFeedback(`${chord.symbol}: llevas ${buffer.length} de ${chord.midi.length} notas. Sigue.`);
        return;
      }
      const playedBeat = elapsedBeats();
      setHits([...hitsRef.current, {
        expected: chord.midi,
        played: [...buffer],
        expectedBeat: chord.beat,
        playedBeat,
        correct: true,
      }]);
      setFeedback(`¡Acorde ${chord.symbol} completo! ${timingHint(chord.beat, playedBeat)}`);
      chordBufferRef.current = [];
    }

    if (stepRef.current + 1 >= current.length) {
      if (loopRef.current) completeCycle();
      else {
        setStep(stepRef.current + 1);
        finish();
      }
    } else {
      setStep(stepRef.current + 1);
    }
  }

  function handleMidiMessage(event: MIDIMessageEvent) {
    const [status, note, velocity] = Array.from(event.data ?? []);
    if (status !== undefined && (status & 0xf0) === 0x90 && note !== undefined && (velocity ?? 0) > 0) {
      handleNote(note);
    }
  }

  async function connectMidi() {
    const nav = navigator as Navigator & { requestMIDIAccess?: () => Promise<MIDIAccess> };
    if (!nav.requestMIDIAccess) {
      setMidiStatus('MIDI no disponible · usa QWERTY o la pantalla');
      return;
    }
    try {
      const access = await nav.requestMIDIAccess();
      const attach = () => {
        let count = 0;
        access.inputs.forEach((input) => {
          count += 1;
          input.onmidimessage = handleMidiMessage;
        });
        setMidiStatus(count ? `MIDI conectado · ${count} dispositivo(s)` : 'MIDI listo · conecta tu teclado');
      };
      attach();
      access.onstatechange = attach;
    } catch {
      setMidiStatus('MIDI sin permiso · usa QWERTY o la pantalla');
    }
  }

  useEffect(() => {
    void connectMidi();
    return () => {
      pause();
      stopDemo();
      stopPreview();
      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const midi = QWERTY[event.key.toLowerCase()];
      if (midi === undefined) return;
      event.preventDefault();
      handleNote(midi);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeTrack = selected ? (mode === 'chords' ? selected.chordTrack : selected.melodyTrack) : [];
  const currentEvent: TrackEvent | undefined = activeTrack[step];
  const cascade = activeTrack.slice(step, step + 4);
  const cascadeLevel = new Map<number, number>();
  cascade.forEach((event, index) => {
    expectedMidis(event).forEach((midi) => {
      if (!cascadeLevel.has(midi)) cascadeLevel.set(midi, index);
    });
  });
  const expectedSet = new Set(currentEvent ? expectedMidis(currentEvent) : []);
  const length = selected ? trackLength(activeTrack) : 0;
  const progress = activeTrack.length ? Math.round((step / activeTrack.length) * 100) : 0;

  const pieceCards = melodies.map((melody) => {
    const auditioning = previewId === melody.id;
    const windowStart = Math.max(0, Math.min(previewStep - 3, melody.melodyTrack.length - 12));
    const visibleNotes = melody.melodyTrack.slice(windowStart, windowStart + 12);
    const previewProgress = melody.melodyTrack.length
      ? Math.max(0, ((previewStep + 1) / melody.melodyTrack.length) * 100)
      : 0;
    return (
      <div class="ml-piece" data-ml-piece-card={melody.id}>
        <button
          type="button"
          class="ml-piece-select"
          data-ml-piece={melody.id}
          onClick={() => {
            stopPreview();
            setSelected(melody);
            setBpm(melody.bpm);
            reset();
            setScreen('mode');
            setFeedback(`Elegiste «${melody.title}». ¿Qué quieres practicar?`);
          }}
        >
          <span class="ml-piece-top">
            <span class="ml-difficulty" data-level={melody.difficulty}>{melody.difficulty}</span>
            <span class="ml-piece-bpm">{melody.bpm} BPM</span>
          </span>
          <strong>{melody.title}</strong>
          <small>{melody.key} · {melody.meter}/4 · {trackLength(melody.melodyTrack)} notas</small>
          <span class="ml-piece-cta">Elegir <span aria-hidden="true">→</span></span>
        </button>
        <div class="ml-preview" data-ml-preview={melody.id}>
          <button
            type="button"
            class={`ml-preview-btn${auditioning ? ' is-on' : ''}`}
            data-ml-preview-btn={melody.id}
            aria-label={`${auditioning ? 'Detener' : 'Escuchar'} ${melody.title}`}
            onClick={() => togglePreview(melody)}
          >
            {auditioning ? '■ Detener' : '▶ Cómo suena'}
          </button>
          {auditioning && (
            <div class="ml-preview-live" role="status" aria-live="polite">
              <div class="ml-preview-notes" aria-label="Melodía sonando">
                {visibleNotes.map((note, index) => {
                  const absolute = windowStart + index;
                  return (
                    <span
                      key={absolute}
                      class={`ml-preview-note${absolute === previewStep ? ' is-on' : ''}`}
                      data-ml-preview-note={String(absolute)}
                    >
                      {note.label}
                    </span>
                  );
                })}
              </div>
              <span class="ml-preview-bar"><i style={{ width: `${previewProgress}%` }} /></span>
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <section class="ml-library" id="ml-root" aria-label="Biblioteca de melodías y práctica MIDI">
      <header class="ml-header">
        <div>
          <span class="ml-kicker">BIBLIOTECA DE MELODÍAS · PRÁCTICA MIDI</span>
          <h2 class="ml-title">Toca la pieza, nota a nota o acorde a acorde</h2>
          <p class="ml-sub">Teclado QWERTY, pantalla o controlador MIDI por USB. Tu ritmo manda.</p>
        </div>
        <span class="ml-midi-badge" id="ml-midi-status" title={midiStatus}>{midiStatus}</span>
      </header>

      {screen === 'menu' && (
        <div class="ml-menu" id="ml-menu">
          <p class="ml-section-label">Elige una pieza · pulsa «Cómo suena» para oírla antes de practicar</p>
          <div class="ml-pieces">{pieceCards}</div>
        </div>
      )}

      {screen === 'mode' && selected && (
        <div class="ml-mode" id="ml-mode" role="dialog" aria-modal="true" aria-labelledby="ml-mode-title">
          <div class="ml-mode-head">
            <div>
              <p class="ml-section-label">{selected.title} · {selected.bpm} BPM</p>
              <h3 id="ml-mode-title">¿Qué quieres practicar?</h3>
            </div>
            <button
              type="button"
              class={`ml-preview-btn${previewId === selected.id ? ' is-on' : ''}`}
              data-ml-preview-btn={selected.id}
              aria-label={`${previewId === selected.id ? 'Detener' : 'Escuchar'} ${selected.title}`}
              onClick={() => togglePreview(selected)}
            >
              {previewId === selected.id ? '■ Detener' : '▶ Cómo suena'}
            </button>
          </div>
          <div class="ml-mode-grid">
            <button
              type="button"
              class="ml-mode-card"
              id="ml-mode-melody"
              onClick={() => {
                stopPreview();
                setMode('melody');
                reset();
                setScreen('play');
              }}
            >
              <span class="ml-mode-icon" aria-hidden="true">🎵</span>
              <strong>Practicar Melodía</strong>
              <small>Una nota cada vez, en la octava exacta. Ideal para afinar el oído.</small>
              <span class="ml-mode-cta">Nota por nota →</span>
            </button>
            <button
              type="button"
              class="ml-mode-card"
              id="ml-mode-chords"
              onClick={() => {
                stopPreview();
                setMode('chords');
                reset();
                setScreen('play');
              }}
            >
              <span class="ml-mode-icon" aria-hidden="true">🎹</span>
              <strong>Practicar Acordes</strong>
              <small>Un bloque armónico por compás, en simultáneo o en arpegio guiado.</small>
              <span class="ml-mode-cta">Acorde por compás →</span>
            </button>
          </div>
          <button type="button" class="ml-ghost" id="ml-back-mode" onClick={() => { stopPreview(); setScreen('menu'); }}>
            ← Volver al menú
          </button>
        </div>
      )}

      {screen === 'play' && selected && (
        <div class="ml-session" id="ml-session">
          <div class="ml-transport">
            <button type="button" class="ml-play" id="ml-play" aria-pressed={playing} onClick={() => (playing ? pause() : play())}>
              {playing ? (demoActive ? '❚❚ Pausa · demo' : '❚❚ Pausa') : '▶ Play'}
            </button>
            <button type="button" class="ml-icon ml-stop" id="ml-stop" aria-label="Detener y ver resultado" title="Detener y ver resultado" onClick={finish}>⏹</button>
            <button type="button" class="ml-icon" id="ml-restart" aria-label="Reiniciar pieza" title="Reiniciar" onClick={reset}>↺</button>
            <button
              type="button"
              class={`ml-loop${loop ? ' is-on' : ''}`}
              id="ml-loop"
              aria-pressed={loop}
              title="Repetir la pieza en bucle hasta que detenes"
              onClick={() => setLoop(!loop)}
            >
              ⟳ Bucle {loop ? 'ON' : 'OFF'}
            </button>
            <div class="ml-tempo" role="group" aria-label="Cambiar BPM">
              <button type="button" class="ml-icon" id="ml-bpm-down" aria-label="Bajar BPM" onClick={() => setBpm(Math.max(50, bpm - 4))}>−</button>
              <span><b id="ml-bpm-value">{bpm}</b> BPM</span>
              <button type="button" class="ml-icon" id="ml-bpm-up" aria-label="Subir BPM" onClick={() => setBpm(Math.min(180, bpm + 4))}>+</button>
            </div>
            <button type="button" class="ml-ghost ml-transport-back" id="ml-back" onClick={() => { pause(); setScreen('mode'); }}>
              ← Menú
            </button>
          </div>

          <div class="ml-progress" role="progressbar" aria-label="Progreso de la pieza" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
            <i id="ml-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div
            class="ml-stage"
            id="ml-stage"
            data-expected={JSON.stringify(
              currentEvent ? { midi: expectedMidis(currentEvent), beat: currentEvent.beat, label: eventLabel(currentEvent) } : null,
            )}
            data-step={String(step)}
            data-cycle={String(cycle)}
            data-beat={String(beat)}
            data-demo={demoActive ? '1' : '0'}
          >
            <div class="ml-stage-info">
              <span class="ml-kind">{mode === 'chords' ? 'ACORDE POR COMPÁS' : 'NOTA POR NOTA'}</span>
              {demoActive && <span class="ml-demo-badge">▶ VIENDO LA DEMO</span>}
              <strong class="ml-expected" id="ml-expected">
                {currentEvent ? eventLabel(currentEvent) : '¡Pieza terminada!'}
              </strong>
              <span class="ml-position">
                Vuelta {cycle} · paso {Math.min(step + 1, activeTrack.length)} de {activeTrack.length} · compás {currentEvent ? Math.floor(currentEvent.beat / (selected.meter || 4)) + 1 : '—'}
              </span>
            </div>
            <div class="ml-beat" id="ml-beat" role="group" aria-label={`Metrónomo a ${bpm} BPM`}>
              {Array.from({ length: selected.meter }, (_, index) => (
                <i
                  key={index}
                  class={index === beat ? 'is-on' : ''}
                  style={index === beat ? { animationDuration: `${60000 / bpm}ms` } : undefined}
                />
              ))}
            </div>
            <p class="ml-feedback" id="ml-feedback" role="status" aria-live="polite">{feedback}</p>
          </div>

          <div class="ml-keys-scroll" id="ml-keys-scroll">
            <div
              class="ml-keys"
              id="ml-keyboard"
              role="group"
              aria-label="Teclado virtual de 4 octavas (Do2 a Do6)"
              style={{ '--ml-white-keys': String(WHITE_MIDIS.length) }}
            >
              {WHITE_MIDIS.map((midi) => {
                const level = cascadeLevel.get(midi);
                return (
                  <button
                    type="button"
                    class={`ml-key ml-key--white${expectedSet.has(midi) ? ' is-expected' : ''}${level !== undefined ? ' is-cascade' : ''}${lastPlayed.includes(midi) ? (wasCorrect ? ' is-hit' : ' is-miss') : ''}`}
                    style={{ '--cascade': String(1 - (level ?? 0) * 0.2), width: `${100 / WHITE_MIDIS.length}%` }}
                    data-ml-midi={String(midi)}
                    aria-label={`Tocar ${noteName(midi)}`}
                    onClick={() => handleNote(midi)}
                  >
                    <span>{midi % 12 === 0 ? noteName(midi) : noteName(midi).replace(/\d+$/, '')}</span>
                    <small>{KEY_HINT[midi] ?? ''}</small>
                  </button>
                );
              })}
              {BLACK_MIDIS.map(({ midi, left }) => {
                const level = cascadeLevel.get(midi);
                return (
                  <button
                    type="button"
                    class={`ml-key ml-key--black${expectedSet.has(midi) ? ' is-expected' : ''}${level !== undefined ? ' is-cascade' : ''}${lastPlayed.includes(midi) ? (wasCorrect ? ' is-hit' : ' is-miss') : ''}`}
                    style={{ left: `${left}%`, width: `${BLACK_WIDTH}%`, '--cascade': String(1 - (level ?? 0) * 0.2) }}
                    data-ml-midi={String(midi)}
                    aria-label={`Tocar ${noteName(midi)}`}
                    onClick={() => handleNote(midi)}
                  >
                    <small>{KEY_HINT[midi] ?? ''}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div class="ml-legend">
            <span><i class="ml-dot ml-dot--expected" /> Esperada</span>
            <span><i class="ml-dot ml-dot--cascade" /> Viene en la cascada</span>
            <span><i class="ml-dot ml-dot--hit" /> La que tocaste</span>
            <button type="button" class="ml-ghost" id="ml-connect-midi" onClick={() => void connectMidi()}>🎹 Conectar MIDI</button>
          </div>
          <p class="ml-hint"><b>▶ Play</b> muestra la demo: el teclado toca y resalta la melodía; toca cualquier nota para tomar el control. Teclado de <b>4 octavas (Do2–Do6)</b>, QWERTY cubre el centro (<b>Z–M</b> = Do4–Si4, <b>Q–T</b> = Do5–Sol5).</p>
        </div>
      )}

      {screen === 'result' && selected && result && (
        <div class="ml-result" id="ml-result" role="status" aria-live="polite">
          <span class="ml-result-stars" aria-hidden="true">{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</span>
          <h3>¡Pieza terminada!</h3>
          <p class="ml-result-main"><strong id="ml-accuracy">{result.accuracy}%</strong> de precisión</p>
          <div class="ml-result-grid">
            <span>Melodía <b>{Math.round(result.melodicAccuracy * 100)}%</b></span>
            <span>Ritmo <b>{Math.round(result.rhythmicAccuracy * 100)}%</b></span>
            <span>Aciertos <b>{result.correct}/{result.total}</b></span>
          </div>
          <p class="ml-result-xp" id="ml-xp">{earnedXp > 0 ? `+${earnedXp} XP ganados` : 'Esta pieza ya tenía su XP'}</p>
          <div class="ml-result-actions">
            <button type="button" class="ml-play" id="ml-repeat" onClick={() => { reset(); setScreen('play'); }}>↻ Repetir</button>
            <button type="button" class="ml-ghost" id="ml-result-menu" onClick={() => { stopPreview(); setScreen('menu'); }}>Volver al menú</button>
          </div>
        </div>
      )}
    </section>
  );
}
