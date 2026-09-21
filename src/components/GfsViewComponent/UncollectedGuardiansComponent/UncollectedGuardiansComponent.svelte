<script lang="ts">
  import { portraitUrl } from '$lib/portraits';
  import type { GuardianForce } from '$lib/types/game';

  interface Props {
    /** Locked Guardians only. The page splits the roster before passing it in. */
    guardians: GuardianForce[];
  }

  let { guardians }: Props = $props();
</script>

<!-- `mt-4` is this section's share of the scroll body's inter-section rhythm,
     kept on the root so the page stays a plain composition. -->
<section class="mt-4 flex flex-col gap-3" aria-labelledby="gf-uncollected-heading">
  <div class="bar flex items-center gap-2 px-2 py-1 text-label">
    <h2 id="gf-uncollected-heading" class="font-normal">Uncollected</h2>
    <span class="ml-auto tabular-nums text-ff-ink-dim">{guardians.length}</span>
  </div>

  {#if guardians.length === 0}
    <p class="well px-2 py-1.5 text-label text-ff-ink-dim">Every Guardian is collected.</p>
  {:else}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {#each guardians as guardian (guardian.id)}
        {@const portrait = portraitUrl(guardian.name)}
        <!-- Absence keeps the same footprint as presence: the plate recesses
             and the portrait greys out, so the list never reflows. The plate
             carries no status copy; the heading already says "Uncollected". -->
        <div class="well flex items-center gap-2 p-2">
          {#if portrait}
            <img
              src={portrait}
              alt=""
              class="h-16 w-auto shrink-0 border border-ff-edge-lo opacity-40 grayscale"
            />
          {/if}
          <div class="min-w-0 flex-1 truncate text-name font-bold">{guardian.name}</div>
        </div>
      {/each}
    </div>
  {/if}
</section>
