/**
 * Minimal CDP client: evaluates an expression in the renderer and optionally
 * saves a screenshot. Avoids the agent-browser daemon entirely.
 *
 * Usage: node scripts/cdp-probe.mjs "<js expression>" [screenshot.png]
 */
import { writeFile } from 'node:fs/promises';

const EXPRESSION = process.argv[2] ?? 'document.body.innerText';
const SHOT = process.argv[3] ?? null;

const PORT = process.env.CDP_PORT ?? '9222';
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = list.find((t) => t.type === 'page' && t.url.includes('5173'));
if (!page) {
  console.error('no renderer page found');
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 1;
const pending = new Map();

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
  else entry.resolve(message.result);
});

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

// A clean reload rules out renderer state corrupted by hot-module replacement.
if (process.env.CDP_RELOAD) {
  await send('Page.enable');
  await send('Page.reload', { ignoreCache: true });
  await new Promise((r) => setTimeout(r, Number(process.env.CDP_RELOAD_WAIT ?? 4000)));
}

const result = await send('Runtime.evaluate', {
  expression: EXPRESSION,
  returnByValue: true,
  awaitPromise: true
});

if (result.exceptionDetails) {
  console.error('renderer threw:', JSON.stringify(result.exceptionDetails.exception, null, 2));
} else {
  const value = result.result.value;
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

if (SHOT) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(SHOT, Buffer.from(shot.data, 'base64'));
  console.log(`\nscreenshot written to ${SHOT}`);
}

ws.close();
