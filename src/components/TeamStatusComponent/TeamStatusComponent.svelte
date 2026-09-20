<script lang="ts">
  import type { CharacterUpdate, TeamMember } from '$lib/types/game';
  import TeamCharacterStatusComponent from './TeamCharacterStatusComponent/TeamCharacterStatusComponent.svelte';

  interface Props {
    teamMembers: TeamMember[];
    onTeamMemberChange: (name: string, data: CharacterUpdate) => void;
  }

  let { teamMembers, onTeamMemberChange }: Props = $props();
  const editableTeamMembers = $derived(teamMembers.filter((member) => member.isAvailable));
</script>

<team-status>
  <team-member-list>
    {#each editableTeamMembers as teamMember (teamMember.id)}
      <TeamCharacterStatusComponent
        character={structuredClone(teamMember)}
        onTeamCharacterStatusChange={onTeamMemberChange}
      />
    {/each}
    {#each editableTeamMembers as teamMember (teamMember.id)}
      <spacer aria-hidden="true"></spacer>
    {/each}
  </team-member-list>
</team-status>

<style>
  team-member-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    padding: 20px;
  }

  spacer {
    width: 336px;
  }
</style>
