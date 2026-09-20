# FF8 Battle and Party Editor

A Windows desktop tool for editing Final Fantasy VIII gameplay state in real time.

- Edit party composition and character availability
- Edit character levels, HP, magic, and inventory-related values
- Display and manipulate enemies during battle
- Disable enemy attacks and field battles

The memory map targets the English Steam 2013 executable: **`FF8_EN.exe`**.

> This is a fork of [dw1284/ff8-battle-mod](https://github.com/dw1284/ff8-battle-mod), originally created by Dennis Williams. The modernized fork is maintained at [jalbarrang/ff8-battle-mod](https://github.com/jalbarrang/ff8-battle-mod).

## Safety model

The application reads and writes the running `FF8_EN.exe` process through Win32 APIs. It does not patch the executable on disk.

The Electron renderer is isolated and sandboxed:

- `nodeIntegration` is disabled
- `contextIsolation` and the Chromium sandbox are enabled
- all Chromium permission requests are denied
- production network requests and external navigation are blocked
- the preload exposes only a small, typed FF8 IPC API

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
pnpm build          # SvelteKit renderer + Electron main/preload bundles
pnpm package        # unpacked Electron application
pnpm make           # Squirrel installer and portable ZIP
```

Build output is written under `out/`:

- `out/make/squirrel.windows/x64/FF8-Battle-HP-Setup.exe`
- `out/make/zip/win32/x64/FF8 Battle HP-win32-x64-1.0.0.zip`

## Technology

- Electron 44
- SvelteKit 2 and Svelte 5
- Vite 8
- TypeScript 7 for native `.ts` validation
- Effect 4 RC for the process-watcher fiber lifecycle
- Koffi 3 for Win32 process-memory access
- Electron Forge 7 for packaging
- pnpm 11 on Node 26

### TypeScript compatibility split

Current SvelteKit and `svelte-check` releases still consume the legacy JavaScript compiler API, which TypeScript 7 removed. The project therefore uses:

- TypeScript 5.9 for Svelte language tooling
- TypeScript 7.0, installed under the `typescript7` alias, for `src/main`, `src/preload`, shared native types, and Vite config validation

`pnpm check` runs both toolchains. This split can be removed once Svelte's tooling supports TypeScript 7 directly.

### Node 26 packaging compatibility

Electron Forge 7 currently resolves older packager internals. `pnpm-workspace.yaml` pins Node-26-compatible `@electron/packager` and `@electron/rebuild` releases. Small tracked patches under `patches/` adapt Forge's hook API and replace the removed `fs.rmdir({ recursive: true })` call in `cross-zip`.

## Architecture

- `src/main/` — Electron lifecycle, security policy, FF8 watcher, Win32 memory adapter
- `src/preload/` — constrained context bridge
- `src/routes/` — SvelteKit renderer
- `src/components/` — Svelte 5 UI components
- `src/lib/types/` — renderer/preload contracts
- `src/main/ff8/config/` — reverse-engineered FF8 memory map and character encoding

See [BUILD-NOTES.md](./BUILD-NOTES.md) for packaging and validation details.
