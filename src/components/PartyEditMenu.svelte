<script lang="ts">
  import type { BattleCharacter, CharacterUpdate, TeamMember } from '$lib/types/game';

  interface Props {
    partyMembers: BattleCharacter[];
    teamMembers: TeamMember[];
    onPartyMemberChange: (id: number, data: CharacterUpdate) => void;
    onTeamMemberChange: (name: string, data: CharacterUpdate) => void;
    disabled: boolean | string[];
  }

  let {
    partyMembers,
    teamMembers,
    onPartyMemberChange,
    onTeamMemberChange,
    disabled
  }: Props = $props();

  const availableForSlot = (slot: number): TeamMember[] => [
    { id: 255, name: '', displayName: '' },
    ...teamMembers.filter(
      (member) =>
        member.isAvailable &&
        partyMembers.every(
          (partyMember, index) => index === slot || partyMember.teamMemberId !== member.id
        )
    )
  ];

  const slot1AvailableTeamMembers = $derived(availableForSlot(0));
  const slot2AvailableTeamMembers = $derived(availableForSlot(1));
  const slot3AvailableTeamMembers = $derived(availableForSlot(2));

  function isDisabled(setting: string): boolean {
    return disabled === true || (Array.isArray(disabled) && disabled.includes(setting));
  }

  function onSelectChange(slot: number, event: Event): void {
    const member = partyMembers[slot];
    if (!member) return;
    onPartyMemberChange(member.id, {
      teamMemberId: Number((event.currentTarget as HTMLSelectElement).value)
    });
  }

  function onCheckboxChange(member: TeamMember, event: Event): void {
    onTeamMemberChange(member.name, {
      isAvailable: (event.currentTarget as HTMLInputElement).checked
    });
  }
</script>

<party-edit-menu>
  <settings-panel>
    <setting-row>
      <setting-name>Team Members:</setting-name>
      <setting-options class="team-availability">
        {#each teamMembers as teamMember}
          <label>
            <input
              type="checkbox"
              checked={teamMember.isAvailable}
              onchange={(event) => onCheckboxChange(teamMember, event)}
              disabled={isDisabled('team-availability')}
            />
            {teamMember.displayName ?? ''}
          </label>
        {/each}
      </setting-options>
    </setting-row>
    <setting-row>
      <setting-name>Main Party:</setting-name>
      <setting-options class="main-party">
        <select
          value={partyMembers[0]?.teamMemberId}
          onchange={(event) => onSelectChange(0, event)}
          disabled={isDisabled('main-party')}
          aria-label="Party slot 1"
        >
          {#each slot1AvailableTeamMembers as teamMember}
            <option value={teamMember.id}>{teamMember.displayName}</option>
          {/each}
        </select>
        <select
          value={partyMembers[1]?.teamMemberId}
          onchange={(event) => onSelectChange(1, event)}
          disabled={isDisabled('main-party')}
          aria-label="Party slot 2"
        >
          {#each slot2AvailableTeamMembers as teamMember}
            <option value={teamMember.id}>{teamMember.displayName}</option>
          {/each}
        </select>
        <select
          value={partyMembers[2]?.teamMemberId}
          onchange={(event) => onSelectChange(2, event)}
          disabled={isDisabled('main-party')}
          aria-label="Party slot 3"
        >
          {#each slot3AvailableTeamMembers as teamMember}
            <option value={teamMember.id}>{teamMember.displayName}</option>
          {/each}
        </select>
      </setting-options>
    </setting-row>
  </settings-panel>
  <note-text>Some settings require that you be out of the FF8 menu before they become editable</note-text>
</party-edit-menu>

<style>
  party-edit-menu {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    height: 95%;
  }

  settings-panel {
    display: flex;
    flex-direction: column;
    width: 510px;
  }

  setting-row {
    display: flex;
    align-items: baseline;
    margin: 10px 0;
  }

  setting-name {
    width: 200px;
    text-align: right;
    margin-right: 25px;
    font-weight: 700;
  }

  .main-party {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 65px;
  }

  .main-party select {
    width: 100px;
  }

  .team-availability {
    display: flex;
    flex-wrap: wrap;
    width: 180px;
  }

  .team-availability label {
    width: 80px;
    font-weight: 500;
  }

  note-text {
    font-size: 14px;
    font-weight: 700;
    margin-top: 20px;
  }
</style>
