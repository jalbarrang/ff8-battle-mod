<script lang="ts">
  import { onMount } from 'svelte';

  import PartyViewComponent from '../components/PartyViewComponent/PartyViewComponent.svelte';
  import type { BattleCharacter, GameValue, GameValueDeltas, TeamMember } from '$lib/types/game';

  let processStatus = $state<'searching' | 'connected'>('searching');
  let battleStarted = $state(false);

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

  // An enemy slot counts as occupied once the battle setup has written its max
  // HP, and that value stays set after the enemy dies. It is therefore gated on
  // the battle director actually being in a battle, or the left column would
  // still be listing the last fight's opponents out on the field.
  const visibleEnemies = $derived(
    battleStarted ? enemies.filter((enemy) => (enemy.maxHealth ?? 0) > 0) : []
  );

  // A party slot is occupied when the engine has assigned it a team member; 255
  // is the empty-slot marker. Those slots persist after a fight, which is what
  // lets the same rows be shown both in battle and on the field. Level and EXP
  // live on the team member rather than on the battle slot, so they are joined
  // in by team member id.
  const visibleParty = $derived(
    partyMembers
      .filter((member) => member.teamMemberId !== undefined && member.teamMemberId !== 255)
      .map((member) => {
        const teamMember = teamMembers.find((candidate) => candidate.id === member.teamMemberId);
        return {
          ...member,
          displayName: teamMember?.displayName ?? member.name,
          currentLevel: teamMember?.currentLevel,
          currentExp: teamMember?.currentExp
        };
      })
  );

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

  function applyDeltas(deltas: GameValueDeltas): void {
    for (const [propertyName, { newVal }] of Object.entries(deltas)) {
      if (propertyName.includes('Enemy')) receiveEnemyValue(propertyName, newVal);
      else if (propertyName.includes('PartyMember')) receivePartyMemberValue(propertyName, newVal);
      else if (propertyName.includes('TeamMember')) receiveTeamMemberValue(propertyName, newVal);
      else if (propertyName === 'battleStarted') battleStarted = Boolean(newVal);
    }
  }

  onMount(() => {
    if (!window.ff8) return;
    const removeDeltasListener = window.ff8.onGameValuesUpdated(applyDeltas);
    const removeStatusListener = window.ff8.onProcessStatusChanged((status) => {
      processStatus = status;
      if (status === 'searching') battleStarted = false;
    });
    // The watcher only pushes changes, so a renderer that mounts after it has
    // already connected has to ask for the current state explicitly.
    window.ff8.requestSnapshot();
    return () => {
      removeDeltasListener();
      removeStatusListener();
    };
  });
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-ff-field font-ff tracking-wider text-ff-border uppercase">
  {#if processStatus === 'searching'}
    <div class="flex flex-1 items-center justify-center p-6 text-xs">
      Looking for process FF8_EN.exe
    </div>
  {:else}
    <PartyViewComponent
      enemies={visibleEnemies}
      party={visibleParty}
      {battleStarted}
    />
  {/if}
</div>
