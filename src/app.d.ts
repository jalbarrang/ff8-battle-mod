// The renderer talks to the Electron main process over a loopback WebSocket
// (see `$lib/ff8-socket` and `src/main/ws/hub.ts`), so there is no context-bridge
// API to declare on `window` any more.
export {};
