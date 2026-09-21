<script lang="ts">
  import magicSpells from '$lib/magic-spells';
  import { portraitUrl } from '$lib/portraits';
  import type { TeamMember } from '$lib/types/game';

  interface Props {
    character: TeamMember;
  }

  let { character }: Props = $props();

  const name = $derived(character.displayName || character.name);
  const portrait = $derived(portraitUrl(name));
  const maxHealth = $derived(calculateMaxHealth(character));

  function calculateMaxHealth(target: TeamMember): number {
    const level = target.currentLevel ?? 1;
    const modifier1 = target.maxHealthModifier1 ?? 0;
    const modifier2 = target.maxHealthModifier2 ?? 0;
    const bonusSpellId = target.healthBonusSpell ?? 0;
    const bonusMultiplier = magicSpells.find((spell) => spell.id === bonusSpellId)?.hpBonusModifier ?? 0;
    const bonusQuantity = target.magic?.find(([spellId]) => spellId === bonusSpellId)?.[1] ?? 0;
    const bonusHealth = bonusQuantity * bonusMultiplier;
    return (
      bonusHealth -
      Math.floor((level * level + level * level * 4) * 2 / 255) +
      level * modifier1 +
      modifier2
    );
  }
</script>

<div class="flex items-start gap-3">
  {#if portrait}
    <img src={portrait} alt="" class="h-24 w-auto shrink-0 border border-ff-border/60" />
  {/if}
  <div class="flex min-w-0 flex-1 flex-col gap-1">
    <div class="flex flex-wrap items-baseline gap-x-3 text-sm">
      <span class="truncate font-bold">{name}</span>
      <span class="text-xs tabular-nums">
        <span class="text-ff-label">LV</span>
        {character.currentLevel ?? 0}
        <span class="text-ff-label ml-2">HP</span>
        {character.currentHealth ?? 0}<span class="text-ff-label">/</span>{maxHealth}
      </span>
    </div>
  </div>
</div>
