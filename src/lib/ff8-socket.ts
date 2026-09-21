import type { GameValueDeltas, ProcessStatus } from '$lib/types/game';
import {
  buildFf8WebSocketUrl,
  resolveFf8WsPort,
  type WsServerMessage
} from '$lib/types/ws-protocol';

export interface Ff8SocketHandlers {
  onStatus(status: ProcessStatus): void;
  onDeltas(deltas: GameValueDeltas): void;
}

const INITIAL_RECONNECT_DELAY = 250;
const MAX_RECONNECT_DELAY = 4_000;

/**
 * Connects the renderer to the main-process FF8 WebSocket hub.
 *
 * This replaces the old `window.ff8` IPC bridge. It reconnects with capped
 * exponential backoff, because the main process may not have started the hub
 * yet on a cold boot, and asks for a full snapshot every time it (re)connects.
 * The returned function tears the connection down.
 */
export function connectFf8Socket(handlers: Ff8SocketHandlers): () => void {
  const port = resolveFf8WsPort(window.location.search);
  const url = buildFf8WebSocketUrl(port);

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = INITIAL_RECONNECT_DELAY;
  let disposed = false;

  const scheduleReconnect = (): void => {
    if (disposed || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      open();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  };

  const applyMessage = (raw: string): void => {
    let message: WsServerMessage;
    try {
      message = JSON.parse(raw) as WsServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'hello':
      case 'status':
        handlers.onStatus(message.status);
        break;
      case 'deltas':
        handlers.onDeltas(message.deltas);
        break;
      case 'snapshot':
        handlers.onStatus(message.status);
        handlers.onDeltas(message.deltas);
        break;
      default:
        break;
    }
  };

  function open(): void {
    if (disposed) return;
    const next = new WebSocket(url);
    socket = next;

    next.addEventListener('open', () => {
      reconnectDelay = INITIAL_RECONNECT_DELAY;
      next.send(JSON.stringify({ type: 'snapshot' }));
    });
    next.addEventListener('message', (event) => {
      if (typeof event.data === 'string') applyMessage(event.data);
    });
    next.addEventListener('close', () => {
      if (socket === next) socket = null;
      scheduleReconnect();
    });
    next.addEventListener('error', () => next.close());
  }

  open();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    socket?.close();
    socket = null;
  };
}
