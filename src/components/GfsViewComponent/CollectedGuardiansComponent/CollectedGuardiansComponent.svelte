<script lang="ts">
  import { guardianExpToNextLevel, guardianLevel } from '$lib/gfs';
  import { portraitUrl } from '$lib/portraits';
  import { skillName } from '$lib/skills';
  import type { GuardianForce } from '$lib/types/game';

  interface Props {
    /** Unlocked Guardians only. The page splits the roster before passing it in. */
    guardians: GuardianForce[];
  }

  let { guardians }: Props = $props();

</script>

<section class="flex flex-col gap-3" aria-labelledby="gf-collected-heading">
  <div class="bar flex items-center gap-2 px-2 py-1 text-label">
    <h2 id="gf-collected-heading" class="font-normal">Collected</h2>
    <span class="ml-auto tabular-nums text-ff-ink-dim">{guardians.length}</span>
  </div>

  {#if guardians.length === 0}
    <p class="well px-2 py-1.5 text-label text-ff-ink-dim">
      No Guardian Forces obtained yet.
    </p>
  {:else}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {#each guardians as guardian (guardian.id)}
        {@const portrait = portraitUrl(guardian.name)}
        {@const expToNext = guardianExpToNextLevel(guardian.exp)}
        {@const apTotal = guardian.learningApRequired}
        <div class="plate p-2">
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
                <div class="flex justify-between gap-2">
                  <span class="text-ff-ink-dim">HP</span>
                  <span class="tabular-nums"
                    >{guardian.currentHealth} / {guardian.maxHealth}</span
                  >
                </div>

                <div class="space-y-1">
                  <div class="flex justify-between gap-2">
                    <span class="text-ff-ink-dim">EXP</span>
                    <span class="tabular-nums">{guardian.exp}</span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-ff-ink-dim">XP to Next level</span>
                    <span
                      class="tabular-nums"
                      title={expToNext === null
                        ? `Level ${guardianLevel(guardian.exp)} is the cap`
                        : 'Remaining EXP for the next level'}
                    >
                      {expToNext ?? '—'}
                    </span>
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
                        title={apTotal > 0
                          ? `AP collected of the ${apTotal} needed to learn it`
                          : 'AP collected so far'}
                      >
                        {guardian.learningAp}{apTotal > 0 ? ` / ${apTotal}` : ''} AP
                      </span>
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
