---
name: FF8 Battle HP
description: A read-only Final Fantasy VIII battle and party readout, built as an FF8 menu window for a small always-on companion screen.
# Values sampled from Final Fantasy VIII's own menu chrome — the FFVIII menu
# recreation `eadpearce/ff8-ui` and FF8 menu captures (main menu, Junction, GF) —
# then darkened and narrowed until white ink clears 4.5:1 across the whole metal
# sweep. The NES-era FF1 palette this app shipped first is gone; see ## Colors.
colors:
  field: "#000000"
  plate-hi: "#5e5e5e"
  plate-lo: "#3d3d3d"
  well: "#232323"
  edge-hi: "#949494"
  edge-lo: "#1c1c1c"
  ink: "#ffffff"
  ink-dim: "#e2e2e2"
  signal-good: "#35c948"
  signal-warn: "#f5b800"
  signal-bad: "#f04a2a"
typography:
  name:
    fontFamily: "'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  figure:
    fontFamily: "'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  nav:
    fontFamily: "'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  tab:
    fontFamily: "'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.08em"
rounded:
  square: "0px"
  pill: "9999px"
spacing:
  hair: "2px"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "24px"
components:
  nav-tab:
    backgroundColor: "{colors.plate-lo}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    rounded: "{rounded.square}"
    padding: "6px 12px"
  nav-tab-active:
    backgroundColor: "{colors.plate-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.nav}"
    rounded: "{rounded.square}"
    padding: "6px 12px"
  corner-tab:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.tab}"
    rounded: "{rounded.square}"
    padding: "0px 4px"
  party-card:
    backgroundColor: "{colors.plate-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.name}"
    rounded: "{rounded.square}"
    padding: "{spacing.md}"
  battle-row:
    backgroundColor: "{colors.plate-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.square}"
    padding: "0px"
  guardian-card:
    backgroundColor: "{colors.plate-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.name}"
    rounded: "{rounded.square}"
    padding: "{spacing.md}"
  item-row:
    backgroundColor: "{colors.plate-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 8px"
  search-field:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 8px"
  sort-tab:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 12px"
---

# Design System: FF8 Battle HP

## Overview

**Creative North Star: "The Junction Terminal"**

This is an instrument junctioned to a running game, wearing the game's own clothes. It does not present a dashboard; it reports. Every surface is a readout plate that a player glances at while their hands are on a controller and their eyes are mostly on another monitor, which is why the interface is a 540x360 menu window rather than an application: it is small, always visible, and never the thing being looked at directly.

The world is Final Fantasy VIII's menu, and the migration to it was the point. The original mod this fork descends from was a grey Win32 dialog — beveled buttons, spinners, `File Edit View Window Help`. That was replaced, first by a NES-era FF1 pastiche and now by the real thing: grey metal plates carrying a two-colour bevel, a hard black offset shadow, black corner tabs naming each panel, a black field, and white ink in a condensed grotesque with a dark bloom. The claim is unchanged and now literal — a game's state is best reported in the visual language of the game that produced it.

The material is the period's material: flat two-dimensional plates, not photographed metal. FF8's own menus are gradient fills with drawn bevels, and this system renders them the same way (`linear-gradient` plus a four-colour border), so the build's medium matches its source's medium rather than imitating a physical object. Density is high and ornamental load is zero: no imagery beyond the game's own portraits, no icon set, no radius, no typeface beyond one. Hierarchy comes from tone, bevel, rule work and size — never from hue. The craft budget goes into alignment and into the accuracy of live numbers; the 15-cell ATB meter and the Card capture percentage are the two places this interface does something the game's own UI cannot.

**Key Characteristics:**
- 540x360 companion window (320x160 floor), a second-monitor readout rather than an app to live in.
- Four tones of one grey family plus a two-colour bevel; a black field; white ink. No hue carries hierarchy.
- One shadow in the whole system: hard, 5px, zero blur. The bevel does the edge work; the offset does the stacking.
- Small black corner tabs name every panel — the world's signature device, and the only uppercase type.
- Mixed case everywhere else, in a self-hosted condensed grotesque with tabular figures.
- Two surface tiers only: a raised plate that holds live state, a recessed well for controls, uncharged meters and empty slots.
- Panes own their scrolling; the plate is the frame, the scroller is inside it.

Confirmed anti-references. This must never resolve toward a modern SaaS dashboard (stat cards, soft radii, blurred elevation, chart furniture); toward NES pixel-art pastiche (the FF1 pastiche this replaced is precisely what it is not); toward glassmorphism (frosted panels, translucent blur); toward ornate fantasy RPG chrome (parchment, gold filigree, decorative corners); or toward mobile app card stacks (large radii, generous whitespace, stacked phone cards).

