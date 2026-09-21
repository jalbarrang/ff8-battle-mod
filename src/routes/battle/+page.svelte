<script lang="ts">
  import PartyViewComponent from '../../components/PartyViewComponent/PartyViewComponent.svelte';
  import { gameState } from '$lib/game-state.svelte';
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="bar flex shrink-0 items-center gap-2 px-2 py-1 text-label">
    {#if gameState.battleStarted}
      <span class="lamp animate-pulse rounded-full bg-ff-bad"></span>
      <span>Battle in progress</span>
    {:else}
      <span class="lamp rounded-full bg-ff-edge-hi"></span>
      <span class="text-ff-ink-dim">No fight running — party status only</span>
    {/if}
  </div>

  <PartyViewComponent
    enemies={gameState.visibleEnemies}
    party={gameState.visibleParty}
    battleStarted={gameState.battleStarted}
  />
</div>
