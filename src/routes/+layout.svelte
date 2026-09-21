<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { untrack } from 'svelte';

  import { gameState } from '$lib/game-state.svelte';
  import '../styles/global.css';

  let { children } = $props();

  const TABS = [
    { route: '/', href: '#/', label: 'Party' },
    { route: '/battle', href: '#/battle', label: 'Battle' },
    { route: '/gfs', href: '#/gfs', label: 'Guardians' },
    { route: '/items', href: '#/items', label: 'Items' }
  ] as const;

  // Hash routing keeps the logical route in the fragment, so derive the active
  // tab from `url.hash` and fall back to the pathname for a bare `/`.
  function routeOf(url: URL): string {
    const fromHash = url.hash.replace(/^#/, '').split(/[?#]/)[0];
    return fromHash || url.pathname || '/';
  }

  const activeRoute = $derived(routeOf(page.url));

  // The Battle screen takes over when a fight starts and hands control back to
  // whatever tab was open when it ends. Manual navigation mid-fight is
  // respected: the tab is only restored if the battle view is still showing.
  let wasInBattle = false;
  let returnRoute = '/';

  $effect(() => {
    const inBattle = gameState.battleStarted;
    if (inBattle === wasInBattle) return;

    if (inBattle) {
      const here = untrack(() => routeOf(page.url));
      if (here !== '/battle') returnRoute = here;
      void goto('#/battle');
    } else {
      const here = untrack(() => routeOf(page.url));
      if (here === '/battle') void goto(returnRoute === '/' ? '#/' : `#${returnRoute}`);
    }

    wasInBattle = inBattle;
  });

  $effect(() => {
    // Subscribe to the watcher once the window exists.
    gameState.init();
  });
</script>

<div class="flex h-screen w-full flex-col overflow-hidden bg-ff-field font-ff tracking-wider text-ff-border uppercase">
  <nav class="flex shrink-0 items-stretch border-b-2 border-ff-border bg-ff-window-dark text-xs" aria-label="Sections">
    {#each TABS as tab (tab.route)}
      <a
        href={tab.href}
        aria-current={activeRoute === tab.route ? 'page' : undefined}
        class="relative flex items-center gap-1.5 border-r-2 border-ff-border px-3 py-1.5 transition-colors hover:bg-ff-window"
        class:bg-ff-window={activeRoute === tab.route}
        class:text-ff-warn={activeRoute === tab.route}
      >
        {tab.label}
        {#if tab.route === '/battle' && gameState.battleStarted}
          <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ff-bad" title="Battle in progress"></span>
        {/if}
      </a>
    {/each}
    <span class="ml-auto flex items-center px-3 text-[10px] text-ff-label normal-case">
      {gameState.processStatus === 'connected' ? 'FF8 connected' : 'Searching…'}
    </span>
  </nav>

  <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
    {#if gameState.processStatus === 'searching'}
      <div class="flex flex-1 items-center justify-center p-6 text-xs">
        Looking for process FF8_EN.exe
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>
</div>
