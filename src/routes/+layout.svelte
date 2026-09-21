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
  const connected = $derived(gameState.processStatus === 'connected');

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

<div class="flex h-screen w-full flex-col overflow-hidden bg-ff-field font-ff text-ff-ink">
  <nav class="bar flex shrink-0 items-stretch text-nav" aria-label="Sections">
    {#each TABS as tab (tab.route)}
      <a
        href={tab.href}
        aria-current={activeRoute === tab.route ? 'page' : undefined}
        class="tab"
        class:tab-active={activeRoute === tab.route}
      >
        <span>{tab.label}</span>
        {#if tab.route === '/battle' && gameState.battleStarted}
          <span
            class="lamp animate-pulse rounded-full bg-ff-bad"
            title="Battle in progress"
          ></span>
        {/if}
      </a>
    {/each}

    <!-- The lamp carries the state on its own; the words drop before the tabs
         are allowed to clip at the window's narrow end. -->
    <span class="ml-auto flex shrink-0 items-center gap-2 px-3 text-label text-ff-ink-dim">
      <span class="lamp rounded-full {connected ? 'bg-ff-good' : 'bg-ff-warn'}"></span>
      <span class="hidden status:inline">{connected ? 'FF8 connected' : 'Searching…'}</span>
    </span>
  </nav>

  <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
    {#if !connected}
      <div class="flex flex-1 items-center justify-center p-6">
        <div class="plate px-4 pb-3 pt-4">
          <span class="tab-label">Status</span>
          <p class="text-nav">Searching for FF8_EN.exe…</p>
        </div>
      </div>
    {:else}
      {@render children()}
    {/if}
  </main>
</div>
