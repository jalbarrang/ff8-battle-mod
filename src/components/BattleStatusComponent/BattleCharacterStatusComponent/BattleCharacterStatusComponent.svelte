<script lang="ts">
  import { cardSuccessChance } from '$lib/card';
  import { portraitUrl } from '$lib/portraits';
  import type { BattleCharacter } from '$lib/types/game';

  interface Props {
    character: BattleCharacter;
    showCardChance?: boolean;
    side?: 'enemy' | 'party';
  }

  let { character, showCardChance = false, side = 'enemy' }: Props = $props();

  const name = $derived(character.displayName || character.name);
  const portrait = $derived(portraitUrl(name));
  const currentHealth = $derived(character.isDead ? 0 : (character.currentHealth ?? 0));
  const maxHealth = $derived(character.isDead ? 0 : (character.maxHealth ?? 0));
  const cardChance = $derived(
    showCardChance && !character.isDead ? cardSuccessChance(currentHealth, maxHealth) : null
  );
  const facingParty = $derived(side === 'party');
  const oddsColour = $derived(
    cardChance === null ? '' : cardChance >= 0.9 ? 'text-ff-good' : cardChance < 0.5 ? 'text-ff-bad' : 'text-ff-warn'
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

<div class="flex flex-col gap-0.5">
  <div class="flex items-center gap-2" class:flex-row-reverse={facingParty}>
    {#if portrait}
      <img src={portrait} alt="" class="h-10 w-auto shrink-0 border border-ff-border/60" />
    {/if}
    <div class="flex flex-1 items-baseline justify-between gap-2" class:flex-row-reverse={facingParty}>
      <span class="truncate text-sm font-bold">{name}</span>
      <span class="shrink-0 text-sm tabular-nums">
        {currentHealth}<span class="text-ff-label">/</span>{maxHealth}
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
          class="h-1.5 flex-1 border border-ff-border/50"
          class:bg-ff-good={cell < atb && atbReady}
          class:bg-ff-warn={cell < atb && !atbReady}
          class:bg-ff-window-dark={cell >= atb}
        ></span>
      {/each}
    </div>
  {/if}
  {#if cardChance !== null}
    <span
      class="text-right text-[10px] leading-none {oddsColour}"
      title={`Card capture roll: ${(cardChance * 100).toFixed(1)}% (succeeds when 256 - 255 x HP/maxHP >= rand 0..255)`}
    >
      Card {Math.round(cardChance * 100)}%
    </span>
  {/if}
</div>
