import type { Ff8Api } from '$lib/types/game';

declare global {
  interface Window {
    ff8: Ff8Api;
  }
}

export {};
