<script lang="ts">
  import {
    computeMonotonySummary,
    computeToleranceStatus,
    formatDistance,
    formatPercent,
    formatSignedDistance,
    monotonyInterpretationText,
  } from "$lib/domain/view";
  import type { RollingSeriesPoint } from "$lib/types/app";

  export let latest: RollingSeriesPoint | null = null;
  export let series: RollingSeriesPoint[] = [];

  let showMonotonyTooltip = false;

  $: status = computeToleranceStatus(
    latest
      ? {
          ...latest,
          sum7ma90: latest.sum7ma30,
        }
      : null,
  );
  $: baseline = Number(latest?.sum7ma30);
  $: current = Number(latest?.sum7);
  $: capBaseline30 = Number(latest?.sum7ma30);
  $: cap = Number.isFinite(capBaseline30) ? capBaseline30 * 1.1 : null;
  $: deltaPct =
    Number.isFinite(current) && Number.isFinite(baseline) && baseline > 0
      ? (current - baseline) / baseline
      : null;
  $: monotony = computeMonotonySummary(series);
  $: monotonyText = monotony ? monotonyInterpretationText(monotony) : "";
  $: monotonyColor =
    monotony?.status === "green"
      ? "#065f46"
      : monotony?.status === "yellow"
        ? "#92400e"
        : "#991b1b";
  $: monotonyMarkerColor =
    monotony?.status === "green"
      ? "#15803d"
      : monotony?.status === "yellow"
        ? "#d97706"
        : "#dc2626";
</script>

<section class="card tolerance-panel" hidden={!latest}>
  <div class="tolerance-header">
    <h2>Running Tolerance</h2>
    <span class={`tolerance-badge ${status.tone}`}>{status.badge}</span>
  </div>
  <p class={`tolerance-load-cap ${status.tone}`}>
    <strong>{formatDistance(current)} / {formatDistance(cap)}</strong>
  </p>
  <p class="tolerance-message">7d load vs 30d avg + 10% cap</p>
  <p class="tolerance-metrics">
    Delta vs baseline: {formatPercent(deltaPct)} · Headroom vs cap: {formatSignedDistance(
      Number.isFinite(cap) && Number.isFinite(current) ? cap - current : null,
    )}
  </p>
  <p class="tolerance-baseline-indicator">
    30d baseline: {formatDistance(baseline)} · +10% cap: {formatDistance(cap)}
  </p>
  {#if monotony}
    <div class="monotony-viz">
      <div class="monotony-title">
        <span>Monotony</span>
        <strong style={`color:${monotonyColor}`}
          >{monotony.displayValue} ({monotony.label})</strong
        >
      </div>
      <div
        class="monotony-track"
        aria-label={monotonyText}
        role="img"
        on:mouseenter={() => (showMonotonyTooltip = true)}
        on:mouseleave={() => (showMonotonyTooltip = false)}
      >
        <div class="monotony-zone zone-green"></div>
        <div class="monotony-zone zone-yellow"></div>
        <div class="monotony-zone zone-red"></div>
        <div
          class="monotony-marker"
          style={`left:${monotony.markerPct.toFixed(1)}%;background:${monotonyMarkerColor}`}
          role="button"
          tabindex="0"
          aria-label={monotonyText}
          on:focus={() => (showMonotonyTooltip = true)}
          on:blur={() => (showMonotonyTooltip = false)}
        ></div>
      </div>
      <div class="monotony-scale-labels" aria-hidden="true">
        <span>0</span>
        <span>1.5</span>
        <span>2.0</span>
        <span>3.0+</span>
      </div>
      {#if showMonotonyTooltip}
        <div
          class="monotony-tooltip"
          style={`left:${monotony.markerPct.toFixed(1)}%`}
        >
          {monotonyText}
        </div>
      {/if}
    </div>
  {/if}
</section>
