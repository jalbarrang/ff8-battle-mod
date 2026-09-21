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

<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
  <div class="flex flex-wrap items-center gap-2 text-[10px]">
    <input
      type="search"
      bind:value={query}
      placeholder="Search items"
      aria-label="Search items"
      class="min-w-0 flex-1 border-2 border-ff-border bg-ff-window-dark px-2 py-1 normal-case text-ff-border placeholder:text-ff-label focus:outline-none"
    />
    <div class="flex items-stretch border-2 border-ff-border">
      <button
        type="button"
        onclick={() => (sort = 'name')}
        class="px-2 py-1"
        class:bg-ff-window={sort === 'name'}
        class:text-ff-warn={sort === 'name'}
      >
        Name
      </button>
      <button
        type="button"
        onclick={() => (sort = 'quantity')}
        class="border-l-2 border-ff-border px-2 py-1"
        class:bg-ff-window={sort === 'quantity'}
        class:text-ff-warn={sort === 'quantity'}
      >
        Qty
      </button>
    </div>
  </div>

  <div class="flex items-baseline justify-between text-[10px] text-ff-label">
    <span>Party inventory</span>
    <span>{visible.length} types · {totalQuantity} total</span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]">
    {#if visible.length === 0}
      <p class="p-3 text-xs text-ff-label normal-case">No items match “{query}”.</p>
    {:else}
      <ul class="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {#each visible as item (item.id)}
          <li
            class="flex items-center justify-between gap-2 border border-ff-border/60 bg-ff-window px-2 py-1 text-[11px]"
            title={`Item #${item.id}`}
          >
            <span class="truncate">{item.name}</span>
            <span class="shrink-0 tabular-nums text-ff-label">×{item.quantity}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
