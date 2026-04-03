<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import DualHandleSlider from "$lib/components/DualHandleSlider.svelte";
  import EChart from "$lib/components/EChart.svelte";
  import {
    formatDateLabel,
    formatPace,
    linearRegression,
    pearsonCorrelation,
  } from "$lib/domain/view";
  import {
    computeFiniteBounds,
    resolveNumericRange,
    sliderStepToValue,
    valueToSliderStep,
  } from "$lib/runtime/ranges";
  import type { PaceHrPoint } from "$lib/types/app";

  const PACE_RANGE_SLIDER_STEPS = 1000;
  const PACE_RANGE_MIN_GAP_STEPS = 5;
  const PACE_RANGE_MIN_SPAN = 0.05;
  const COLOR_RANGE_SLIDER_STEPS = 1000;
  const COLOR_RANGE_MIN_GAP_STEPS = 5;

  export let points: PaceHrPoint[] = [];
  export let selectedOnlyEnabled = false;
  export let comparableEnabled = false;
  export let strictness = "normal";
  export let comparableSummary = "";
  export let selectedIds: string[] = [];
  export let paceRangeMin: number | null = null;
  export let paceRangeMax: number | null = null;
  export let colorRangeMin: number | null = null;
  export let colorRangeMax: number | null = null;

  const dispatch = createEventDispatcher();
  let activePaceThumb: "slow" | "fast" = "fast";
  let activeColorThumb: "min" | "max" = "max";

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
      return "linear-gradient(90deg, #dbeafe, #1d4ed8)";
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

  function formatRangeDate(timestamp: number | null) {
    if (!Number.isFinite(timestamp)) {
      return "n/a";
    }
    return formatDateLabel(
      new Date(Number(timestamp)).toISOString().slice(0, 10),
    );
  }

  function pointColor(
    ts: number | null,
    minTs: number | null,
    maxTs: number | null,
  ) {
    if (
      !Number.isFinite(ts) ||
      !Number.isFinite(minTs) ||
      !Number.isFinite(maxTs) ||
      Number(maxTs) <= Number(minTs)
    ) {
      return "hsl(210, 86%, 62%)";
    }
    const t = Math.max(
      0,
      Math.min(
        1,
        (Number(ts) - Number(minTs)) / (Number(maxTs) - Number(minTs)),
      ),
    );
    const lightness = 84 - t * 48;
    return `hsl(210, 86%, ${lightness.toFixed(1)}%)`;
  }

  $: usableAll = points.filter((point) => {
    const pace = Number(point?.paceMinKm);
    const hr = Number(point?.avgHrBpm);
    return Number.isFinite(pace) && pace > 0 && Number.isFinite(hr) && hr > 0;
  });
  $: paceBounds = computeFiniteBounds(
    usableAll.map((point) => Number(point.paceMinKm)),
    0.3,
  );
  $: paceBoundMin = paceBounds.min;
  $: paceBoundMax = paceBounds.max;
  $: resolvedPaceRange =
    paceRangeMin === null &&
    paceRangeMax === null &&
    paceBoundMin !== null &&
    paceBoundMax !== null
      ? { min: paceBoundMin, max: paceBoundMax }
      : resolveNumericRange(
          { min: paceRangeMin, max: paceRangeMax },
          paceBounds,
          PACE_RANGE_MIN_SPAN,
        );
  $: usable = usableAll.filter((point) => {
    const pace = Number(point.paceMinKm);
    return (
      pace >= Number(resolvedPaceRange.min) &&
      pace <= Number(resolvedPaceRange.max)
    );
  });
  $: regression = linearRegression(usable);
  $: correlation = pearsonCorrelation(usable);
  $: datedPoints = usableAll.map((point) => {
    const ts = Date.parse(`${point.date}T00:00:00Z`);
    return { point, ts: Number.isFinite(ts) ? ts : null };
  });
  $: finiteTimestamps = datedPoints
    .map((entry) => entry.ts)
    .filter((value) => Number.isFinite(value)) as number[];
  $: colorBoundMin = finiteTimestamps.length
    ? Math.min(...finiteTimestamps)
    : null;
  $: colorBoundMax = finiteTimestamps.length
    ? Math.max(...finiteTimestamps)
    : null;
  $: resolvedColorRange =
    colorRangeMin === null &&
    colorRangeMax === null &&
    colorBoundMin !== null &&
    colorBoundMax !== null
      ? { min: colorBoundMin, max: colorBoundMax }
      : resolveNumericRange(
          { min: colorRangeMin, max: colorRangeMax },
          { min: colorBoundMin, max: colorBoundMax },
          Math.max(
            60 * 1000,
            ((Number(colorBoundMax) || 0) - (Number(colorBoundMin) || 0)) /
              COLOR_RANGE_SLIDER_STEPS,
          ),
        );

  $: slowPaceStep =
    Number.isFinite(resolvedPaceRange.max) &&
    Number.isFinite(paceBoundMin) &&
    Number.isFinite(paceBoundMax)
      ? valueToSliderStep(
          Number(resolvedPaceRange.max),
          Number(paceBoundMin),
          Number(paceBoundMax),
          PACE_RANGE_SLIDER_STEPS,
          true,
        )
      : 0;
  $: fastPaceStep =
    Number.isFinite(resolvedPaceRange.min) &&
    Number.isFinite(paceBoundMin) &&
    Number.isFinite(paceBoundMax)
      ? valueToSliderStep(
          Number(resolvedPaceRange.min),
          Number(paceBoundMin),
          Number(paceBoundMax),
          PACE_RANGE_SLIDER_STEPS,
          true,
        )
      : PACE_RANGE_SLIDER_STEPS;
  $: paceFillStartPct = (slowPaceStep / PACE_RANGE_SLIDER_STEPS) * 100;
  $: paceFillEndPct = (fastPaceStep / PACE_RANGE_SLIDER_STEPS) * 100;
  $: colorMinStep =
    Number.isFinite(resolvedColorRange.min) &&
    Number.isFinite(colorBoundMin) &&
    Number.isFinite(colorBoundMax)
      ? valueToSliderStep(
          Number(resolvedColorRange.min),
          Number(colorBoundMin),
          Number(colorBoundMax),
          COLOR_RANGE_SLIDER_STEPS,
        )
      : 0;
  $: colorMaxStep =
    Number.isFinite(resolvedColorRange.max) &&
    Number.isFinite(colorBoundMin) &&
    Number.isFinite(colorBoundMax)
      ? valueToSliderStep(
          Number(resolvedColorRange.max),
          Number(colorBoundMin),
          Number(colorBoundMax),
          COLOR_RANGE_SLIDER_STEPS,
        )
      : COLOR_RANGE_SLIDER_STEPS;
  $: colorFillStartPct = (colorMinStep / COLOR_RANGE_SLIDER_STEPS) * 100;
  $: colorFillEndPct = (colorMaxStep / COLOR_RANGE_SLIDER_STEPS) * 100;
  $: colorGradient = buildColorScaleGradient(
    colorBoundMin,
    colorBoundMax,
    (value) =>
      pointColor(
        value,
        Number(resolvedColorRange.min),
        Number(resolvedColorRange.max),
      ),
  );

  $: chartOption = {
    animation: false,
    grid: { left: 72, right: 28, top: 28, bottom: 76 },
    tooltip: {
      trigger: "item",
      enterable: false,
      confine: true,
      formatter: (params: {
        data?: {
          value?: unknown;
          name?: string;
          activityName?: string | null;
          activityId?: string;
          date?: string | null;
        };
        seriesName?: string;
      }) => {
        const data = params?.data ?? {};
        if (!Array.isArray(data?.value)) {
          return params?.seriesName ?? "";
        }
        const [pace, hr] = data.value;
        const title =
          data.name || data.activityName || data.activityId || "Run";
        return [
          `<strong>${title}</strong>`,
          formatDateLabel(data.date ?? null),
          `Pace: ${formatPace(Number(pace))}`,
          `HR: ${Math.round(Number(hr))} bpm`,
        ].join("<br>");
      },
    },
    xAxis: {
      type: "value",
      inverse: true,
      min: Number.isFinite(resolvedPaceRange.min)
        ? Number(resolvedPaceRange.min)
        : undefined,
      max: Number.isFinite(resolvedPaceRange.max)
        ? Number(resolvedPaceRange.max)
        : undefined,
      name: "Pace (min/km)",
      nameLocation: "middle",
      nameGap: 38,
      axisLabel: {
        formatter: (value: number) =>
          formatPace(Number(value)).replace(" /km", ""),
      },
    },
    yAxis: {
      type: "value",
      name: "Heart Rate (bpm)",
      nameLocation: "middle",
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => `${Math.round(Number(value))}`,
      },
    },
    series: [
      {
        name: "Runs",
        type: "scatter",
        cursor: "pointer",
        emphasis: { disabled: true, scale: false },
        data: datedPoints
          .map(({ point, ts }) => ({
            name: point.activityName || point.activityId || "Run",
            value: [Number(point.paceMinKm), Number(point.avgHrBpm)],
            activityId: String(point.activityId ?? ""),
            date: point.date ?? null,
            activityName: point.activityName ?? null,
            symbolSize: selectedIds.includes(String(point.activityId ?? ""))
              ? 12
              : 9,
            itemStyle: {
              color: pointColor(
                ts,
                Number(resolvedColorRange.min),
                Number(resolvedColorRange.max),
              ),
              borderColor: selectedIds.includes(String(point.activityId ?? ""))
                ? "#f97316"
                : "rgba(15,23,42,0.2)",
              borderWidth: selectedIds.includes(String(point.activityId ?? ""))
                ? 2
                : 1,
            },
          }))
          .filter((entry) => {
            const pace = Number(entry?.value?.[0]);
            return (
              Number.isFinite(pace) &&
              pace >= Number(resolvedPaceRange.min) &&
              pace <= Number(resolvedPaceRange.max)
            );
          }),
      },
      ...(regression
        ? [
            {
              name: "Trend",
              type: "line",
              symbol: "none",
              silent: true,
              emphasis: { disabled: true },
              lineStyle: {
                color: "#0f172a",
                width: 2,
              },
              data: [
                [
                  Math.min(...usable.map((point) => Number(point.paceMinKm))),
                  regression.slope *
                    Math.min(
                      ...usable.map((point) => Number(point.paceMinKm)),
                    ) +
                    regression.intercept,
                ],
                [
                  Math.max(...usable.map((point) => Number(point.paceMinKm))),
                  regression.slope *
                    Math.max(
                      ...usable.map((point) => Number(point.paceMinKm)),
                    ) +
                    regression.intercept,
                ],
              ],
            },
          ]
        : []),
    ],
  };

  function handlePaceRangeInput(changed: "slow" | "fast", nextStep: number) {
    if (!Number.isFinite(paceBoundMin) || !Number.isFinite(paceBoundMax)) {
      return;
    }

    let slowStep = changed === "slow" ? nextStep : slowPaceStep;
    let fastStep = changed === "fast" ? nextStep : fastPaceStep;
    slowStep = Math.max(
      0,
      Math.min(PACE_RANGE_SLIDER_STEPS, Math.round(slowStep)),
    );
    fastStep = Math.max(
      0,
      Math.min(PACE_RANGE_SLIDER_STEPS, Math.round(fastStep)),
    );

    if (changed === "slow" && slowStep > fastStep - PACE_RANGE_MIN_GAP_STEPS) {
      fastStep = Math.min(
        PACE_RANGE_SLIDER_STEPS,
        slowStep + PACE_RANGE_MIN_GAP_STEPS,
      );
    }
    if (changed === "fast" && fastStep < slowStep + PACE_RANGE_MIN_GAP_STEPS) {
      slowStep = Math.max(0, fastStep - PACE_RANGE_MIN_GAP_STEPS);
    }

    dispatch("changepacerange", {
      min: sliderStepToValue(
        fastStep,
        Number(paceBoundMin),
        Number(paceBoundMax),
        PACE_RANGE_SLIDER_STEPS,
        true,
      ),
      max: sliderStepToValue(
        slowStep,
        Number(paceBoundMin),
        Number(paceBoundMax),
        PACE_RANGE_SLIDER_STEPS,
        true,
      ),
    });
  }

  function handleColorRangeInput(changed: "min" | "max", nextStep: number) {
    if (!Number.isFinite(colorBoundMin) || !Number.isFinite(colorBoundMax)) {
      return;
    }

    let nextMinStep = changed === "min" ? nextStep : colorMinStep;
    let nextMaxStep = changed === "max" ? nextStep : colorMaxStep;
    nextMinStep = Math.max(
      0,
      Math.min(COLOR_RANGE_SLIDER_STEPS, Math.round(nextMinStep)),
    );
    nextMaxStep = Math.max(
      0,
      Math.min(COLOR_RANGE_SLIDER_STEPS, Math.round(nextMaxStep)),
    );

    if (
      changed === "min" &&
      nextMinStep > nextMaxStep - COLOR_RANGE_MIN_GAP_STEPS
    ) {
      nextMaxStep = Math.min(
        COLOR_RANGE_SLIDER_STEPS,
        nextMinStep + COLOR_RANGE_MIN_GAP_STEPS,
      );
    }
    if (
      changed === "max" &&
      nextMaxStep < nextMinStep + COLOR_RANGE_MIN_GAP_STEPS
    ) {
      nextMinStep = Math.max(0, nextMaxStep - COLOR_RANGE_MIN_GAP_STEPS);
    }

    dispatch("changecolorrange", {
      min: sliderStepToValue(
        nextMinStep,
        Number(colorBoundMin),
        Number(colorBoundMax),
        COLOR_RANGE_SLIDER_STEPS,
      ),
      max: sliderStepToValue(
        nextMaxStep,
        Number(colorBoundMin),
        Number(colorBoundMax),
        COLOR_RANGE_SLIDER_STEPS,
      ),
    });
  }

  function handleChartClick(event: CustomEvent) {
    const activityId = String(event.detail?.data?.activityId || "");
    if (activityId) {
      dispatch("openactivity", { activityId });
    }
  }
