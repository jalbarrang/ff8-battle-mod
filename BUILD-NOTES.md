# ff8-battle-mod — local build notes

Original: https://github.com/dw1284/ff8-battle-mod (no releases/tags published).

## What this is
An external window that shows enemy (and party) HP in battle by reading
`FF8_EN.exe` memory. Numeric HP, not an in-game bar. It does NOT modify the
game exe, so it is compatible with Junction VIII's exe hash whitelist,
FFNx, and Maelstrom (Maelstrom edits data files, not these runtime structs).

## Privacy / safety (hardened in index.js)
- No network code in the app at all. The only `https://` strings in the bundle
  are lodash license comments.
- `index.js` denies EVERY Chromium permission request/check (so geolocation,
  notifications, media, etc. can never be granted).
- `index.js` cancels every non-local request in `webRequest.onBeforeRequest`,
  so `http`/`https`/`ws` cannot be reached. `will-navigate` and window-open are
  denied too.
- DevTools is no longer opened.
- Verified: `permissions=denied`, `getCurrentPosition=DENIED`,
  `fetch('https://example.com')=BLOCKED`, remote `<img>=BLOCKED`.
- `sirv-cli` (unused static file server, was still a dependency) was removed.

## Overlay behavior
- Always on top (`screen-saver` level), no app menu, no DevTools.
- Window position/size persisted to `%APPDATA%\ff8-battle-mod\window-state.json`.
- Default 540x360, resizable.

## Build recipe (Windows, Node 26 + VS2022 Build Tools, Python 3.14)
1. `npm install --ignore-scripts --engine-strict=false --force`
   (old `concentrate@0.2.3` trips npm's engine-strict default.)
2. Ensure Electron 13.1.4 is extracted into `node_modules/electron/dist`
   (its installer can leave only `locales`; extract the cached zip manually and
   write `electron.exe` into `node_modules/electron/path.txt`).
3. `npm i -D @electron/rebuild --ignore-scripts --engine-strict=false --force`
4. `GYP_DEFINES="openssl_fips=" npx electron-rebuild -v 13.1.4 -f -w memoryjs`
   (Node 26 removed `openssl_fips`, which old gyp files require.)
5. `npm run build`
6. Run from source: `launch.cmd` (or `node_modules\electron\dist\electron.exe .`)

## Standalone build
`npx electron-builder --win portable`
Output: `dist/FF8-Battle-HP-1.0.0-portable.exe` (bundles Electron + memoryjs;
no Node install required). Native addon is unpacked to
`resources/app.asar.unpacked/node_modules/memoryjs/`.

## Usage
1. Start FF8 (2013 Steam, `FF8_EN.exe`) via J8/FFNx and enter a battle.
2. Run `dist/FF8-Battle-HP-1.0.0-portable.exe`.
3. Enemy names + current/max HP appear; click a number to edit.
