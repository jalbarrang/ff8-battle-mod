export type ProcessStatus = 'searching' | 'connected';

export type MagicSlot = [spellId: number, quantity: number];
export type ItemSlot = [itemId: number, quantity: number];

export interface GuardianRosterEntry {
  unlocked: boolean;
  learningSkillId: number;
}

export interface GuardianStatsEntry {
  currentHealth: number;
  maxHealth: number;
  exp: number;
}

export type GameValue =
  | boolean
  | number
  | string
  | number[]
  | MagicSlot[]
  | ItemSlot[]
  | GuardianRosterEntry[]
  | GuardianStatsEntry[]
  | null;

export interface Character {
  id: number;
  name: string;
  displayName?: string;
  currentHealth?: number;
  maxHealth?: number;
  isDead?: boolean;
}

export interface BattleCharacter extends Character {
  atb?: number;
  currentExp?: number;
  currentLevel?: number;
  hasPoisonWithoutAnimation?: boolean;
  teamMemberId?: number;
}

export interface TeamMember extends Character {
  currentLevel?: number;
  currentExp?: number;
  healthBonusSpell?: number;
  isAvailable?: boolean;
  magic?: MagicSlot[];
  maxHealthModifier1?: number;
  maxHealthModifier2?: number;
}

export interface GuardianForce {
  id: number;
  name: string;
  unlocked: boolean;
  learningSkillId: number;
  currentHealth: number;
  maxHealth: number;
  exp: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
}

export interface GameValueDelta {
  newVal: GameValue;
  prevVal: GameValue;
}

export type GameValueDeltas = Record<string, GameValueDelta>;
