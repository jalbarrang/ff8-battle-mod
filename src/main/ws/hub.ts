import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { WebSocket, WebSocketServer } from 'ws';

import {
  WS_HOST,
  WS_PROTOCOL_VERSION,
  parseWsClientMessage,
  type Ff8Snapshot,
  type WsServerMessage
} from '../../lib/types/ws-protocol';

export interface Ff8WebSocketHubOptions {
  /** Preferred loopback port; falls back to an ephemeral port when busy. */
  port: number;
  /** Supplies the full current state for `snapshot` requests and `GET /state`. */
  getSnapshot: () => Ff8Snapshot;
  onError?: (error: unknown) => void;
  log?: (message: string) => void;
}

/**
 * Loopback WebSocket + HTTP hub that replaces the renderer IPC channel.
 *
 * Everything the watcher produces (`status`, `deltas`) is broadcast to every
 * connected client, so the renderer and a local test harness observe exactly
 * the same stream. A `snapshot` request is answered on the requesting socket
 * only, keeping request ids correlated for agents.
 */
export class Ff8WebSocketHub {
  private httpServer: Server | null = null;
  private socketServer: WebSocketServer | null = null;
  private status: Ff8Snapshot['status'] = 'searching';
  private boundPort: number;

  constructor(private readonly options: Ff8WebSocketHubOptions) {
    this.boundPort = options.port;
  }

  /** The port the hub actually bound to (may differ from the preferred port). */
  get port(): number {
    return this.boundPort;
  }

  async start(): Promise<void> {
    if (this.httpServer) return;

    const httpServer = createServer(this.handleHttp);
    const socketServer = new WebSocketServer({
      server: httpServer,
      verifyClient: (info: { origin: string }) => {
        if (this.isAllowedOrigin(info.origin)) return true;
        this.options.log?.(`rejected connection from origin ${JSON.stringify(info.origin)}`);
        return false;
      }
    });

    socketServer.on('connection', this.handleConnection);
    socketServer.on('error', (error) => this.options.onError?.(error));

    this.boundPort = await this.listen(httpServer, this.options.port);
    // Registered only after a successful bind so a busy-port fallback does not
    // also surface the EADDRINUSE error to the caller.
    httpServer.on('error', (error) => this.options.onError?.(error));

    this.httpServer = httpServer;
    this.socketServer = socketServer;
    this.options.log?.(
      `listening on ws://${WS_HOST}:${this.boundPort} (HTTP http://${WS_HOST}:${this.boundPort}/state)`
    );
  }

  async stop(): Promise<void> {
    for (const client of this.socketServer?.clients ?? []) client.terminate();
    await new Promise<void>((resolve) => {
      if (!this.socketServer) return resolve();
      this.socketServer.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      if (!this.httpServer) return resolve();
      this.httpServer.close(() => resolve());
    });
    this.socketServer = null;
    this.httpServer = null;
  }

  /** Broadcasts a watcher status transition to every connected client. */
  broadcastStatus(status: Ff8Snapshot['status']): void {
    this.status = status;
    this.broadcast({ type: 'status', status });
  }

  /** Broadcasts incremental game-value changes to every connected client. */
  broadcastDeltas(deltas: Ff8Snapshot['deltas']): void {
    this.broadcast({ type: 'deltas', deltas });
  }

  private broadcast(message: WsServerMessage): void {
    if (!this.socketServer) return;
    const payload = JSON.stringify(message);
    for (const client of this.socketServer.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }

  private send(socket: WebSocket, message: WsServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
  }

  /**
   * Rejects browser connections from arbitrary web origins so a page the user
   * visits cannot read the loopback feed. Native clients (agents, tests) send
   * no Origin header, the packaged renderer sends `file://`, and the dev
   * renderer sends a loopback origin.
   */
  private isAllowedOrigin(origin: string | undefined): boolean {
    if (!origin || origin === 'file://') return true;
    try {
      const url = new URL(origin);
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return false;
      return (
        url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]'
      );
    } catch {
      return false;
    }
  }

  private readonly handleConnection = (socket: WebSocket): void => {
    this.options.log?.(`client connected (${this.socketServer?.clients.size ?? 0} total)`);
    this.send(socket, { type: 'hello', protocol: WS_PROTOCOL_VERSION, status: this.status });

    socket.on('message', (data, isBinary) => {
      if (isBinary) {
        this.send(socket, { type: 'error', message: 'binary frames are not supported' });
        return;
      }
      this.handleClientMessage(socket, data.toString('utf8'));
    });
    socket.on('error', (error) => this.options.onError?.(error));
    socket.on('close', () => {
      this.options.log?.(`client disconnected (${this.socketServer?.clients.size ?? 0} total)`);
    });
  };

  private handleClientMessage(socket: WebSocket, raw: string): void {
    const message = parseWsClientMessage(raw);
    if (!message) {
      this.send(socket, {
        type: 'error',
        message: 'expected a JSON object of {"type":"snapshot"|"ping","id"?}'
      });
      return;
    }

    if (message.type === 'ping') {
      this.send(socket, { type: 'pong', id: message.id });
      return;
    }

    const snapshot = this.options.getSnapshot();
    this.status = snapshot.status;
    this.send(socket, { type: 'snapshot', id: message.id, ...snapshot });
  }

  private readonly handleHttp = (request: IncomingMessage, response: ServerResponse): void => {
    const { pathname } = new URL(request.url ?? '/', `http://${WS_HOST}:${this.boundPort}`);

    if (request.method === 'GET' && pathname === '/state') {
      this.respond(response, 200, {
        protocol: WS_PROTOCOL_VERSION,
        ...this.options.getSnapshot()
      });
      return;
    }

    if (request.method === 'GET' && (pathname === '/health' || pathname === '/healthz')) {
      this.respond(response, 200, { ok: true, protocol: WS_PROTOCOL_VERSION });
      return;
    }

    this.respond(response, 404, { error: 'not found' });
  };

  private respond(response: ServerResponse, status: number, body: unknown): void {
    const payload = JSON.stringify(body);
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store'
    });
    response.end(payload);
  }

  /**
   * Binds to the preferred port, falling back to an OS-assigned port when it is
   * already in use. The actual port is reported to the renderer by the caller.
   */
  private listen(server: Server, port: number): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException): void => {
        if (error.code === 'EADDRINUSE' && port !== 0) {
          server.removeListener('error', onError);
          this.options.log?.(`port ${port} is busy, falling back to an ephemeral port`);
          resolve(this.listen(server, 0));
          return;
        }
        reject(error);
      };

      server.once('error', onError);
      server.listen(port, WS_HOST, () => {
        server.removeListener('error', onError);
        const address = server.address();
        resolve(typeof address === 'object' && address !== null ? address.port : port);
      });
    });
  }
}
