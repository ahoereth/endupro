<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { formatDateTimeLabel } from "$lib/domain/view";
  import type { RunSummary } from "$lib/types/app";

  export let runs: RunSummary[] = [];
  export let searchQuery = "";
  export let selectedIds: string[] = [];
  export let activeDetailId: string | null = null;
  export let totalRunsInRange = 0;

  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent | KeyboardEvent, activityId: string) {
    dispatch("select", {
      activityId,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
  }
</script>

<section class="card recent-activities-card sticky-viewport-panel">
  <div class="chart-header">
    <h2>Recent Activities</h2>
    <p id="recent-activities-count">
      {runs.length
        ? searchQuery.trim()
          ? `${runs.length}/${totalRunsInRange} matches in range`
          : `${runs.length} in range`
        : ""}
    </p>
  </div>
  <input
    id="recent-activities-search"
    type="search"
    aria-label="Search recent activities"
    placeholder="Search activities..."
    bind:value={searchQuery}
    on:input={() => dispatch("search", { value: searchQuery })}
  />
  {#if runs.length}
    <ul class="activity-list">
      {#each runs as run}
        <li>
          <div
            class="activity-item"
            class:is-selected={selectedIds.includes(String(run.id)) ||
              activeDetailId === String(run.id)}
            role="button"
            tabindex="0"
            aria-pressed={selectedIds.includes(String(run.id)) ||
              activeDetailId === String(run.id)}
            on:click={(event) => handleClick(event, String(run.id))}
            on:dblclick={() => dispatch("open", { activityId: String(run.id) })}
            on:keydown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleClick(event, String(run.id));
              }
            }}
          >
            <div class="activity-item-top">
              <div class="activity-name">{run.name || "Untitled run"}</div>
              <button
                type="button"
                class="activity-detail-trigger"
                on:click={(event) => {
                  event.stopPropagation();
                  dispatch("open", { activityId: String(run.id) });
                }}
              >
                Details
              </button>
            </div>
            <div class="activity-meta">
              {formatDateTimeLabel(run.startDateTime)} | {Number.isFinite(
                Number(run.distanceKm),
              )
                ? `${Number(run.distanceKm).toFixed(2)} km`
                : "distance n/a"}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="field-hint">
      {searchQuery.trim()
        ? "No activities match your search in the selected timeline range."
        : "No synced activities in selected timeline range."}
    </p>
  {/if}
</section>
