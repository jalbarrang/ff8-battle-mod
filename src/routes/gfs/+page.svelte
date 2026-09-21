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
  const odinStatus = $derived(
    specialFlags.odin ? 'Recruited' : specialFlags.gilgamesh ? 'Deceased' : 'Not recruited'
  );
  const odinTone = $derived(specialFlags.odin ? 'text-ff-warn' : 'text-ff-label');
  const gilgameshStatus = $derived(specialFlags.gilgamesh ? 'Recruited' : 'Not recruited');
  const gilgameshTone = $derived(specialFlags.gilgamesh ? 'text-ff-warn' : 'text-ff-label');

  function healthPercent(guardian: GuardianForce): number {
    if (!guardian.maxHealth || guardian.maxHealth <= 0) return 0;
    return Math.min(100, Math.round((guardian.currentHealth / guardian.maxHealth) * 100));
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
  <div class="flex items-baseline justify-between text-[10px] text-ff-label">
    <span>Guardian Forces</span>
    <span>{collected.length} / {guardians.length} collected</span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]">
    <div class="flex items-center gap-2 text-[10px] text-ff-label">
      <span class="font-bold tracking-wide uppercase">Collected</span>
      <span class="h-px flex-1 bg-ff-border"></span>
      <span>{collected.length}</span>
    </div>

    <div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each collected as guardian (guardian.id)}
        {@const portrait = portraitUrl(guardian.name)}
        <div class="border-2 border-ff-border bg-ff-window p-2">
          <div class="flex gap-2">
            {#if portrait}
              <img
                src={portrait}
                alt=""
                class="h-16 w-auto shrink-0 self-start border border-ff-border/60"
              />
            {/if}

            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <span class="truncate text-sm font-bold">{guardian.name}</span>
                <span
                  class="shrink-0 text-[10px] text-ff-label"
                  title="Derived from GF EXP at 1000 EXP per level"
                >
                  LV {guardianLevel(guardian.exp)}
                </span>
              </div>

              <div class="mt-1.5 space-y-1.5 text-[10px]">
                <div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ff-label">HP</span>
                    <span class="tabular-nums">{guardian.currentHealth} / {guardian.maxHealth}</span>
                  </div>
                  <div class="mt-0.5 h-1.5 w-full border border-ff-border/50 bg-ff-window-dark">
                    <div class="h-full bg-ff-good" style="width: {healthPercent(guardian)}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ff-label">EXP</span>
                    <span class="tabular-nums">{guardian.exp}</span>
                  </div>
                  <div class="mt-0.5 h-1.5 w-full border border-ff-border/50 bg-ff-window-dark">
                    <div
                      class="h-full bg-ff-warn"
                      style="width: {Math.round(guardianLevelProgress(guardian.exp) * 100)}%"
                    ></div>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-2">
                  <span class="text-ff-label">Learning</span>
                  <span class="flex min-w-0 items-baseline gap-1.5">
                    <span
                      class="truncate text-ff-warn"
                      title={guardian.learningSkillId ? skillName(guardian.learningSkillId) : 'No ability selected'}
                    >
                      {guardian.learningSkillId ? skillName(guardian.learningSkillId) : '—'}
                    </span>
                    {#if guardian.learningSkillId}
                      <span class="shrink-0 tabular-nums text-ff-label" title="AP collected so far">
                        {guardian.learningAp} AP
                      </span>
                    {/if}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="my-3 border-t-2 border-dashed border-ff-border/50"></div>

    <div class="flex items-center gap-2 text-[10px] text-ff-label">
      <span class="font-bold tracking-wide uppercase">Uncollected</span>
      <span class="h-px flex-1 bg-ff-border"></span>
      <span>{uncollected.length}</span>
    </div>

    <div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each uncollected as guardian (guardian.id)}
        {@const portrait = portraitUrl(guardian.name)}
        <div class="flex items-center gap-2 border-2 border-ff-border bg-ff-window p-2">
          {#if portrait}
            <img
              src={portrait}
              alt=""
              class="h-16 w-auto shrink-0 border border-ff-border/60 opacity-40 grayscale"
            />
          {/if}
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-bold">{guardian.name}</div>
            <div class="text-[10px] text-ff-label">Not obtained</div>
          </div>
        </div>
      {/each}
    </div>

    <div class="my-3 border-t-2 border-dashed border-ff-border/50"></div>

    <div class="flex items-center gap-2 text-[10px] text-ff-label">
      <span class="font-bold tracking-wide uppercase">Special</span>
      <span class="h-px flex-1 bg-ff-border"></span>
    </div>

    <div class="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div class="flex items-center gap-2 border-2 border-ff-border bg-ff-window p-2">
        {#if odinCard}
          <img
            src={odinCard}
            alt=""
            class="h-16 w-auto shrink-0 border border-ff-border/60 {specialFlags.odin
              ? ''
              : 'opacity-40 grayscale'}"
          />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold">Odin</div>
          <div class="text-[10px] {odinTone}">{odinStatus}</div>
        </div>
      </div>

      <div class="flex items-center gap-2 border-2 border-ff-border bg-ff-window p-2">
        {#if gilgameshCard}
          <img
            src={gilgameshCard}
            alt=""
            class="h-16 w-auto shrink-0 border border-ff-border/60 {specialFlags.gilgamesh
              ? ''
              : 'opacity-40 grayscale'}"
          />
        {/if}
        <div class="min-w-0 flex-1">
          <div class="text-sm font-bold">Gilgamesh</div>
          <div class="text-[10px] {gilgameshTone}">{gilgameshStatus}</div>
        </div>
      </div>
    </div>
  </div>
</div>
