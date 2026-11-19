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
const profile = await mkdtemp(path.join(os.tmpdir(), 'pm-challenges-browser-'));
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
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if (await evaluate(`Boolean(document.querySelector('#challenge-session'))`)) break;
    } catch {
      // Página aún navegando.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const state = () => evaluate(`(() => ({
    hidden: document.querySelector('#challenge-session').hidden,
    module: document.querySelector('#ch-module').textContent,
    id: document.querySelector('#ch-stage').dataset.challengeId,
    title: document.querySelector('#ch-title').textContent,
    kind: document.querySelector('#ch-kind').textContent,
    options: [...document.querySelectorAll('#ch-options .ch-opt')]
      .filter((b) => !b.closest('[hidden]'))
      .map((b) => b.textContent),
    pulseVisible: !document.querySelector('#ch-pulse').hidden,
    playVisible: !document.querySelector('#ch-play').hidden,
    segments: document.querySelectorAll('#ch-progress .ch-seg').length,
    feedback: document.querySelector('#ch-feedback').textContent,
    feedbackHidden: document.querySelector('#ch-feedback').hidden,
    replayHidden: document.querySelector('#ch-replay').hidden,
    replayLabel: document.querySelector('#ch-replay-label').textContent,
    hintHidden: document.querySelector('#ch-hint').hidden,
    nextHidden: document.querySelector('#ch-next').hidden,
    micVisible: !document.querySelector('#ch-mic-box').hidden,
    midiVisible: !document.querySelector('#ch-midi-btn').hidden,
    privacy: document.querySelector('.ch-privacy').textContent,
    keys: document.querySelectorAll('#ch-keys .ch-key').length,
    detected: document.querySelector('#ch-detected').textContent,
    pageText: document.querySelector('#ch-stage').textContent
  }))()`);

  const bank = await evaluate(`JSON.parse(document.querySelector('#challenge-session').dataset.challenges)`);
  const challenge = (id) => {
    const found = bank.find((item) => item.id === id);
    assert.ok(found, `Falta el reto ${id} en el banco`);
    return found;
  };

  function answerChoice(id) {
    const correct = challenge(id).validacion;
    return evaluate(`(async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const button = [...document.querySelectorAll('#ch-options .ch-opt')]
          .find((b) => !b.closest('[hidden]') && b.textContent === ${JSON.stringify(correct)});
        if (button) {
          button.click();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error('No aparece la opción ${correct}');
    })()`);
  }

  function answerPlay(id) {
    const midi = challenge(id).midi;
    return evaluate(`(async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const key = [...document.querySelectorAll('#ch-keys .ch-key')]
          .find((k) => Number(k.dataset.midi) % 12 === ${midi} % 12);
        if (key) {
          const letter = key.querySelector('small').textContent.trim().toLowerCase();
          document.dispatchEvent(new KeyboardEvent('keydown', { key: letter, bubbles: true }));
          document.dispatchEvent(new KeyboardEvent('keyup', { key: letter, bubbles: true }));
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error('No aparece la tecla para MIDI ${midi}');
    })()`);
  }

  async function answerPulse(id) {
    const pattern = challenge(id).pulso;
    const info = await evaluate(`(() => {
      const box = document.querySelector('#ch-pulse');
      return {
        expected: JSON.parse(box.dataset.expected || '[]'),
        start: Number(box.dataset.start || 0),
        tolerance: Number(box.dataset.tolerance || 0),
        dots: box.querySelectorAll('.ch-pulse-dot').length
      };
    })()`);
    assert.equal(info.dots, pattern.golpes, `El metrónomo de ${id} dibuja ${pattern.golpes} puntos`);
    assert.equal(info.expected.length, pattern.golpes);
    assert.ok(info.start > 0, 'El metrónomo expone su marca de inicio');
    assert.ok(info.tolerance > 0, 'El metrónomo expone la tolerancia');
    await evaluate(`(async () => {
      const expected = ${JSON.stringify(info.expected)};
      const start = ${info.start};
      // Adelantar unos ms evita que el jitter del temporizador saque el golpe
      // de la ventana de tolerancia (mínimo 150 ms en los retos rápidos).
      const lead = Math.min(60, ${info.tolerance} / 3);
      for (const offset of expected) {
        const delay = Math.max(0, start + offset - lead - performance.now());
        await new Promise((resolve) => setTimeout(resolve, delay));
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: ' ', code: 'Space', bubbles: true, cancelable: true
        }));
        document.dispatchEvent(new KeyboardEvent('keyup', {
          key: ' ', code: 'Space', bubbles: true, cancelable: true
        }));
      }
      return true;
    })()`);
  }

  async function solve(id, xp) {
    const current = challenge(id);
    if (current.tipo === 'oir_elegir') await answerChoice(id);
    else if (current.tipo === 'tocar_pulso') await answerPulse(id);
    else await answerPlay(id);
    const after = await state();
    assert.match(after.feedback, new RegExp(`\\+${xp} XP`), `XP esperado en ${id}`);
    assert.equal(after.nextHidden, false, `${id} debe mostrar el botón de avance`);
    return after;
  }

  const advance = () => evaluate(`document.querySelector('#ch-next').click()`);

  // Estado inicial: 15 lanzadores, sin toggles, sesión oculta.
  const initial = await evaluate(`({
    launchers: document.querySelectorAll('[data-challenge-module]').length,
    toggles: document.querySelectorAll('[data-module-toggle]').length,
    hidden: document.querySelector('#challenge-session').hidden,
    summary: document.querySelector('#progress-summary').textContent
  })`);
  assert.equal(initial.launchers, 15);
  assert.equal(initial.toggles, 0);
  assert.equal(initial.hidden, true);
  assert.match(initial.summary, /0\/15/);
  assert.equal(bank.length, 73);

  // Abrir M1 desde su lanzador (reintentos por si el bundle aún se está cargando).
  let opened;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await evaluate(`document.querySelector('[data-challenge-module="M1"]').click()`);
    opened = await state();
    if (opened.hidden === false) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(opened.hidden, false);
  assert.equal(opened.id, 'm1_reto_01');
  assert.match(opened.module, /M1/);
  assert.match(opened.title, /propiedad del sonido/);
  assert.equal(opened.options.length, 4);
  assert.equal(opened.segments, 8, 'M1 tiene 8 retos y la barra se ajusta al módulo');
  assert.equal(opened.replayHidden, true, 'El primer reto no tiene sonido que repetir.');

  // Dos fallos: mensaje "Casi 🎹", pista desbloqueada, sin la palabra "incorrecto".
  const wrong = await evaluate(`(() => {
    const opts = [...document.querySelectorAll('#ch-options .ch-opt')];
    opts.find((b) => b.textContent === 'Timbre').click();
    const first = document.querySelector('#ch-feedback').textContent;
    opts.find((b) => b.textContent === 'Duración').click();
    return {
      first,
      second: document.querySelector('#ch-feedback').textContent,
      hintHidden: document.querySelector('#ch-hint').hidden,
      pageText: document.querySelector('#ch-stage').textContent
    };
  })()`);
  assert.match(wrong.first, /^Casi 🎹 — Altura \+ /);
  assert.match(wrong.second, /Casi 🎹/);
  assert.equal(wrong.hintHidden, false);
  assert.ok(!/incorrecto/i.test(wrong.pageText), 'No debe aparecer la palabra "incorrecto".');

  const hint = await evaluate(`(() => {
    document.querySelector('#ch-hint').click();
    return document.querySelector('#ch-hint').textContent;
  })()`);
  assert.match(hint, /sirena/);

  // Acierto al tercer intento: +5 XP y botón de avance.
  await answerChoice('m1_reto_01');
  const solved = await state();
  assert.match(solved.feedback, /\+5 XP/);
  assert.equal(solved.nextHidden, false);
  const reward = await evaluate(`JSON.parse(localStorage.getItem('progressive-music:state:v1'))`);
  assert.ok(reward.awardedQuestions.includes('m1_reto_01'));

  // Segundo reto (auditivo): el botón vuelve a reproducir los cuatro pulsos.
  await advance();
  const second = await state();
  assert.equal(second.id, 'm1_reto_02');
  assert.equal(second.replayHidden, false);
  assert.equal(second.replayLabel, 'Volver a escuchar');

  await evaluate(`document.querySelector('#ch-replay').click()`);
  const replayPlaying = await evaluate(`(() => ({
    label: document.querySelector('#ch-replay-label').textContent,
    playing: document.querySelector('#ch-replay').classList.contains('is-playing')
  }))()`);
  assert.equal(replayPlaying.label, 'Reproduciendo…');
  assert.equal(replayPlaying.playing, true);
  await new Promise((resolve) => setTimeout(resolve, 1800));
  assert.equal(await evaluate(`document.querySelector('#ch-replay-label').textContent`), 'Volver a escuchar');
  await solve('m1_reto_02', 10);

  // Tercero (voz/MIDI) resuelto con el teclado QWERTY.
  await advance();
  const third = await state();
  assert.equal(third.id, 'm1_reto_03');
  assert.match(third.title, /La4/);
  assert.equal(third.micVisible, true);
  assert.match(third.privacy, /no se graba/);
  assert.equal(third.keys, 12);
  assert.equal(third.replayLabel, 'Escuchar la nota');
  // Tercer acierto consecutivo: +10 XP y +5 de bonus de racha.
  const played = await solve('m1_reto_03', 15);
  assert.match(played.detected, /La4/);

  // Cuarto: timbre (oir_elegir).
  await advance();
  assert.equal((await state()).id, 'm1_reto_04');
  await solve('m1_reto_04', 10);

  // Quinto: primer reto de pulso con metrónomo y entrada Espacio.
  await advance();
  const pulse = await state();
  assert.equal(pulse.id, 'm1_reto_05');
  assert.match(pulse.kind, /SIGUE EL PULSO/);
  assert.equal(pulse.pulseVisible, true);
  assert.equal(pulse.playVisible, false);
  assert.equal(pulse.replayHidden, false);
  assert.equal(pulse.replayLabel, 'Volver a escuchar');
  await solve('m1_reto_05', 10);
  const pulseStatus = await evaluate(`document.querySelector('#ch-pulse-status').textContent`);
  assert.match(pulseStatus, /En hora! 4\/4/);

  // Sexto: tempo (oir_elegir).
  await advance();
  assert.equal((await state()).id, 'm1_reto_06');
  // Sexto acierto consecutivo: bonus de racha.
  await solve('m1_reto_06', 15);

  // Séptimo: segundo reto de pulso, a 90 BPM.
  await advance();
  assert.equal((await state()).id, 'm1_reto_07');
  await solve('m1_reto_07', 10);

  // Octavo y último de M1: negra en 4/4.
  await advance();
  assert.equal((await state()).id, 'm1_reto_08');
  await solve('m1_reto_08', 10);

  // Cerrar la sesión: resumen, módulo completado y panel sincronizado.
  await advance();
  const finished = await evaluate(`(() => ({
    summaryHidden: document.querySelector('#ch-summary').hidden,
    title: document.querySelector('#ch-summary-title').textContent,
    text: document.querySelector('#ch-summary-text').textContent,
    progress: JSON.parse(localStorage.getItem('progressive-music:progress')),
    summary: document.querySelector('#progress-summary').textContent,
    modules: document.querySelector('#progress-modules').textContent
  }))()`);
  assert.equal(finished.summaryHidden, false);
  assert.match(finished.title, /Módulo conseguido/);
  assert.equal(finished.progress.m1.completed, true);
  assert.ok(finished.progress.m1.score >= 70);
  assert.match(finished.summary, /1\/15/);
  assert.equal(finished.modules, '1');

  // M2 tiene 7 retos: la barra se recalcula al cambiar de módulo.
  const focus = await evaluate(`(() => {
    document.querySelector('#ch-close').click();
    document.querySelector('[data-challenge-module="M2"]').click();
    document.querySelector('#ch-focus').click();
    document.querySelector('#ch-settings-btn').click();
    return {
      segments: document.querySelectorAll('#ch-progress .ch-seg').length,
      focusOn: document.body.classList.contains('ch-focus'),
      pressed: document.querySelector('#ch-focus').getAttribute('aria-pressed'),
      settingsHidden: document.querySelector('#ch-settings').hidden,
      expanded: document.querySelector('#ch-settings-btn').getAttribute('aria-expanded'),
      inputs: [...document.querySelectorAll('#ch-input option')].map((o) => o.textContent),
      quit: document.querySelector('#ch-finish').textContent.trim()
    };
  })()`);
  assert.equal(focus.segments, 7);
  assert.equal(focus.focusOn, true);
  assert.equal(focus.pressed, 'true');
  assert.equal(focus.settingsHidden, false);
  assert.equal(focus.expanded, 'true');
  assert.deepEqual(focus.inputs, ['Pantalla', 'Micrófono', 'MIDI']);
  assert.match(focus.quit, /Terminar por hoy/);

  const closed = await evaluate(`(() => {
    document.querySelector('#ch-finish').click();
    return {
      summaryHidden: document.querySelector('#ch-summary').hidden,
      focusOn: document.body.classList.contains('ch-focus'),
      saved: JSON.parse(localStorage.getItem('progressive-music:challenge-session')).modulo
    };
  })()`);
  assert.equal(closed.summaryHidden, false);
  assert.equal(closed.focusOn, true);
  assert.equal(closed.saved, 'M2');

  // M4 estrena los 50 retos pendientes: 5 pasos y controles de micro + MIDI.
  const m4 = await evaluate(`(() => {
    document.querySelector('#ch-close').click();
    document.querySelector('[data-challenge-module="M4"]').click();
    return {
      segments: document.querySelectorAll('#ch-progress .ch-seg').length,
      id: document.querySelector('#ch-stage').dataset.challengeId,
      micVisible: !document.querySelector('#ch-mic-box').hidden,
      midiVisible: !document.querySelector('#ch-midi-btn').hidden,
      kind: document.querySelector('#ch-kind').textContent
    };
  })()`);
  assert.equal(m4.segments, 5);
  assert.equal(m4.id, 'm4_reto_01');
  assert.equal(m4.micVisible, true);
  assert.equal(m4.midiVisible, true, 'Todo reto de nota debe ofrecer conexión MIDI');
  assert.match(m4.kind, /CANTA O TOCA/);
  await solve('m4_reto_01', 15); // Noveno acierto: +5 de bonus de racha.

  await advance();
  const m4Second = await state();
  assert.equal(m4Second.id, 'm4_reto_02');
  assert.equal(m4Second.micVisible, true);
  assert.equal(m4Second.midiVisible, true);
  await solve('m4_reto_02', 10);

  assert.deepEqual(pageErrors, [], `Errores de navegador: ${pageErrors.join('; ')}`);
  console.log('Prueba de retos correcta: 73 retos, barra por módulo, micrófono y MIDI, pulso con metrónomo, repetición de sonido, XP, pistas, teclado QWERTY, cierre, progreso y modo enfoque.');
} finally {
  socket?.close();
  await Promise.all([stopProcess(chrome), stopProcess(devServer)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
