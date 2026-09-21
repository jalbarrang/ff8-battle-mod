<script lang="ts">
  import type { TeamMember } from '$lib/types/game';
  import TeamCharacterStatusComponent from './TeamCharacterStatusComponent/TeamCharacterStatusComponent.svelte';

  interface Props {
    teamMembers: TeamMember[];
  }

  let { teamMembers }: Props = $props();
  const availableTeamMembers = $derived(teamMembers.filter((member) => member.isAvailable));

  const column =
    'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto border-2 border-ff-border bg-ff-window p-2 ' +
    '[scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]';
</script>

<div class="flex min-h-0 flex-1 gap-3 p-3">
  <div class={column}></div>
  <div class={column}>
    {#each availableTeamMembers as teamMember (teamMember.id)}
      <TeamCharacterStatusComponent character={teamMember} />
    {/each}
  </div>
</div>
