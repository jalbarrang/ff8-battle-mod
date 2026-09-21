import type { GameValueDeltas, ProcessStatus } from './game';

/**
 * Wire contract for the loopback bridge between the Electron main process and
 * the renderer. The main process owns the server; the renderer (and any local
 * agent or test harness) is just a client, which is what makes the data
 * pipeline testable without DevTools/CDP.
 */

/** Default loopback port for the FF8 main-process WebSocket hub. */
export const DEFAULT_WS_PORT = 8174;

/** Loopback host the hub binds to. It is never reachable off the machine. */
export const WS_HOST = '127.0.0.1';

/** Bumped whenever the wire contract changes so clients can detect drift. */
export const WS_PROTOCOL_VERSION = 1;

export interface Ff8Snapshot {
  status: ProcessStatus;
  deltas: GameValueDeltas;
}

// ---------------------------------------------------------------------------
// Server -> client
// ---------------------------------------------------------------------------

/** Sent once on connect, before any state is delivered. */
export interface WsHelloMessage {
  type: 'hello';
  protocol: number;
  status: ProcessStatus;
}

/** Watcher connectivity changed (`searching` <-> `connected`). */
export interface WsStatusMessage {
  type: 'status';
  status: ProcessStatus;
}

/** Incremental game-value changes. `deltas` only contains changed keys. */
export interface WsDeltasMessage {
  type: 'deltas';
  deltas: GameValueDeltas;
}

/** Full current state, sent in reply to a `snapshot` request. */
export interface WsSnapshotMessage extends Ff8Snapshot {
  type: 'snapshot';
  /** Echoes the request id when one was supplied. */
  id?: number | string;
}

export interface WsPongMessage {
  type: 'pong';
  id?: number | string;
}

export interface WsErrorMessage {
  type: 'error';
  message: string;
}

export type WsServerMessage =
  | WsHelloMessage
  | WsStatusMessage
  | WsDeltasMessage
  | WsSnapshotMessage
  | WsPongMessage
  | WsErrorMessage;

// ---------------------------------------------------------------------------
// Client -> server
// ---------------------------------------------------------------------------

export interface WsSnapshotRequest {
  type: 'snapshot';
  id?: number | string;
}

export interface WsPingRequest {
  type: 'ping';
  id?: number | string;
}

export type WsClientMessage = WsSnapshotRequest | WsPingRequest;

// ---------------------------------------------------------------------------
// Helpers shared by the main process and the renderer
// ---------------------------------------------------------------------------

export function buildFf8WebSocketUrl(port: number = DEFAULT_WS_PORT): string {
  return `ws://${WS_HOST}:${port}`;
}

/**
 * Resolves the hub port. The main process appends `?wsPort=<port>` to the
 * renderer URL, so a renderer that connected to an overridden or fallback port
 * still finds the right server.
 */
export function resolveFf8WsPort(search: string): number {
  const raw = new URLSearchParams(search).get('wsPort');
  const port = raw === null ? Number.NaN : Number(raw);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_WS_PORT;
}

/** Parses an inbound client frame; returns null when it is not a known request. */
export function parseWsClientMessage(raw: string): WsClientMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const { type, id } = value as { type?: unknown; id?: unknown };
  if (type !== 'snapshot' && type !== 'ping') return null;
  if (id !== undefined && typeof id !== 'number' && typeof id !== 'string') return null;
  return id === undefined ? { type } : { type, id };
}
