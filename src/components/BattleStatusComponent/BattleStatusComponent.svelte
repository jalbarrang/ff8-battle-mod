<script lang="ts">
  import type { BattleCharacter, CharacterUpdate } from '$lib/types/game';
  import BattleCharacterStatusComponent from './BattleCharacterStatusComponent/BattleCharacterStatusComponent.svelte';

  interface Props {
    enemies: BattleCharacter[];
    partyMembers: BattleCharacter[];
    enemyAttacksEnabled: boolean;
    onEnemyChange: (id: number, data: CharacterUpdate) => void;
    onPartyMemberChange: (id: number, data: CharacterUpdate) => void;
    onKillAllEnemiesClick: () => void;
    onDisableEnableEnemyAttacksClick: () => void;
    onDamageAllEnemiesClick: () => void;
    onCureAllPartyMembersClick: () => void;
  }

  let {
    enemies,
    partyMembers,
    enemyAttacksEnabled,
    onEnemyChange,
    onPartyMemberChange,
    onKillAllEnemiesClick,
    onDisableEnableEnemyAttacksClick,
    onDamageAllEnemiesClick,
    onCureAllPartyMembersClick
  }: Props = $props();
</script>

<battle-status>
  <enemy-list>
    {#each enemies as enemy (enemy.id)}
      <BattleCharacterStatusComponent character={enemy} onBattleCharacterStatusChange={onEnemyChange} />
    {/each}
    <button-panel>
      <button onclick={onKillAllEnemiesClick}>Kill All</button>
      <button onclick={onDisableEnableEnemyAttacksClick}
        >{enemyAttacksEnabled ? 'Disable' : 'Enable'} Attacks</button
      >
      <button onclick={onDamageAllEnemiesClick}>Damage All</button>
    </button-panel>
  </enemy-list>
  <party-member-list>
    {#each partyMembers as partyMember (partyMember.id)}
      <BattleCharacterStatusComponent
        character={partyMember}
        onBattleCharacterStatusChange={onPartyMemberChange}
      />
    {/each}
    <button-panel>
      <button onclick={onCureAllPartyMembersClick}>Cure All</button>
    </button-panel>
  </party-member-list>
</battle-status>

<style>
  enemy-list,
  party-member-list {
    display: inline-flex;
    flex-direction: column;
    width: 237px;
  }

  party-member-list {
    margin-left: 30px;
  }

  button-panel {
    display: flex;
    flex-wrap: wrap;
    margin-top: 5px;
    border-top: 1px solid;
  }

  button-panel button {
    text-decoration: underline;
    border: none;
    background: none;
    font-weight: 600;
    font-size: 14px;
    padding: 0 10px 0 0;
    margin: 0;
    cursor: pointer;
  }
</style>
