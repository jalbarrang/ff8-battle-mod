import { rm } from 'node:fs/promises';

await Promise.all([
  rm('.vite', { force: true, recursive: true }),
  rm('.svelte-kit', { force: true, recursive: true }),
  rm('build', { force: true, recursive: true })
]);