</script>

<section class="card chart">
  <div class="chart-header">
    <h2>Heart Rate vs Pace</h2>
    <p>
      {#if usableAll.length}
        {usable.length === usableAll.length
          ? `${usable.length} points`
          : `${usable.length}/${usableAll.length} points`}
        · Correlation {correlation !== null ? correlation.toFixed(2) : "n/a"}
      {:else}
        No points in range
      {/if}
    </p>
  </div>
  <p class="chart-subsummary">
    Same pace (x), lower HR (y) is better. Darker blue means earlier/lower date
    at the same x-position.
  </p>

  <div class="row compact comparable-controls">
    {#if selectedIds.length}
      <label class="checkbox-inline">
        <input
          type="checkbox"
          checked={selectedOnlyEnabled}
          on:change={(event) =>
            dispatch("toggleselectedonly", {
              value: (event.currentTarget as HTMLInputElement).checked,
            })}
        />
        Only show selected activities
      </label>
      <label class="checkbox-inline">
        <input
          type="checkbox"
          checked={comparableEnabled}
          on:change={(event) =>
            dispatch("togglecomparable", {
              value: (event.currentTarget as HTMLInputElement).checked,
            })}
        />
        Only show comparable activities
      </label>
      <label for="strictness" class="mini-label">Strictness</label>
      <select
        id="strictness"
        value={strictness}
        disabled={!comparableEnabled}
        on:change={(event) =>
          dispatch("changestrictness", {
            value: (event.currentTarget as HTMLSelectElement).value,
          })}
      >
        <option value="loose">Loose</option>
        <option value="normal">Normal</option>
        <option value="strict">Strict</option>
      </select>
      {#if comparableEnabled || selectedOnlyEnabled}
        <button
          type="button"
          class="secondary-button"
          on:click={() => dispatch("resetcomparable")}
          >Show all activities</button
        >
      {/if}
    {/if}
  </div>
  <p class="chart-subsummary">{comparableSummary}</p>

  {#if usableAll.length > 1 && resolvedPaceRange.min !== null && resolvedPaceRange.max !== null}
    <div class="chart-control-stack">
      <div class="scrub-row">
        <label for="pace-range-slow">Pace range</label>
        <DualHandleSlider
          startId="pace-range-slow"
          endId="pace-range-fast"
          min={0}
          max={PACE_RANGE_SLIDER_STEPS}
          step={1}
          startValue={slowPaceStep}
          endValue={fastPaceStep}
          startPct={paceFillStartPct}
          endPct={paceFillEndPct}
          startLabel={formatPace(Number(resolvedPaceRange.max))}
          endLabel={formatPace(Number(resolvedPaceRange.min))}
          activeHandle={activePaceThumb === "slow" ? "start" : "end"}
          on:pointerdownhandle={(event) =>
            (activePaceThumb =
              event.detail.handle === "start" ? "slow" : "fast")}
          on:inputhandle={(event) =>
            handlePaceRangeInput(
              event.detail.handle === "start" ? "slow" : "fast",
              event.detail.value,
            )}
        />
      </div>

      {#if resolvedColorRange.min !== null && resolvedColorRange.max !== null}
        <div class="scrub-row">
          <label for="date-color-saturation">Date color saturation</label>
          <DualHandleSlider
            startId="date-color-saturation"
            min={0}
            max={COLOR_RANGE_SLIDER_STEPS}
            step={1}
            startValue={colorMinStep}
            endValue={colorMaxStep}
            startPct={colorFillStartPct}
            endPct={colorFillEndPct}
            startLabel={formatRangeDate(Number(resolvedColorRange.min))}
            endLabel={formatRangeDate(Number(resolvedColorRange.max))}
            activeHandle={activeColorThumb === "min" ? "start" : "end"}
            heightPx={44}
            trackHeightPx={11}
            fillHeightPx={11}
            baseBackground={colorGradient}
            baseBorder="1px solid rgba(13, 32, 28, 0.12)"
            fillBackground="transparent"
            fillBorder="2px solid rgba(15, 23, 42, 0.42)"
            on:pointerdownhandle={(event) =>
              (activeColorThumb =
                event.detail.handle === "start" ? "min" : "max")}
            on:inputhandle={(event) =>
              handleColorRangeInput(
                event.detail.handle === "start" ? "min" : "max",
                event.detail.value,
              )}
          />
        </div>
      {/if}
    </div>
  {/if}

  {#if usable.length > 1}
    <EChart
      option={chartOption}
      height="360px"
      on:chartclick={handleChartClick}
    />
  {:else if usableAll.length > 1}
    <div class="chart-empty">
      No points in current pace range. Widen the Pace range slider.
    </div>
  {:else}
    <div class="chart-empty">No pace/HR points for the selected view.</div>
  {/if}
</section>
