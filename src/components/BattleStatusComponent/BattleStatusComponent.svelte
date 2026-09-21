<script lang="ts">
  import type { BattleCharacter } from '$lib/types/game';
  import BattleCharacterStatusComponent from './BattleCharacterStatusComponent/BattleCharacterStatusComponent.svelte';

  interface Props {
    enemies: BattleCharacter[];
    partyMembers: BattleCharacter[];
  }

  let { enemies, partyMembers }: Props = $props();

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
    {#each partyMembers as partyMember (partyMember.id)}
      <BattleCharacterStatusComponent character={partyMember} side="party" />
    {/each}
  </div>
</div>
