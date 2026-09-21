<script lang="ts">
  import { gameState } from '$lib/game-state.svelte';
  import { guardianLevel, guardianLevelProgress } from '$lib/gfs';
  import { portraitUrl } from '$lib/portraits';
  import { skillName } from '$lib/skills';
  import type { GuardianForce } from '$lib/types/game';

  const guardians = $derived(gameState.guardians);
  const collected = $derived(guardians.filter((guardian) => guardian.unlocked));
  const uncollected = $derived(guardians.filter((guardian) => !guardian.unlocked));
  const specialFlags = $derived(gameState.guardianSpecialFlags);
  const odinCard = $derived(portraitUrl('Odin'));
  const gilgameshCard = $derived(portraitUrl('Gilgamesh'));

  // The game clears the Odin possession bit when it grants Gilgamesh (AI opcode
  // 54), so a cleared Odin bit next to a set Gilgamesh bit means Odin was lost,
  // not that he was never recruited.
  const odinStatus = $derived(specialFlags.odin ? 'Recruited' : specialFlags.gilgamesh ? 'Deceased' : 'Not recruited');
  const gilgameshStatus = $derived(specialFlags.gilgamesh ? 'Recruited' : 'Not recruited');

  function healthPercent(guardian: GuardianForce): number {
    if (!guardian.maxHealth || guardian.maxHealth <= 0) return 0;
    return Math.min(100, Math.round((guardian.currentHealth / guardian.maxHealth) * 100));
  }

  // A lamp carries the state; the word beside it stays white.
  const lamp = (state: 'good' | 'warn' | 'bad') =>
    state === 'good' ? 'bg-ff-good' : state === 'bad' ? 'bg-ff-bad' : 'bg-ff-warn';
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
  <div class="bar flex shrink-0 items-baseline justify-between px-2 py-1 text-label">
    <span>Guardian Forces</span>
    <span class="tabular-nums text-ff-ink-dim">
      {collected.length} / {guardians.length} collected
    </span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto pb-2 pr-2">
    <section class="flex flex-col gap-3" aria-labelledby="gf-collected-heading">
      <div class="bar flex items-center gap-2 px-2 py-1 text-label">
        <h2 id="gf-collected-heading" class="font-normal">Collected</h2>
        <span class="ml-auto tabular-nums text-ff-ink-dim">{collected.length}</span>
      </div>

      {#if collected.length === 0}
        <p class="well px-2 py-1.5 text-label text-ff-ink-dim">
          No Guardian Forces obtained yet.
        </p>
      {:else}
        <div class="grid grid-cols-1 gap-3">
          {#each collected as guardian (guardian.id)}
            {@const portrait = portraitUrl(guardian.name)}
            <div class="plate p-2">
              <span class="tab-label">GF</span>
              <div class="flex gap-2">
                {#if portrait}
                  <img
                    src={portrait}
                    alt=""
                    class="h-16 w-auto shrink-0 self-start border border-ff-edge-lo"
                  />
                {/if}

                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="truncate text-name font-bold">{guardian.name}</span>
                    <span
                      class="shrink-0 text-label text-ff-ink-dim"
                      title="Derived from GF EXP at 1000 EXP per level"
                    >
                      Lv {guardianLevel(guardian.exp)}
                    </span>
                  </div>

                  <div class="mt-2 space-y-2 text-label">
                    <div>
                      <div class="flex justify-between gap-2">
                        <span class="text-ff-ink-dim">HP</span>
                        <span class="tabular-nums"
                          >{guardian.currentHealth} / {guardian.maxHealth}</span
                        >
                      </div>
                      <div class="mt-1 h-2 w-full border border-ff-edge-lo bg-ff-well">
                        <div
                          class="h-full bg-ff-good"
                          style="width: {healthPercent(guardian)}%"
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div class="flex justify-between gap-2">
                        <span class="text-ff-ink-dim">EXP</span>
                        <span class="tabular-nums">{guardian.exp}</span>
                      </div>
                      <div class="mt-1 h-2 w-full border border-ff-edge-lo bg-ff-well">
                        <div
                          class="h-full bg-ff-warn"
                          style="width: {Math.round(guardianLevelProgress(guardian.exp) * 100)}%"
                        ></div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between gap-2">
                      <span class="text-ff-ink-dim">Learning</span>
                      {#if guardian.learningSkillId}
                        <span class="flex min-w-0 items-center gap-1.5">
                          <span class="lamp rounded-full bg-ff-warn"></span>
                          <span class="truncate" title={skillName(guardian.learningSkillId)}>
                            {skillName(guardian.learningSkillId)}
                          </span>
                          <span
                            class="shrink-0 tabular-nums text-ff-ink-dim"
                            title="AP collected so far">{guardian.learningAp} AP</span
                          >
                        </span>
                      {:else}
                        <span class="text-ff-ink-dim" title="No ability selected">—</span>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="mt-4 flex flex-col gap-3" aria-labelledby="gf-uncollected-heading">
      <div class="bar flex items-center gap-2 px-2 py-1 text-label">
        <h2 id="gf-uncollected-heading" class="font-normal">Uncollected</h2>
        <span class="ml-auto tabular-nums text-ff-ink-dim">{uncollected.length}</span>
      </div>

      {#if uncollected.length === 0}
        <p class="well px-2 py-1.5 text-label text-ff-ink-dim">Every Guardian is collected.</p>
      {:else}
        <div class="grid grid-cols-1 gap-3">
          {#each uncollected as guardian (guardian.id)}
            {@const portrait = portraitUrl(guardian.name)}
            <!-- Absence keeps the same footprint as presence: the plate recesses
                 and the portrait greys out, so the list never reflows. -->
            <div class="well flex items-center gap-2 p-2">
              {#if portrait}
                <img
                  src={portrait}
                  alt=""
                  class="h-16 w-auto shrink-0 border border-ff-edge-lo opacity-40 grayscale"
                />
              {/if}
              <div class="min-w-0 flex-1">
                <div class="truncate text-name font-bold">{guardian.name}</div>
                <div class="text-label text-ff-ink-dim">Not obtained</div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="mt-4 flex flex-col gap-3" aria-labelledby="gf-special-heading">
      <div class="bar flex items-center gap-2 px-2 py-1 text-label">
        <h2 id="gf-special-heading" class="font-normal">Special</h2>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <div class="plate p-2">
          <span class="tab-label">Odin</span>
          <div class="flex items-center gap-2">
            {#if odinCard}
              <img
                src={odinCard}
                alt=""
                class="h-16 w-auto shrink-0 border border-ff-edge-lo {specialFlags.odin
                  ? ''
                  : 'opacity-40 grayscale'}"
              />
            {/if}
            <div class="min-w-0 flex-1">
              <div class="text-name font-bold">Odin</div>
              <div class="mt-0.5 flex items-center gap-1.5 text-label">
                <span
                  class="lamp rounded-full {specialFlags.odin
                    ? lamp('good')
                    : specialFlags.gilgamesh
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
                class="h-16 w-auto shrink-0 border border-ff-edge-lo {specialFlags.gilgamesh
                  ? ''
                  : 'opacity-40 grayscale'}"
              />
            {/if}
            <div class="min-w-0 flex-1">
              <div class="text-name font-bold">Gilgamesh</div>
              <div class="mt-0.5 flex items-center gap-1.5 text-label">
                <span
                  class="lamp rounded-full {specialFlags.gilgamesh ? lamp('good') : lamp('warn')}"
                ></span>
                <span>{gilgameshStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
