/**
 * Connects to the FF8 main-process WebSocket hub and streams the same
 * status/delta feed the renderer consumes. This is the CDP-free way for an
 * agent or test to observe the memory pipeline.
 *
 * Usage:
 *   node scripts/ws-probe.mjs [seconds] [--port 8174] [--once] [--full] [--filter atb]
 *
 * Flags:
 *   --once        request a snapshot, print it, and exit
 *   --full        print full JSON instead of a one-line summary
 *   --filter K    only print deltas whose key contains K (repeatable)
 *
 * Env:
 *   FF8_WS_PORT   hub port (default 8174)
 */
const args = process.argv.slice(2);
const durationSeconds = Number(args.find((arg) => /^\d+(\.\d+)?$/.test(arg)) ?? 10);
const once = args.includes('--once');
const full = args.includes('--full');
const filters = args
  .map((arg, index) => (arg === '--filter' ? args[index + 1] : null))
  .filter((value) => typeof value === 'string');
const port = Number(process.env.FF8_WS_PORT ?? 8174);

const formatValue = (value) => {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const matchesFilter = (key) => filters.length === 0 || filters.some((filter) => key.includes(filter));

const started = Date.now();
const stamp = () => `t=${((Date.now() - started) / 1000).toFixed(3)}s`;

const socket = new WebSocket(`ws://127.0.0.1:${port}`);
const summary = { status: 0, deltas: 0, changedKeys: 0, snapshots: 0 };

let closing = false;
const finish = (code) => {
  if (closing) return;
  closing = true;
  try {
    socket.close();
  } catch {
    /* already closed */
  }
  console.log(
    `\n--- summary ---\n${summary.status} status, ${summary.deltas} delta batches ` +
    `(${summary.changedKeys} changed keys), ${summary.snapshots} snapshots`
  );
  process.exit(code);
};

socket.addEventListener('open', () => {
  console.log(`[${stamp()}] connected to ws://127.0.0.1:${port}`);
  socket.send(JSON.stringify({ type: 'snapshot', id: 1 }));
});

socket.addEventListener('message', (event) => {
  if (typeof event.data !== 'string') return;
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'hello':
      console.log(`[${stamp()}] hello protocol=${message.protocol} status=${message.status}`);
      break;
    case 'status':
      summary.status++;
      console.log(`[${stamp()}] status ${message.status}`);
      break;
    case 'deltas': {
      summary.deltas++;
      const entries = Object.entries(message.deltas).filter(([key]) => matchesFilter(key));
      summary.changedKeys += entries.length;
      if (entries.length === 0) break;
      if (full) {
        console.log(`[${stamp()}] deltas ${JSON.stringify(message.deltas, null, 2)}`);
        break;
      }
      for (const [key, { prevVal, newVal }] of entries) {
        console.log(`[${stamp()}] ${key}: ${formatValue(prevVal)} -> ${formatValue(newVal)}`);
      }
      break;
    }
    case 'snapshot':
      summary.snapshots++;
      if (full) {
        console.log(`[${stamp()}] snapshot ${JSON.stringify(message, null, 2)}`);
      } else {
        const keys = Object.keys(message.deltas ?? {});
        console.log(
          `[${stamp()}] snapshot id=${message.id ?? '-'} status=${message.status} ` +
          `keys=${keys.length}${keys.length ? ` (${keys.slice(0, 8).join(', ')}${keys.length > 8 ? ', …' : ''})` : ''}`
        );
      }
      if (once) finish(0);
      break;
    case 'pong':
      console.log(`[${stamp()}] pong id=${message.id ?? '-'}`);
      break;
    case 'error':
      console.error(`[${stamp()}] error: ${message.message}`);
      break;
    default:
      break;
  }
});

socket.addEventListener('error', () => {
  console.error(`[${stamp()}] could not connect to ws://127.0.0.1:${port} (is the app running?)`);
  process.exit(1);
});

if (!once) setTimeout(() => finish(0), durationSeconds * 1000);
