/**
 * Read-only diagnostic: characterises the FF8 enemy ATB byte (range, ceiling,
 * reset behaviour) so a gauge can be scaled correctly.
 *
 * Usage: node scripts/probe-atb.mjs [seconds]
 */
import koffi from 'koffi';

const PROCESS_NAME = 'FF8_EN.exe';
const DURATION_S = Number(process.argv[2] ?? 60);
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

const buf = Buffer.allocUnsafe(4);
const bytesRead = [0];
const readInt = (address) => {
  if (!readProcessMemory(handle, address, buf, 4, bytesRead)) return null;
  return buf.readInt32LE(0);
};
const readByte = (address) => {
  if (!readProcessMemory(handle, address, buf, 1, bytesRead)) return null;
  return buf.readUInt8(0);
};

const BATTLE_STATE = 0x01cd8fc6;
const ENEMIES = [
  { id: 1, atb: 0x01d27d95, hp: 0x01d27d98, maxHp: 0x01d27d9c },
  { id: 2, atb: 0x01d27e65, hp: 0x01d27e68, maxHp: 0x01d27e6c },
  { id: 3, atb: 0x01d27f35, hp: 0x01d27f38, maxHp: 0x01d27f3c },
  { id: 4, atb: 0x01d28005, hp: 0x01d28008, maxHp: 0x01d2800c }
];

console.log(`attached to pid=${pid}, busy-spin for ${DURATION_S}s`);

const state = ENEMIES.map((e) => ({
  ...e,
  maxAtb: -1,
  minAtb: 256,
  values: new Uint32Array(256),
  maxHpSeen: 0,
  transitions: []
}));

const start = performance.now();
const deadline = start + DURATION_S * 1000;
let lastBattleState = null;
let battleTicks = 0;

while (performance.now() < deadline) {
  const now = performance.now() - start;
  const bs = readByte(BATTLE_STATE);
  if (bs !== null && bs !== lastBattleState) {
    console.log(`  t=${(now / 1000).toFixed(2)}s  battleState ${lastBattleState} -> ${bs}`);
    lastBattleState = bs;
  }
  if (bs === 3) battleTicks++;

  for (const s of state) {
    const atb = readByte(s.atb);
    if (atb !== null) {
      if (atb > s.maxAtb) s.maxAtb = atb;
      if (atb < s.minAtb) s.minAtb = atb;
      s.values[atb]++;
      const prev = s.transitions.at(-1);
      if (!prev || prev.value !== atb) s.transitions.push({ at: now, value: atb });
    }
    const maxHp = readInt(s.maxHp);
    if (maxHp !== null && maxHp > s.maxHpSeen && maxHp < 100000) s.maxHpSeen = maxHp;
  }
}

closeHandle(handle);

const inBattle = battleTicks > 0;
console.log(`\nbattleState sampled IN_BATTLE(3) for ${battleTicks} passes\n`);

for (const s of state) {
  const occupied = s.maxHpSeen > 0;
  console.log(`enemy${s.id}: slot ${occupied ? 'OCCUPIED' : 'empty'} (maxHp=${s.maxHpSeen})  atb range ${s.minAtb}..${s.maxAtb}  distinct values ${s.values.reduce((a, c) => a + (c > 0 ? 1 : 0), 0)}`);
  if (!occupied) continue;

  // A "cycle" is a rise from a low value then a drop back down (the enemy acted).
  const cycles = [];
  let low = null;
  for (const t of s.transitions) {
    if (low === null || t.value < low.value) low = t;
    else if (low && t.value - low.value >= 0 && t.value >= 3 && low.value <= 2 && low.value < t.value) {
      // still rising
    }
  }
  const resets = [];
  for (let i = 1; i < s.transitions.length; i++) {
    const prev = s.transitions[i - 1];
    const cur = s.transitions[i];
    if (cur.value < prev.value) resets.push({ at: cur.at, from: prev.value, to: cur.value });
  }
  console.log(`  transitions=${s.transitions.length}  resets(ATB dropped)=${resets.length}`);
  for (const r of resets.slice(0, 20)) {
    console.log(`     t=${(r.at / 1000).toFixed(2)}s  ${r.from} -> ${r.to}`);
  }
  const peakBeforeReset = resets.map((r) => r.from);
  if (peakBeforeReset.length > 0) {
    console.log(`  peak value before reset: min=${Math.min(...peakBeforeReset)} max=${Math.max(...peakBeforeReset)}  (=> full gauge is at least ${Math.max(...peakBeforeReset)})`);
  }
  const histogram = [];
  for (let v = 0; v < 256; v++) if (s.values[v] > 0) histogram.push(`${v}x${s.values[v]}`);
  console.log(`  observed values: ${histogram.join(' ')}`);
}
