<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { formatDateTimeLabel } from "$lib/domain/view";
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

  const dispatch = createEventDispatcher();
  let apiKey = "";
  $: canSaveApiKey = apiKey.trim().length > 0;
  $: isStatusError =
    typeof status === "string" &&
    (status.startsWith("Intervals.icu API ") ||
      status === "Sync failed." ||
      status === "Could not stop the current sync.");

  $: statusHint =
    isStatusError && status.startsWith("Intervals.icu API ")
      ? "Please double-check your Intervals.icu API key and try again."
      : isStatusError && status === "Sync failed."
        ? "Please try again and make sure your API key is still valid."
        : isStatusError && status === "Could not stop the current sync."
          ? "The current sync is still running in the background."
          : null;

  function submitApiKey() {
    if (!canSaveApiKey) {
      return;
    }
    dispatch("savekey", { apiKey });
    apiKey = "";
  }
</script>

<section class="card controls">
  <h2>Intervals.icu Connection</h2>
  <form
    class="settings-form"
    autocomplete="off"
    on:submit|preventDefault={submitApiKey}
  >
    <label for="api-key">API key</label>
    <div class="row api-key-row">
      <input
        id="api-key"
        bind:value={apiKey}
        type="password"
        class:has-saved-key={hasApiKey}
        on:input={() => dispatch("keychange")}
        placeholder={hasApiKey
          ? "Key provided."
          : "Paste Intervals.icu API key"}
      />
      <button type="submit" disabled={!canSaveApiKey}>Save Key</button>
    </div>
    <p class="field-hint">
      {#if hasApiKey}
        API key stored locally in browser storage.
      {:else}
        No API key saved yet. Get one from Intervals.icu's
        <a
          href="https://intervals.icu/features/open-api/"
          target="_blank"
          rel="noreferrer"
        >
          Open API docs
        </a>. All data is retrieved from intervals.icu and stored only in your
        browser locally. The application does not send any data to its own
        servers.
      {/if}
    </p>
  </form>

  <div class="summary-row">
    <span class="summary-label">Last sync</span>
    <span class="summary-value"
      >{syncedAt ? formatDateTimeLabel(syncedAt) : "Not synced yet"}</span
    >
  </div>
  <div class="summary-row">
    <span class="summary-label">Most recent activity</span>
    <span class="summary-value"
      >{latestRun?.name || "No activities synced yet"}</span
    >
  </div>
  <div class="summary-row">
    <span class="summary-label">Most recent date/time</span>
    <span class="summary-value"
      >{formatDateTimeLabel(latestRun?.startDateTime ?? null)}</span
    >
  </div>
  <div class="summary-row">
    <span class="summary-label">Oldest activity date/time</span>
    <span class="summary-value"
      >{formatDateTimeLabel(oldestRun?.startDateTime ?? null)}</span
    >
  </div>
  <div class="summary-row">
    <span class="summary-label">Activities</span>
    <span class="summary-value">{activityCount}</span>
  </div>

  <div class={`status-box ${isStatusError ? "status-box--error" : ""}`}>
    {#if statusHint}
      <div>{statusHint}</div>
    {/if}
    {#if isStatusError && status.startsWith("Intervals.icu API ")}
      <pre><code>{status}</code></pre>
    {:else}
      {status}
    {/if}
  </div>

  {#if syncBusy && syncProgressPercent !== null}
    <div
      class="sync-progress"
      aria-label="Sync progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={syncProgressPercent}
      role="progressbar"
    >
      <div class="sync-progress-track">
        <div
          class="sync-progress-fill"
          style={`width: ${syncProgressPercent}%`}
        ></div>
      </div>
      <span class="sync-progress-value">{syncProgressPercent}%</span>
    </div>
  {/if}

  {#if hasApiKey}
    <div class="row compact connection-actions">
      <button
        type="button"
        disabled={syncBusy}
        on:click={() => dispatch("update")}>Update</button
      >
    </div>
    {#if syncBusy}
      <div class="row compact connection-actions">
        <button
          type="button"
          class="secondary-button"
          disabled={syncStopping}
          on:click={() => dispatch("stopsync")}
        >
          {syncStopping ? "Stopping..." : "Pause Sync"}
        </button>
      </div>
    {/if}
    <div class="row compact data-reset-actions">
      <button
        type="button"
        class="secondary-button"
        disabled={syncBusy}
        on:click={() => dispatch("clearactivities")}
      >
        Clear Activities
      </button>
      <button
        type="button"
        class="secondary-button danger-button"
        disabled={syncBusy}
        on:click={() => dispatch("deleteall")}
      >
        Delete All Data
      </button>
    </div>
  {/if}
</section>
