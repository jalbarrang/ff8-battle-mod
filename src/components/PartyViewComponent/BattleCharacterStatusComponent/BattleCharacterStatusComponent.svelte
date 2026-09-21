<script lang="ts">
  import { cardSuccessChance } from '$lib/card';
  import { portraitUrl } from '$lib/portraits';
  import type { BattleCharacter } from '$lib/types/game';

  interface Props {
    character: BattleCharacter;
    showCardChance?: boolean;
    showExp?: boolean;
    showLevel?: boolean;
    side?: 'enemy' | 'party';
  }

  let {
    character,
    showCardChance = false,
    showExp = false,
    showLevel = false,
    side = 'enemy'
  }: Props = $props();

  const name = $derived(character.displayName || character.name);
  const portrait = $derived(portraitUrl(name));
  const currentHealth = $derived(character.isDead ? 0 : (character.currentHealth ?? 0));
  const maxHealth = $derived(character.isDead ? 0 : (character.maxHealth ?? 0));
  const cardChance = $derived(
    showCardChance && !character.isDead ? cardSuccessChance(currentHealth, maxHealth) : null
  );
  const facingParty = $derived(side === 'party');

  // The odds lamp carries the band, never the words: saturated green, amber and
  // red cannot reach 4.5:1 as 10px text on metal, and the number stays legible.
  const oddsLamp = $derived(
    cardChance === null
      ? ''
      : cardChance >= 0.9
        ? 'bg-ff-good'
        : cardChance < 0.5
          ? 'bg-ff-bad'
          : 'bg-ff-warn'
  );

  // The enemy ATB gauge is a 0..15 counter, so it is rendered as 15 discrete
  // cells rather than a continuous bar. It holds at 15 while the enemy waits in
  // the action queue and resets to 0 once it acts. Only enemies have an ATB
  // address mapped, so party members never show this.
  const ATB_FULL = 15;
  const atbCells = Array.from({ length: ATB_FULL }, (_, index) => index);
  const atb = $derived(
    !facingParty && !character.isDead && character.atb !== undefined
      ? Math.min(Math.max(character.atb, 0), ATB_FULL)
      : null
  );
  const atbReady = $derived(atb === ATB_FULL);
</script>

<div class="flex flex-col gap-1">
  <div class="flex items-center gap-2" class:flex-row-reverse={facingParty}>
    {#if portrait}
      <img src={portrait} alt="" class="h-10 w-auto shrink-0 border border-ff-edge-lo" />
    {/if}
    <div
      class="flex flex-1 items-baseline justify-between gap-2"
      class:flex-row-reverse={facingParty}
    >
      <span class="flex min-w-0 items-baseline gap-1.5">
        <span class="truncate text-name font-bold">{name}</span>
        {#if showLevel && character.currentLevel !== undefined}
          <span class="shrink-0 text-label leading-none text-ff-ink-dim">
            Lv {character.currentLevel}
          </span>
        {/if}
      </span>
      <span class="shrink-0 text-name tabular-nums">
        {currentHealth}<span class="text-ff-ink-dim">/</span>{maxHealth}
      </span>
    </div>
  </div>

  {#if atb !== null}
    <div
      class="flex gap-px"
      class:flex-row-reverse={facingParty}
      role="meter"
      aria-label={atbReady ? `${name} ATB ready` : `${name} ATB`}
      aria-valuenow={atb}
      aria-valuemin={0}
      aria-valuemax={ATB_FULL}
      title={atbReady ? 'ATB full — ready to act' : `ATB ${atb}/${ATB_FULL}`}
    >
      {#each atbCells as cell (cell)}
        <span
          class="h-2 flex-1 border border-ff-edge-lo"
          class:bg-ff-good={cell < atb && atbReady}
          class:bg-ff-warn={cell < atb && !atbReady}
          class:bg-ff-well={cell >= atb}
        ></span>
      {/each}
    </div>
  {/if}

  {#if cardChance !== null}
    <span
      class="flex items-center justify-end gap-1.5 text-label leading-none"
      title={`Card capture roll: ${(cardChance * 100).toFixed(1)}% (succeeds when 256 - 255 x HP/maxHP >= rand 0..255)`}
    >
      <span class="lamp rounded-full {oddsLamp}"></span>
      <span class="tabular-nums">Card {Math.round(cardChance * 100)}%</span>
    </span>
  {/if}

  {#if showExp && character.currentExp !== undefined}
    <span
      class="text-label leading-none text-ff-ink-dim"
      class:text-right={!facingParty}
      title={`Experience ${character.currentExp}`}
    >
      EXP {character.currentExp}
    </span>
  {/if}
</div>
