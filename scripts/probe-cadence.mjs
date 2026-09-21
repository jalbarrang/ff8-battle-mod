/**
 * Read-only diagnostic: measures the cadence at which the running FF8_EN.exe
 * mutates a set of addresses, at microsecond resolution.
 *
 * Usage: node scripts/probe-cadence.mjs [seconds]
 */
import koffi from 'koffi';

const PROCESS_NAME = 'FF8_EN.exe';
const DURATION_S = Number(process.argv[2] ?? 10);
const DUMP_TARGET = process.argv[3] ?? null;
const PROCESS_VM_READ = 0x0010;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const TH32CS_SNAPPROCESS = 0x00000002;

const kernel32 = koffi.load('kernel32.dll');
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
  dwSize: 'uint32_t',
  cntUsage: 'uint32_t',
  th32ProcessID: 'uint32_t',
  th32DefaultHeapID: 'uintptr_t',
  th32ModuleID: 'uint32_t',
  cntThreads: 'uint32_t',
  th32ParentProcessID: 'uint32_t',
  pcPriClassBase: 'int32_t',
  dwFlags: 'uint32_t',
  szExeFile: koffi.array('char16_t', 260, 'String')
});

const createToolhelp32Snapshot = kernel32.func('__stdcall', 'CreateToolhelp32Snapshot', HANDLE, ['uint32_t', 'uint32_t']);
const process32First = kernel32.func('__stdcall', 'Process32FirstW', 'bool', [HANDLE, koffi.inout(koffi.pointer(PROCESSENTRY32W))]);
const process32Next = kernel32.func('__stdcall', 'Process32NextW', 'bool', [HANDLE, koffi.inout(koffi.pointer(PROCESSENTRY32W))]);
const openProcess = kernel32.func('__stdcall', 'OpenProcess', HANDLE, ['uint32_t', 'bool', 'uint32_t']);
const readProcessMemory = kernel32.func(
  'bool __stdcall ReadProcessMemory(HANDLE hProcess, uintptr_t lpBaseAddress, _Out_ void *lpBuffer, size_t nSize, _Out_ size_t *lpNumberOfBytesRead)'
);
const closeHandle = kernel32.func('__stdcall', 'CloseHandle', 'bool', [HANDLE]);

function findPid(name) {
  const snap = createToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  const entry = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
  let ok = process32First(snap, entry);
  while (ok) {
    if (entry.szExeFile?.toLowerCase() === name.toLowerCase()) {
      closeHandle(snap);
      return entry.th32ProcessID;
    }
    entry.dwSize = koffi.sizeof(PROCESSENTRY32W);
    ok = process32Next(snap, entry);
  }
  closeHandle(snap);
  return null;
}

// Addresses mirror src/main/ff8/config/memory-address-config.ts exactly.
const TARGETS = [
  { name: 'battleState', address: 0x01cd8fc6, type: 'byte' },
  { name: 'atbEnemy1', address: 0x01d27d95, type: 'byte' },
  { name: 'atbEnemy2', address: 0x01d27e65, type: 'byte' },
  { name: 'atbEnemy3', address: 0x01d27f35, type: 'byte' },
  { name: 'atbEnemy4', address: 0x01d28005, type: 'byte' },
  { name: 'hpEnemy1', address: 0x01d27d98, type: 'int' },
  { name: 'hpParty1', address: 0x01cff172, type: 'short' }
];

const pid = findPid(PROCESS_NAME);
if (!pid) {
  console.error(`${PROCESS_NAME} is not running`);
  process.exit(1);
}
const handle = openProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, false, pid);
if (!handle) {
  console.error('OpenProcess failed');
  process.exit(1);
}

const buffer = Buffer.allocUnsafe(4);
const bytesRead = [0];
const readValue = ({ address, type }) => {
  const size = type === 'int' ? 4 : type === 'short' ? 2 : 1;
  if (!readProcessMemory(handle, address, buffer, size, bytesRead)) return null;
  if (type === 'int') return buffer.readInt32LE(0);
  if (type === 'short') return buffer.readInt16LE(0);
  return buffer.readUInt8(0);
};

console.log(`attached to pid=${pid}, busy-spin for ${DURATION_S}s, sampling every ~0.04ms`);

const trackers = TARGETS.map((t) => ({ ...t, last: null, changes: [] }));
const start = performance.now();
const deadline = start + DURATION_S * 1000;
let passes = 0;

