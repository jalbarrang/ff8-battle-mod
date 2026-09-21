export type MagicSlot = [spellId: number, quantity: number];
export type GameValue = boolean | number | string | number[] | MagicSlot[] | null;

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

export interface GameValueDelta {
  newVal: GameValue;
  prevVal: GameValue;
}

export type GameValueDeltas = Record<string, GameValueDelta>;

export interface Ff8Api {
  onGameValuesUpdated(callback: (deltas: GameValueDeltas) => void): () => void;
  onProcessStatusChanged(callback: (status: 'searching' | 'connected') => void): () => void;
  requestSnapshot(): void;
}
