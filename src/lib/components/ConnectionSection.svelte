<script lang="ts">
  import ConnectionPanel from "$lib/components/ConnectionPanel.svelte";
  import type { RunSummary } from "$lib/types/app";

  export let status = "Loading...";
  export let hasApiKey = false;
  export let syncedAt: string | null = null;
  export let oldestRun: RunSummary | null = null;
  export let latestRun: RunSummary | null = null;
  export let syncBusy = false;
  export let syncStopping = false;
  export let syncProgressPercent: number | null = null;
  export let activityCount = 0;
  export let onSaveKey: (apiKey: string) => void;
  export let onKeyChange: () => void;
  export let onUpdate: () => void;
  export let onStopSync: () => void;
  export let onClearActivities: () => void;
  export let onDeleteAll: () => void;
  export let mobileMenuOpen = false;
  export let onCloseMenu: () => void;

  $: isConnectionFaulty =
    typeof status === "string" && status.startsWith("Intervals.icu API ");
</script>

{#if !hasApiKey || isConnectionFaulty}
  <div class="mobile-connection-panel">
    <ConnectionPanel
      {status}
      {hasApiKey}
      {syncedAt}
      {oldestRun}
      {latestRun}
      {syncBusy}
      {syncStopping}
      {syncProgressPercent}
      {activityCount}
      on:savekey={(event) => onSaveKey(event.detail.apiKey)}
      on:keychange={onKeyChange}
      on:update={onUpdate}
      on:stopsync={onStopSync}
      on:clearactivities={onClearActivities}
      on:deleteall={onDeleteAll}
    />
  </div>
{/if}

<aside
  class="left-column"
  class:is-mobile-open={mobileMenuOpen}
  aria-label="Controls and recent activities"
>
  <div class="mobile-left-drawer-header">
    <h2>Menu</h2>
    <button type="button" class="secondary-button" on:click={onCloseMenu}>
      Close
    </button>
  </div>
  <ConnectionPanel
    {status}
    {hasApiKey}
    {syncedAt}
    {oldestRun}
    {latestRun}
    {syncBusy}
    {syncStopping}
    {syncProgressPercent}
    {activityCount}
    on:savekey={(event) => onSaveKey(event.detail.apiKey)}
    on:keychange={onKeyChange}
    on:update={onUpdate}
    on:stopsync={onStopSync}
    on:clearactivities={onClearActivities}
    on:deleteall={onDeleteAll}
  />
  <slot />
</aside>