while (performance.now() < deadline) {
  const now = performance.now() - start;
  for (const tracker of trackers) {
    const value = readValue(tracker);
    if (value === null) continue;
    if (tracker.last === null) {
      tracker.last = value;
      continue;
    }
    if (value !== tracker.last) {
      tracker.changes.push({ at: now, from: tracker.last, to: value });
      tracker.last = value;
    }
  }
  passes++;
}

closeHandle(handle);

const span = performance.now() - start;
console.log(`${passes} passes over ${span.toFixed(0)}ms (${(passes / span * 1000).toFixed(0)} Hz, pass interval ${(span / passes).toFixed(4)}ms)\n`);

const quantize = (values, step) => {
  const errs = values.map((v) => Math.abs(v - Math.round(v / step) * step));
  return (errs.reduce((a, b) => a + b, 0) / errs.length).toFixed(3);
};

for (const tracker of trackers) {
  const changes = tracker.changes;
  console.log(`${tracker.name.padEnd(12)} final=${String(tracker.last).padStart(11)}  changes=${changes.length}`);

  if (tracker.name === DUMP_TARGET) {
    console.log('  t(ms)        gap(ms)     from -> to   delta');
    changes.forEach((c, i) => {
      const gap = i === 0 ? 0 : c.at - changes[i - 1].at;
      console.log(
        `  ${c.at.toFixed(3).padStart(11)}  ${gap.toFixed(3).padStart(9)}  ` +
        `${String(c.from).padStart(6)} -> ${String(c.to).padStart(6)}  ${String(c.to - c.from).padStart(5)}`
      );
    });
  }

  if (changes.length < 3) continue;
  const gaps = changes.slice(1).map((c, i) => c.at - changes[i].at);
  // Only short gaps describe the update tick; long gaps are turns / resets.
  const short = gaps.filter((g) => g < 1000);
  if (short.length === 0) continue;
  const sorted = [...short].sort((a, b) => a - b);
  const mean = short.reduce((a, b) => a + b, 0) / short.length;
  console.log(
    `  short gaps (n=${short.length}): min=${sorted[0].toFixed(3)} median=${sorted[Math.floor(sorted.length / 2)].toFixed(3)} ` +
    `mean=${mean.toFixed(3)} max=${sorted.at(-1).toFixed(3)} ms`
  );
  console.log(
    `  mean |error| vs  15Hz(66.667ms)=${quantize(short, 1000 / 15)}ms  ` +
    `vs 30Hz(33.333ms)=${quantize(short, 1000 / 30)}ms  ` +
    `vs 60Hz(16.667ms)=${quantize(short, 1000 / 60)}ms  ` +
    `vs 20Hz(50ms)=${quantize(short, 50)}ms`
  );
}

// ---------------------------------------------------------------------------
// Per-tracker grid fit. Each battle struct is written at its own phase inside
// the logic tick, so timestamps must be fitted per target, not pooled.
// A control series built on a known 15 Hz grid validates the metric.
// ---------------------------------------------------------------------------
const fitGrid = (times, step, phase) => {
  const errs = times.map((t) => {
    const k = Math.round((t - phase) / step);
    return Math.abs(t - phase - k * step);
  });
  return errs.reduce((a, b) => a + b, 0) / errs.length;
};

const bestPhase = (times, step) => {
  let best = { phase: 0, err: Infinity };
  for (let i = 0; i < 400; i++) {
    const phase = (i * step) / 400;
    const err = fitGrid(times, step, phase);
    if (err < best.err) best = { phase, err };
  }
  return best;
};

const TICK = 1000 / 15;
const CANDIDATES = [
  ['15 Hz (battle logic)', TICK],
  ['20 Hz', 50],
  ['30 Hz', 1000 / 30],
  ['40 Hz', 25],
  ['60 Hz', 1000 / 60],
  ['75 Hz', 1000 / 75]
];

console.log('\n--- per-tracker grid fit ---');
console.log(`  grid residual in ms (mean |error|). A true grid converges near 0.`);
console.log(`  ${'target'.padEnd(12)}${'n'.padStart(4)}  ` + CANDIDATES.map(([l]) => l.padStart(9)).join(''));

// control: 200 timestamps on a perfect 15 Hz grid with +/- 0.35 ms of jitter
const control = Array.from({ length: 200 }, (_, i) => 11.4 + i * TICK + ((i % 5) - 2) * 0.175);
console.log(
  `  ${'CONTROL'.padEnd(12)}${String(control.length).padStart(4)}  ` +
  CANDIDATES.map(([, s]) => bestPhase(control, s).err.toFixed(3).padStart(9)).join('')
);

