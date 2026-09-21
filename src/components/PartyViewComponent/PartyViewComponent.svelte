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

  const column =
    'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-2 border-ff-border bg-ff-window p-2 ' +
    '[scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]';
</script>

<div class="flex min-h-0 flex-1 gap-3 p-3">
  <div class={column}>
    {#each enemies as enemy (enemy.id)}
      <BattleCharacterStatusComponent character={enemy} showCardChance />
    {/each}
  </div>
  <div class={column}>
    {#each party as member (member.id)}
      <BattleCharacterStatusComponent
        character={member}
        side="party"
        showLevel
        showExp={!battleStarted}
      />
    {/each}
  </div>
</div>
