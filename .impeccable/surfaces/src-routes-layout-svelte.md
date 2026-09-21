---
version: 1
slug: "src-routes-layout-svelte"
primary_target: "src/routes/+layout.svelte"
related_targets: ["src/routes/+page.svelte","src/routes/battle/+page.svelte","src/routes/gfs/+page.svelte","src/routes/items/+page.svelte"]
---

# Surface brief — FF8 Battle HP renderer

## Scope and visitor mode

**Operate.** The whole renderer: the app shell plus its four screens (Party,
Battle, Guardians, Items). The visitor is the maintainer, alone, on a second
monitor, glancing at live game state while playing. Nothing here is marketing and
nothing is read linearly.

## Audience, job, constraints

Job: read the state FF8 hides — enemy HP, KO, ATB, Card odds, party and roster
status, Guardians, inventory — without leaving the game. Fixed 540x360 window
(320x160 floor). Read-only by construction. Windows x64 Electron; production
blocks all network requests, so every asset is local. Accessibility need is
distance readability, not touch.

## Chosen direction

The FF8 menu world, migrated from the incumbent NES-era FF1 look: grey metal
gradient plates with four-colour bevels, hard black offset shadows, black corner
tabs, black field, condensed grotesque with tabular figures. The window-and-frame
grammar, the two-tier surface model (raised plate vs recessed well), the signal
colour semantics and the rectilinear form language all survive the migration; the
palette, the typeface and the letter case do not.

## Direction contract

**THESIS.** A PS1-era menu window junctioned to a live game: raised grey metal
plates on a black field, each carrying a small black corner tab that names it.
It refuses the category default of a modern dashboard — no neutral ground, no
card radii, no soft elevation, no chart furniture.

**OWN-WORLD.** Four colours of metal (light stop #6a6a6a, mid #4f4f4f, dark stop
#3b3b3b, recess #262626), a two-colour bevel (light #8f8f8f on top/left, dark
#202020 on bottom/right), black field, white ink, and three state signals
(green/amber/red). Material is gradient-plus-bevel, never shadow-blur; the only
shadow is a hard 5px black offset. Type is one condensed grotesque, mixed case
for names and labels, uppercase only in the 10px corner tabs. Components are the
plate, the well, the corner tab and the raised tab.

**STORY.** The player glances and knows: whose turn is charging, what the enemy's
health and Card odds are, which Guardian is learning what. They never wonder
whether a number is live, and they never read a sentence to find a value.

**FIRST VIEWPORT.** The nav bar is a metal bar of mixed-case tabs across the top,
the active tab lit as a raised plate; a black corner tab reading STATUS sits on
the first party plate; the first plate's 16px name and its tabular health figure
are the largest ink on screen; every plate casts a hard black offset down-right
onto the field.

**FORM.** The FF8 menu world, pinned by the user against FF8's own menu chrome
(grey metal gradient, #aaa/#444 bevel, black corner tabs, text glow — evidenced
from the FFVIII menu recreation `eadpearce/ff8-ui` and FF8 menu captures). No
concept roll was run and none was owed: the world is brief-pinned, not open, and
`concept-seed` exists to break a category rut this brief does not have. Build
path is code-led — the harness reports no image generation, so there is no comp
round and no toggle to record.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
