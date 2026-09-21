import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { svelteGrab } from 'point-to-svelte/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Development-only: serves `/__open-in-editor` for the point-to-svelte
    // overlay's "Open" action. `inject: false` because SvelteKit renders its own
    // HTML and loads the client from `src/hooks.client.ts` instead. The plugin
    // is `apply: 'serve'`, so production builds are untouched.
    svelteGrab({ inject: false }),
    tailwindcss(),
    sveltekit()
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  }
});