## Colors

One grey family, four tones, two bevel edges, two inks, three signals. Every value was sampled from FF8's menu chrome and then darkened until white ink clears 4.5:1 across the entire gradient — FF8's own mid-grey panels do not pass, and that is the one place fidelity yields to legibility.

### Primary
- **Plate Light** (`#5e5e5e`): the light end of every plate gradient, at the top-left where the bevel's light edge sits.
- **Plate Dark** (`#3d3d3d`): the dark end, at the bottom-right. A plate is always this diagonal sweep, never a flat fill.
- **Recess Black** (`#232323`): every recessed surface — ATB cells that have not charged, the item search field, list beds, the sort control's backing, and every empty-slot message.

### Neutral
- **Field Black** (`#000000`): the field. It shows through every gutter, behind every plate, and inside the corner tabs that break a plate's top edge. The window's own background colour matches it, so the app has no seam with its frame.
- **Bevel Light** (`#949494`): the top and left edge of anything raised — and the scrollbar thumb, which is the same gesture at a smaller scale.
- **Bevel Dark** (`#1c1c1c`): the bottom and right edge of anything raised, and the top and left edge of anything recessed. The two-tone edge is what makes a plate read as metal rather than as a rectangle.
- **Ink White** (`#ffffff`): all primary text and the current values in a readout. It carries a 2px black bloom (`text-shadow: 0 0 2px rgb(0 0 0 / 0.9)`), FF8's own lettering treatment.
- **Dim Ink** (`#e2e2e2`): field labels (`HP`, `Level`, `Learning`), units, counts, secondary status text, and the `/` inside a health figure. A barely-relieved tier: at 5:1 even on the lightest plate tone, so it is legibility relief, not a colour tier. Hierarchy in this world is carried by size and weight first.

### Tertiary
- **Signal Green** (`#35c948`): a recruited special Guardian, Card capture odds at 90% or better, ATB cells once the meter is full, and the navigation lamp while FF8 is attached.
- **Signal Amber** (`#f5b800`): the ability being learned, charged ATB cells before the meter is full, Card odds from 50–89%, the lamp while the watcher is still searching, the lit edge under the active tab, the active sort segment, the caret and the focus ring.
- **Signal Red** (`#f04a2a`): a battle in progress, a lost special Guardian, and Card odds below 50%.

### Named Rules
**The Four Tones Rule.** One grey family, four tones (plate light, plate dark, recess, field) and two bevel edges. There is no second hue family, no blue, no warm grey, and no tint of either. If a surface needs to separate from another, it moves a tone or it gains a bevel; it never gains a colour.

**The Bevel Rule.** Nothing is separated by whitespace alone. Two things that are distinct are separated by a two-colour bevel (light top/left, dark bottom/right) or by a 2px dark rule. Whitespace sets rhythm; edges carry meaning.

**The Signal Is Never Text Rule.** Green, amber and red fill bars, lamps and lit edges. They never set a word or a number. Saturated state colour cannot reach 4.5:1 as 12px text on mid metal, and a value the player must read at a glance is the last thing that should be carrying its state in hue alone. Every coloured signal ships beside a white value or a white status word.

### What the migration left behind

The NES-era FF1 system (black field, `#0000a8` blue windows, `#00005c` recesses, white frames, lavender labels) is gone, and so is its all-caps monospace voice. Nothing in a new surface may reintroduce it: the two blues, the lavender label tier and the white 2px frame are not "on brand", they are the previous brand.

## Typography

**Display Font:** none — this system has no display tier.
**Body Font:** `'FF8 Condensed', Bahnschrift, 'Arial Narrow', 'Segoe UI', system-ui, sans-serif`
**Label/Mono Font:** the same; there is only one face.

**Character:** A condensed grotesque, self-hosted (`public/fonts/roboto-condensed.woff2`, Roboto Condensed, Apache-2.0 — the face the FFVIII menu recreation used), with Bahnschrift and Arial Narrow as installed fallbacks. It is referenced document-relative from the stylesheet rather than imported through the bundler: the production build inlines CSS into the HTML, so a hashed Vite asset URL resolves to nothing under `file://` and the app would quietly fall back to a system face. Condensed and slightly mechanical, it matches FF8's menu lettering and keeps long item and Guardian names inside 540px.

