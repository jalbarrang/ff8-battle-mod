/**
 * Read-only diagnostic: samples battle HP values as fast as possible and
 * reports how long it takes the game to move from one HP value to the next.
 *
 * Usage: node scripts/measure-hp-cadence.mjs [seconds] [sampleIntervalMs]
 */
import koffi from 'koffi';

const PROCESS_NAME = 'FF8_EN.exe';
const DURATION_S = Number(process.argv[2] ?? 30);
// 0 = busy-spin (microsecond resolution). setTimeout on Windows quantizes to ~15.6ms.
const SAMPLE_MS = Number(process.argv[3] ?? 0);

const PROCESS_VM_READ = 0x0010;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

const kernel32 = koffi.load('kernel32.dll');
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const TH32CS_SNAPPROCESS = 0x00000002;
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
const queryPerformanceCounter = kernel32.func('__stdcall', 'QueryPerformanceCounter', 'bool', [koffi.out(koffi.pointer('int64_t'))]);

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

// Battle-relevant HP values, straight from src/main/ff8/config/memory-address-config.ts
const TARGETS = [
  { name: 'enemy1', address: 0x01d27d98, type: 'int' },
  { name: 'enemy2', address: 0x01d27e24, type: 'int' },
  { name: 'enemy3', address: 0x01d27eb0, type: 'int' },
  { name: 'enemy4', address: 0x01d27f3c, type: 'int' },
  { name: 'party1', address: 0x01cff172, type: 'short' },
  { name: 'party2', address: 0x01cff342, type: 'short' },
  { name: 'party3', address: 0x01cff512, type: 'short' }
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
console.log(
  `attached to ${PROCESS_NAME} pid=${pid}, ` +
  `${SAMPLE_MS === 0 ? 'busy-spin (us resolution)' : `sampling every ~${SAMPLE_MS}ms`} for ${DURATION_S}s`
);

const buffer = Buffer.allocUnsafe(4);
const bytesRead = [0];

function readValue({ address, type }) {
  if (!readProcessMemory(handle, address, buffer, type === 'int' ? 4 : 2, bytesRead)) return null;
  return type === 'int' ? buffer.readInt32LE(0) : buffer.readInt16LE(0);
}

const trackers = new Map(TARGETS.map((t) => [t.name, { ...t, last: null, changes: [] }]));
const start = performance.now();
const deadline = start + DURATION_S * 1000;
let samples = 0;
let firstPassAt = null;

const tick = () => {
  const now = performance.now();
  if (firstPassAt === null) firstPassAt = now;
  for (const tracker of trackers.values()) {
    const value = readValue(tracker);
    if (value === null) continue;
    if (tracker.last === null) {
      tracker.last = value;
      continue;
    }
    if (value !== tracker.last) {
      tracker.changes.push({ at: now - firstPassAt, from: tracker.last, to: value, pass: samples });
      tracker.last = value;
    }
  }
  samples++;
};

if (SAMPLE_MS === 0) {
  while (performance.now() < deadline) tick();
} else {
  while (performance.now() < deadline) {
    tick();
    await new Promise((r) => setTimeout(r, SAMPLE_MS));
  }
}

closeHandle(handle);

const fmt = (n) => `${n.toFixed(2)}ms`;
const span = performance.now() - firstPassAt;
console.log(
  `\n${samples} sample passes over ${(span / 1000).toFixed(2)}s ` +
  `(pass interval ${(span / samples).toFixed(3)}ms, ${(samples / span * 1000).toFixed(0)} Hz)\n`
);

for (const tracker of trackers.values()) {
  const changes = tracker.changes;
  console.log(`${tracker.name.padEnd(7)} final=${String(tracker.last).padStart(6)}  changes=${changes.length}`);
  if (changes.length === 0) continue;
  const gaps = changes.slice(1).map((c, i) => c.at - changes[i].at);
  for (const c of changes) {
    console.log(`   t=${fmt(c.at).padStart(11)}  pass#${String(c.pass).padStart(7)}  ${c.from} -> ${c.to}`);
  }
  if (gaps.length > 0) {
    const sorted = [...gaps].sort((a, b) => a - b);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    console.log(
      `   gap min=${fmt(sorted[0])} median=${fmt(sorted[Math.floor(sorted.length / 2)])} ` +
      `mean=${fmt(mean)} max=${fmt(sorted.at(-1))}`
    );
  }
}
