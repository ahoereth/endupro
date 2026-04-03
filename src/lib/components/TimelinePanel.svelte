<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { formatDateLabel } from "$lib/domain/view";
  import DualHandleSlider from "$lib/components/DualHandleSlider.svelte";
  import type { RollingSeriesPoint } from "$lib/types/app";

  export let series: RollingSeriesPoint[] = [];
  export let startIndex: number | null = null;
  export let endIndex: number | null = null;
  export let activityCount = 0;
  export let hasRunsInRange = true;

  const dispatch = createEventDispatcher();

  $: hasSeries = series.length > 0;
  $: startDate =
    hasSeries && startIndex !== null ? series[startIndex]?.date : null;
  $: endDate = hasSeries && endIndex !== null ? series[endIndex]?.date : null;
  $: maxIndex = hasSeries ? series.length - 1 : 0;
  $: startPct =
    hasSeries && startIndex !== null && maxIndex > 0
      ? (startIndex / maxIndex) * 100
      : 0;
  $: endPct =
    hasSeries && endIndex !== null && maxIndex > 0
      ? (endIndex / maxIndex) * 100
      : 100;
  $: activePreset = resolveActivePreset(startIndex, endIndex, maxIndex);

  function resolveActivePreset(
    start: number | null,
    end: number | null,
    max: number,
  ) {
    if (!hasSeries || start === null || end === null || end !== max) {
      return null;
    }
    if (start === 0) {
      return "all";
    }
    const presets = [
      { days: 30, value: "30" },
      { days: 90, value: "90" },
      { days: 180, value: "180" },
      { days: 365, value: "365" },
    ] as const;
    for (const preset of presets) {
      if (start === Math.max(0, max - preset.days + 1)) {
        return preset.value;
      }
    }
    return null;
  }
</script>

<section class="card timeline-card">
  <div class="chart-header">
    <h2>Timeline</h2>
    <p>
      {activityCount
        ? `${activityCount} ${activityCount === 1 ? "activity" : "activities"} in selected period`
        : ""}
    </p>
  </div>
  <div class="timeline-presets">
    <button
      type="button"
      class="timeline-preset-button"
      class:is-active={activePreset === "30"}
      on:click={() => dispatch("preset", { days: 30 })}>Last 30 days</button
    >
    <button
      type="button"
      class="timeline-preset-button"
      class:is-active={activePreset === "90"}
      on:click={() => dispatch("preset", { days: 90 })}>Last 90 days</button
    >
    <button
      type="button"
      class="timeline-preset-button"
      class:is-active={activePreset === "180"}
      on:click={() => dispatch("preset", { days: 180 })}>Last 180 days</button
    >
    <button
      type="button"
      class="timeline-preset-button"
      class:is-active={activePreset === "365"}
      on:click={() => dispatch("preset", { days: 365 })}>Last year</button
    >
    <button
      type="button"
      class="timeline-preset-button"
      class:is-active={activePreset === "all"}
      on:click={() => dispatch("preset", { days: "all" })}>All</button
    >
  </div>

  {#if hasSeries && startIndex !== null && endIndex !== null}
    <div class="scrub-row">
      <label for="timeline-start">Timeline range</label>
      <DualHandleSlider
        startId="timeline-start"
        endId="timeline-end"
        min={0}
        max={series.length - 1}
        step={1}
        startValue={startIndex}
        endValue={endIndex}
        {startPct}
        {endPct}
        startLabel={formatDateLabel(startDate)}
        endLabel={formatDateLabel(endDate)}
        trackInsetPx={8}
        on:inputhandle={(event) =>
          dispatch("change", {
            which: event.detail.handle === "start" ? "start" : "end",
            value: event.detail.value,
          })}
      />
    </div>
  {/if}

  {#if hasSeries && !hasRunsInRange}
    <p class="timeline-range-warning">
      No activities in selected timeline range.
    </p>
  {/if}
</section>