### Hierarchy
- **Name** (`text-name`, bold, 16px): character and Guardian names, and the current health figure in a battle row. Bold is the entire weight vocabulary — there is no 500, no italics.
- **Figure** (`text-name`, regular, 16px, `tabular-nums`): health values. Same size as a name, because "whose row is this" and "how much health is left" are the two things a glance must catch.
- **Nav** (`text-nav`, regular, 13px): the four tab labels.
- **Label** (`text-label`, regular, 12px): the workhorse — field labels, in-card figures, odds, EXP, section headers, counts, item rows, status text. The floor: nothing in this system is smaller.
- **Tab** (`text-tab`, regular, 11px, `letter-spacing: 0.08em`, uppercase): the black corner tabs that name panels. The only uppercase type in the interface.

### Named Rules
**The One Face Rule.** One typeface, forever. No display face, no serif for flavour, no icon font, no second weight beyond regular and bold.

**The Corner Tab Rule.** Uppercase belongs to the 11px corner tabs and to nothing else. Names, labels, item names and status words are mixed case, because that is how FF8's menus read. A screen of all-caps condensed type is the FF1 system's voice, not this one.

**The Twelve Floor Rule.** Nothing is set below 12px except the 11px corner tab. The viewer is read from a second monitor under split attention, and the label tier sits at 12px for that reason; sub-12px copy is a regression against a stated product need, not a density choice. The scale lives in `@theme` as `--text-name`, `--text-nav`, `--text-label` and `--text-tab`, and `pnpm lint` fails a hand-written size.

**The Lining Figures Rule.** Every changing numeral is tabular. A health value that shifts its own width while the player is watching it is a defect, not a detail.

## Layout

The window is the layout. Default 540x360, minimum 320x160, resizable, size persisted between runs. A fixed navigation bar (13px text, 12px horizontal and 6px vertical padding, 2px dark bottom rule, roughly 32px tall) sits above a single main region that fills the rest.

Inside the main region, screens are vertical stacks with a 12px gutter (`p-3`) and 12px gaps between plates. Every screen opens with a chrome strip — a gradient bar carrying the screen's name on the left and its count on the right — and each of its groups opens with a second, thinner strip. Within a plate, padding drops to 8px and inner rows tighten to 4px or 2px. That is the whole rhythm: 2, 4, 6, 8, 12, 24.

Two surface tiers carry the structure. A **plate** is raised: gradient fill, two-colour bevel, 5px hard offset, and a black corner tab straddling its top edge. A **well** is recessed: flat `#232323`, inverted bevel, no offset. Plates hold live state; wells hold controls, ATB cells, list beds and empty slots. Nothing else is a container.

**The plate is the frame and the scroller is inside it.** A plate that scrolls must put its scroll container in an inner element, or the corner tab straddling the top edge gets clipped by the overflow. Scrolling is always delegated: the window and the main region are `overflow-hidden`, and each pane that can grow owns its own `overflow-y-auto` with a thin scrollbar (`#949494` thumb on `#232323`). A scrollbar at the window edge would mean the layout had failed.

The Guardian grids climb a column ladder as the window widens — `sm:grid-cols-2` at 640px, `xl:grid-cols-3` at 1280px, `2xl:grid-cols-4` at 1536px; the party and item grids are still one column. All of it is dormant at the default 540px: design for one column, treat the extra columns as a bonus, never as the composition.

### Named Rules
**The No Page Scroll Rule.** The window never scrolls. Only a nameable pane does. If content overflows the window, the fix is a pane, not a scrollbar on `<body>`.

**The 540 Rule.** Every screen is composed for 540x360 first. 320px must remain usable, but no composition may depend on width the default window does not have.

**The Frame Owns The Label Rule.** A corner tab belongs to the plate, not to the scroll container. If a label clips, the frame/scroller nesting is wrong, not the label's position.

## Elevation & Depth

There is exactly one shadow in this system: `box-shadow: 5px 5px 0 #000` on every raised plate. Hard, offset, zero blur — a plate sitting on the field, which is what FF8's menus do. It is not an elevation scale and it never varies: no hover lift, no focus glow, no second step, no blur anywhere. Anything that must not stack goes recessed instead, and everything recessed has no shadow at all.

