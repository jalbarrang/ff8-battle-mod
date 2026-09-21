/**
 * Continuously samples the renderer DOM over CDP and records the game-data
 * stream over the FF8 WebSocket hub. Used to tell apart "no data reached the
 * component" from "data reached it but the derived list stayed empty".
 *
 * The WebSocket side replaces the old `window.ff8` IPC recorder, so this script
 * no longer depends on the preload bridge.
 *
 * Usage: node scripts/monitor-battle-view.mjs <port,port> [seconds]
 * Env:   FF8_WS_PORT (default 8174)
 */
import { writeFile } from 'node:fs/promises';

const PORTS = (process.argv[2] ?? '9222').split(',');
const DURATION_S = Number(process.argv[3] ?? 120);
const WS_PORT = Number(process.env.FF8_WS_PORT ?? 8174);

const PROBE = `(() => {
  // PartyViewComponent is the only view with the bordered blue window columns.
  const battleColumns = [...document.querySelectorAll('div.border-2.border-ff-border.bg-ff-window')];
  const names = [...document.querySelectorAll('span.truncate.font-bold')].map((s) => s.textContent.trim());
  const meters = [...document.querySelectorAll('[role=meter]')];
  const raw = document.body.innerHTML;
  // Both states now share one shell and both show LV, so the discriminator is
  // whether enemy rows are present (enemies only render during a battle) and
  // whether party rows show EXP (only rendered on the field).
  const hasEnemies = battleColumns.length > 0 && battleColumns[0].querySelectorAll('span.truncate.font-bold').length > 0;
  const hasExp = raw.includes('>EXP ');
  const view = raw.includes('Looking for process')
    ? 'SEARCHING'
    : hasEnemies
      ? 'BATTLE'
      : hasExp
        ? 'FIELD'
        : 'SHELL';
  return JSON.stringify({
    view,
    characters: names,
    enemyColumn: battleColumns[0] ? battleColumns[0].querySelectorAll('span.truncate.font-bold').length : -1,
    partyColumn: battleColumns[1] ? battleColumns[1].querySelectorAll('span.truncate.font-bold').length : -1,
    meters: meters.length,
    meterValues: meters.map((m) => Number(m.getAttribute('aria-valuenow')))
  });
})()`;

// --- game-data recorder over the WebSocket hub -----------------------------
const probe = { connected: false, batches: 0, changedKeys: 0, atb: [], sawAtbKey: false, sawEnemyHp: false, status: null };
const ws = new WebSocket(`ws://127.0.0.1:${WS_PORT}`);
ws.addEventListener('open', () => {
  probe.connected = true;
  ws.send(JSON.stringify({ type: 'snapshot', id: 1 }));
});
ws.addEventListener('message', (event) => {
  if (typeof event.data !== 'string') return;
  const message = JSON.parse(event.data);
  if (message.type === 'status') probe.status = message.status;
  if (message.type !== 'deltas') return;
  probe.batches++;
  probe.changedKeys += Object.keys(message.deltas).length;
  if (message.deltas.atbEnemy1) {
    probe.sawAtbKey = true;
    probe.atb.push(message.deltas.atbEnemy1.newVal);
  }
  if (message.deltas.currentHealthEnemy1) probe.sawEnemyHp = true;
});
ws.addEventListener('error', () => console.warn(`[ws] no hub on ws://127.0.0.1:${WS_PORT}`));

async function connect(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page' && t.url.includes('5173'));
  if (!page) return null;

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return {
    port,
    ws: socket,
    evaluate: (expression) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
      }),
    screenshot: () =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
      })
  };
}

const clients = (await Promise.all(PORTS.map(connect))).filter(Boolean);
if (clients.length === 0) {
  console.error('no renderers reachable');
  process.exit(1);
}
console.log(`watching ${clients.map((c) => c.port).join(', ')} for ${DURATION_S}s`);
console.log(`game data via ws://127.0.0.1:${WS_PORT}\n`);

const history = clients.map(() => []);
const timelines = clients.map(() => []);
const start = Date.now();
let shotTaken = false;

while (Date.now() - start < DURATION_S * 1000) {
  for (const [index, client] of clients.entries()) {
    try {
      const result = await client.evaluate(PROBE);
      const state = JSON.parse(result.result.value);
      history[index].push(state);
      const timeline = timelines[index];
      const previous = timeline.at(-1);
      const changed =
        !previous || previous.view !== state.view || previous.enemyColumn !== state.enemyColumn || previous.meters !== state.meters;
      if (changed) {
        timeline.push({ t: ((Date.now() - start) / 1000).toFixed(1), ...state });
        console.log(
          `[${client.port}] t=${((Date.now() - start) / 1000).toFixed(1)}s ${state.view.padEnd(9)} ` +
          `enemyCol=${state.enemyColumn} partyCol=${state.partyColumn} meters=${state.meters} ` +
          `${state.meterValues.length ? `atb=[${state.meterValues.join(',')}] ` : ''}${JSON.stringify(state.characters)}`
        );
        const shotView = process.env.SHOT_VIEW ?? 'BATTLE';
        const shouldShoot = state.view === shotView;
        if (shouldShoot && !shotTaken) {
          shotTaken = true;
          const shot = await client.screenshot();
          await writeFile(`${shotView.toLowerCase()}-${client.port}.png`, Buffer.from(shot.data, 'base64'));
          console.log(`           ^ screenshot -> ${shotView.toLowerCase()}-${client.port}.png`);
        }
      }
    } catch (error) {
      console.log(`[${client.port}] probe failed: ${error.message}`);
    }
  }
  await new Promise((r) => setTimeout(r, 400));
}

console.log('\n--- summary ---');
for (const [index, client] of clients.entries()) {
  const states = history[index];
  const views = states.reduce((acc, s) => ({ ...acc, [s.view]: (acc[s.view] ?? 0) + 1 }), {});
  const battleStates = states.filter((s) => s.view === 'BATTLE');
  console.log(
    `[${client.port}] samples=${states.length} views=${JSON.stringify(views)} ` +
    `battleSamples=${battleStates.length} ` +
    `maxEnemyColumn=${Math.max(-1, ...battleStates.map((s) => s.enemyColumn))} ` +
    `maxPartyColumn=${Math.max(-1, ...battleStates.map((s) => s.partyColumn))} ` +
    `maxMeters=${Math.max(0, ...states.map((s) => s.meters))}`
  );
}
console.log(
  `[ws] connected=${probe.connected} status=${probe.status} batches=${probe.batches} ` +
  `changedKeys=${probe.changedKeys} sawAtbKey=${probe.sawAtbKey} sawEnemyHp=${probe.sawEnemyHp} ` +
  `atbSamples=${probe.atb.length}`
);
ws.close();
