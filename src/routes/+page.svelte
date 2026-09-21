<script lang="ts">
  import { gameState } from '$lib/game-state.svelte';
  import { portraitUrl } from '$lib/portraits';
  import type { TeamMember } from '$lib/types/game';

  const characters = $derived(gameState.teamMembers);

  // Battle-party slots persist outside a fight, so the active party can be
  // highlighted here even on the field.
  const partyIds = $derived(
    new Set(gameState.visibleParty.map((member) => member.teamMemberId))
  );

  // Only characters who have actually joined the party are shown at all; the
  // unrecruited roster slots are just noise. The joined members are then split
  // into the active battle party and everyone else.
  const joinedMembers = $derived(characters.filter((member) => member.isAvailable));
  const activeMembers = $derived(joinedMembers.filter((member) => partyIds.has(member.id)));
  const inactiveMembers = $derived(joinedMembers.filter((member) => !partyIds.has(member.id)));

  function magicCount(member: TeamMember): number {
    return member.magic?.filter(([, quantity]) => (quantity ?? 0) > 0).length ?? 0;
  }
</script>

<!-- The world has two surfaces: a raised plate that holds live state, and a
     recess for everything standing by. That, not colour, is how the active
     party is separated from the rest of the roster. -->
{#snippet memberPlate(member: TeamMember, active: boolean)}
  {@const name = member.displayName || member.name}
  {@const portrait = portraitUrl(name)}
  <div class={active ? 'plate p-2' : 'well p-2'}>
    {#if active}
      <span class="tab-label">Status</span>
    {/if}
    <div class="flex items-center gap-2">
      {#if portrait}
        <img src={portrait} alt="" class="h-12 w-auto shrink-0 border border-ff-edge-lo" />
      {/if}
      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2">
          <span class="truncate text-name font-bold">{name}</span>
          <span class="shrink-0 text-label text-ff-ink-dim">Lv {member.currentLevel ?? 1}</span>
        </div>

        <dl class="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-0.5 text-label">
          <div class="flex items-baseline gap-1.5">
            <dt class="text-ff-ink-dim">HP</dt>
            <dd class="tabular-nums">{member.currentHealth ?? 0}</dd>
          </div>
          <div class="flex items-baseline gap-1.5">
            <dt class="text-ff-ink-dim">EXP</dt>
            <dd class="tabular-nums">{member.currentExp ?? 0}</dd>
          </div>
          <div class="flex items-baseline gap-1.5">
            <dt class="text-ff-ink-dim">Magic</dt>
            <dd class="tabular-nums">{magicCount(member)}</dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
{/snippet}

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
  <div class="bar flex shrink-0 items-baseline justify-between px-2 py-1 text-label">
    <span>Party roster</span>
    <span class="tabular-nums text-ff-ink-dim">
      {joinedMembers.length} / {characters.length} joined
    </span>
  </div>

  <!-- The plate offset needs room inside the scroller, or it gets clipped. -->
  <div class="min-h-0 flex-1 overflow-y-auto pb-2 pr-2">
    <section class="flex flex-col gap-2" aria-labelledby="active-party-heading">
      <h2 id="active-party-heading" class="text-label text-ff-ink-dim">Active party</h2>
      {#if activeMembers.length > 0}
        <div class="grid grid-cols-1 gap-3">
          {#each activeMembers as member (member.id)}
            {@render memberPlate(member, true)}
          {/each}
        </div>
      {:else}
        <p class="text-label text-ff-ink-dim">
          No one is in the battle party. Slots fill when a fight starts.
        </p>
      {/if}
    </section>

    <section class="mt-4 flex flex-col gap-2" aria-labelledby="inactive-party-heading">
      <h2 id="inactive-party-heading" class="text-label text-ff-ink-dim">Inactive party</h2>
      {#if inactiveMembers.length > 0}
        <div class="grid grid-cols-1 gap-3">
          {#each inactiveMembers as member (member.id)}
            {@render memberPlate(member, false)}
          {/each}
        </div>
      {:else}
        <p class="text-label text-ff-ink-dim">Everyone who has joined is in the party.</p>
      {/if}
    </section>
  </div>
</div>
