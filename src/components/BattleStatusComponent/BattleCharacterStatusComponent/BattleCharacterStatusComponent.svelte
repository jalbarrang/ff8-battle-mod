<script lang="ts">
  import type { BattleCharacter, CharacterUpdate } from '$lib/types/game';
  import NumericInput from '../../NumericInput.svelte';

  interface Props {
    character: BattleCharacter;
    onBattleCharacterStatusChange?: (id: number, data: CharacterUpdate) => void;
  }

  let {
    character,
    onBattleCharacterStatusChange = () => undefined
  }: Props = $props();

  let propertyToEdit = $state<'currentHealth' | 'maxHealth' | null>(null);
  let newValue = $state(0);

  const currentHealth = $derived(character.isDead ? 0 : (character.currentHealth ?? 0));
  const maxHealth = $derived(character.isDead ? 0 : (character.maxHealth ?? 0));

  function onEditClick(propertyName: 'currentHealth' | 'maxHealth'): void {
    if (character.isDead) {
      window.alert("Cannot edit because the character is KO'd");
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
    const maximum = propertyToEdit === 'currentHealth' ? (character.maxHealth ?? newValue) : newValue;
    const boundedValue = Math.min(newValue, maximum);
    const data: CharacterUpdate = { [propertyToEdit]: boundedValue };
    if (propertyToEdit === 'maxHealth' && boundedValue < (character.currentHealth ?? 0)) {
      data.currentHealth = boundedValue;
    }
    onBattleCharacterStatusChange(character.id, data);
    onCancelClick();
  }

  function onCancelClick(): void {
    propertyToEdit = null;
    newValue = 0;
  }
</script>

<character-status>
  <character-name>{character.displayName || character.name}:</character-name>
  <statline>
    <button class="stat" onclick={() => onEditClick('currentHealth')}>{currentHealth}</button>
    <stat-separator>/</stat-separator>
    <button class="stat" onclick={() => onEditClick('maxHealth')}>{maxHealth}</button>
  </statline>
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
    align-items: center;
    justify-content: space-between;
    height: 20px;
    font-weight: bold;
  }

  character-name {
    padding-right: 15px;
    font-size: 19px;
  }

  statline {
    display: flex;
  }

  .stat {
    cursor: pointer;
    text-decoration: underline;
    color: inherit;
    background: none;
    border: 0;
    padding: 0;
    font-weight: 600;
    font-size: 16px;
    width: 63px;
    text-align: right;
    text-shadow: inherit;
  }

  stat-separator {
    padding: 0 4px;
    font-weight: 400;
    font-size: 16px;
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
