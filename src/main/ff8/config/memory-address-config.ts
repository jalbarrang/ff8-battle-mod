import _ from 'lodash';

import type { MemoryAddressConfig, MemoryValue } from '../types';
import characterSet from './character-set';

const defaultValueTransformerOut = (values: MemoryValue[]): MemoryValue => values[0];
const decodeText = (values: MemoryValue[]): string => {
  const bytes = (values[0] ?? []) as number[];
  const nullIndex = bytes.indexOf(0);
  return bytes
    .slice(0, nullIndex === -1 ? bytes.length : nullIndex)
    .map((characterCode) => characterSet[characterCode] ?? '')
    .join('');
};

// Party inventory: 198 slots of (item id, quantity) at 0x01CFE79C (module
// offset 18FE79C from ff8-speedruns/ff8-memory). Empty slots are dropped so the
// renderer only ever sees items the party is actually holding.
const decodeInventory = (values: MemoryValue[]): MemoryValue => {
  const bytes = (values[0] ?? []) as number[];
  const inventory: number[][] = [];
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const itemId = bytes[index] ?? 0;
    const quantity = bytes[index + 1] ?? 0;
    if (itemId > 0 && quantity > 0) inventory.push([itemId, quantity]);
  }
  return inventory;
};

// Guardian Force roster: 16 entries, stride 0x44, from 0x01CFDCB9 (18FDCB9).
// +0x00 is the unlocked flag and +0x2F the ability currently selected to learn.
// Returned positionally; the renderer owns the GF ordering and names.
const GUARDIAN_COUNT = 16;
const GUARDIAN_ROSTER_STRIDE = 0x44;
const GUARDIAN_ROSTER_SIZE = (GUARDIAN_COUNT - 1) * GUARDIAN_ROSTER_STRIDE + 0x30;

// The GF save record (record base 0x01CFDCA8) stores the ability being learned
// at +0x40 and one AP byte per learnable ability at +0x24. Those AP slots are
// ordered by the GF's own kernel ability list, not by global ability id, so the
// matching slot is looked up in the loaded kernel.bin buffer.
const GUARDIAN_RECORD_BASE = 0x01CFDCA8;
const GUARDIAN_RECORD_AP_OFFSET = 0x24;
const GUARDIAN_RECORD_LEARNING_OFFSET = 0x40;

// readFilesKernelNamedicIconSysfnt loads kernel.bin whole into the static buffer
// at 0x01CF3E48. The 16 junctionable-GF sections start at file offset 0x0F78 and
// are 0x84 bytes each, with 21 ability ids at +0x1E + slot*4.
const KERNEL_GF_BASE = 0x01CF4DC0;
const KERNEL_GF_SECTION_SIZE = 0x84;
const KERNEL_GF_ABILITY_OFFSET = 0x1e;
const GUARDIAN_ABILITY_SLOTS = 21;

// Ability definitions: kernel.bin file offset 0x40E0 (0x01CF3E48 + 0x40E0) holds
// all seven ability groups as one contiguous array of 116 8-byte entries, ids
// 0-115 (junction, command, stat %, character, party, GF, menu). The AP needed
// to learn an ability is the byte at entry+4.
const KERNEL_ABILITY_BASE = 0x01CF7F28;
const KERNEL_ABILITY_COUNT = 116;
const KERNEL_ABILITY_STRIDE = 8;
const KERNEL_ABILITY_AP_OFFSET = 4;

// Odin/Gilgamesh/Phoenix possession and related story flags (SG_ODIN_ANGEL_-
// GILGA_FLAG in ff8-speedruns/ff8-memory). 0x02 = possess Odin, 0x08 = possess
// Gilgamesh, 0x04 = Phoenix called once.
const GUARDIAN_SPECIAL_FLAGS_ADDRESS = 0x01CFE97A;
const GUARDIAN_SPECIAL_ODIN = 0x02;
const GUARDIAN_SPECIAL_GILGAMESH = 0x08;

const decodeGuardianRoster = (values: MemoryValue[]): MemoryValue => {
  const bytes = (values[0] ?? []) as number[];
  if (bytes.length < GUARDIAN_ROSTER_SIZE) return [];
  return Array.from({ length: GUARDIAN_COUNT }, (_, index) => ({
    unlocked: (bytes[index * GUARDIAN_ROSTER_STRIDE] ?? 0) > 0,
    learningSkillId: bytes[index * GUARDIAN_ROSTER_STRIDE + 0x2f] ?? 0
  }));
};

