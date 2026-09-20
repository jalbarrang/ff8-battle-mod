// Temporary diagnostic: dump FF8 battle-slot memory so we can see why enemy HP
// isn't showing. Run while FF8 is in a battle. Writes memory-dump.txt.
const { app } = require('electron');
const memoryjs = require('memoryjs');
const fs = require('fs');
const path = require('path');

function safe(fn, fallback) {
  try { return fn(); } catch (e) { return fallback !== undefined ? fallback : 'ERR:' + e.message; }
}
const ri = (h, a) => safe(() => memoryjs.readMemory(h, a, 'int'));
const rs = (h, a) => safe(() => memoryjs.readMemory(h, a, 'short'));
const rb = (h, a) => safe(() => memoryjs.readMemory(h, a, 'byte'));
const rbuf = (h, a, n) => { const o = []; for (let i = 0; i < n; i++) o.push(rb(h, a + i)); return o; };
const hex = b => (typeof b === 'number' ? b.toString(16).padStart(2, '0') : '??');

app.whenReady().then(() => {
  const lines = [];
  const log = (...a) => lines.push(a.join(' '));
  try {
    const p = memoryjs.openProcess('FF8_EN.exe');
    const h = p.handle;
    const base = (p.modBaseAddr >>> 0) || 0x400000;
    log('FF8_EN.exe pid=' + p.th32ProcessID + ' modBaseAddr=0x' + base.toString(16));

    // battle-module pointer the app uses for "battleStarted"
    const goPtr = ri(h, 0x01A79D88);
    const mainLoop = ri(h, goPtr + 0xB40);
    log('gameObjectPtr[0x1A79D88]=0x' + (goPtr >>> 0).toString(16) + '  +0xB40(mainLoop)=0x' + (mainLoop >>> 0).toString(16) + '  >1e9=' + (mainLoop > 1e9));
    log('menuIsOpen[0x1D2A27C]=' + rb(h, 0x01D2A27C));
    log('');

    const E = [0x1927D94, 0x1927E64, 0x1927F34, 0x1928004]; // enemy slot RVAs
    const NAMES = [0x01D75038, 0x01D75058, 0x01D75078, 0x01D75098]; // absolute name addrs
    for (let i = 0; i < 4; i++) {
      const rva = E[i];
      const abs = base + rva;
      log('=== Enemy ' + (i + 1) + ' (abs 0x' + abs.toString(16) + ') ===');
      log('  +0x00 atb=' + rb(h, abs + 0x00) + '  +0x04 curHP(int)=' + ri(h, abs + 0x04) + '  +0x08 maxHP(int)=' + ri(h, abs + 0x08));
      log('  +0x6C isDeadByte=' + rb(h, abs + 0x6C) + '  +0x78 statusByte=' + rb(h, abs + 0x78) + '  +0xA8 level=' + rb(h, abs + 0xA8));
      log('  name bytes @0x' + NAMES[i].toString(16) + ': ' + JSON.stringify(rbuf(h, NAMES[i], 16)));
      // raw first 0x40 bytes
      for (const off of [0x00, 0x10, 0x20, 0x30]) {
        log('  +0x' + off.toString(16).padStart(2, '0') + ': ' + rbuf(h, abs + off, 16).map(hex).join(' '));
      }
      log('');
    }

    // ally battle slots (unified struct base 0x1927B10, stride 0xD0)
    log('=== Ally battle slots ===');
    for (let i = 0; i < 3; i++) {
      const abs = base + 0x1927B18 + i * 0xD0;
      log('  Ally ' + (i + 1) + ' abs 0x' + abs.toString(16) +
        '  +0x10(short)=' + rs(h, abs + 0x10) + '  +0x14(short)=' + rs(h, abs + 0x14) +
        '  +0x18(int)=' + ri(h, abs + 0x18) + '  +0x1C(int)=' + ri(h, abs + 0x1C) +
        '  +0xB4 level=' + rb(h, abs + 0xB4));
    }
    log('');

    // app's own "PartyMember" HP addresses
    log('=== App PartyMember HP addresses ===');
    const partyHp = [[0x01CFF172, 0x01CFF174], [0x01CFF342, 0x01CFF344], [0x001CFF512, 0x01CFF514]];
    partyHp.forEach((pair, i) => log('  Party ' + (i + 1) + ' cur=' + rs(h, pair[0]) + ' max=' + rs(h, pair[1])));
    log('');

    // app's own TeamMember (savemap) HP addresses
    log('=== App TeamMember HP (Squall/Zell) ===');
    log('  Squall cur=' + rs(h, 0x01CFE0E8) + '  Zell cur=' + rs(h, 0x01CFE180));
  } catch (e) {
    log('ERROR: ' + (e && e.stack ? e.stack : e));
  }
  fs.writeFileSync(path.join(__dirname, 'memory-dump.txt'), lines.join('\n'));
  app.quit();
});
