import { contextBridge, ipcRenderer } from 'electron';

import type { Ff8Api, GameValueDeltas } from '../lib/types/game';

const IPC = {
  deltas: 'ff8:game-values-updated',
  processStatus: 'ff8:process-status-changed',
  snapshot: 'ff8:request-snapshot'
} as const;

const api: Ff8Api = {
  onGameValuesUpdated(callback: (deltas: GameValueDeltas) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, deltas: GameValueDeltas): void => callback(deltas);
    ipcRenderer.on(IPC.deltas, listener);
    return () => ipcRenderer.removeListener(IPC.deltas, listener);
  },

  onProcessStatusChanged(callback): () => void {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: 'searching' | 'connected'
    ): void => callback(status);
    ipcRenderer.on(IPC.processStatus, listener);
    return () => ipcRenderer.removeListener(IPC.processStatus, listener);
  },

  requestSnapshot(): void {
    ipcRenderer.send(IPC.snapshot);
  }
};

contextBridge.exposeInMainWorld('ff8', Object.freeze(api));
