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
    // Try the next installed browser path.
  }
}
if (!chromePath) throw new Error('No se encontró Chrome/Chromium. Define CHROME_PATH para la prueba de navegador.');

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
const profile = await mkdtemp(path.join(os.tmpdir(), 'cadencia-chords-browser-'));
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

  const initial = await evaluate(`({
    title: document.querySelector('#key-tool-title')?.textContent.trim(),
    cards: document.querySelectorAll('[data-key-tool] [data-chord-index]').length,
    firstCardLabel: document.querySelector('[data-chord-index="0"]')?.getAttribute('aria-label'),
    keyboard: Boolean(document.querySelector('[data-chord-view] svg.kb')),
    guitar: Boolean(document.querySelector('[data-chord-view] svg.gt'))
  })`);
  assert.equal(initial.title, 'Acordes diatónicos por tonalidad');
  assert.equal(initial.cards, 7);
  assert.equal(initial.firstCardLabel, 'I, C, Mayor, Casa');
  assert.ok(initial.keyboard && initial.guitar, 'El acorde inicial debe mostrar teclado y diagrama de guitarra.');

  const modes = await evaluate(`({
    cards: document.querySelectorAll('[data-mode-card]').length,
    formula: document.querySelector('#mode-formula')?.textContent,
    characteristic: Boolean(document.querySelector('#mp .characteristic'))
  })`);
  assert.equal(modes.cards, 7);
  assert.equal(modes.formula, '1 – 2 – 3 – 4 – 5 – 6 – 7');
  assert.ok(modes.characteristic, 'La nota característica debe distinguirse en el teclado.');

  await evaluate(`document.querySelector('[data-play-melody="0"]').click()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
  const melody = await evaluate(`({
    pressed: document.querySelector('[data-play-melody="0"]').getAttribute('aria-pressed'),
    stopEnabled: !document.querySelector('#melody-stop').disabled,
    status: document.querySelector('#melody-status').textContent,
    activeKeys: document.querySelectorAll('#melody-keyboard .wk.on, #melody-keyboard .bk.on').length
  })`);
  assert.equal(melody.pressed, 'true');
  assert.ok(melody.stopEnabled);
  assert.match(melody.status, /Lidio:/);
  assert.equal(melody.activeKeys, 1, 'El teclado debe iluminar la nota que está sonando.');
  await evaluate(`document.querySelector('#melody-stop').click()`);
  const stoppedMelody = await evaluate(`({
    pressed: document.querySelector('[data-play-melody="0"]').getAttribute('aria-pressed'),
    stopDisabled: document.querySelector('#melody-stop').disabled,
    status: document.querySelector('#melody-status').textContent
  })`);
  assert.equal(stoppedMelody.pressed, 'false');
  assert.ok(stoppedMelody.stopDisabled);
  assert.match(stoppedMelody.status, /Elige un motivo/);

  await evaluate(`(() => {
    window.__oscillatorStarts = 0;
    const Audio = window.AudioContext || window.webkitAudioContext;
    const original = Audio.prototype.createOscillator;
    Audio.prototype.createOscillator = function(...args) {
      window.__oscillatorStarts += 1;
      return original.apply(this, args);
    };
    const select = document.querySelector('#chord-key');
    select.value = 'F#';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  const sharpMajor = await evaluate(`({
    key: document.querySelector('#chord-key').value,
    mode: [...document.querySelectorAll('[data-mode]')].find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.mode,
    names: [...document.querySelectorAll('[data-chord-index] .chord-name')].map((item) => item.textContent.trim())
  })`);
  assert.equal(sharpMajor.key, 'F#');
  assert.equal(sharpMajor.mode, 'major');
  assert.deepEqual(sharpMajor.names, ['F♯', 'G♯m', 'A♯m', 'B', 'C♯', 'D♯m', 'E♯dim']);

  await evaluate(`document.querySelector('[data-chord-index="6"]').click()`);
  const diminished = await evaluate(`(() => {
    const view = document.querySelector('[data-chord-view]');
    return {
      label: document.querySelector('[data-selected-label]').textContent,
      keyboard: Boolean(view.querySelector('svg.kb')),
      guitar: Boolean(view.querySelector('svg.gt')),
      playButton: Boolean(view.querySelector('.pl')),
      ariaLabel: document.querySelector('[data-chord-index="6"]').getAttribute('aria-label'),
      oscillators: window.__oscillatorStarts
    };
  })()`);
  assert.match(diminished.label, /E♯dim/);
  assert.equal(diminished.ariaLabel, 'vii°, E♯dim, Disminuido');
  assert.ok(diminished.keyboard && diminished.guitar && diminished.playButton, 'E♯dim debe mostrar teclado, guitarra y control de audio.');
  assert.ok(diminished.oscillators > 0, 'Seleccionar E♯dim debe iniciar los osciladores de audio.');

  await evaluate(`document.querySelector('[data-relative]').click()`);
  const relative = await evaluate(`({
    key: document.querySelector('#chord-key').value,
    mode: [...document.querySelectorAll('[data-mode]')].find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.mode,
    hint: document.querySelector('[data-relative-hint]').textContent.trim(),
    names: [...document.querySelectorAll('[data-chord-index] .chord-name')].map((item) => item.textContent.trim())
  })`);
  assert.equal(relative.key, 'D#');
  assert.equal(relative.mode, 'minor');
  assert.equal(relative.hint, 'F♯ mayor');
  assert.deepEqual(relative.names, ['D♯m', 'E♯dim', 'F♯', 'G♯m', 'A♯m', 'B', 'C♯']);
  assert.deepEqual(pageErrors, [], `Errores de navegador: ${pageErrors.join('; ')}`);

  console.log('Prueba de navegador correcta: cambia tonalidad y relativa, reproduce E♯dim y un motivo modal, anima el teclado y detiene el audio.');
} finally {
  socket?.close();
  await Promise.all([stopProcess(chrome), stopProcess(devServer)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
