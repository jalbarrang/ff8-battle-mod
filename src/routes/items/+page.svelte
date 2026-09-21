<script lang="ts">
  import { gameState } from '$lib/game-state.svelte';

  let query = $state('');
  let sort = $state<'name' | 'quantity'>('name');

  const items = $derived(gameState.items);

  const visible = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    const filtered = items.filter(
      (item) =>
        !needle || item.name.toLowerCase().includes(needle) || String(item.id) === needle
    );
    return sort === 'quantity'
      ? filtered.sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
      : filtered.sort((a, b) => a.name.localeCompare(b.name));
  });

  const totalQuantity = $derived(visible.reduce((sum, item) => sum + item.quantity, 0));
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
  <div class="flex flex-wrap items-center gap-2">
    <input
      type="search"
      bind:value={query}
      placeholder="Search items"
      aria-label="Search items"
      class="well min-w-0 flex-1 px-2 py-1 text-label text-ff-ink placeholder:text-ff-ink-dim"
    />

    <!-- FFVIII's menu tabs, doing the same job here: the lit segment is the
         active sort. -->
    <div class="well flex items-stretch text-label" role="group" aria-label="Sort items">
      <button
        type="button"
        onclick={() => (sort = 'name')}
        aria-pressed={sort === 'name'}
        class="tab py-1 last:border-r-0"
        class:tab-active={sort === 'name'}
      >
        Name
      </button>
      <button
        type="button"
        onclick={() => (sort = 'quantity')}
        aria-pressed={sort === 'quantity'}
        class="tab py-1 last:border-r-0"
        class:tab-active={sort === 'quantity'}
      >
        Qty
      </button>
    </div>
  </div>

  <div class="bar flex shrink-0 items-baseline justify-between px-2 py-1 text-label">
    <span>Party inventory</span>
    <span class="tabular-nums text-ff-ink-dim">
      {visible.length} types · {totalQuantity} total
    </span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto pb-2 pr-2 pt-3">
    {#if visible.length === 0}
      <p class="well px-2 py-1.5 text-label text-ff-ink-dim">
        {query.trim()
          ? `Nothing in the inventory matches “${query.trim()}”.`
          : 'The inventory is empty. Items appear as the game reports them.'}
      </p>
    {:else}
      <!-- One window with many rows, the way a console inventory reads: the
           rows share a plate and are divided by rules, not stacked as cards. -->
      <div class="plate">
        <span class="tab-label">Inventory</span>
        <ul class="divide-y divide-ff-edge-lo pt-1">
          {#each visible as item (item.id)}
            <li
              class="flex items-center justify-between gap-2 px-2 py-1 text-label transition-colors hover:bg-ff-plate-hi/40"
              title={`Item #${item.id}`}
            >
              <span class="truncate">{item.name}</span>
              <span class="shrink-0 tabular-nums text-ff-ink-dim">×{item.quantity}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>
