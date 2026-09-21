/**
 * Read-only diagnostic: verifies the documented FF8 (2013 Steam) addresses for
 * the party inventory, GF roster/stats and the per-character party struct.
 *
 * Module-relative offsets from ff8-speedruns/ff8-memory + base 0x400000.
 *
 * Usage: node scripts/probe-game-data.mjs
 */
import koffi from 'koffi';

const PROCESS_NAME = 'FF8_EN.exe';
const PROCESS_VM_READ = 0x0010;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const TH32CS_SNAPPROCESS = 0x00000002;
const BASE = 0x400000;
const abs = (offset) => BASE + offset;

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

function readBytes(address, size) {
  const buf = Buffer.allocUnsafe(size);
  const read = [0];
  if (!readProcessMemory(handle, address, buf, size, read)) return null;
  return buf.subarray(0, read[0]);
}

const GF_NAMES = [
  'Quezacotl', 'Shiva', 'Ifrit', 'Siren', 'Brothers', 'Diablos', 'Carbuncle',
  'Leviathan', 'Pandemona', 'Cerberus', 'Alexander', 'Doomtrain', 'Bahamut',
  'Cactuar', 'Tonberry', 'Eden'
];
const CHARACTERS = ['Squall', 'Zell', 'Irvine', 'Quistis', 'Rinoa', 'Selphie', 'Seifer', 'Edea'];

const state = readBytes(0x1cd8fc6, 1);
console.log(`mode_StateGlobal byte = ${state?.[0]} (3 = in battle)\n`);

// --- Items: 198 x (id, qty), base 18FE79C ---------------------------------
const itemsRaw = readBytes(abs(0x18fe79c), 198 * 2);
console.log('=== ITEMS (non-empty slots) ===');
let itemCount = 0;
for (let i = 0; i < 198; i++) {
  const id = itemsRaw[i * 2];
  const qty = itemsRaw[i * 2 + 1];
  if (id !== 0 || qty !== 0) {
    console.log(`  slot ${String(i).padStart(3)}: id=${String(id).padStart(3)} qty=${qty}`);
    itemCount++;
  }
}
console.log(`  -> ${itemCount} occupied slots\n`);

// --- GF roster: unlock + learning skill, base 18FDCB9 stride 0x44 ----------
const rosterRaw = readBytes(abs(0x18fdcb9), 15 * 0x44 + 0x30);
// --- GF stats: hp/maxHp/exp, base 18FF618 stride 0xC -----------------------
const gfStatsRaw = readBytes(abs(0x18ff618), 16 * 0xc);
console.log('=== GUARDIAN FORCES ===');
for (let i = 0; i < 16; i++) {
  const unlocked = rosterRaw[i * 0x44];
  const learning = rosterRaw[i * 0x44 + 0x2f];
  const hp = gfStatsRaw.readUInt16LE(i * 0xc);
  const maxHp = gfStatsRaw.readUInt16LE(i * 0xc + 2);
  const exp = gfStatsRaw.readUInt32LE(i * 0xc + 4);
  console.log(
    `  ${GF_NAMES[i].padEnd(10)} unlocked=${String(unlocked).padStart(3)} learningSkill=${String(learning).padStart(3)} ` +
    `hp=${String(hp).padStart(5)} maxHp=${String(maxHp).padStart(5)} exp=${String(exp).padStart(7)}`
  );
}
console.log('');

// --- Character party struct: 8 x 0x98, base 18FE0E8 ------------------------
const charRaw = readBytes(abs(0x18fe0e8), 8 * 0x98);
console.log('=== CHARACTERS ===');
for (let i = 0; i < 8; i++) {
  const base = i * 0x98;
  const hp = charRaw.readUInt16LE(base + 0x0);
  const hpMod = charRaw.readUInt16LE(base + 0x2);
  const exp = charRaw.readUInt32LE(base + 0x4);
  const stats = ['str', 'vit', 'mag', 'spr', 'spd', 'lck'].map((name, n) => `${name}=${charRaw[base + 0xa + n]}`);
  const kill = charRaw.readUInt16LE(base + 0x90);
  const ko = charRaw.readUInt16LE(base + 0x92);
  const magic = [];
  for (let slot = 0; slot < 32; slot++) {
    const spell = charRaw[base + 0x10 + slot * 2];
    const qty = charRaw[base + 0x10 + slot * 2 + 1];
    if (spell) magic.push(`${spell}x${qty}`);
  }
  console.log(
    `  ${CHARACTERS[i].padEnd(8)} hp=${String(hp).padStart(5)} hpMod=${String(hpMod).padStart(4)} exp=${String(exp).padStart(8)} ` +
    `lvl~${Math.floor(exp / 1000) + 1} ` +
    `${stats.join(' ')} kill=${kill} ko=${ko} magic=[${magic.join(' ')}]`
  );
}

closeHandle(handle);
