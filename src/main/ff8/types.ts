export type MemoryType = 'byte' | 'bytes' | 'int' | 'short';

// Values are dynamic because each reverse-engineered FF8 field has its own shape.
export type MemoryValue = any;

export interface MemoryLocation {
  address: number;
  offsets: number[];
  type: MemoryType;
  size: number | null;
}

export interface MemoryAddressEntry {
  locations: MemoryLocation[];
  valueTransformerOut: ((values: MemoryValue[]) => MemoryValue) | null;
}

// The memory map is read-only: every entry describes how to decode game state,
// never how to encode it back into the process.
export type MemoryAddressConfig = Record<string, MemoryAddressEntry>;

export interface GameValueDelta {
  newVal: MemoryValue;
  prevVal: MemoryValue;
}

export type GameValueDeltas = Record<string, GameValueDelta>;

export type ProcessStatus = 'searching' | 'connected';
