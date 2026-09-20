import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/preload/index.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.cjs'
    },
    outDir: '.vite/build',
    rollupOptions: {
      external: ['electron']
    },
    sourcemap: false,
    target: 'node22'
  }
});