// Guardian Force stats: 16 entries, stride 0xC, from 0x01CFF618 (18FF618):
// current HP (short), max HP (short), EXP (int), then 4 bytes of padding.
const GUARDIAN_STATS_STRIDE = 0xc;
const decodeGuardianStats = (values: MemoryValue[]): MemoryValue => {
  const buffer = Buffer.from((values[0] ?? []) as number[]);
  // The watcher calls this with `[]` as the previous value on the first delta,
  // so an empty (or short) read must not be indexed into.
  if (buffer.length < GUARDIAN_COUNT * GUARDIAN_STATS_STRIDE) return [];
  return Array.from({ length: GUARDIAN_COUNT }, (_, index) => ({
    currentHealth: buffer.readUInt16LE(index * GUARDIAN_STATS_STRIDE),
    maxHealth: buffer.readUInt16LE(index * GUARDIAN_STATS_STRIDE + 2),
    exp: buffer.readUInt32LE(index * GUARDIAN_STATS_STRIDE + 4)
  }));
};

// Joins the kernel ability list to each GF's AP bytes to report how much AP the
// GF has accumulated toward the ability it is currently learning, and how much
// that ability costs in total.
const decodeGuardianLearning = (values: MemoryValue[]): MemoryValue => {
  const kernel = (values[0] ?? []) as number[];
  const records = (values[1] ?? []) as number[];
  const abilities = (values[2] ?? []) as number[];
  if (kernel.length < GUARDIAN_COUNT * KERNEL_GF_SECTION_SIZE) return [];
  if (records.length < GUARDIAN_COUNT * GUARDIAN_ROSTER_STRIDE) return [];
  const hasAbilityTable = abilities.length >= KERNEL_ABILITY_COUNT * KERNEL_ABILITY_STRIDE;

  return Array.from({ length: GUARDIAN_COUNT }, (_, index) => {
    const recordBase = index * GUARDIAN_ROSTER_STRIDE;
    const learningSkillId = records[recordBase + GUARDIAN_RECORD_LEARNING_OFFSET] ?? 0;
    const kernelBase = index * KERNEL_GF_SECTION_SIZE + KERNEL_GF_ABILITY_OFFSET;

    let learningAp = 0;
    for (let slot = 0; slot < GUARDIAN_ABILITY_SLOTS; slot += 1) {
      if (kernel[kernelBase + slot * 4] === learningSkillId) {
        learningAp = records[recordBase + GUARDIAN_RECORD_AP_OFFSET + slot] ?? 0;
        break;
      }
    }

    // 0 when the ability id falls outside the array (ids 116+ are not part of
    // the vanilla data), which the renderer reads as "total unknown".
    const learningApRequired = hasAbilityTable && learningSkillId < KERNEL_ABILITY_COUNT
      ? abilities[learningSkillId * KERNEL_ABILITY_STRIDE + KERNEL_ABILITY_AP_OFFSET] ?? 0
      : 0;

    return { learningSkillId, learningAp, learningApRequired };
  });
};

const decodeGuardianSpecialFlags = (values: MemoryValue[]): MemoryValue => {
  const byte = Number(values[0] ?? 0);
  return {
    odin: (byte & GUARDIAN_SPECIAL_ODIN) !== 0,
    gilgamesh: (byte & GUARDIAN_SPECIAL_GILGAMESH) !== 0
  };
};