Depth is otherwise entirely structural: the bevel says raised, the inverted bevel says recessed, the gradient says which way the light falls (top-left, always, matching the bevel's light edge). Absence is conveyed by terracing rather than dimming: an uncollected Guardian is the same plate with its portrait at `opacity: 0.4` and greyscale and its status line reading "Not obtained", so a missing thing occupies exactly the space a present one does and the list never reflows.

## Shapes

Hard rectangles, no exceptions beyond a single dot. `border-radius: 0` is the form language: plates, wells, tabs, fields, ATB cells and item rows are all square-cornered.

Edges do the work that radius and blurred shadow do elsewhere, in a strict hierarchy:
- **2px two-colour bevel** — every plate and well, light `#949494` on top/left and dark `#1c1c1c` on bottom/right (inverted for wells).
- **2px dark rule** — the bottom edge of a chrome bar, and the divider between item rows.
- **1px dark rule** — inner detail: portraits inside plates and ATB cells.
- **Gradient sweep** — 135deg from Plate Light to Plate Dark on every raised surface, so any two plates agree about where the light is.

The single exception: a 6px lamp. `border-radius: 9999px` for the round status lamps (connection, battle in progress), square for the odds marker. It is the only curve in the interface, which is why it reads as a lamp.

## Components

### Plate
The primary surface: `linear-gradient(135deg, #5e5e5e, #3d3d3d)`, a 2px two-colour bevel, `box-shadow: 5px 5px 0 #000`, 8px padding, `position: relative` so its corner tab can straddle the top edge.

### Well
The recess: flat `#232323`, 2px bevel with the light and dark edges swapped, no shadow. Used for ATB cells, the search field, the sort control's backing, list beds and every empty-slot message.

### Corner Tab (signature)
An absolutely positioned black label at `top: -8px; left: 8px`, 11px uppercase, `letter-spacing: 0.08em`, 4px horizontal padding, background Field Black. It straddles the plate's top edge and interrupts its top bevel, naming the panel the way FF8's `STATUS`, `HELP`, `GF` and `COMMAND` tabs do. Every plate in the app carries one: `Status` on party members, `Enemy` and `Party` on the battle columns, `GF` on Guardians, `Inventory` on the item ledger, and `Odin`/`Gilgamesh` on the special cards.

### Chrome Strip
A 180deg gradient bar (`#5e5e5e` → `#3d3d3d`) closed by a 2px dark bottom rule, 8px horizontal and 4px vertical padding, 12px text. Carries the screen name and its count (`Party roster` … `2 / 8 joined`), or a group name and its count (`Collected` … `4`). It is the system's most repeated element and it never casts an offset — it is part of the frame, not a plate.

### Navigation Tabs
A chrome strip of adjacent mixed-case tabs divided by 2px dark rules: 13px text, 12px horizontal and 6px vertical padding.
- **Default:** transparent on the bar, ink white.
- **Hover:** the bar lightens toward Plate Light at 60% — a hover previews selection with the same surface change.
- **Active:** the tab itself becomes a plate (135deg gradient) with a 3px Signal Amber inset edge along its bottom. Selection is stated twice, by surface and by the amber edge.
- **Battle indicator:** when a fight starts, a 6px pulsing Signal Red lamp appears inside the Battle tab.

### Status Bar
The strip under the navigation on the Battle screen: a lamp plus one line of text. Red and pulsing while a fight runs ("Battle in progress"), a neutral grey lamp and dim ink when idle ("No fight running — party status only"), and a Signal Green lamp with "FF8 connected" in the navigation. The lamp is the state; the words carry the detail.

### Battle Character Row (signature)
A 40px portrait with a 1px dark rule, the name at 16px bold, `Lv n` at 12px dim, and current/max health as one 16px tabular figure with the `/` in dim ink. Party rows mirror horizontally (`flex-row-reverse`) so the player's side reads right-to-left against the enemy column — the portrait moves to the right edge and the numbers to the left. Enemies add the ATB meter and Card odds; party members add `EXP n`, hidden during a fight because EXP only has meaning on the field.

### ATB Meter (signature)
Fifteen discrete cells, `gap: 1px`, each 8px tall with a 1px dark rule, stretching to the row's width. Uncharged cells are Recess Black; charged cells are Signal Amber; all fifteen charged flips them to Signal Green and the meter reports itself ready to act. It is a `role="meter"` with live `aria-valuenow`, because the enemy's 0–15 counter is the one piece of state a player can act on and it must not be conveyed by colour alone.

### Card Odds Readout
A right-aligned 12px line, white, reading `Card 87%`, preceded by a 6px lamp in the band's colour: Signal Green at 90% and above, Signal Amber from 50–89%, Signal Red below 50%. Computed from current and maximum health; it disappears entirely once the enemy is dead rather than showing 0%.

### Party Member Plate
8px padding on a plate. A 48px portrait (1px dark rule), the name at 16px bold, `Lv n` at 12px dim right-aligned on the same baseline, and beneath it a wrapping row of tight label/value pairs at 12px — `HP 2446  EXP 7812  Magic 22` — labels in dim ink, values white and tabular. A member standing by is the same content on a well instead of a plate: the two-tier surface model, not greyed-out text, is how the active party is separated from the roster.

### Guardian Force Card
A 64px portrait, a 16px bold name, derived `Lv n` at 12px dim, then labelled rows at 12px. The card carries no gauges: HP is a plain `current / max` figure, and under the total `EXP` figure sits a second `XP to Next level` row reporting what the current level still costs, `—` at the level cap. The `Learning` row reports the ability in white beside a 6px amber lamp, with its progress as `collected / required AP` in dim ink — the total read from the kernel ability table, so a modded AP cost shows up here too. An unobtained Guardian is a well whose portrait is `opacity-40 grayscale`, with "Not obtained" in dim ink.

### Item Ledger
One plate holding every row, divided by 1px dark rules — a console inventory, not a stack of cards. Rows are 12px, 4px/8px padding, name truncated with an ellipsis, quantity as `×n` in dim ink, tabular, at the right edge, with a Plate Light wash at 40% on hover.

### Search Field
A well, 2px inverted bevel, 4px/8px padding, 12px text, dim ink placeholder, Signal Amber caret. Focus is a 2px Signal Amber outline from the global `:focus-visible` rule — never `outline: none`.

### Sort Control
Two tabs inside a well, divided by a 2px dark rule, matching the navigation exactly: the active segment takes the plate gradient and the 3px amber inset edge, the inactive one sits at dim ink on the recess. Each carries `aria-pressed`.

### Scrollbar
10px, Recess Black track, Bevel Light thumb with a 2px recess border, lightening on hover. Themed in CSS so the browser surface belongs to the palette.

## Do's and Don'ts

### Do:
- **Do** keep one grey family: Plate Light and Plate Dark for raised, Recess Black for recessed, Field Black behind everything, white ink on top.
- **Do** draw every edge as a two-colour bevel, light on top/left and dark on bottom/right, inverted for wells. The bevel is the material.
- **Do** give every plate a black corner tab naming it, straddling the top edge — and nest the scroll container inside the plate so the tab is never clipped.
- **Do** keep the one shadow hard and constant: `5px 5px 0 #000`, no blur, no hover lift, no second step.
- **Do** set every changing numeral in `tabular-nums` — health, EXP, level, quantity, odds, AP.
- **Do** take every size from the `--text-*` scale and every colour from a `--color-ff-*` token, and keep the classes you write ones Tailwind or `src/styles/global.css` can actually generate. `pnpm lint` fails a hand-written size, a raw colour, and an ungeneratable class, and its errors name the token to use instead.
- **Do** pair every coloured signal with a white value or word, and keep `role="meter"` with live `aria-valuenow` on the ATB meter.
- **Do** show absence by terracing: an unobtained Guardian is a well with a greyscale portrait, holding the same space as a present one.
- **Do** keep the empty states written: an idle battle column, an empty inventory and a searching window each say what they are.
- **Do** ship assets through `public/` and reference them document-relative (`./fonts/…`, `./images/…`). The production bundle inlines the stylesheet into the HTML, so a bundler-hashed asset URL does not resolve under `file://` and fails silently to a fallback.

### Don't:
- **Don't** blur the shadow, add a second shadow, or lift a plate on hover. One hard offset is the whole depth system.
- **Don't** round anything. No 4px "softening", no card radii, no pill buttons — the 6px lamp is the only curve.
- **Don't** set state colour as text. Green, amber and red fill bars, lamps and lit edges, never words or numbers.
- **Don't** reintroduce the FF1 system: no `#0000a8` blue, no lavender labels, no white 2px frames, no all-caps condensed type outside the corner tabs.
- **Don't** go below 12px except the 11px corner tab, and don't trade the label tier for density.
- **Don't** ship a focus state as `outline: none`; keyboard focus is a 2px amber outline, always visible.
- **Don't** let the navigation clip. Below the `status` breakpoint (431px) the connection words drop and the lamp carries the state alone; the tabs never truncate.
- **Don't** let the window scroll. Overflow belongs to a pane.
- **Don't** drift toward a modern dashboard, NES pixel-art pastiche, glassmorphism, ornate fantasy chrome, or mobile card stacks — all five are confirmed anti-references.
- **Don't** treat the metal as a photograph. This is a flat 2D plate language: gradients and drawn bevels are the medium, and painted or photographic textures would be a different world.
