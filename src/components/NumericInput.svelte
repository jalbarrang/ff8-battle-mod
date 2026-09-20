<script lang="ts">
  import type { Action } from 'svelte/action';

  interface Props {
    value: number;
    min?: number;
    max?: number;
    onChange?: (event: Event) => void;
    onInit?: (element: HTMLInputElement) => void;
    onKeydown?: (event: KeyboardEvent) => void;
    onKeypress?: (event: KeyboardEvent) => void;
  }

  let {
    value = $bindable(),
    min,
    max,
    onChange,
    onInit = () => undefined,
    onKeydown,
    onKeypress
  }: Props = $props();

  const initialize: Action<HTMLInputElement> = (element) => {
    onInit(element);
  };

  function handleKeypress(event: KeyboardEvent): void {
    if (['-', '+', 'e', '.'].includes(event.key)) event.preventDefault();
    else onKeypress?.(event);
  }
</script>

<numeric-input>
  <input
    type="number"
    {min}
    {max}
    bind:value
    onkeypress={handleKeypress}
    onchange={onChange}
    onkeydown={onKeydown}
    use:initialize
  />
</numeric-input>

<style>
  numeric-input {
    display: flex;
  }

  input[type='number']::-webkit-inner-spin-button {
    opacity: 1;
  }
</style>
