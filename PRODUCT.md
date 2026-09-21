# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Host is a Windows x64 Electron desktop window, not a browser-served page or a
mobile surface. The renderer is a web UI (SvelteKit) inside that window; there
is no phone, tablet, or touch target to design for.

## Users

The maintainer, mid-playthrough of Final Fantasy VIII (2013 Steam English
release), with the game running on the primary monitor and this viewer on a
second monitor beside it. Both are on the same PC, because reading game memory
is inherently local.

The job: see the state the game itself hides — enemy HP, KO, ATB, Card capture
odds, party and roster status, Guardian Forces, inventory — without leaving the
game, without a second machine, and without risking the save. Attention is
split, so the viewer is read in glances rather than studied.

## Product Purpose

A read-only real-time viewer for FF8 gameplay state. It attaches to the running
`FF8_EN.exe` and mirrors party, Guardian Force, item, and live battle state into
one desktop window.

Success means it stays correct through a full playthrough, stays legible at a
glance from a second monitor, and remains a codebase the maintainer wants to
keep extending.

## Positioning

The single place where party, Guardian Forces, items, and live battle state
appear together: the original mod covered the battle screen, this fork widens
that to the whole run and keeps a modern, maintained Electron/Svelte/Tailwind
stack that still builds and ships installers.

Structurally, it has no write path at all — a neighbouring tool that also
*publishes* to the game cannot truthfully claim that.

## Operating Context

- The viewer and the game run on the same machine; memory is read locally.
- The game is expected to be running first. On a cold boot the correct state is
  "searching for `FF8_EN.exe`", and the UI must be usable and honestly empty in
  that state rather than showing stale or placeholder numbers.
- The viewer is a companion on a second monitor, visible the whole session; it
  is never an overlay on top of the game.
- Runtime requires the English 2013 Steam release running as `FF8_EN.exe`. That
  is the entire support surface and it is final: other localisations, other
  regional builds, and the 2019 Remastered release are out of scope, not
  backlog.
- State reaches the renderer over a loopback WebSocket hub owned by the main
  process. Because that feed is an ordinary local WebSocket, the same stream can
  be observed without the UI: `ws://127.0.0.1:8174`, `curl http://127.0.0.1:8174/state`,
  and `scripts/ws-probe.mjs` are the supported ways to inspect real game state
  during development.
- Development runs `pnpm dev` (SvelteKit renderer + Electron main + Electron),
  and renderer DevTools/CDP can be enabled with `FF8_DEBUG_PORT=9222`.

## Capabilities and Constraints

Confirmed capability: party composition and availability, character level/HP/
EXP/magic, enemy names, HP and KO state in battle, live Card capture odds, ATB,
Guardian Forces, and inventory, plus automatic switching to the Battle screen
when a fight starts and back to the previous tab when it ends.

Hard constraints, none of which may be relaxed by a feature request:

- Read-only, enforced by construction. The process is opened with
  `PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ` and the only memory call
  is `ReadProcessMemory`. There is no `WriteProcessMemory` binding, no on-disk
  patching, and no save-file access.
- Sandboxed renderer: `nodeIntegration` disabled, `contextIsolation` and the
  Chromium sandbox enabled, all permission requests denied, no preload and no
  IPC bridge.
- The bridge binds to `127.0.0.1` only, broadcasts only data the watcher already
  read, and rejects web-page origins. If the preferred port is busy it falls
  back to an ephemeral port and tells the renderer which one.
- Windows x64 only; Node 26 / pnpm 11 toolchain pinned in `package.json`.
- The memory map under `src/main/ff8/config/` is reverse-engineered and is the
  most fragile part of the product: game-build assumptions live there.
- Terminology is game vocabulary and should stay that way: party / roster /
  active party, Guardians, Card capture odds, ATB, KO.
- Distribution is local only. `pnpm make` produces a Squirrel installer and a
  portable ZIP for this machine and nothing is published anywhere: no GitHub
  Releases, no winget or Scoop listing, no store submission, no in-app
  auto-update, and no telemetry or network calls beyond the loopback bridge.

Support scope is closed, not merely unstarted: no second memory map is
anticipated, and a request for another build is a decision to revisit, never a
default to extend toward. Distribution stops at the two local installers for the
same reason — publishing would add surfaces (release notes, version support,
update channels) that this product does not want to own.

## Brand Commitments

- Name: **FF8 Battle HP** (`productName`). Lineage is part of the product's
  honesty: a fork of Dennis Williams' (`dw1284/ff8-battle-mod`) original work,
  maintained by Juan Alb (`jalbarrang`).
- Voice: terse, uppercase, game-menu vocabulary — status labels, not sentences.
- Visual identity is Final Fantasy VIII's menu, and it is a commitment: a black
  field, grey metal plates with a two-colour bevel (light top/left, dark
  bottom/right), a hard black offset shadow, small black corner tabs naming each
  panel, and white ink in a condensed grotesque — mixed case, with uppercase
  reserved for the corner tabs. The NES-era FF1 look the first implementation
  shipped (blue windows, white frames, all-caps monospace) is the baseline that
  was left behind, not a fallback.
- Artwork: character and Guardian Force mugshots in `public/images/` are cropped
  from CaSquall's mugshot sheet (The Spriters Resource). Odin and Gilgamesh have
  no menu mugshots and use their Triple Triad cards instead. Final Fantasy VIII
  and its artwork are © Square Enix; they ship here for non-commercial fan use,
  so no asset may be presented as original work or sold.

## Evidence on Hand

- Real artwork: `public/images/` (party members, Guardians, Battle-background
  portrait variants under `backp/` and `backup2/`), `assets/icon.png`.
- `assets/inventory_edit.gif` and `assets/party_edit.gif` come from the original
  mod and document its write-capable editor era — they are history, not a
  feature description of this fork.
- Verified live behaviour is documented rather than assumed: `README.md` and
  `BUILD-NOTES.md` record battle validation of enemy name/HP/KO, party battle
  slots, the `mode_StateGlobal` battle flag, ATB, and Card capture odds.
- Absent, and not to be fabricated: real user testimonials, download counts,
  press coverage, performance benchmarks, and pricing. There is no marketing
  claim behind this product and none should be invented for it.

## Product Principles

1. **Read-only or nothing.** If a feature needs a write path, the feature is
   wrong. Never add `WriteProcessMemory`, patching, or save access.
2. **Glanceable at a distance.** The second-monitor scene is the acceptance
   test: critical state must land in a moment, at viewing distance, under split
   attention.
3. **One window for the whole run.** Party, Guardians, items and battle state
   share one app and one vocabulary instead of fragmenting into separate tools.
4. **Live truth beats decoration.** A wrong number is worse than a missing one;
   degrade honestly to the searching state instead of showing stale or invented
   values.
5. **Keep the lineage.** The FF1/NES menu identity is the product's face; deepen
   its craft rather than trading it for a different world.

## Accessibility & Inclusion

No formal standard is required beyond the basics, and the implementation already
carries sensible labels and landmarks. The one product-specific requirement is
**large-text / distance readability**: the viewer is read from a second monitor,
so type size, contrast, and density must hold up at arm's length or further. The
FF8 rebuild raised the label and figure tier to 12px and names to 16px for this
reason, so dropping back below 12px is a regression against a stated need, not a
density preference.
