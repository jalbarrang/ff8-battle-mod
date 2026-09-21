import { dev } from '$app/environment';

// `point-to-svelte` is a development-only element picker: click a component in
// the running window and the payload names the file, line and props behind it.
// Imported dynamically, inside a `dev` branch, so the overlay and its stylesheet
// never reach the packaged bundle. The "Open" action it offers is served by the
// `svelteGrab` plugin in vite.config.ts, which is `apply: 'serve'` for the same
// reason. SvelteKit renders its own HTML, so the plugin cannot inject this for
// us — hence the import here rather than `inject: true`.
if (dev) {
  await import('point-to-svelte');
}
