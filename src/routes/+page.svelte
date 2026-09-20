<script lang="ts">
  import { onMount } from 'svelte';

  import BattleStatusComponent from '../components/BattleStatusComponent/BattleStatusComponent.svelte';
  import MenuDrawerComponent from '../components/MenuDrawerComponent.svelte';
  import PartyEditMenu from '../components/PartyEditMenu.svelte';
  import TeamStatusComponent from '../components/TeamStatusComponent/TeamStatusComponent.svelte';
  import type {
    BattleCharacter,
    CharacterUpdate,
    GameValue,
    GameValueDeltas,
    TeamMember
  } from '$lib/types/game';

  let ff8MenuIsOpen = $state(false);
  let processStatus = $state<'searching' | 'connected'>('searching');
  let battleStarted = $state(false);
  let enemyAttacksEnabled = $state(true);

  const teamMembers = $state<TeamMember[]>([
    { id: 0, name: 'Squall' },
    { id: 1, name: 'Zell' },
    { id: 2, name: 'Irvine' },
    { id: 3, name: 'Quistis' },
    { id: 4, name: 'Rinoa' },
    { id: 5, name: 'Selphie' },
    { id: 6, name: 'Seifer' },
    { id: 7, name: 'Edea' }
  ]);
  const enemies = $state<BattleCharacter[]>(
    Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Enemy ${index + 1}` }))
  );
  const partyMembers = $state<BattleCharacter[]>(
    Array.from({ length: 3 }, (_, index) => ({ id: index + 1, name: `Party ${index + 1}` }))
  );

  const teamReady = $derived(teamMembers.every((member) => member.magic !== undefined));

  $effect(() => {
    for (const partyMember of partyMembers) {
      const displayName =
        teamMembers.find((member) => member.id === partyMember.teamMemberId)?.displayName ??
        partyMember.name;
      if (partyMember.displayName !== displayName) partyMember.displayName = displayName;
    }
  });

  function assignValue(target: object | undefined, propertyName: string, value: GameValue): void {
    if (target) (target as Record<string, GameValue>)[propertyName] = value;
  }

  function receiveTeamMemberValue(propertyName: string, value: GameValue): void {
    const [attributeName, teamMemberName] = propertyName.split('TeamMember');
    assignValue(teamMembers.find((member) => member.name === teamMemberName), attributeName!, value);
  }

  function receiveEnemyValue(propertyName: string, value: GameValue): void {
    const [attributeName, rawId] = propertyName.split('Enemy');
    assignValue(enemies.find((enemy) => enemy.id === Number(rawId)), attributeName!, value);
  }

  function receivePartyMemberValue(propertyName: string, value: GameValue): void {
    const [attributeName, rawId] = propertyName.split('PartyMember');
    assignValue(partyMembers.find((member) => member.id === Number(rawId)), attributeName!, value);
  }

  function emitUpdate(propertyName: string, value: GameValue): void {
    window.ff8?.updateGameValue(propertyName, value);
  }

  function sendTeamMemberValues(teamMemberName: string, data: CharacterUpdate): void {
    for (const [key, value] of Object.entries(data)) {
      emitUpdate(`${key}TeamMember${teamMemberName}`, value);
    }
  }

  function sendEnemyValues(enemyId: number, data: CharacterUpdate): void {
    for (const [key, value] of Object.entries(data)) emitUpdate(`${key}Enemy${enemyId}`, value);
  }

  function sendPartyMemberValues(partyMemberId: number, data: CharacterUpdate): void {
    for (const [key, value] of Object.entries(data)) {
      emitUpdate(`${key}PartyMember${partyMemberId}`, value);
    }
  }

  function applyDeltas(deltas: GameValueDeltas): void {
    for (const [propertyName, { newVal }] of Object.entries(deltas)) {
      if (propertyName.includes('Enemy')) receiveEnemyValue(propertyName, newVal);
      else if (propertyName.includes('PartyMember')) receivePartyMemberValue(propertyName, newVal);
      else if (propertyName.includes('TeamMember')) receiveTeamMemberValue(propertyName, newVal);
      else if (propertyName === 'battleStarted') battleStarted = Boolean(newVal);
      else if (propertyName === 'enemyAttacksEnabled') enemyAttacksEnabled = Boolean(newVal);
      else if (propertyName === 'menuIsOpen') ff8MenuIsOpen = Boolean(newVal);
    }
  }

  function killAllEnemies(): void {
    const originalAttackEnabledValue = enemyAttacksEnabled;
    emitUpdate('enemyAttacksEnabled', false);
    emitUpdate('damageLimitEnabled', false);
    emitUpdate('killOnNextPoisonTick', true);
    for (const enemy of enemies) {
      sendEnemyValues(enemy.id, { hasPoisonWithoutAnimation: true, atb: 46 });
    }

    const interval = window.setInterval(() => {
      if (enemies.every((enemy) => enemy.currentHealth === 0)) {
        emitUpdate('killOnNextPoisonTick', false);
        emitUpdate('damageLimitEnabled', true);
        emitUpdate('enemyAttacksEnabled', originalAttackEnabledValue);
        window.clearInterval(interval);
      }
    }, 50);
  }

  function toggleEnemyAttacks(): void {
    emitUpdate('enemyAttacksEnabled', !enemyAttacksEnabled);
  }

  function damageAllEnemies(): void {
    for (const enemy of enemies.filter(
      (candidate) => !candidate.isDead && (candidate.currentHealth ?? 0) > 0
    )) {
      sendEnemyValues(enemy.id, { currentHealth: 1 });
    }
  }

  function cureAllPartyMembers(): void {
    for (const member of partyMembers) {
      sendPartyMemberValues(member.id, { currentHealth: member.maxHealth ?? 0 });
    }
  }

  onMount(() => {
    if (!window.ff8) return;
    const removeDeltasListener = window.ff8.onGameValuesUpdated(applyDeltas);
    const removeStatusListener = window.ff8.onProcessStatusChanged((status) => {
      processStatus = status;
      if (status === 'searching') battleStarted = false;
    });
    return () => {
      removeDeltasListener();
      removeStatusListener();
    };
  });
</script>

<app-shell>
  <MenuDrawerComponent maxHeight="300px">
    <PartyEditMenu
      {partyMembers}
      {teamMembers}
      onPartyMemberChange={sendPartyMemberValues}
      onTeamMemberChange={sendTeamMemberValues}
      disabled={ff8MenuIsOpen ? ['main-party'] : false}
    />
  </MenuDrawerComponent>
  {#if processStatus === 'searching'}
    <empty-state>Looking for process FF8_EN.exe</empty-state>
  {:else if battleStarted}
    <BattleStatusComponent
      {enemies}
      {partyMembers}
      {enemyAttacksEnabled}
      onEnemyChange={sendEnemyValues}
      onPartyMemberChange={sendPartyMemberValues}
      onKillAllEnemiesClick={killAllEnemies}
      onDisableEnableEnemyAttacksClick={toggleEnemyAttacks}
      onDamageAllEnemiesClick={damageAllEnemies}
      onCureAllPartyMembersClick={cureAllPartyMembers}
    />
  {:else if teamReady}
    <TeamStatusComponent {teamMembers} onTeamMemberChange={sendTeamMemberValues} />
  {:else}
    <empty-state>Reading FF8 data…</empty-state>
  {/if}
</app-shell>

<style>
  app-shell {
    display: flex;
    height: 100%;
  }

  empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
</style>
