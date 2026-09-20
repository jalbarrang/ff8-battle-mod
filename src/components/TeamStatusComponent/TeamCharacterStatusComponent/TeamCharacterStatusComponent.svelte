<script lang="ts">
  import magicSpells from '$lib/magic-spells';
  import type { CharacterUpdate, TeamMember } from '$lib/types/game';
  import NumericInput from '../../NumericInput.svelte';

  interface Props {
    character: TeamMember;
    onTeamCharacterStatusChange?: (name: string, data: CharacterUpdate) => void;
  }

  let {
    character: sourceCharacter,
    onTeamCharacterStatusChange = () => undefined
  }: Props = $props();

  let character = $state<TeamMember>({ id: -1, name: '' });
  let propertyToEdit = $state<'currentHealth' | 'currentLevel' | null>(null);
  let newValue = $state(0);

  $effect(() => {
    character = structuredClone(sourceCharacter);
  });

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

  function onEditClick(propertyName: 'currentHealth' | 'currentLevel' | 'maxHealth'): void {
    if (propertyName === 'maxHealth') {
      window.alert("Cannot edit because this is calculated by the character's level");
      return;
    }
    propertyToEdit = propertyName;
    newValue = character[propertyName] ?? 0;
  }

  function onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') onConfirmClick();
    else if (event.key === 'Escape') onCancelClick();
  }

  function onConfirmClick(): void {
    if (!propertyToEdit) return;
    const maximum = propertyToEdit === 'currentHealth' ? maxHealth : newValue;
    const boundedValue = Math.min(newValue, maximum);
    onTeamCharacterStatusChange(character.name, { [propertyToEdit]: boundedValue });
    onCancelClick();
  }

  function onCancelClick(): void {
    propertyToEdit = null;
    newValue = 0;
  }

  function onMagicChange(): void {
    onTeamCharacterStatusChange(character.name, {
      magic: structuredClone(character.magic ?? [])
    });
  }
</script>

<character-status>
  <portrait style={`background-image: url('./images/${character.name}.png')`}></portrait>
  <status-panel>
    <statline>
      <character-name>{character.displayName || character.name}</character-name>
    </statline>
    <statline>
      <stat-name>Level:</stat-name>
      <button class="stat" onclick={() => onEditClick('currentLevel')}>{character.currentLevel ?? 0}</button>
      <stat-name>Health:</stat-name>
      <button class="stat health" onclick={() => onEditClick('currentHealth')}
        >{character.currentHealth ?? 0}</button
      >
      <stat-separator>/</stat-separator>
      <button class="stat health" onclick={() => onEditClick('maxHealth')}>{maxHealth}</button>
    </statline>
    <statline>
      <magic-editor>
        {#each character.magic ?? [] as magicSlot}
          <magic-slot>
            <select
              value={magicSlot[0]}
              onchange={(event) => {
                magicSlot[0] = Number(event.currentTarget.value);
                onMagicChange();
              }}
              aria-label="Magic spell"
            >
              {#each magicSpells as spell}
                <option value={spell.id}>{spell.name}</option>
              {/each}
            </select>
            <NumericInput min={0} max={100} bind:value={magicSlot[1]} onChange={onMagicChange} />
          </magic-slot>
        {/each}
      </magic-editor>
    </statline>
  </status-panel>
  {#if propertyToEdit}
    <div class="property-edit-panel">
      <NumericInput bind:value={newValue} onKeydown={onInputKeydown} onInit={(input) => input.select()} />
      <button onclick={onConfirmClick}>Confirm</button>
      <button onclick={onCancelClick}>Cancel</button>
    </div>
  {/if}
</character-status>

<style>
  character-status {
    display: flex;
    font-weight: 500;
    margin: 10px 15px;
  }

  portrait {
    background-repeat: no-repeat;
    background-size: 100% auto;
    width: 88px;
    margin-right: 14px;
  }

  character-name {
    width: 66px;
    font-size: 19px;
  }

  status-panel {
    display: flex;
    flex-direction: column;
    margin-top: 3px;
  }

  statline {
    display: flex;
  }

  stat-name {
    margin-right: 10px;
    font-size: 15px;
    font-weight: 500;
  }

  .stat {
    cursor: pointer;
    text-decoration: underline;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    text-shadow: inherit;
    font-weight: 600;
    font-size: 16px;
    margin-right: 10px;
    width: 24px;
  }

  .stat.health {
    width: 38px;
    text-align: right;
    margin: 0;
  }

  stat-separator {
    padding: 0 4px;
    font-weight: 400;
    font-size: 16px;
  }

  magic-editor {
    display: flex;
    flex-direction: column;
    height: 105px;
    margin-top: 4px;
    overflow-y: scroll;
    border: 1px inset;
    flex-grow: 1;
  }

  magic-slot {
    display: flex;
  }

  magic-slot select {
    flex-grow: 1;
    margin-right: 2px;
  }

  magic-slot :global(input) {
    width: 45px;
    margin-right: 2px;
  }

  .property-edit-panel {
    display: flex;
    position: absolute;
    left: 107px;
  }

  .property-edit-panel :global(input) {
    width: 82px;
  }
</style>
