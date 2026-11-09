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
const profile = await mkdtemp(path.join(os.tmpdir(), 'cadencia-tuner-browser-'));
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

  const initial = await evaluate(`({
    mode: document.querySelector('#af-mode')?.value,
    strings: document.querySelectorAll('#af-strings .af-str').length,
    tuningHidden: document.querySelector('#af-tuning-field')?.hidden,
    privacy: document.querySelector('.afinador .af-privacy')?.textContent.replace(/\\s+/g, ' ').trim()
  })`);
  assert.equal(initial.mode, 'guitar');
  assert.equal(initial.strings, 6);
  assert.equal(initial.tuningHidden, false);
  assert.match(initial.privacy, /no se graba/);

  const refpitch = await evaluate(`(() => {
    const select = document.querySelector('#af-refpitch');
    select.value = '432';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      value: select.value,
      first: document.querySelector('#af-strings .af-str span').textContent
    };
  })()`);
  assert.equal(refpitch.value, '432');
  assert.match(refpitch.first, /80\.9 Hz/);

  await evaluate(`(() => {
    const select = document.querySelector('#af-refpitch');
    select.value = '440';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);

  const chromatic = await evaluate(`(() => {
    const select = document.querySelector('#af-mode');
    select.value = 'chromatic';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return {
      tuningHidden: document.querySelector('#af-tuning-field').hidden,
      notes: document.querySelectorAll('#af-strings .af-str').length,
      first: document.querySelector('#af-strings .af-str b').textContent,
      last: [...document.querySelectorAll('#af-strings .af-str b')].at(-1).textContent
    };
  })()`);
  assert.equal(chromatic.tuningHidden, true);
  assert.equal(chromatic.notes, 12);
  assert.equal(chromatic.first, 'Do');
  assert.equal(chromatic.last, 'Si');

  const selected = await evaluate(`(() => {
    document.querySelector('#af-strings .af-str[data-pc="9"]').click();
    const la = document.querySelector('#af-strings .af-str[data-pc="9"]');
    return {
      pressed: la.getAttribute('aria-pressed'),
      auto: document.querySelector('#af-auto').getAttribute('aria-pressed')
    };
  })()`);
  assert.equal(selected.pressed, 'true');
  assert.equal(selected.auto, 'false');

  await evaluate(`(async () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const audio = new Ctx();
    await audio.resume();
    const osc = audio.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110; // La2
    const gain = audio.createGain();
    gain.gain.value = 0.25;
    const dest = audio.createMediaStreamDestination();
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    window.__fakeAudio = { audio, osc };
    navigator.mediaDevices.getUserMedia = async () => dest.stream;
  })()`);
  await evaluate(`document.querySelector('#af-start').click()`);
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const reading = await evaluate(`({
    note: document.querySelector('#af-note').textContent.trim(),
    sub: document.querySelector('#af-sub').textContent,
    verdict: document.querySelector('#af-verdict').textContent,
    state: document.querySelector('#af-display').dataset.state,
    signal: document.querySelector('#af-level').dataset.signal,
    start: document.querySelector('#af-start').textContent
  })`);
  assert.match(reading.start, /Detener/);
  assert.equal(reading.signal, 'ok');
  assert.match(reading.note, /^La/);
  assert.match(reading.sub, /Objetivo: La/);
  assert.match(reading.verdict, /Afinada|baja|alta/);
  assert.ok(!/Señal baja/.test(reading.verdict), `No debería faltar señal: ${reading.verdict}`);

  await new Promise((resolve) => setTimeout(resolve, 1000));
  const marked = await evaluate(`(() => {
    const la = document.querySelector('#af-strings .af-str[data-pc="9"]');
    return {
      done: la.classList.contains('is-done'),
      label: la.getAttribute('aria-label'),
      verdict: document.querySelector('#af-verdict').textContent
    };
  })()`);
  assert.ok(marked.done, 'La nota La debería quedar marcada como afinada.');
  assert.match(marked.label, /afinada/);

  const otherKey = await evaluate(`(() => {
    document.querySelector('#af-strings .af-str[data-pc="4"]').click();
    return document.querySelector('#af-strings .af-str[data-pc="4"]').getAttribute('aria-pressed');
  })()`);
  assert.equal(otherKey, 'true');
  await new Promise((resolve) => setTimeout(resolve, 900));
  const hint = await evaluate(`document.querySelector('#af-verdict').textContent`);
  assert.match(hint, /Estás tocando La\d?; el objetivo es Mi/);

  await evaluate(`document.querySelector('#af-start').click()`);
  const stopped = await evaluate(`({
    start: document.querySelector('#af-start').textContent,
    pressed: document.querySelector('#af-start').getAttribute('aria-pressed')
  })`);
  assert.match(stopped.start, /Activar micrófono/);
  assert.equal(stopped.pressed, 'false');

  assert.deepEqual(pageErrors, [], `Errores de navegador: ${pageErrors.join('; ')}`);
  console.log('Prueba del afinador correcta: modo cromático, nota objetivo, detección en vivo sin grabación, marcado de nota afinada y referencia de tonalidad.');
} finally {
  socket?.close();
  await Promise.all([stopProcess(chrome), stopProcess(devServer)]);
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
