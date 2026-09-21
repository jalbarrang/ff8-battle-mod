<script lang="ts">
  import type { BattleCharacter } from '$lib/types/game';
  import BattleCharacterStatusComponent from './BattleCharacterStatusComponent/BattleCharacterStatusComponent.svelte';

  interface Props {
    /** Enemy battle slots. Empty while out of battle. */
    enemies: BattleCharacter[];
    /** The three battle-party slots, joined with team-member level/EXP data. */
    party: BattleCharacter[];
    /** EXP only has meaning on the field, so it is hidden during a fight. */
    battleStarted: boolean;
  }

  let { enemies, party, battleStarted }: Props = $props();

  // The plate is the frame, the inner div is the scroller. Keeping the scroll
  // container inside the plate is what lets the corner tab straddle the top
  // edge instead of being clipped by its own overflow.
  const column = 'plate flex min-h-0 flex-1 flex-col p-2';
  const columnBody = 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto';
</script>

<div class="flex min-h-0 flex-1 gap-3 p-3">
  <section class={column} aria-labelledby="battle-enemies-heading">
    <span class="tab-label">Enemy</span>
    <h2 id="battle-enemies-heading" class="sr-only">Enemies</h2>
    <div class={columnBody}>
      {#if enemies.length === 0}
        <p class="well px-2 py-1.5 text-label text-ff-ink-dim">
          {battleStarted ? 'These enemy slots are empty.' : 'No fight is running.'}
        </p>
      {:else}
        {#each enemies as enemy (enemy.id)}
          <BattleCharacterStatusComponent character={enemy} showCardChance />
        {/each}
      {/if}
    </div>
  </section>

  <section class={column} aria-labelledby="battle-party-heading">
    <span class="tab-label">Party</span>
    <h2 id="battle-party-heading" class="sr-only">Battle party</h2>
    <div class={columnBody}>
      {#if party.length === 0}
        <p class="well px-2 py-1.5 text-label text-ff-ink-dim">
          No one holds a battle slot yet.
        </p>
      {:else}
        {#each party as member (member.id)}
          <BattleCharacterStatusComponent
            character={member}
            side="party"
            showLevel
            showExp={!battleStarted}
          />
        {/each}
      {/if}
    </div>
  </section>
</div>
