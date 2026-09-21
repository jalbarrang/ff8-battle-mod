<script lang="ts">
  import { gameState } from '$lib/game-state.svelte';
  import CollectedGuardiansComponent from '../../components/GfsViewComponent/CollectedGuardiansComponent/CollectedGuardiansComponent.svelte';
  import SpecialGuardiansComponent from '../../components/GfsViewComponent/SpecialGuardiansComponent/SpecialGuardiansComponent.svelte';
  import UncollectedGuardiansComponent from '../../components/GfsViewComponent/UncollectedGuardiansComponent/UncollectedGuardiansComponent.svelte';

  const guardians = $derived(gameState.guardians);
  // The two lists are split here so the header can report the roster total and
  // each section only ever sees the Guardians it renders.
  const collected = $derived(guardians.filter((guardian) => guardian.unlocked));
  const uncollected = $derived(guardians.filter((guardian) => !guardian.unlocked));
  const specialFlags = $derived(gameState.guardianSpecialFlags);
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
  <div class="bar flex shrink-0 items-baseline justify-between px-2 py-1 text-label">
    <span>Guardian Forces</span>
    <span class="tabular-nums text-ff-ink-dim">
      {collected.length} / {guardians.length} collected
    </span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto pb-2 pr-2">
    <CollectedGuardiansComponent guardians={collected} />
    <UncollectedGuardiansComponent guardians={uncollected} />
    <SpecialGuardiansComponent flags={specialFlags} />
  </div>
</div>