let pooled = 0;
for (const tracker of trackers) {
  const times = tracker.changes.map((c) => c.at);
  if (times.length < 3) continue;
  pooled += times.length;
  console.log(
    `  ${tracker.name.padEnd(12)}${String(times.length).padStart(4)}  ` +
    CANDIDATES.map(([, s]) => bestPhase(times, s).err.toFixed(3).padStart(9)).join('')
  );
}
console.log(`  (${pooled} write timestamps total)`);

// ---------------------------------------------------------------------------
// Integer-tick check: real gaps should be whole multiples of the battle tick.
// ---------------------------------------------------------------------------
console.log(`\n--- gap quantisation vs ${TICK.toFixed(3)}ms battle tick ---`);
for (const tracker of trackers) {
  if (tracker.changes.length < 3) continue;
  const gaps = tracker.changes.slice(1).map((c, i) => c.at - tracker.changes[i].at).filter((g) => g > 1);
  if (gaps.length === 0) continue;
  const rows = gaps.map((g) => {
    const ticks = Math.round(g / TICK);
    return { g, ticks, err: Math.abs(g - ticks * TICK) };
  });
  const worst = rows.reduce((a, b) => (b.err > a.err ? b : a));
  const meanErr = rows.reduce((a, b) => a + b.err, 0) / rows.length;
  console.log(
    `  ${tracker.name.padEnd(12)} gaps=${String(rows.length).padStart(3)}  ` +
    `mean|err|=${meanErr.toFixed(3)}ms  worst: ${worst.g.toFixed(3)}ms -> ${worst.ticks} ticks (err ${worst.err.toFixed(3)}ms)`
  );
  console.log(`     tick counts: ${[...new Set(rows.map((r) => r.ticks))].sort((a, b) => a - b).join(', ')}`);
}

// ---------------------------------------------------------------------------
// What the watcher's 150ms poll actually costs in detection latency.
// ---------------------------------------------------------------------------
const POLL = 150;
console.log(`\n--- simulated ${POLL}ms app poll (READ_INTERVAL) ---`);
const allLatencies = [];
for (const tracker of trackers) {
  if (tracker.changes.length === 0) continue;
  const latencies = tracker.changes.map((c) => Math.ceil(c.at / POLL) * POLL - c.at);
  allLatencies.push(...latencies);
  const sorted = [...latencies].sort((a, b) => a - b);
  console.log(
    `  ${tracker.name.padEnd(12)} events=${String(tracker.changes.length).padStart(3)}  ` +
    `latency min=${sorted[0].toFixed(1)} median=${sorted[Math.floor(sorted.length / 2)].toFixed(1)} ` +
    `mean=${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)} max=${sorted.at(-1).toFixed(1)}ms`
  );
}
if (allLatencies.length > 0) {
  const mean = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
  console.log(`  overall mean detection latency: ${mean.toFixed(1)}ms (theoretical 75ms)`);
}

// ---------------------------------------------------------------------------
// Least-squares period estimate: t = a + b * k, where k is the integer tick
// index inferred from a nominal period. Recovers the real cadence far more
// precisely than differencing noisy gaps, and exposes drift over long runs.
// ---------------------------------------------------------------------------
console.log('\n--- period regression (per target) ---');
const T0 = 1000 / 15;
for (const tracker of trackers) {
  const times = tracker.changes.map((c) => c.at);
  if (times.length < 5) continue;
  const k = times.map((t) => Math.round((t - times[0]) / T0));
  const n = times.length;
  const mk = k.reduce((a, b) => a + b, 0) / n;
  const mt = times.reduce((a, b) => a + b, 0) / n;
  const cov = k.reduce((a, kk, i) => a + (kk - mk) * (times[i] - mt), 0);
  const varK = k.reduce((a, kk) => a + (kk - mk) ** 2, 0);
  const slope = cov / varK;
  const residuals = times.map((t, i) => t - (mt + slope * (k[i] - mk)));
  const rms = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / n);
  const spanTicks = k.at(-1) - k[0];
  const oddTicks = k.filter((x) => x % 2 === 1).length;
  console.log(
    `  ${tracker.name.padEnd(12)} n=${String(n).padStart(3)} ticks=${String(spanTicks).padStart(5)}  ` +
    `period=${slope.toFixed(4)}ms  rms=${rms.toFixed(2)}ms  (${(slope / 2).toFixed(4)}ms if half-tick)  odd-parity=${oddTicks}`
  );
}
