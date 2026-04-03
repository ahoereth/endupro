<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    formatDateLabel,
    formatDateTimeLabel,
    formatDistance,
    formatDuration,
    formatPace,
    formatSignedDistance,
  } from "$lib/domain/view";
  import ActivityDetailStreamChart from "$lib/components/ActivityDetailStreamChart.svelte";
  import type { ActivityDetailPayload } from "$lib/types/app";

  export let detail: ActivityDetailPayload | null = null;
  export let open = false;
  export let canShowOlder = false;
  export let canShowNewer = false;
  export let paceRangeMin: number | null = null;
  export let paceRangeMax: number | null = null;

  const dispatch = createEventDispatcher();

  function formatHr(value: number | null) {
    return Number.isFinite(Number(value))
      ? `${Math.round(Number(value))} bpm`
      : "n/a";
  }

  function formatMeters(value: number | null) {
    return Number.isFinite(Number(value))
      ? `${Math.round(Number(value))} m`
      : "n/a";
  }

  function formatTemp(value: number | null) {
    return Number.isFinite(Number(value))
      ? `${Number(value).toFixed(1)} C`
      : "n/a";
  }

  function formatLoad(value: number | null) {
    return Number.isFinite(Number(value))
      ? String(Math.round(Number(value)))
      : "n/a";
  }

  function baselineStatusClass(status: string | null | undefined) {
    const normalized = String(status || "").toLowerCase();
    if (
      normalized === "green" ||
      normalized === "yellow" ||
      normalized === "red"
    ) {
      return `status-${normalized}`;
    }
    return "status-gray";
  }
</script>

<aside
  class="drawer-overlay sticky-viewport-panel sticky-viewport-panel-flush"
  aria-hidden={!open}
  class:open
