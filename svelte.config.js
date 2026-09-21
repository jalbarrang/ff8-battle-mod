import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      strict: true
    }),
    files: {
      assets: 'public'
    },
    router: {
      type: 'hash'
    },
    output: {
      bundleStrategy: 'inline'
    },
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        // `ws://127.0.0.1:<port>` is the main-process data hub. The wildcard
        // port keeps a fallback/overridden hub port working from the CSP.
        'connect-src': ['self', 'ws://127.0.0.1:*', 'ws://localhost:*'],
        'img-src': ['self', 'data:'],
        'style-src': ['self', 'unsafe-inline'],
        'object-src': ['none'],
        'base-uri': ['none'],
        'frame-ancestors': ['none']
      }
    }
  }
};

export default config;
