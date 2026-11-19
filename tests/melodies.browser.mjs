import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

let chromePath;
for (const candidate of chromeCandidates) {
  try {
    await access(candidate);
    chromePath = candidate;
    break;
  } catch {
    // Probar la siguiente ruta.
  }
}
if (!chromePath) throw new Error('No se encontró Chrome/Chromium. Define CHROME_PATH.');

const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const devServer = spawn('pnpm', ['exec', 'astro', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: projectRoot,
  stdio: 'ignore',
});
const profile = await mkdtemp(path.join(os.tmpdir(), 'pm-melodies-browser-'));
let chrome;
let socket;

function stopProcess(child) {
  if (!child || child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

// Mismo mapa que la isla: midi → tecla QWERTY.
const KEY_FOR_MIDI = {
  60: 'z', 61: 's', 62: 'x', 63: 'd', 64: 'c', 65: 'v', 66: 'g',
  67: 'b', 68: 'h', 69: 'n', 70: 'j', 71: 'm', 72: 'q', 73: '2',
  74: 'w', 75: '3', 76: 'e', 77: 'r', 78: '5', 79: 't',
};

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (devServer.exitCode !== null) throw new Error(`pnpm dev terminó con código ${devServer.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  if (!ready) throw new Error('Astro no respondió para la prueba de navegador.');

  chrome = spawn(chromePath, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, baseUrl,
  ], { stdio: 'ignore' });

  let devtoolsPort;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const activePort = (await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      devtoolsPort = Number(activePort);
      break;
    } catch {
      if (chrome.exitCode !== null) throw new Error(`Chrome terminó con código ${chrome.exitCode}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!devtoolsPort) throw new Error('Chrome no abrió el puerto de DevTools.');

  let target;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`).then((response) => response.json());
    target = targets.find((item) => item.type === 'page' && item.url.startsWith(baseUrl));
    if (target) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!target) throw new Error('Chrome no creó una pestaña para el sitio.');

  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let commandId = 0;
  const waiting = new Map();
  const pageErrors = [];
  const networkErrors = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && waiting.has(message.id)) {
      const { resolve, reject } = waiting.get(message.id);
      waiting.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === 'Runtime.exceptionThrown') {
      pageErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    }
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      pageErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
    }
    if (message.method === 'Network.loadingFailed') {
      networkErrors.push(`${message.params.errorText}: ${message.params.requestId}`);
    }
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
      networkErrors.push(`${message.params.response.status}: ${message.params.response.url}`);
    }
  });

  function send(method, params = {}) {
    const id = ++commandId;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => waiting.set(id, { resolve, reject }));
  }

  async function evaluate(expression) {
    const response = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    }
    return response.result?.value;
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  // Recargamos con CDP ya activo para capturar errores de hidratación del bundle.
  await send('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  // La isla Preact se hidrata justo después del primer render.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (await evaluate(`document.querySelectorAll('#ml-menu [data-ml-piece]').length >= 5`)) break;
    } catch {
      // Página aún navegando.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  async function waitFor(expression, label) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        // El nodo aún no existe mientras Preact renderiza.
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`No se cumplió la condición: ${label}`);
  }

  const state = () => evaluate(`(() => {
    const root = document.querySelector('#ml-root');
    const stage = document.querySelector('#ml-stage');
    return {
      pieces: document.querySelectorAll('[data-ml-piece]').length,
      menu: Boolean(document.querySelector('#ml-menu')),
      mode: Boolean(document.querySelector('#ml-mode')),
      session: Boolean(document.querySelector('#ml-session')),
      result: Boolean(document.querySelector('#ml-result')),
      expected: stage ? JSON.parse(stage.dataset.expected || 'null') : null,
      step: stage ? Number(stage.dataset.step) : -1,
      cycle: stage ? Number(stage.dataset.cycle) : -1,
      beatDots: document.querySelectorAll('#ml-beat i').length,
      beatOn: document.querySelectorAll('#ml-beat i.is-on').length,
      loop: document.querySelector('#ml-loop')?.getAttribute('aria-pressed') ?? '',
      feedback: document.querySelector('#ml-feedback')?.textContent ?? '',
      bpm: Number(document.querySelector('#ml-bpm-value')?.textContent ?? 0),
      playLabel: document.querySelector('#ml-play')?.textContent?.trim() ?? '',
      pressed: document.querySelector('#ml-play')?.getAttribute('aria-pressed') ?? '',
      progress: document.querySelector('#ml-progress-bar')?.style.width ?? '',
      expectedKeys: document.querySelectorAll('#ml-keyboard .is-expected').length,
      cascadeKeys: document.querySelectorAll('#ml-keyboard .is-cascade').length,
      hitKeys: document.querySelectorAll('#ml-keyboard .is-hit').length,
      missKeys: document.querySelectorAll('#ml-keyboard .is-miss').length,
      accuracy: document.querySelector('#ml-accuracy')?.textContent ?? '',
      xp: document.querySelector('#ml-xp')?.textContent ?? '',
      midi: document.querySelector('#ml-midi-status')?.textContent ?? '',
      reward: JSON.parse(localStorage.getItem('progressive-music:state:v1') || '{}'),
      title: root?.querySelector('.ml-title')?.textContent ?? ''
    };
  })()`);

  const press = (midi) => evaluate(`(() => {
    const key = ${JSON.stringify(KEY_FOR_MIDI)}[${midi}];
    if (!key) throw new Error('Sin tecla QWERTY para MIDI ${midi}');
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  })()`);

  // Toca todas las notas esperadas en su pulso exacto para lograr 100 % de ritmo.
  async function playTrack(events) {
    return evaluate(`(async () => {
      document.querySelector('#ml-play').click();
      const start = performance.now();
      const bpm = Number(document.querySelector('#ml-bpm-value').textContent);
      const beatMs = 60000 / bpm;
      const keys = ${JSON.stringify(KEY_FOR_MIDI)};
      const events = ${JSON.stringify(events)};
      const feedback = [];
      for (const event of events) {
        const target = start + event.beat * beatMs;
        const delay = Math.max(0, target - performance.now());
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        for (const midi of event.midi) {
          const key = keys[midi];
          if (!key) throw new Error('Sin tecla QWERTY para MIDI ' + midi);
          window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
          window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
        feedback.push(document.querySelector('#ml-feedback')?.textContent ?? '');
      }
      return feedback;
    })()`);
  }

  const initial = await state();
  assert.ok(initial.pieces >= 5, 'El catálogo ofrece al menos 5 piezas');
  assert.equal(initial.menu, true);
  assert.equal(initial.mode, false);
  assert.equal(initial.session, false);
  assert.match(initial.title, /Toca la pieza/);
  assert.match(initial.midi, /MIDI/);

  // La badge cambia de «conectando…» cuando useEffect de la isla se ejecuta.
  await waitFor(`!/conectando/.test(document.querySelector('#ml-midi-status')?.textContent ?? '')`, 'isla Preact hidratada');

  // Selección de pieza y selector de modo.
  await evaluate(`document.querySelector('[data-ml-piece="pop-loop"]').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-mode'))`, 'selector de modo visible');
  const chosen = await state();
  assert.equal(chosen.menu, false);
  assert.equal(chosen.mode, true);
  const modeText = await evaluate(`document.querySelector('#ml-mode').textContent`);
  assert.match(modeText, /Practicar Melodía/);
  assert.match(modeText, /Practicar Acordes/);

  // --- Modo Melodía ---
  await evaluate(`document.querySelector('#ml-mode-melody').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-session'))`, 'sesión de melodía visible');
  let playing = await state();
  assert.equal(playing.session, true);
  assert.equal(playing.step, 0);
  assert.deepEqual(playing.expected.midi, [64]);
  assert.match(playing.expected.label, /Mi/);
  assert.ok(playing.expectedKeys >= 1, 'La nota esperada se resalta en el teclado');
  assert.ok(playing.cascadeKeys >= 2, 'La cascada muestra las próximas notas');
  assert.equal(playing.loop, 'true', 'El bucle viene activado por defecto');
  assert.equal(playing.beatDots, 4, 'El metrónomo dibuja un punto por pulso');
  await evaluate(`document.querySelector('#ml-loop').click()`);
  await waitFor(`document.querySelector('#ml-loop')?.getAttribute('aria-pressed') === 'false'`, 'bucle desactivado');
  assert.equal((await state()).loop, 'false');
  await evaluate(`document.querySelector('#ml-loop').click()`);
  await waitFor(`document.querySelector('#ml-loop')?.getAttribute('aria-pressed') === 'true'`, 'bucle reactivado');

  // Demo automática: Play toca y resalta la melodía; la primera nota tocada toma el control.
  await evaluate(`document.querySelector('#ml-play').click()`);
  await waitFor(`document.querySelector('#ml-stage')?.dataset.demo === '1'`, 'demo en curso');
  await waitFor(`document.querySelectorAll('#ml-keyboard .ml-key.is-hit').length >= 1`, 'tecla iluminada por la demo');
  assert.match(await evaluate(`document.querySelector('#ml-play').textContent`), /demo/);
  await evaluate(`(() => {
    const key = ${JSON.stringify(KEY_FOR_MIDI)}[60];
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
  })()`);
  await waitFor(`document.querySelector('#ml-stage')?.dataset.demo === '0'`, 'demo interrumpida al tocar');
  assert.equal((await state()).step, 0, 'al tomar el control se vuelve al paso 1');
  await evaluate(`document.querySelector('#ml-play').click()`);
  await waitFor(`document.querySelector('#ml-play')?.getAttribute('aria-pressed') === 'false'`, 'reproductor en pausa tras la demo');

  // Nota equivocada: no avanza, mensaje amable y feedback visual rojo.
  // Preact confirma el render en el siguiente frame: esperamos uno antes de leer.
  const wrong = await evaluate(`(async () => {
    const key = ${JSON.stringify(KEY_FOR_MIDI)}[60];
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    const stage = document.querySelector('#ml-stage');
    return {
      step: Number(stage.dataset.step),
      feedback: document.querySelector('#ml-feedback').textContent,
      missKeys: document.querySelectorAll('#ml-keyboard .is-miss').length,
    };
  })()`);
  assert.equal(wrong.step, 0, 'Una nota incorrecta no avanza');
  assert.match(wrong.feedback, /Casi 🎹/);
  assert.ok(wrong.missKeys >= 1, 'La nota tocada se marca en rojo');

  // Transporte: Play/Pausa, BPM y reinicio limpian el fallo anterior.
  await evaluate(`document.querySelector('#ml-play').click()`);
  await waitFor(`document.querySelector('#ml-play')?.getAttribute('aria-pressed') === 'true'`, 'botón de pausa activo');
  const isPlaying = await state();
  assert.match(isPlaying.playLabel, /Pausa/);
  assert.equal(isPlaying.pressed, 'true');
  await evaluate(`document.querySelector('#ml-play').click()`);
  await waitFor(`document.querySelector('#ml-play')?.getAttribute('aria-pressed') === 'false'`, 'reproductor en pausa');
  assert.match((await state()).playLabel, /Play/);
  await evaluate(`document.querySelector('#ml-bpm-up').click()`);
  await waitFor(`document.querySelector('#ml-bpm-value')?.textContent === '104'`, 'BPM subido');
  assert.equal((await state()).bpm, 104);
  await evaluate(`document.querySelector('#ml-bpm-down').click()`);
  await waitFor(`document.querySelector('#ml-bpm-value')?.textContent === '100'`, 'BPM bajado');
  assert.equal((await state()).bpm, 100);
  await evaluate(`document.querySelector('#ml-restart').click()`);
  await waitFor(`/Listo/.test(document.querySelector('#ml-feedback')?.textContent ?? '')`, 'sesión reiniciada');
  const restarted = await state();
  assert.equal(restarted.step, 0);
  assert.equal(restarted.missKeys, 0);
  assert.match(restarted.feedback, /Listo/);

  const melodyEvents = [
    { beat: 0, midi: [64] }, { beat: 1, midi: [67] }, { beat: 2, midi: [72] },
    { beat: 4, midi: [74] }, { beat: 5, midi: [71] }, { beat: 6, midi: [67] },
    { beat: 8, midi: [72] }, { beat: 9, midi: [69] }, { beat: 10, midi: [76] },
    { beat: 12, midi: [65] }, { beat: 13, midi: [69] }, { beat: 14, midi: [72] },
  ];
  const melodyFeedback = await playTrack(melodyEvents);
  assert.ok(melodyFeedback.some((text) => /En hora/.test(text)), 'El feedback indica el acierto rítmico');
  await waitFor(`Number(document.querySelector('#ml-stage')?.dataset.cycle) === 2`, 'vuelta 2 automática');
  const looped = await state();
  assert.equal(looped.session, true, 'En bucle la práctica no se detiene sola');
  assert.equal(looped.cycle, 2);
  assert.equal(looped.step, 0);
  assert.match(looped.feedback, /Vuelta 2/);
  assert.equal(looped.beatOn, 1, 'El metrónomo visual marca el pulso activo');
  await evaluate(`document.querySelector('#ml-stop').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-result'))`, 'resultado de melodía visible');
  const melodyResult = await state();
  assert.equal(melodyResult.result, true, 'Al detener se muestra el resultado');
  assert.equal(melodyResult.accuracy, '100%', 'La precisión es perfecta al seguir el ritmo');
  assert.match(melodyResult.xp, /\+50 XP/, 'Intermedio: 40 base + 10 de pieza perfecta');
  assert.ok(melodyResult.reward.awardedQuestions.includes('melody:pop-loop:melody'));
  assert.ok(melodyResult.reward.badges.includes('Melodista'));
  assert.equal(melodyResult.reward.xp, 50);

  // Volver al menú y repetir en modo Acordes.
  await evaluate(`document.querySelector('#ml-result-menu').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-menu'))`, 'menú principal visible');
  assert.equal((await state()).menu, true);
  await evaluate(`document.querySelector('[data-ml-piece="pop-loop"]').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-mode'))`, 'selector de modo visible de nuevo');
  await evaluate(`document.querySelector('#ml-mode-chords').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-session'))`, 'sesión de acordes visible');
  const chordSession = await state();
  assert.deepEqual(chordSession.expected.midi, [60, 64, 67]);
  assert.match(chordSession.expected.label, /C/);
  assert.equal(chordSession.expectedKeys, 3, 'Las tres notas del acorde se resaltan');

  // Volver al selector y reentrar: comprueba el control «Volver al menú» del transporte.
  await evaluate(`document.querySelector('#ml-back').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-mode'))`, 'selector de modo tras Volver');
  assert.equal((await state()).mode, true);
  await evaluate(`document.querySelector('#ml-mode-chords').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-session'))`, 'sesión de acordes reentrada');
  assert.equal((await state()).session, true);

  const chordEvents = [
    { beat: 0, midi: [60, 64, 67] }, { beat: 4, midi: [62, 67, 71] },
    { beat: 8, midi: [60, 64, 69] }, { beat: 12, midi: [60, 65, 69] },
  ];
  await playTrack(chordEvents);
  await waitFor(`Number(document.querySelector('#ml-stage')?.dataset.cycle) === 2`, 'vuelta 2 de acordes');
  assert.match((await state()).feedback, /Vuelta 2/);
  await evaluate(`document.querySelector('#ml-stop').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-result'))`, 'resultado de acordes visible');
  const chordResult = await state();
  assert.equal(chordResult.result, true);
  assert.equal(chordResult.accuracy, '100%');
  assert.match(chordResult.xp, /\+50 XP/);
  assert.ok(chordResult.reward.awardedQuestions.includes('melody:pop-loop:chords'));
  assert.equal(chordResult.reward.xp, 100, 'Cada modo otorga su XP una sola vez');

  // --- Audición «cómo suena» (al final: el audio previo altera el jitter del tempo) ---
  await evaluate(`document.querySelector('#ml-result-menu').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-menu'))`, 'menú para audicionar');
  await evaluate(`(() => {
    window.__audioStarts = 0;
    const Audio = window.AudioContext || window.webkitAudioContext;
    const original = Audio.prototype.createOscillator;
    Audio.prototype.createOscillator = function (...args) {
      window.__audioStarts += 1;
      return original.apply(this, args);
    };
  })()`);
  await evaluate(`document.querySelector('[data-ml-preview-btn="twinkle"]').click()`);
  await waitFor(`document.querySelector('[data-ml-preview-btn="twinkle"]')?.textContent.includes('Detener')`, 'audición en marcha');
  await waitFor(`document.querySelectorAll('[data-ml-preview="twinkle"] .ml-preview-note.is-on').length === 1`, 'nota en curso resaltada');
  const audition = await evaluate(`({
    starts: window.__audioStarts,
    label: document.querySelector('[data-ml-preview-btn="twinkle"]').textContent.trim(),
    notes: document.querySelectorAll('[data-ml-preview="twinkle"] .ml-preview-note').length,
    active: document.querySelector('[data-ml-preview="twinkle"] .ml-preview-note.is-on')?.textContent,
    bar: document.querySelector('[data-ml-preview="twinkle"] .ml-preview-bar i')?.style.width
  })`);
  assert.match(audition.label, /Detener/);
  assert.ok(audition.starts > 0, 'La audición reproduce notas con Web Audio');
  assert.ok(audition.notes >= 8, 'La audición muestra una ventana de notas');
  assert.ok(audition.active, 'La nota que suena se resalta');
  assert.match(audition.bar ?? '', /%$/, 'La barra de progreso avanza');
  await evaluate(`document.querySelector('[data-ml-preview-btn="twinkle"]').click()`);
  await waitFor(`document.querySelector('[data-ml-preview-btn="twinkle"]')?.textContent.includes('Cómo suena')`, 'audición detenida');

  // Elegir una pieza corta la audición, y el selector de modo también permite oírla.
  await evaluate(`document.querySelector('[data-ml-preview-btn="pop-loop"]').click()`);
  await evaluate(`document.querySelector('[data-ml-piece="pop-loop"]').click()`);
  await waitFor(`Boolean(document.querySelector('#ml-mode'))`, 'selector de modo tras audición');
  assert.equal(
    await evaluate(`document.querySelector('#ml-mode [data-ml-preview-btn]')?.textContent.includes('Detener') ?? false`),
    false,
    'Elegir una pieza detiene la audición',
  );
  await evaluate(`document.querySelector('#ml-mode [data-ml-preview-btn]').click()`);
  await waitFor(`document.querySelector('#ml-mode [data-ml-preview-btn]')?.textContent.includes('Detener')`, 'audición en el selector de modo');
  assert.equal((await state()).mode, true, 'La audición no saca del selector de modo');
  await evaluate(`document.querySelector('#ml-mode [data-ml-preview-btn]').click()`);

  assert.deepEqual(pageErrors, [], `Errores de navegador: ${pageErrors.join('; ')}`);
  console.log('Prueba de melodías correcta: catálogo, selector de modo, teclado en cascada, MIDI, validación, ritmo, XP, audición de una sola pasada y sin errores de página.');
} finally {
  socket?.close();
  await Promise.all([stopProcess(chrome), stopProcess(devServer)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
