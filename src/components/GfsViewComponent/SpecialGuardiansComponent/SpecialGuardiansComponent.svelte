<script lang="ts">
  import { portraitUrl } from '$lib/portraits';
  import type { GuardianSpecialFlags } from '$lib/types/game';

  interface Props {
    /** The two one-off Guardian possession bits the game tracks outside the roster. */
    flags: GuardianSpecialFlags;
  }

  let { flags }: Props = $props();

  const odinCard = $derived(portraitUrl('Odin'));
  const gilgameshCard = $derived(portraitUrl('Gilgamesh'));

  // The game clears the Odin possession bit when it grants Gilgamesh (AI opcode
  // 54), so a cleared Odin bit next to a set Gilgamesh bit means Odin was lost,
  // not that he was never recruited.
  const odinStatus = $derived(flags.odin ? 'Recruited' : flags.gilgamesh ? 'Deceased' : 'Not recruited');
  const gilgameshStatus = $derived(flags.gilgamesh ? 'Recruited' : 'Not recruited');

  // A lamp carries the state; the word beside it stays white.
  const lamp = (state: 'good' | 'warn' | 'bad') =>
    state === 'good' ? 'bg-ff-good' : state === 'bad' ? 'bg-ff-bad' : 'bg-ff-warn';
</script>

<!-- `mt-4` is this section's share of the scroll body's inter-section rhythm,
     kept on the root so the page stays a plain composition. -->
<section class="mt-4 flex flex-col gap-3" aria-labelledby="gf-special-heading">
  <div class="bar flex items-center gap-2 px-2 py-1 text-label">
    <h2 id="gf-special-heading" class="font-normal">Special</h2>
  </div>

  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div class="plate p-2">
      <span class="tab-label">Odin</span>
      <div class="flex items-center gap-2">
        {#if odinCard}
          <img
            src={odinCard}
            alt=""
            class="h-16 w-auto shrink-0 border border-ff-edge-lo {flags.odin
              ? ''
              : 'opacity-40 grayscale'}"
          />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="text-name font-bold">Odin</div>
          <div class="mt-0.5 flex items-center gap-1.5 text-label">
            <span
              class="lamp rounded-full {flags.odin
                ? lamp('good')
                : flags.gilgamesh
                  ? lamp('bad')
                  : lamp('warn')}"
            ></span>
            <span>{odinStatus}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="plate p-2">
      <span class="tab-label">Gilgamesh</span>
      <div class="flex items-center gap-2">
        {#if gilgameshCard}
          <img
            src={gilgameshCard}
            alt=""
            class="h-16 w-auto shrink-0 border border-ff-edge-lo {flags.gilgamesh
              ? ''
              : 'opacity-40 grayscale'}"
          />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="text-name font-bold">Gilgamesh</div>
          <div class="mt-0.5 flex items-center gap-1.5 text-label">
            <span
              class="lamp rounded-full {flags.gilgamesh ? lamp('good') : lamp('warn')}"
            ></span>
            <span>{gilgameshStatus}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
