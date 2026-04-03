<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import DualHandleSlider from "$lib/components/DualHandleSlider.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { formatDateLabel, formatPace } from "$lib/domain/view";
  import {
    resolveNumericRange,
    sliderStepToValue,
    valueToSliderStep,
  } from "$lib/runtime/ranges";
  import type { HeatmapModel } from "$lib/types/app";

  const HEATMAP_COLOR_SLIDER_STEPS = 1000;
  const HEATMAP_COLOR_MIN_GAP_STEPS = 5;
  const HEATMAP_COLOR_MIN_SPAN = 1;

  export let model: HeatmapModel = {
    weekKeys: [],
    bins: [],
    cells: [],
  };
  export let binSeconds = 15;
  export let colorRangeMin: number | null = null;
  export let colorRangeMax: number | null = null;

  const dispatch = createEventDispatcher();
  let activeColorThumb: "min" | "max" = "max";

  function formatMonthTick(dateKey: string) {
    const [year, month] = String(dateKey || "").split("-");
    if (!year || !month) {
      return "";
    }
    return `${year}-${month}`;
  }

  function isWeekMonthBoundary(index: number) {
    if (index <= 0) {
      return true;
    }
    const current = String(model.weekKeys[index] || "").slice(0, 7);
    const previous = String(model.weekKeys[index - 1] || "").slice(0, 7);
    return current !== previous;
  }

  function formatCalendarWeek(dateKey: string | null) {
    if (!dateKey) {
      return "CW n/a";
    }
    const date = new Date(`${dateKey}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) {
      return "CW n/a";
    }
    const weekday = date.getUTCDay() || 7;
    const thursday = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 4 - weekday,
      ),
    );
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const week = Math.ceil(
      ((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );
    return `CW ${String(week).padStart(2, "0")}`;
  }

  function heatmapColor(
    avgHr: number | null,
    minHr: number | null,
    maxHr: number | null,
  ) {
    if (!Number.isFinite(avgHr)) {
      return "#edf2f0";
    }
    if (
      !Number.isFinite(minHr) ||
      !Number.isFinite(maxHr) ||
      Number(maxHr) <= Number(minHr)
    ) {
      return "hsl(2, 96%, 52%)";
    }
    const t = Math.max(
      0,
      Math.min(
        1,
        (Number(avgHr) - Number(minHr)) / (Number(maxHr) - Number(minHr)),
      ),
    );
    const emphasized = Math.pow(t, 0.72);
    const lightness = 84 - emphasized * 66;
    return `hsl(2, 96%, ${lightness.toFixed(1)}%)`;
  }

  function buildColorScaleGradient(
    minValue: number | null,
    maxValue: number | null,
    colorAtValue: (value: number) => string,
    steps = 8,
  ) {
    if (
      !Number.isFinite(minValue) ||
      !Number.isFinite(maxValue) ||
      Number(maxValue) <= Number(minValue)
    ) {
      return "linear-gradient(90deg, #fee2e2, #b91c1c)";
    }
    const stops: string[] = [];
    for (let index = 0; index < steps; index += 1) {
      const t = steps <= 1 ? 0 : index / (steps - 1);
      const value =
        Number(minValue) + t * (Number(maxValue) - Number(minValue));
      stops.push(`${colorAtValue(value)} ${(t * 100).toFixed(1)}%`);
    }
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }

  $: values = model.cells
    .map((cell) => cell.avgHrBpm)
    .filter((value) => Number.isFinite(value)) as number[];
  $: minHr = values.length ? Math.min(...values) : null;
  $: maxHr = values.length ? Math.max(...values) : null;
  $: resolvedColorRange =
    colorRangeMin === null &&
    colorRangeMax === null &&
    minHr !== null &&
    maxHr !== null
      ? { min: minHr, max: maxHr }
      : resolveNumericRange(
          { min: colorRangeMin, max: colorRangeMax },
          { min: minHr, max: maxHr },
          HEATMAP_COLOR_MIN_SPAN,
        );
  $: colorMinStep =
    Number.isFinite(resolvedColorRange.min) &&
    Number.isFinite(minHr) &&
    Number.isFinite(maxHr)
      ? valueToSliderStep(
          Number(resolvedColorRange.min),
          Number(minHr),
          Number(maxHr),
          HEATMAP_COLOR_SLIDER_STEPS,
        )
      : 0;
  $: colorMaxStep =
    Number.isFinite(resolvedColorRange.max) &&
    Number.isFinite(minHr) &&
    Number.isFinite(maxHr)
      ? valueToSliderStep(
          Number(resolvedColorRange.max),
          Number(minHr),
          Number(maxHr),
          HEATMAP_COLOR_SLIDER_STEPS,
        )
      : HEATMAP_COLOR_SLIDER_STEPS;
  $: colorFillStartPct = (colorMinStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;
  $: colorFillEndPct = (colorMaxStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;
  $: colorGradient = buildColorScaleGradient(minHr, maxHr, (value) =>
    heatmapColor(
      value,
      Number(resolvedColorRange.min),
      Number(resolvedColorRange.max),
    ),
  );

  $: heatmapPalette =
    resolvedColorRange.min !== null && resolvedColorRange.max !== null
      ? Array.from({ length: 8 }, (_, index) => {
          const t = index / 7;
          const value =
            Number(resolvedColorRange.min) +
            t *
              (Number(resolvedColorRange.max) - Number(resolvedColorRange.min));
          return heatmapColor(
            value,
            Number(resolvedColorRange.min),
            Number(resolvedColorRange.max),
          );
        })
      : ["#fee2e2", "#b91c1c"];
  $: chartOption = {
    animation: false,
    grid: { left: 102, right: 28, top: 24, bottom: 86 },
    tooltip: {
      position: "top",
      formatter: (params: { data?: { value?: unknown } }) => {
        const [xIndex, yIndex, hr] =
          (params?.data?.value as
            | [number, number, number | null]
            | undefined) ?? [];
        const weekKey = model.weekKeys[Number(xIndex)] ?? null;
        const bin = model.bins[Number(yIndex)];
        return [
          `<strong>${formatDateLabel(weekKey)}</strong>`,
          formatCalendarWeek(weekKey),
          `Pace: ${formatPace((Number(bin) * binSeconds) / 60)}`,
          `Avg HR: ${Number.isFinite(Number(hr)) ? `${Math.round(Number(hr))} bpm` : "n/a"}`,
        ].join("<br>");
      },
    },
    xAxis: {
      type: "category",
      inverse: false,
      name: "Week",
      nameLocation: "middle",
      nameGap: 62,
      data: model.weekKeys,
      splitArea: { show: true },
      axisLabel: {
        rotate: 35,
        interval: (index: number) => isWeekMonthBoundary(index),
        formatter: (value: string) => formatMonthTick(value),
      },
    },
    yAxis: {
      type: "category",
      inverse: true,
      name: "Pace (min/km)",
      nameLocation: "middle",
      nameGap: 72,
      data: model.bins.map((bin) =>
        formatPace((bin * binSeconds) / 60).replace(" /km", ""),
      ),
      splitArea: { show: true },
      axisLabel: { show: true, formatter: (value: string) => value },
    },
    visualMap: {
      show: false,
      type: "continuous",
      dimension: 2,
      min: Number.isFinite(resolvedColorRange.min)
        ? Number(resolvedColorRange.min)
        : 0,
      max: Number.isFinite(resolvedColorRange.max)
        ? Number(resolvedColorRange.max)
        : 1,
      inRange: {
        color: heatmapPalette,
      },
      outOfRange: {
        color: ["#edf2f0"],
      },
    },
    series: [
      {
        name: "Avg HR",
        type: "heatmap",
        label: {
          show: false,
        },
        data: model.cells.map((cell) => ({
          value: [
            model.weekKeys.findIndex((weekKey) => weekKey === cell.weekKey),
            model.bins.findIndex((bin) => bin === cell.bin),
            cell.avgHrBpm,
          ],
          itemStyle: {
            color: heatmapColor(
              cell.avgHrBpm,
              Number(resolvedColorRange.min),
              Number(resolvedColorRange.max),
            ),
          },
        })),
      },
    ],
  };

  function handleColorRangeInput(changed: "min" | "max", nextStep: number) {
    if (!Number.isFinite(minHr) || !Number.isFinite(maxHr)) {
      return;
    }

    let nextMinStep = changed === "min" ? nextStep : colorMinStep;
    let nextMaxStep = changed === "max" ? nextStep : colorMaxStep;
    nextMinStep = Math.max(
      0,
      Math.min(HEATMAP_COLOR_SLIDER_STEPS, Math.round(nextMinStep)),
    );
    nextMaxStep = Math.max(
      0,
      Math.min(HEATMAP_COLOR_SLIDER_STEPS, Math.round(nextMaxStep)),
    );

    if (
      changed === "min" &&
      nextMinStep > nextMaxStep - HEATMAP_COLOR_MIN_GAP_STEPS
    ) {
      nextMaxStep = Math.min(
        HEATMAP_COLOR_SLIDER_STEPS,
        nextMinStep + HEATMAP_COLOR_MIN_GAP_STEPS,
      );
    }
    if (
      changed === "max" &&
      nextMaxStep < nextMinStep + HEATMAP_COLOR_MIN_GAP_STEPS
    ) {
      nextMinStep = Math.max(0, nextMaxStep - HEATMAP_COLOR_MIN_GAP_STEPS);
    }

    dispatch("changecolorrange", {
      min: sliderStepToValue(
        nextMinStep,
        Number(minHr),
        Number(maxHr),
        HEATMAP_COLOR_SLIDER_STEPS,
      ),
      max: sliderStepToValue(
        nextMaxStep,
        Number(minHr),
        Number(maxHr),
        HEATMAP_COLOR_SLIDER_STEPS,
      ),
    });
  }
</script>

<section class="card chart">
  <div class="chart-header">
    <h2>Pace-Bin HR Heatmap</h2>
    <p>
      {model.weekKeys.length ? `${model.weekKeys.length} weeks` : "No data"}
    </p>
  </div>
  {#if resolvedColorRange.min !== null && resolvedColorRange.max !== null}
    <div class="scrub-row">
      <label for="hr-color-saturation">HR color saturation</label>
      <DualHandleSlider
        startId="hr-color-saturation"
        min={0}
        max={HEATMAP_COLOR_SLIDER_STEPS}
        step={1}
        startValue={colorMinStep}
        endValue={colorMaxStep}
        startPct={colorFillStartPct}
        endPct={colorFillEndPct}
        startLabel={`${Number(resolvedColorRange.min).toFixed(0)} bpm`}
        endLabel={`${Number(resolvedColorRange.max).toFixed(0)} bpm`}
        activeHandle={activeColorThumb === "min" ? "start" : "end"}
        heightPx={44}
        trackHeightPx={11}
        fillHeightPx={11}
        baseBackground={colorGradient}
        baseBorder="1px solid rgba(13, 32, 28, 0.12)"
        fillBackground="transparent"
        fillBorder="2px solid rgba(15, 23, 42, 0.42)"
        on:pointerdownhandle={(event) =>
          (activeColorThumb = event.detail.handle === "start" ? "min" : "max")}
        on:inputhandle={(event) =>
          handleColorRangeInput(
            event.detail.handle === "start" ? "min" : "max",
            event.detail.value,
          )}
      />
    </div>
  {/if}

  {#if model.weekKeys.length && model.bins.length}
    <EChart option={chartOption} height="420px" />
  {:else}
    <div class="chart-empty">No heatmap data for the selected range.</div>
  {/if}
</section>
