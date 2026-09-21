<script lang="ts">
  import PartyViewComponent from '../../components/PartyViewComponent/PartyViewComponent.svelte';
  import { gameState } from '$lib/game-state.svelte';
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div
    class="flex shrink-0 items-center gap-2 border-b-2 border-ff-border bg-ff-window-dark px-3 py-1 text-[10px]"
  >
    {#if gameState.battleStarted}
      <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ff-bad"></span>
      <span class="text-ff-bad">Battle in progress</span>
    {:else}
      <span class="text-ff-label">No battle — showing party status</span>
    {/if}
  </div>

  <PartyViewComponent
    enemies={gameState.visibleEnemies}
    party={gameState.visibleParty}
    battleStarted={gameState.battleStarted}
  />
</div>
