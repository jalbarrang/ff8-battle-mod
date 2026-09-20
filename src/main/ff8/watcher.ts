import { Effect, Fiber } from 'effect';
import isEqual from 'lodash/isEqual.js';

import memoryAddressConfig from './config/memory-address-config';
import { WindowsProcessMemory, type ProcessHandle } from './memory';
import type {
  GameValueDeltas,
  MemoryLocation,
  MemoryValue,
  ProcessStatus
} from './types';

const PROCESS_NAME = 'FF8_EN.exe';
const SEARCH_INTERVAL = '1500 millis';
const READ_INTERVAL = '150 millis';

const locationKey = ({ address, offsets, size, type }: MemoryLocation): string =>
  `${address}:${offsets.join(',')}:${type}:${size ?? ''}`;

const allLocations = [
  ...new Map(
    Object.values(memoryAddressConfig)
      .flatMap(({ locations }) => locations)
      .map((location) => [locationKey(location), location])
  ).values()
];

export interface WatcherCallbacks {
  onDeltas(deltas: GameValueDeltas): void;
  onError(error: unknown): void;
  onStatus(status: ProcessStatus): void;
}

export class Ff8ProcessWatcher {
  private readonly memory = new WindowsProcessMemory();
  private readonly gameValues = new Map<string, MemoryValue[]>();
  private fiber: Fiber.Fiber<void, never> | undefined;
  private process: ProcessHandle | null = null;
  private running = false;

  constructor(private readonly callbacks: WatcherCallbacks) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.callbacks.onStatus('searching');
    this.fiber = Effect.runFork(this.watchLoop());
  }

  stop(): void {
    this.running = false;
    if (this.fiber) Effect.runFork(Fiber.interrupt(this.fiber));
    this.fiber = undefined;
    this.disconnect();
  }

  updateGameValue(propertyName: string, value: MemoryValue): void {
    if (!this.process) return;

    const entry = memoryAddressConfig[propertyName];
    if (!entry) throw new Error(`Unknown game value: ${propertyName}`);

    try {
      const previousValues = entry.locations.map((location) => this.readLocation(location));
      const nextValues = entry.valueTransformerIn(value, previousValues);
      entry.locations.forEach((location, index) => {
        const valueToWrite = nextValues[index];
        const targetAddress = this.resolveAddress(location);
        if (location.type === 'bytes') {
          this.memory.writeBytes(this.process!, targetAddress, valueToWrite);
        } else {
          this.memory.write(this.process!, targetAddress, location.type, Number(valueToWrite));
        }
      });
    } catch (error) {
      this.callbacks.onError(error);
      this.disconnect();
    }
  }

  private watchLoop(): Effect.Effect<void> {
    const watcher = this;
    return Effect.gen(function*() {
      while (watcher.running) {
        yield* Effect.sync(() => watcher.poll());
        yield* Effect.sleep(watcher.process ? READ_INTERVAL : SEARCH_INTERVAL);
      }
    });
  }

  private poll(): void {
    if (!this.process) {
      try {
        this.process = this.memory.openProcess(PROCESS_NAME);
        if (this.process) {
          this.gameValues.clear();
          this.callbacks.onStatus('connected');
        }
      } catch (error) {
        this.callbacks.onError(error);
      }
      return;
    }

    try {
      this.readUpdatedValues();
    } catch (error) {
      this.callbacks.onError(error);
      this.disconnect();
    }
  }

  private readUpdatedValues(): void {
    const valuesByLocation = new Map(
      allLocations.map((location) => [locationKey(location), this.readLocation(location)])
    );
    const deltas: GameValueDeltas = {};

    for (const [propertyName, entry] of Object.entries(memoryAddressConfig)) {
      const previousValues = this.gameValues.get(propertyName) ?? [];
      const nextValues = entry.locations.map((location) => valuesByLocation.get(locationKey(location)));
      if (entry.valueTransformerOut && !isEqual(previousValues, nextValues)) {
        this.gameValues.set(propertyName, nextValues);
        deltas[propertyName] = {
          prevVal: entry.valueTransformerOut(previousValues),
          newVal: entry.valueTransformerOut(nextValues)
        };
      }
    }

    if (Object.keys(deltas).length > 0) this.callbacks.onDeltas(deltas);
  }

  private readLocation(location: MemoryLocation): MemoryValue {
    if (!this.process) throw new Error('FF8 process is not connected');
    const address = this.resolveAddress(location);
    if (location.type === 'bytes') {
      if (location.size === null) throw new Error('A byte-array location must specify its size');
      return this.memory.readBytes(this.process, address, location.size);
    }
    return this.memory.read(this.process, address, location.type);
  }

  private resolveAddress(location: MemoryLocation): number {
    if (!this.process || location.offsets.length === 0) return location.address;
    let address = this.memory.read(this.process, location.address, 'int');
    for (const [index, offset] of location.offsets.entries()) {
      address += offset;
      if (index < location.offsets.length - 1) {
        address = this.memory.read(this.process, address, 'int');
      }
    }
    return address;
  }

  private disconnect(): void {
    if (this.process) this.memory.closeProcess(this.process);
    this.process = null;
    this.gameValues.clear();
    if (this.running) this.callbacks.onStatus('searching');
  }
}
