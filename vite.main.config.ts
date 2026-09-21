import { builtinModules } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'main.cjs'
    },
    outDir: '.vite/build',
    rollupOptions: {
      external: [
        'electron',
        'koffi',
        'ws',
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`)
      ]
    },
    sourcemap: false,
    target: 'node22'
  }
});
