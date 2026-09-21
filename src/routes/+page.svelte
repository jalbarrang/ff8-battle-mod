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

  function magicCount(member: TeamMember): number {
    return member.magic?.filter(([, quantity]) => (quantity ?? 0) > 0).length ?? 0;
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
  <div class="flex items-baseline justify-between text-[10px] text-ff-label">
    <span>Party roster</span>
    <span>{characters.filter((member) => member.isAvailable).length} / {characters.length} available</span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each characters as member (member.id)}
        {@const name = member.displayName || member.name}
        {@const portrait = portraitUrl(name)}
        {@const inParty = partyIds.has(member.id)}
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

            <div class="mt-1 flex flex-wrap gap-1 text-[9px] leading-tight">
              <span
                class="border px-1"
                class:border-ff-good={member.isAvailable}
                class:text-ff-good={member.isAvailable}
                class:border-ff-label={!member.isAvailable}
                class:text-ff-label={!member.isAvailable}
              >
                {member.isAvailable ? 'Available' : 'Not yet joined'}
              </span>
              {#if inParty}
                <span class="border border-ff-warn px-1 text-ff-warn">In party</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
