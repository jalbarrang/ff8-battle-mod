import { GUARDIAN_FORCES } from '$lib/gfs';
import { connectFf8Socket } from '$lib/ff8-socket';
import { itemName } from '$lib/items';
import type {
  BattleCharacter,
  GameValue,
  GameValueDeltas,
  GuardianForce,
  GuardianRosterEntry,
  GuardianStatsEntry,
  InventoryItem,
  ItemSlot,
  ProcessStatus,
  TeamMember
} from '$lib/types/game';

// The renderer never polls memory itself. The Electron main-process watcher
// pushes deltas over a loopback WebSocket and answers an explicit snapshot
// request. This module owns the single subscription and the one cache of game
// state that every page reads from, so navigating between tabs never
// re-requests or loses data.
//
// Keeping the transport in the main process means the same stream can be
// observed by any local WebSocket client (a test harness, an agent, curl for
// `/state`) without attaching DevTools to the renderer.

const TEAM_MEMBER_ROSTER: Array<Pick<TeamMember, 'id' | 'name'>> = [
  { id: 0, name: 'Squall' },
  { id: 1, name: 'Zell' },
  { id: 2, name: 'Irvine' },
  { id: 3, name: 'Quistis' },
  { id: 4, name: 'Rinoa' },
  { id: 5, name: 'Selphie' },
  { id: 6, name: 'Seifer' },
  { id: 7, name: 'Edea' }
];

let processStatus = $state<ProcessStatus>('searching');
let battleStarted = $state(false);

const teamMembers = $state<TeamMember[]>(TEAM_MEMBER_ROSTER.map((member) => ({ ...member })));
const enemies = $state<BattleCharacter[]>(
  Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Enemy ${index + 1}` }))
);
const partyMembers = $state<BattleCharacter[]>(
  Array.from({ length: 3 }, (_, index) => ({ id: index + 1, name: `Party ${index + 1}` }))
);

let guardianRoster = $state<GuardianRosterEntry[]>([]);
let guardianStats = $state<GuardianStatsEntry[]>([]);
let inventory = $state<ItemSlot[]>([]);

// Enemy slots only count as occupied once the battle setup writes their max HP,
// and that value survives the fight, so the list is gated on the battle flag.
const visibleEnemies = $derived.by((): BattleCharacter[] =>
  battleStarted ? enemies.filter((enemy) => (enemy.maxHealth ?? 0) > 0) : []
);

// Party slots persist between fights (255 is the empty marker), which is what
// lets the same rows render in battle and on the field. Level/EXP live on the
// team member, so they are joined in by team member id.
const visibleParty = $derived.by((): BattleCharacter[] =>
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

const guardians = $derived.by((): GuardianForce[] =>
  GUARDIAN_FORCES.map((name, id) => ({
    id,
    name,
    unlocked: guardianRoster[id]?.unlocked ?? false,
    learningSkillId: guardianRoster[id]?.learningSkillId ?? 0,
    currentHealth: guardianStats[id]?.currentHealth ?? 0,
    maxHealth: guardianStats[id]?.maxHealth ?? 0,
    exp: guardianStats[id]?.exp ?? 0
  }))
);

const items = $derived.by((): InventoryItem[] =>
  inventory.map(([id, quantity]) => ({ id, quantity, name: itemName(id) }))
);

function assign(target: object | undefined, propertyName: string, value: GameValue): void {
  if (target) (target as Record<string, GameValue>)[propertyName] = value;
}

function receiveTeamMemberValue(propertyName: string, value: GameValue): void {
  const [attributeName, teamMemberName] = propertyName.split('TeamMember');
  assign(teamMembers.find((member) => member.name === teamMemberName), attributeName!, value);
}

function receiveEnemyValue(propertyName: string, value: GameValue): void {
  const [attributeName, rawId] = propertyName.split('Enemy');
  assign(enemies.find((enemy) => enemy.id === Number(rawId)), attributeName!, value);
}

function receivePartyMemberValue(propertyName: string, value: GameValue): void {
  const [attributeName, rawId] = propertyName.split('PartyMember');
  assign(partyMembers.find((member) => member.id === Number(rawId)), attributeName!, value);
}

function applyDeltas(deltas: GameValueDeltas): void {
  for (const [propertyName, { newVal }] of Object.entries(deltas)) {
    if (propertyName === 'battleStarted') {
      battleStarted = Boolean(newVal);
    } else if (propertyName === 'itemsInventory') {
      inventory = (newVal as ItemSlot[] | null) ?? [];
    } else if (propertyName === 'guardianRoster') {
      guardianRoster = (newVal as GuardianRosterEntry[] | null) ?? [];
    } else if (propertyName === 'guardianStats') {
      guardianStats = (newVal as GuardianStatsEntry[] | null) ?? [];
    } else if (propertyName.includes('Enemy')) {
      receiveEnemyValue(propertyName, newVal);
    } else if (propertyName.includes('PartyMember')) {
      receivePartyMemberValue(propertyName, newVal);
    } else if (propertyName.includes('TeamMember')) {
      receiveTeamMemberValue(propertyName, newVal);
    }
  }
}

let initialized = false;

/**
 * Subscribes to the FF8 watcher exactly once for the lifetime of the window and
 * requests the current snapshot. Safe to call from every layout mount: repeated
 * calls are ignored, and no teardown is needed because the window owns the
 * subscription.
 */
function init(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  initialized = true;

  connectFf8Socket({
    onDeltas: applyDeltas,
    onStatus: (status) => {
      processStatus = status;
      if (status === 'searching') battleStarted = false;
    }
  });
}

export const gameState = {
  get processStatus(): ProcessStatus {
    return processStatus;
  },
  get battleStarted(): boolean {
    return battleStarted;
  },
  get teamMembers(): TeamMember[] {
    return teamMembers;
  },
  get enemies(): BattleCharacter[] {
    return enemies;
  },
  get partyMembers(): BattleCharacter[] {
    return partyMembers;
  },
  get guardians(): GuardianForce[] {
    return guardians;
  },
  get items(): InventoryItem[] {
    return items;
  },
  get visibleEnemies(): BattleCharacter[] {
    return visibleEnemies;
  },
  get visibleParty(): BattleCharacter[] {
    return visibleParty;
  },
  init
};
