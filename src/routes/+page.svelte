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

{#snippet memberCard(member: TeamMember)}
  {@const name = member.displayName || member.name}
  {@const portrait = portraitUrl(name)}
  <div class="flex items-center gap-2 border-2 border-ff-border bg-ff-window p-2">
    {#if portrait}
      <img src={portrait} alt="" class="h-12 w-auto shrink-0 border border-ff-border/60" />
    {/if}
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <span class="truncate text-sm font-bold">{name}</span>
        <span class="shrink-0 text-[10px] text-ff-label">LV {member.currentLevel ?? 1}</span>
      </div>

      <dl class="mt-1 grid grid-cols-3 gap-x-3 text-[10px]">
        <div class="flex justify-between gap-1">
          <dt class="text-ff-label">HP</dt>
          <dd class="tabular-nums">{member.currentHealth ?? 0}</dd>
        </div>
        <div class="flex justify-between gap-1">
          <dt class="text-ff-label">EXP</dt>
          <dd class="tabular-nums">{member.currentExp ?? 0}</dd>
        </div>
        <div class="flex justify-between gap-1">
          <dt class="text-ff-label">Magic</dt>
          <dd class="tabular-nums">{magicCount(member)}</dd>
        </div>
      </dl>
    </div>
  </div>
{/snippet}

<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
  <div class="flex items-baseline justify-between text-[10px] text-ff-label">
    <span>Party roster</span>
    <span>{joinedMembers.length} / {characters.length} joined</span>
  </div>

  <div
    class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]"
  >
    <section class="flex flex-col gap-2" aria-labelledby="active-party-heading">
      <h2
        id="active-party-heading"
        class="flex items-center gap-1.5 text-[10px] text-ff-warn"
      >
        <span class="inline-block h-1.5 w-1.5 bg-ff-warn"></span>
        Active party
      </h2>
      {#if activeMembers.length > 0}
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each activeMembers as member (member.id)}
            {@render memberCard(member)}
          {/each}
        </div>
      {:else}
        <p class="text-[10px] text-ff-label">No active party members.</p>
      {/if}
    </section>

    <div
      class="my-3 flex items-center gap-2"
      role="separator"
      aria-label="Inactive party members"
    >
      <span class="h-0.5 flex-1 bg-ff-border/60"></span>
      <span class="shrink-0 text-[10px] text-ff-label">Inactive</span>
      <span class="h-0.5 flex-1 bg-ff-border/60"></span>
    </div>

    <section class="flex flex-col gap-2" aria-labelledby="inactive-party-heading">
      <h2 id="inactive-party-heading" class="text-[10px] text-ff-label">Inactive party</h2>
      {#if inactiveMembers.length > 0}
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {#each inactiveMembers as member (member.id)}
            {@render memberCard(member)}
          {/each}
        </div>
      {:else}
        <p class="text-[10px] text-ff-label">No inactive party members.</p>
      {/if}
    </section>
  </div>
</div>
