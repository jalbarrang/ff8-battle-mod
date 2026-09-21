<script lang="ts">
  import { gameState } from '$lib/game-state.svelte';
  import { guardianLevel, guardianLevelProgress } from '$lib/gfs';
  import { skillName } from '$lib/skills';
  import type { GuardianForce } from '$lib/types/game';

  const guardians = $derived(gameState.guardians);
  const unlockedCount = $derived(guardians.filter((guardian) => guardian.unlocked).length);

  function healthPercent(guardian: GuardianForce): number {
    if (!guardian.maxHealth || guardian.maxHealth <= 0) return 0;
    return Math.min(100, Math.round((guardian.currentHealth / guardian.maxHealth) * 100));
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
  <div class="flex items-baseline justify-between text-[10px] text-ff-label">
    <span>Guardian Forces</span>
    <span>{unlockedCount} / {guardians.length} obtained</span>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-ff-border)_var(--color-ff-window-dark)]">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {#each guardians as guardian (guardian.id)}
        {#if guardian.unlocked}
          <div class="border-2 border-ff-border bg-ff-window p-2">
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
                <span class="truncate text-ff-warn" title={guardian.learningSkillId ? skillName(guardian.learningSkillId) : 'No ability selected'}>
                  {guardian.learningSkillId ? skillName(guardian.learningSkillId) : '—'}
                </span>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex items-center justify-between border border-ff-border/40 px-2 py-1 text-[10px] text-ff-label">
            <span>{guardian.name}</span>
            <span class="normal-case">Not obtained</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>
