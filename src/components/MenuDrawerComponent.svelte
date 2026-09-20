<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    heightWhenClosed?: string;
    maxHeight?: string;
  }

  let {
    children,
    heightWhenClosed = '6px',
    maxHeight = `calc(100vh - ${heightWhenClosed})`
  }: Props = $props();

  let isOpen = $state(false);
  let transitionsEnabled = $state(true);
  let currentHeight = $state(0);
  let currentWidth = $state(0);

  const drawerStyle = $derived(
    `max-height: ${maxHeight}; margin-left: -${currentWidth / 2}px; ${
      transitionsEnabled ? 'transition: bottom .5s;' : ''
    } ${
      isOpen
        ? `bottom: calc(100% - ${currentHeight}px);`
        : `bottom: calc(100% - ${heightWhenClosed});`
    }`
  );

  function disableTransitions(): void {
    transitionsEnabled = false;
    window.setTimeout(() => {
      transitionsEnabled = true;
    }, 100);
  }
</script>

<svelte:window onresize={disableTransitions} />

<menu-drawer style={drawerStyle} bind:clientHeight={currentHeight} bind:clientWidth={currentWidth}>
  <margin-spacer class="left"></margin-spacer>
  <drawer-content>{@render children()}</drawer-content>
  <button class="drawer-handle" type="button" aria-label="Toggle party editor" onclick={() => (isOpen = !isOpen)}>
    <span>| | | |</span>
  </button>
  <margin-spacer class="right"></margin-spacer>
</menu-drawer>

<style>
  menu-drawer {
    position: fixed;
    display: flex;
    flex-direction: column;
    width: calc(100vw - 200px);
    min-width: 425px;
    left: 50%;
    background: #adadad;
    box-shadow: 0 1px black;
  }

  margin-spacer {
    position: absolute;
    top: 0;
    width: 125px;
    height: calc(100% - 30px);
    background: inherit;
    box-shadow: 0 1px black;
    z-index: -3;
  }

  margin-spacer.left {
    left: -125px;
  }

  margin-spacer.right {
    right: -125px;
  }

  menu-drawer:before {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 40px;
    height: 30px;
    background: inherit;
    transform-origin: 0 100%;
    transform: skew(50deg);
    box-shadow: -2px 1px black;
    z-index: -2;
  }

  menu-drawer:after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    width: 40px;
    height: 30px;
    background: inherit;
    transform-origin: 0 100%;
    transform: skew(-50deg);
    box-shadow: 3px 1px black;
    z-index: -2;
  }

  drawer-content {
    flex-grow: 1;
    margin-bottom: 15px;
    background: inherit;
    overflow: hidden;
  }

  .drawer-handle {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #e6e6e6;
    font-size: 6px;
    letter-spacing: 1px;
    height: 12px;
    width: 40px;
    margin: auto;
    left: 0;
    right: 0;
    bottom: -12px;
    background: inherit;
    cursor: pointer;
    user-select: none;
  }

  .drawer-handle:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: inherit;
    transform-origin: 0 100%;
    transform: skew(45deg);
    z-index: -1;
    box-shadow: -1px 0.5px black;
  }

  .drawer-handle:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: inherit;
    transform-origin: 0 100%;
    transform: skew(-45deg);
    z-index: -1;
    box-shadow: 2px 0.5px black;
  }

  .drawer-handle span {
    position: relative;
    top: -2px;
  }
</style>