const memoryAddressConfig: MemoryAddressConfig = {
  // mode_StateGlobal holds the game mode the module handler should run next and
  // the battle director keeps it at 3 (IN_BATTLE) for the whole fight: from the
  // encounter transition until control goes back to the field (1) or world map
  // (2). Verified against the live 2013 Steam FF8_EN.exe while in battle.
  battleStarted: {
    locations: [{
      address: 0x01CD8FC6,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => vals[0] === 3,
  },
  // Enemy 1 (in battle)
  // atbEnemy* is the enemy's ATB gauge: a 0..15 counter that steps up by one
  // every battle tick, holds at 15 while the enemy waits its turn in the action
  // queue, and resets to 0 once it acts. It also freezes mid-value whenever the
  // battle pauses the ATB. Verified against the live 2013 Steam FF8_EN.exe.
  atbEnemy1: {
    locations: [{
      address:0x01D27D95,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthEnemy1: {
    locations: [{
      address:0x01D27D98,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthEnemy1: {
    locations: [{
      address:0x01D27D9C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameEnemy1: {
    locations: [{
      address:0x01D75038,
      offsets: [],
      type: 'bytes',
      size: 14
    }],
    valueTransformerOut: decodeText,
  },
  isDeadEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => vals[0] === 1,
  },
  hasSleepEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasHasteEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasSlowEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasStopEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasProtectEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasShellEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasReflectEnemy1: {
    locations: [{
      address:0x01D27D88,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 128) > 0,
  },
  hasAuraEnemy1: {
    locations: [{
      address:0x01D27D89,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasConfuseEnemy1: {
    locations: [{
      address:0x01D27D89,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasPoisonEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPoisonWithoutAnimationEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPetrifyEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasDarknessEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasSilenceEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 16) > 0,
  },
  hasBerserkEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasZombieEnemy1: {
    locations: [{
      address:0x01D27E00,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D9749C,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasRegenEnemy1: {
    locations: [{
      address:0x01D27DDD,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => _.inRange(vals[0], 0, 126),
  },
  // Enemy 2 (in battle)
  atbEnemy2: {
    locations: [{
      address:0x01D27E65,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthEnemy2: {
    locations: [{
      address:0x01D27E68,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthEnemy2: {
    locations: [{
      address: 0x01D27E6C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameEnemy2: {
    locations: [{
      address: 0x01D75058,
      offsets: [],
      type: 'bytes',
      size: 14,
    }],
    valueTransformerOut: decodeText,
  },
  isDeadEnemy2: {
    locations: [{
      address: 0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] === 1,
  },
  hasSleepEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasHasteEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasSlowEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasStopEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasProtectEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasShellEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasReflectEnemy2: {
    locations: [{
      address:0x01D27E58,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 128) > 0,
  },
  hasAuraEnemy2: {
    locations: [{
      address:0x01D27E59,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasConfuseEnemy2: {
    locations: [{
      address:0x01D27E59,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasPoisonEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPoisonWithoutAnimationEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPetrifyEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasDarknessEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasSilenceEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 16) > 0,
  },
  hasBerserkEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasZombieEnemy2: {
    locations: [{
      address:0x01D27ED0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x1D97538,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasRegenEnemy2: {
    locations: [{
      address:0x01D27EAD,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => _.inRange(vals[0], 0, 126),
  },
  // Enemy 3 (in battle)
  atbEnemy3: {
    locations: [{
      address: 0x01D27F35,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthEnemy3: {
    locations: [{
      address: 0x01D27F38,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthEnemy3: {
    locations: [{
      address: 0x01D27F3C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameEnemy3: {
    locations: [{
      address: 0x01D75078,
      offsets: [],
      type: 'bytes',
      size: 14,
    }],
    valueTransformerOut: decodeText,
  },
  isDeadEnemy3: {
    locations: [{
      address: 0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] === 1,
  },
  hasSleepEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasHasteEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasSlowEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasStopEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasProtectEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasShellEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasReflectEnemy3: {
    locations: [{
      address:0x01D27F28,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 128) > 0,
  },
  hasAuraEnemy3: {
    locations: [{
      address:0x01D27F29,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasConfuseEnemy3: {
    locations: [{
      address:0x01D27F29,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasPoisonEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPoisonWithoutAnimationEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPetrifyEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasDarknessEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasSilenceEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 16) > 0,
  },
  hasBerserkEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasZombieEnemy3: {
    locations: [{
      address:0x01D27FA0,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D975D4,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasRegenEnemy3: {
    locations: [{
      address:0x01D27F7D,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => _.inRange(vals[0], 0, 126),
  },
  // Enemy 4 (in battle)
  atbEnemy4: {
    locations: [{
      address: 0x01D28005,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthEnemy4: {
    locations: [{
      address: 0x01D28008,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthEnemy4: {
    locations: [{
      address: 0x01D2800C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameEnemy4: {
    locations: [{
      address: 0x01D75098,
      offsets: [],
      type: 'bytes',
      size: 14,
    }],
    valueTransformerOut: decodeText,
  },
  isDeadEnemy4: {
    locations: [{
      address: 0x01D28070,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] === 1,
  },
  hasSleepEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasHasteEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasSlowEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasStopEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasProtectEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasShellEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasReflectEnemy4: {
    locations: [{
      address:0x01D28012,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 128) > 0,
  },
  hasAuraEnemy4: {
    locations: [{
      address:0x01D28013,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 1) > 0,
  },
  hasConfuseEnemy4: {
    locations: [{
      address:0x01D28013,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasPoisonEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPoisonWithoutAnimationEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 2) > 0,
  },
  hasPetrifyEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 4) > 0,
  },
  hasDarknessEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 8) > 0,
  },
  hasSilenceEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 16) > 0,
  },
  hasBerserkEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 32) > 0,
  },
  hasZombieEnemy4: {
    locations: [{
      address:0x01D28070,
      offsets: [],
      type: 'byte',
      size: null
    }, {
      address:0x01D97670,
      offsets: [],
      type: 'int',
      size: null
    }],
    valueTransformerOut: vals => (vals[0] & 64) > 0,
  },
  hasRegenEnemy4: {
    locations: [{
      address:0x01D2804D,
      offsets: [],
      type: 'byte',
      size: null
    }],
    valueTransformerOut: vals => _.inRange(vals[0], 0, 126),
  },
  // Party 1 (in battle)
  teamMemberIdPartyMember1: {
    locations: [{
      address: 0x01CFE74C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthPartyMember1: {
    locations: [{
      address: 0x01CFF172,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthPartyMember1: {
    locations: [{
      address: 0x01CFF174,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  // Party 2 (in battle)
  teamMemberIdPartyMember2: {
    locations: [{
      address: 0x01CFE74D,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthPartyMember2: {
    locations: [{
      address: 0x01CFF342,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthPartyMember2: {
    locations: [{
      address: 0x01CFF344,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  // Party 3 (in battle)
  teamMemberIdPartyMember3: {
    locations: [{
      address: 0x01CFE74E,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentHealthPartyMember3: {
    locations: [{
      address: 0x001CFF512,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthPartyMember3: {
    locations: [{
      address: 0x01CFF514,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  // Team Members (in general, no association to a battle)
  // Squall
  maxHealthModifier1TeamMemberSquall: {
    locations: [{
      address: 0x01CF75F4,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberSquall: {
    locations: [{
      address: 0x01CF75F6,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberSquall: {
    locations: [{
      address: 0x01CFE144,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberSquall: {
    locations: [{
      address: 0x01CFDC70,
      offsets: [],
      type: 'bytes',
      size: 7,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberSquall: {
    locations: [{
      address: 0x01CFE0E8,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberSquall: {
    locations: [{
      address: 0x01CFE0EC,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberSquall: {
    locations: [{
      address: 0x01CFE0EC,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberSquall: {
    locations: [{
      address: 0x01CFE0F8,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberSquall: {
    locations: [{
      address: 0x01CFE17C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Zell
  maxHealthModifier1TeamMemberZell: {
    locations: [{
      address: 0x01CF7618,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberZell: {
    locations: [{
      address: 0x01CF761A,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberZell: {
    locations: [{
      address: 0x01CFE1DC,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberZell: {
    locations: [{
      address: 0x01CFA1AC,
      offsets: [],
      type: 'bytes',
      size: 4,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberZell: {
    locations: [{
      address: 0x01CFE180,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberZell: {
    locations: [{
      address: 0x01CFE184,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberZell: {
    locations: [{
      address: 0x01CFE184,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberZell: {
    locations: [{
      address: 0x01CFE190,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberZell: {
    locations: [{
      address: 0x01CFE214,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Irvine
  maxHealthModifier1TeamMemberIrvine: {
    locations: [{
      address: 0x01CF763C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberIrvine: {
    locations: [{
      address: 0x01CF763E,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE274,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberIrvine: {
    locations: [{
      address: 0x01CFA1B1,
      offsets: [],
      type: 'bytes',
      size: 6,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE218,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE21C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE21C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE228,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberIrvine: {
    locations: [{
      address: 0x01CFE2AC,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Quistis
  maxHealthModifier1TeamMemberQuistis: {
    locations: [{
      address: 0x01CF7660,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberQuistis: {
    locations: [{
      address: 0x01CF7662,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE30C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberQuistis: {
    locations: [{
      address: 0x01CFA1B8,
      offsets: [],
      type: 'bytes',
      size: 7,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE2B0,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE2B4,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE2B4,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE2C0,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberQuistis: {
    locations: [{
      address: 0x01CFE344,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Rinoa
  maxHealthModifier1TeamMemberRinoa: {
    locations: [{
      address: 0x01CF7684,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberRinoa: {
    locations: [{
      address: 0x01CF7686,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE3A4,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberRinoa: {
    locations: [{
      address: 0x01CFDC7C,
      offsets: [],
      type: 'bytes',
      size: 7,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE348,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE34C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE34C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE358,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberRinoa: {
    locations: [{
      address: 0x01CFE3DC,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Selphie
  maxHealthModifier1TeamMemberSelphie: {
    locations: [{
      address: 0x01CF76A8,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberSelphie: {
    locations: [{
      address: 0x01CF76AA,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE43C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberSelphie: {
    locations: [{
      address: 0x01CFA1C0,
      offsets: [],
      type: 'bytes',
      size: 7,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE3E0,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE3E4,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE3E4,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE3F0,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberSelphie: {
    locations: [{
      address: 0x01CFE474,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Seifer
  maxHealthModifier1TeamMemberSeifer: {
    locations: [{
      address: 0x01CF76CC,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberSeifer: {
    locations: [{
      address: 0x01CF76CE,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE4D4,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberSeifer: {
    locations: [{
      address: 0x01CFA1C8,
      offsets: [],
      type: 'bytes',
      size: 6,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE478,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE47C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE47C,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE488,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberSeifer: {
    locations: [{
      address: 0x01CFE50C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Edea
  maxHealthModifier1TeamMemberEdea: {
    locations: [{
      address: 0x01CF76F0,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  maxHealthModifier2TeamMemberEdea: {
    locations: [{
      address: 0x01CF76F2,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  healthBonusSpellTeamMemberEdea: {
    locations: [{
      address: 0x01CFE56C,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  displayNameTeamMemberEdea: {
    locations: [{
      address: 0x01CFA1CF,
      offsets: [],
      type: 'bytes',
      size: 4,
    }],
    valueTransformerOut: decodeText,
  },
  currentHealthTeamMemberEdea: {
    locations: [{
      address: 0x01CFE510,
      offsets: [],
      type: 'short',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentExpTeamMemberEdea: {
    locations: [{
      address: 0x01CFE514,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: defaultValueTransformerOut,
  },
  currentLevelTeamMemberEdea: {
    locations: [{
      address: 0x01CFE514,
      offsets: [],
      type: 'int',
      size: null,
    }],
    valueTransformerOut: vals => Math.floor(vals[0] / 1000) + 1, // Divide experience by 1000 and then add 1 to get current level
  },
  magicTeamMemberEdea: {
    locations: [{
      address: 0x01CFE520,
      offsets: [],
      type: 'bytes',
      size: 64 // 32 slots * 2 bytes per slot = 64 bytes
    }],
    valueTransformerOut: vals => _.chunk(vals[0], 2), // Each magic slot is represented by 2 bytes (one telling it which spell, and the other how many owned)
  },
  isAvailableTeamMemberEdea: {
    locations: [{
      address: 0x01CFE5A4,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: vals => vals[0] > 0,
  },
  // Party inventory and Guardian Force state. These live in the field/menu
  // savemap, so they are readable without an active battle.
  itemsInventory: {
    locations: [{
      address: 0x01CFE79C,
      offsets: [],
      type: 'bytes',
      size: 198 * 2,
    }],
    valueTransformerOut: decodeInventory,
  },
  guardianRoster: {
    locations: [{
      address: 0x01CFDCB9,
      offsets: [],
      type: 'bytes',
      size: GUARDIAN_ROSTER_SIZE,
    }],
    valueTransformerOut: decodeGuardianRoster,
  },
  guardianStats: {
    locations: [{
      address: 0x01CFF618,
      offsets: [],
      type: 'bytes',
      size: GUARDIAN_COUNT * GUARDIAN_STATS_STRIDE,
    }],
    valueTransformerOut: decodeGuardianStats,
  },
  guardianLearning: {
    locations: [{
      address: KERNEL_GF_BASE,
      offsets: [],
      type: 'bytes',
      size: GUARDIAN_COUNT * KERNEL_GF_SECTION_SIZE,
    }, {
      address: GUARDIAN_RECORD_BASE,
      offsets: [],
      type: 'bytes',
      size: GUARDIAN_COUNT * GUARDIAN_ROSTER_STRIDE,
    }, {
      address: KERNEL_ABILITY_BASE,
      offsets: [],
      type: 'bytes',
      size: KERNEL_ABILITY_COUNT * KERNEL_ABILITY_STRIDE,
    }],
    valueTransformerOut: decodeGuardianLearning,
  },
  guardianSpecialFlags: {
    locations: [{
      address: GUARDIAN_SPECIAL_FLAGS_ADDRESS,
      offsets: [],
      type: 'byte',
      size: null,
    }],
    valueTransformerOut: decodeGuardianSpecialFlags,
  },
};

export default memoryAddressConfig;
