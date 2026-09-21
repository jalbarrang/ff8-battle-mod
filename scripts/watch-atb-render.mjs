/**
 * Polls the renderer over CDP and captures the ATB gauge the moment it renders.
 * Exits as soon as a snapshot is taken, or after the timeout.
 *
 * Usage: CDP_PORT=9333 node scripts/watch-atb-render.mjs [timeoutSeconds] [out.png]
 */
import { writeFile } from 'node:fs/promises';

const PORT = process.env.CDP_PORT ?? '9222';
const TIMEOUT_S = Number(process.argv[2] ?? 120);
const OUT = process.argv[3] ?? 'atb-gauge.png';

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

const PROBE = `(() => {
  const meters = [...document.querySelectorAll('[role=meter]')];
  return JSON.stringify({
    battle: document.body.innerText.includes('ATB') || meters.length > 0,
    meterCount: meters.length,
    meters: meters.map((m) => ({
      label: m.getAttribute('aria-label'),
      value: Number(m.getAttribute('aria-valuenow')),
      max: Number(m.getAttribute('aria-valuemax')),
      cells: m.children.length,
      filled: [...m.children].filter((c) => c.className.baseVal !== undefined ? false : (c.className.includes('bg-ff-warn') || c.className.includes('bg-ff-good'))).length
    })),
    enemies: [...document.querySelectorAll('span.truncate.font-bold')].map((s) => s.textContent)
  });
})()`;

const deadline = Date.now() + TIMEOUT_S * 1000;
let attempts = 0;
while (Date.now() < deadline) {
  attempts++;
  const result = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
  const state = JSON.parse(result.result.value);
  if (state.meterCount > 0) {
    console.log(`captured after ${attempts} polls:`);
    console.log(JSON.stringify(state, null, 1));
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(OUT, Buffer.from(shot.data, 'base64'));
    console.log(`\nscreenshot -> ${OUT}`);
    ws.close();
    process.exit(0);
  }
  if (attempts % 20 === 0) {
    console.log(`  ${attempts} polls, no gauge yet (enemies on screen: ${JSON.stringify(state.enemies)})`);
  }
  await new Promise((r) => setTimeout(r, 400));
}

console.log(`timed out after ${attempts} polls with no ATB gauge rendered`);
ws.close();
process.exit(2);