>
  <section class="activity-drawer" aria-labelledby="activity-detail-title">
    <div class="activity-drawer-header">
      <div class="activity-detail-summary">
        <p class="activity-detail-subtitle">
          {detail?.summary?.startDateTime
            ? formatDateTimeLabel(detail.summary.startDateTime)
            : detail?.summary?.date
              ? formatDateLabel(detail.summary.date)
              : "Selected activity"}
        </p>
        <h2 id="activity-detail-title" class="activity-detail-title">
          {detail?.summary?.name || "Activity Details"}
        </h2>
        {#if detail?.summary?.id}
          <a
            class="activity-detail-link"
            href={`https://intervals.icu/activities/${detail.summary.id}`}
            target="_blank"
            rel="noreferrer">Open on Intervals.icu</a
          >
        {/if}
      </div>
      <div class="row compact activity-drawer-nav">
        <button
          type="button"
          class="secondary-button"
          disabled={!canShowNewer}
          on:click={() => dispatch("shownewer")}
          aria-label="Show newer selected activity"
        >
          ←
        </button>
        <button
          type="button"
          class="secondary-button"
          disabled={!canShowOlder}
          on:click={() => dispatch("showolder")}
          aria-label="Show older selected activity"
        >
          →
        </button>
        <button
          type="button"
          class="secondary-button"
          on:click={() => dispatch("close")}>Close</button
        >
      </div>
    </div>

    {#if detail}
      <div class="activity-drawer-content">
        <section class="activity-detail-section">
          <h3>Summary</h3>
          <div class="activity-detail-grid">
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Date</div>
              <div class="activity-detail-metric-value">
                {formatDateLabel(detail.summary.date)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Distance</div>
              <div class="activity-detail-metric-value">
                {formatDistance(detail.summary.distanceKm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Time</div>
              <div class="activity-detail-metric-value">
                {formatDuration(detail.summary.movingTimeSec)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Pace</div>
              <div class="activity-detail-metric-value">
                {formatPace(detail.summary.paceMinKm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Avg HR</div>
              <div class="activity-detail-metric-value">
                {formatHr(detail.summary.avgHrBpm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Max HR</div>
              <div class="activity-detail-metric-value">
                {formatHr(detail.summary.maxHrBpm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Elevation Gain</div>
              <div class="activity-detail-metric-value">
                {formatMeters(detail.summary.elevationGainM)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Avg Temp</div>
              <div class="activity-detail-metric-value">
                {formatTemp(detail.summary.avgTempC)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Load</div>
              <div class="activity-detail-metric-value">
                {formatLoad(detail.summary.load)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Type</div>
              <div class="activity-detail-metric-value">
                {detail.summary.type || "n/a"}
              </div>
            </div>
          </div>
        </section>
        <section class="activity-detail-section">
          <div class="activity-detail-section-heading">
            <h3>Baseline Context</h3>
            <div
              class={`activity-detail-baseline-status ${baselineStatusClass(detail.baselineContext?.status)}`}
            >
              {detail.baselineContext?.status || "n/a"}
            </div>
          </div>
          <div class="activity-detail-grid">
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">7d Sum</div>
              <div class="activity-detail-metric-value">
                {formatDistance(detail.baselineContext?.sum7)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">90d Avg</div>
              <div class="activity-detail-metric-value">
                {formatDistance(detail.baselineContext?.sum7ma90)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Cap</div>
              <div class="activity-detail-metric-value">
                {formatDistance(detail.baselineContext?.capKm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Headroom</div>
              <div class="activity-detail-metric-value">
                {formatSignedDistance(detail.baselineContext?.headroomKm)}
              </div>
            </div>
            <div class="activity-detail-metric">
              <div class="activity-detail-metric-label">Delta</div>
              <div class="activity-detail-metric-value">
                {formatSignedDistance(detail.baselineContext?.deltaKm)}
              </div>
            </div>
          </div>
        </section>
        <section class="activity-detail-section">
          <h3>Streams</h3>
          <p class="activity-detail-stream-note">
            Pace, heart rate, cadence, and altitude over elapsed time.
          </p>
          <ActivityDetailStreamChart
            points={detail.detailStreamPoints ?? []}
            {paceRangeMin}
            {paceRangeMax}
          />
        </section>
        <section class="activity-detail-section">
          <h3>Intervals</h3>
          {#if detail.intervalPoints?.length}
            <div class="activity-detail-table-wrap">
              <table class="activity-detail-table">
                <thead>
                  <tr>
                    <th>Interval</th>
                    <th>Pace</th>
                    <th>Avg HR</th>
                    <th>Max HR</th>
                  </tr>
                </thead>
                <tbody>
                  {#each detail.intervalPoints as interval}
                    <tr>
                      <td
                        >{interval.label ||
                          interval.name ||
                          interval.intervalType ||
                          "Interval"}</td
                      >
                      <td>{formatPace(interval.paceMinKm)}</td>
                      <td>{formatHr(interval.avgHrBpm)}</td>
                      <td>{formatHr(interval.maxHrBpm)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="field-hint">No interval details.</p>
          {/if}
        </section>
        <section class="activity-detail-section">
          <h3>Kilometers</h3>
          {#if detail.splitKmPoints?.length}
            <div class="activity-detail-table-wrap">
              <table class="activity-detail-table">
                <thead>
                  <tr>
                    <th>KM</th>
                    <th>Pace</th>
                    <th>Avg HR</th>
                  </tr>
                </thead>
                <tbody>
                  {#each detail.splitKmPoints as split}
                    <tr>
                      <td>KM {split.splitKm ?? "n/a"}</td>
                      <td>{formatPace(split.paceMinKm)}</td>
                      <td>{formatHr(split.avgHrBpm)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <p class="field-hint">No split details.</p>
          {/if}
        </section>
      </div>
    {:else}
      <div class="activity-drawer-content">
        <p class="field-hint">Select an activity to view details.</p>
      </div>
    {/if}
  </section>
</aside>
