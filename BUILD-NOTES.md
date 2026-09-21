# Modern build notes

## Supported game

The memory addresses target the English 2013 Steam release running as `FF8_EN.exe`. The application accesses runtime memory only and does not modify the executable on disk.

## Toolchain

- Node.js 26.5.x
- pnpm 11.5.x with the hoisted linker required by Electron Forge
- Electron 44.4.3
- Electron Forge 7.11.2
- SvelteKit 2.70.3 / Svelte 5.57.1 / Vite 8.3.0
- Tailwind CSS 4.3.3 through `@tailwindcss/vite`, themed as an NES-era FF1 interface
- Effect 4.0.0-rc.116, pinned because v4 is not yet generally available
- Koffi 3.3.1

The exact versions are intentionally pinned in `package.json` and `pnpm-lock.yaml`.

## TypeScript 7

TypeScript 7 is the native compiler and no longer exposes the JavaScript compiler API expected by current Svelte tooling. This repository uses a temporary dual setup:

- `typescript@5.9.3` for SvelteKit and `svelte-check`
- `typescript7`, an alias for `typescript@7.0.2`, for `pnpm check:native`

The TS7 check covers Electron main/preload code, FF8 memory code, shared native types, and Vite configs.

## Native memory access

The old `memoryjs` dependency was removed. `src/main/ff8/memory.ts` calls these Win32 APIs through Koffi:

- `CreateToolhelp32Snapshot`
- `Process32FirstW` / `Process32NextW`
- `OpenProcess`
- `ReadProcessMemory`
- `CloseHandle`

The process is opened with `PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ` only. The fork is read-only: there is no `WriteProcessMemory` binding, no write path in the watcher, and no renderer IPC that could modify the game.

Koffi and `@koromix/koffi-win32-x64` are explicitly retained and unpacked from ASAR by `forge.config.cjs`.

## Node 26 Forge patches

Forge 7.11.2 still depends on `@electron/packager` 18 and `@electron/rebuild` 3, which do not complete packaging correctly under Node 26. The workspace overrides them with versions 20.3.0 and 4.2.0.

Packager 20 changed hooks from callback arguments to Promise-based option objects, so `patches/@electron-forge__core@7.11.2.patch` adapts Forge's compatibility wrappers. Node 26 also removed recursive `fs.rmdir`; `patches/cross-zip@4.0.1.patch` replaces it with `fs.rm`.

## Commands

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm package
pnpm make
```

`pnpm make` emits:

- Squirrel installer: `out/make/squirrel.windows/x64/FF8-Battle-HP-Setup.exe`
- Portable ZIP: `out/make/zip/win32/x64/FF8 Battle HP-win32-x64-1.0.0.zip`

## Verification performed during migration

- Svelte checker: zero errors and warnings
- TypeScript 7 native check: zero errors
- Vite production builds: successful
- Forge package: successful
- Forge Squirrel and ZIP makers: successful
- Packaged Electron app: launched from ASAR with Koffi's native binary present
- Renderer smoke test: expected process-search screen rendered with production styles and no console errors

Live validation against the 2013 Steam `FF8_EN.exe` was completed in battle: enemy names/HP/KO state, party battle slots, and the `mode_StateGlobal` battle flag (3 while fighting, back to 1/2 afterwards) all read correctly, and the renderer displayed live enemy HP with Card capture odds and no console errors.
