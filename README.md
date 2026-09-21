# FF8 Battle and Party Viewer

A Windows desktop tool for viewing Final Fantasy VIII gameplay state in real time. This fork is deliberately read-only: it never writes to the game.

- Party composition and character availability
- Character levels, HP and magic
- Enemy names, HP and KO state during battle, with live Card capture odds
- No memory writes, no code patches, no save-file access

The memory map targets the English Steam 2013 executable: **`FF8_EN.exe`**.

> This is a fork of [dw1284/ff8-battle-mod](https://github.com/dw1284/ff8-battle-mod), originally created by Dennis Williams. The modernized fork is maintained at [jalbarrang/ff8-battle-mod](https://github.com/jalbarrang/ff8-battle-mod).

## Safety model

The application opens the running `FF8_EN.exe` process with read-only access (`PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ`) and only ever calls `ReadProcessMemory`. It cannot write to the game's memory, does not patch the executable on disk, and does not touch save files.

The Electron renderer is isolated and sandboxed:

- `nodeIntegration` is disabled
- `contextIsolation` and the Chromium sandbox are enabled
- all Chromium permission requests are denied
- production network requests and external navigation are blocked, except for the loopback data bridge
- there is no preload or IPC bridge: the renderer receives game state over a loopback WebSocket hosted by the main process
- the WebSocket/HTTP bridge binds to `127.0.0.1` only and is strictly read-only

## Requirements

- Windows x64
- Node.js `26.5.x`
- pnpm `11.5.x`
- Final Fantasy VIII 2013 Steam English release for runtime use

## Development

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Useful commands:

```powershell
pnpm check          # Svelte checks plus native TypeScript 7 checks
pnpm build          # SvelteKit renderer + Electron main bundle
pnpm package        # unpacked Electron application
pnpm make           # Squirrel installer and portable ZIP
```

Build output is written under `out/`:

- `out/make/squirrel.windows/x64/FF8-Battle-HP-Setup.exe`
- `out/make/zip/win32/x64/FF8 Battle HP-win32-x64-1.0.0.zip`

## Local data bridge (agents and tests)

The main process owns the FF8 memory watcher and publishes its results on a
loopback WebSocket. The renderer is only one client of that feed, so any local
process can observe the exact same stream with an ordinary WebSocket client —
no DevTools or CDP required. The bridge only ever broadcasts data the watcher
already read; it has no write path.

- WebSocket: `ws://127.0.0.1:8174` (override with `FF8_WS_PORT`)
- One-shot state, no WebSocket client needed: `curl http://127.0.0.1:8174/state`
- Health: `curl http://127.0.0.1:8174/health`

If the preferred port is busy the hub binds an ephemeral port and tells the
renderer which port to use, so the UI keeps working. WebSocket connections from
web page origins are rejected, so a site the user visits cannot read the feed;
native clients (which send no `Origin`), the packaged renderer (`file://`) and
the loopback dev renderer are allowed.

Protocol (JSON text frames):

| Direction | Message |
| --- | --- |
| server → client | `{"type":"hello","protocol":1,"status":"searching"}` on connect |
| server → client | `{"type":"status","status":"connected"}` |
| server → client | `{"type":"deltas","deltas":{ ... }}` |
| client → server | `{"type":"snapshot","id":1}` → `{"type":"snapshot","id":1,"status":...,"deltas":{...}}` |
| client → server | `{"type":"ping","id":1}` → `{"type":"pong","id":1}` |

`status` is `searching` or `connected`. `deltas` maps a property name to
`{ prevVal, newVal }`, exactly as the renderer consumes it.

An included probe makes this easy to script:

```powershell
node scripts/ws-probe.mjs --once --full        # dump the current snapshot
node scripts/ws-probe.mjs 30 --filter atb      # watch ATB changes for 30s
```

## Technology

- Electron 44
- SvelteKit 2 and Svelte 5
- Tailwind CSS 4 for the FF1-style interface
- Vite 8
- TypeScript 7 for native `.ts` validation
- Effect 4 RC for the process-watcher fiber lifecycle
- Koffi 3 for Win32 process-memory access
- ws 8 for the main-process loopback WebSocket server
- Electron Forge 7 for packaging
- pnpm 11 on Node 26

### TypeScript compatibility split

Current SvelteKit and `svelte-check` releases still consume the legacy JavaScript compiler API, which TypeScript 7 removed. The project therefore uses:

- TypeScript 5.9 for Svelte language tooling
- TypeScript 7.0, installed under the `typescript7` alias, for `src/main`, shared types, and Vite config validation

`pnpm check` runs both toolchains. This split can be removed once Svelte's tooling supports TypeScript 7 directly.

### Node 26 packaging compatibility

Electron Forge 7 currently resolves older packager internals. `pnpm-workspace.yaml` pins Node-26-compatible `@electron/packager` and `@electron/rebuild` releases. Small tracked patches under `patches/` adapt Forge's hook API and replace the removed `fs.rmdir({ recursive: true })` call in `cross-zip`.

## Architecture

- `src/main/` — Electron lifecycle, security policy, FF8 watcher, Win32 memory adapter
- `src/main/ws/` — loopback WebSocket/HTTP hub the renderer and agents connect to (replaces the old preload/IPC bridge)
- `src/routes/` — SvelteKit renderer
- `src/components/` — Svelte 5 UI components
- `src/lib/ff8-socket.ts` — renderer-side WebSocket client with reconnect/backoff
- `src/lib/types/` — shared renderer/main contracts, including the WebSocket wire protocol
- `src/main/ff8/config/` — reverse-engineered FF8 memory map and character encoding

See [BUILD-NOTES.md](./BUILD-NOTES.md) for packaging and validation details.
