<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import EChart from "$lib/components/EChart.svelte";
  import { isoWeekStartKey } from "$lib/domain/shared";
  import { formatDateLabel } from "$lib/domain/view";
  import type { RollingSeriesPoint, RunSummary } from "$lib/types/app";

  export let series: RollingSeriesPoint[] = [];
  export let selectedDateKeys: string[] = [];
  export let visibleLines: string[] = [
    "weekly",
    "sum7",
    "sum7ma90",
    "toleranceKmModel",
  ];
  export let rampCap90Visible = true;
  export let rampCap30Visible = true;
  export let runs: RunSummary[] = [];

  const dispatch = createEventDispatcher();
  const rampCapLabel90 = "90+10%";
  const rampCapLabel30 = "30+10%";
  const weeklyLabel = "weekly";

  let hoveredDateIndex: number | null = null;
  const lineMeta = [
    { key: "sum7", label: "7 day sum", color: "#0ea5e9" },
    { key: "sum7ma30", label: "30d avg of 7d sum", color: "#1d4ed8" },
    { key: "sum7ma90", label: "90d avg of 7d sum", color: "#4338ca" },
    { key: "toleranceKmModel", label: "Tolerance km", color: "#0f766e" },
    { key: "sum14", label: "14 day sum", color: "#16a34a" },
    { key: "sum30", label: "30 day sum", color: "#f97316" },
    { key: "sum90", label: "90 day sum", color: "#8b5cf6" },
    { key: "sum180", label: "180 day sum", color: "#ef4444" },
  ];
  const rampCapColor = "#be185d";

  function formatTooltipKm(value: number | null) {
    return Number.isFinite(Number(value))
      ? `${Number(value).toFixed(2)} km`
      : "";
  }

  function runNamesForDate(dateKey: string): string[] {
    return runs
      .filter((run) => String(run?.date || "") === String(dateKey))
      .map((run) => String(run?.name || "").trim())
      .filter((name) => name.length > 0);
  }

  function formatDateWithWeekday(dateKey: string): string {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const weekdays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const weekday = weekdays[(date.getUTCDay() + 6) % 7];
    return `${dateKey} ${weekday}`;
  }

  function formatMonthTick(dateKey: string) {
    const [year, month] = String(dateKey || "").split("-");
    if (!year || !month) {
      return "";
    }
    return `${year}-${month}`;
  }

  function isMonthBoundary(index: number) {
    if (index <= 0) {
      return true;
    }
    const current = String(xDates[index] || "").slice(0, 7);
    const previous = String(xDates[index - 1] || "").slice(0, 7);
    return current !== previous;
  }

  $: xDates = series.map((point) => point.date);
  $: legendSelected = Object.fromEntries([
    [weeklyLabel, visibleLines.includes("weekly")],
    ...lineMeta.map((line) => [line.label, visibleLines.includes(line.key)]),
    [rampCapLabel90, rampCap90Visible],
    [rampCapLabel30, rampCap30Visible],
  ]);
  $: runBarData = xDates.map((date) => {
    const runsOnDate = runs.filter((run) => String(run.date) === String(date));
    const totalDistanceKm = runsOnDate.reduce((sum, run) => {
      const distance = Number(run.distanceKm);
      return sum + (Number.isFinite(distance) ? distance : 0);
    }, 0);
    const primaryRun = runsOnDate[0] ?? null;
    return {
      value: Number(totalDistanceKm.toFixed(3)),
      activityId: primaryRun ? String(primaryRun.id) : "",
      itemStyle: {
        color: selectedDateKeys.includes(String(date)) ? "#f97316" : "#8fb7ad",
        opacity: totalDistanceKm > 0 ? 0.45 : 0,
      },
    };
  });
  $: lineSeries = lineMeta.map((line) => ({
    name: line.label,
    type: "line",
    smooth: false,
    symbol: "none",
    color: line.color,
    lineStyle: { width: 2.5, color: line.color },
    itemStyle: { color: line.color },
    emphasis: { disabled: true },
    blur: { lineStyle: { opacity: 1 }, itemStyle: { opacity: 1 } },
    z: 3,
    tooltip: {
      valueFormatter: (value: number) => formatTooltipKm(value),
    },
    data: series.map((point) => {
      const value = Number(point?.[line.key]);
      return Number.isFinite(value) ? value : null;
    }),
  }));
  $: rampCapSeries = [
    {
      name: rampCapLabel30,
      type: "line",
      symbol: "none",
      color: "#ec4899",
      lineStyle: { color: "#ec4899", width: 1.5, type: "dashed" },
      itemStyle: { color: "#ec4899" },
      emphasis: { disabled: true },
      z: 2,
      tooltip: {
        valueFormatter: (value: number) => formatTooltipKm(value),
      },
      data: series.map((point) => {
        const baseline = Number(point?.sum7ma30);
        return Number.isFinite(baseline) ? baseline * 1.1 : null;
      }),
    },
    {
      name: rampCapLabel90,
      type: "line",
      symbol: "none",
      color: rampCapColor,
      lineStyle: { color: rampCapColor, width: 1.5, type: "dashed" },
      itemStyle: { color: rampCapColor },
      emphasis: { disabled: true },
      z: 2,
      tooltip: {
        valueFormatter: (value: number) => formatTooltipKm(value),
      },
      data: series.map((point) => {
        const baseline = Number(point?.sum7ma90);
        return Number.isFinite(baseline) ? baseline * 1.1 : null;
      }),
    },
  ];
  $: weeklySeries = (() => {
    const weekBuckets: Record<string, number[]> = {};
    for (let index = 0; index < series.length; index += 1) {
      const weekStart = isoWeekStartKey(series[index]?.date);
      if (!weekBuckets[weekStart]) {
        weekBuckets[weekStart] = [];
      }
      weekBuckets[weekStart].push(index);
    }

    return Object.values(weekBuckets).map((indices) => {
      const data = Array.from({ length: series.length }, () => null);
      for (const index of indices) {
        const value = Number(series[index]?.weekly);
        data[index] = Number.isFinite(value) ? value : null;
      }

      return {
        name: weeklyLabel,
        type: "line",
        smooth: false,
        symbol: "none",
        color: "#0f172a",
        lineStyle: { width: 2, color: "#0f172a", type: "dotted" },
        itemStyle: { color: "#0f172a" },
        emphasis: { disabled: true },
        blur: { lineStyle: { opacity: 1 }, itemStyle: { opacity: 1 } },
        z: 2.5,
        tooltip: {
          valueFormatter: (value: number) => formatTooltipKm(value),
        },
        data,
        connectNulls: false,
      };
    });
  })();
  $: selectionLines = selectedDateKeys.map((dateKey) => ({
    xAxis: dateKey,
    lineStyle: { color: "#f97316", width: 2 },
  }));

  $: hoverMarkLines = (() => {
    if (hoveredDateIndex === null) return [];
    const hoveredDate = xDates[hoveredDateIndex];
    if (!hoveredDate) return [];

    const lines = [
      {
        xAxis: hoveredDate,
        lineStyle: { color: "#bfd7d0", width: 1, type: "dashed" },
      },
    ];

    // Add second line 30 days back if chart shows more than 30 days
    if (xDates.length > 30 && hoveredDateIndex >= 30) {
      const thirtyDaysBackIndex = hoveredDateIndex - 30;
      const thirtyDaysBackDate = xDates[thirtyDaysBackIndex];
      if (thirtyDaysBackDate) {
        lines.push({
          xAxis: thirtyDaysBackDate,
          lineStyle: { color: "#a4cac3", width: 1, type: "dotted" },
        });
      }
    }

    return lines;
  })();
  $: hoverGuideSeries = hoverMarkLines.length
    ? hoverMarkLines.map((line, index) => ({
        name: `__hover_guide_${index}__`,
        type: "line",
        data: xDates.map(() => null),
        symbol: "none",
        smooth: false,
        lineStyle: { opacity: 0, width: 0 },
        itemStyle: { opacity: 0 },
        emphasis: { disabled: true },
        silent: true,
        z: 2,
        tooltip: { show: false },
        legendHoverLink: false,
        markLine: {
          silent: true,
          symbol: "none",
          z: 20 + index,
          data: [line],
        },
      }))
    : [];

  $: chartOption = {
    animation: false,
    grid: { left: 0, right: 0, top: 30, bottom: 100, containLabel: true },
    legend: {
      bottom: 0,
      selected: legendSelected,
      data: [
        weeklyLabel,
        ...lineMeta.map((line) => line.label),
        rampCapLabel30,
        rampCapLabel90,
      ],
      textStyle: {
        color: "#26413c",
      },
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: "#f9fcfb",
      borderColor: "#dbe8e4",
      borderWidth: 1,
      padding: [10, 12],
      textStyle: {
        color: "#26413c",
      },
      extraCssText:
        "border-radius: 10px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);",
      axisPointer: {
        type: "line",
        snap: true,
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const dateKey = params[0].axisValue;
        const dateWithWeekday = formatDateWithWeekday(dateKey);
        const lines = [`<strong>${dateWithWeekday}</strong>`];
        for (const param of params) {
          if (param.value !== null && param.value !== undefined) {
            lines.push(`${param.seriesName}: ${formatTooltipKm(param.value)}`);
          }
        }
        const runNames = runNamesForDate(String(dateKey));
        if (runNames.length) {
          lines.push("");
          lines.push(runNames.join("<br/>"));
        }
        return lines.join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: xDates,
      name: "Date",
      nameLocation: "middle",
      nameGap: 60,
      axisTick: {
        interval: (index: number) => isMonthBoundary(index),
      },
      axisLabel: {
        rotate: 90,
        interval: (index: number) => isMonthBoundary(index),
        formatter: (value: string) => formatMonthTick(value),
      },
    },
    yAxis: {
      type: "value",
      name: "Distance (km)",
      nameLocation: "end",
      nameGap: 10,
      nameRotate: 0,
      nameTextStyle: {
        padding: [0, 0, 0, 30],
      },
      min: 0,
    },
    series: [
      {
        name: "Daily Distance",
        type: "bar",
        barWidth: 6,
        silent: false,
        legendHoverLink: false,
        emphasis: { disabled: true },
        z: 1,
        tooltip: {
          valueFormatter: (value: number) => formatTooltipKm(value),
        },
        data: runBarData,
        markLine: selectionLines.length
          ? {
              silent: true,
              symbol: "none",
              z: 20,
              data: selectionLines,
            }
          : undefined,
      },
      ...lineSeries,
      ...weeklySeries,
      ...rampCapSeries,
      ...hoverGuideSeries,
    ],
  };

  function handleChartClick(event: CustomEvent) {
    const activityId = String(event.detail?.data?.activityId || "");
    if (activityId) {
      dispatch("openrun", { activityId });
    }
  }

  function handleLegendSelectChanged(event: CustomEvent) {
    const selected = event.detail?.selected ?? {};
    rampCap90Visible = selected[rampCapLabel90] !== false;
    rampCap30Visible = selected[rampCapLabel30] !== false;
    dispatch("legendchange", {
      visibleLines: [
        ...(selected[weeklyLabel] !== false ? ["weekly"] : []),
        ...lineMeta
          .filter((line) => selected[line.label] !== false)
          .map((line) => line.key),
      ],
      rampCap90Visible,
      rampCap30Visible,
    });
  }

  function handleAxisPointerUpdate(event: CustomEvent) {
    const params = event.detail;
    const axisInfo = Array.isArray(params?.axesInfo)
      ? params.axesInfo[0]
      : null;
    const dataIndex = Number(
      axisInfo?.dataIndex ?? params?.dataIndex ?? Number.NaN,
    );
    if (
      Number.isFinite(dataIndex) &&
      dataIndex >= 0 &&
      dataIndex < xDates.length
    ) {
      hoveredDateIndex = dataIndex;
      return;
    }

    const axisValue = axisInfo?.value ?? params?.axisValue ?? null;
    if (Number.isFinite(Number(axisValue))) {
      const axisIndex = Number(axisValue);
      if (axisIndex >= 0 && axisIndex < xDates.length) {
        hoveredDateIndex = axisIndex;
        return;
      }
    }

    const axisValueLabel =
      axisInfo?.valueLabel ??
      axisInfo?.axisValueLabel ??
      params?.axisValue ??
      null;
    if (axisValueLabel !== null && axisValueLabel !== undefined) {
      const matchedIndex = xDates.indexOf(String(axisValueLabel));
      hoveredDateIndex = matchedIndex >= 0 ? matchedIndex : null;
    }
  }

  function handleMouseOut() {
    hoveredDateIndex = null;
  }
</script>

<section class="card chart">
  <div class="chart-header">
    <h2>Rolling Sums</h2>
    <p>
      {series.length
        ? `${formatDateLabel(series[0]?.date)} to ${formatDateLabel(series[series.length - 1]?.date)}`
        : ""}
    </p>
  </div>

  {#if series.length}
    <EChart
      option={chartOption}
      height="360px"
      on:chartclick={handleChartClick}
      on:legendselectchanged={handleLegendSelectChanged}
      on:axispointerupdate={handleAxisPointerUpdate}
      on:mouseout={handleMouseOut}
    />
  {:else}
    <div class="chart-empty">No synced runs yet.</div>
  {/if}
</section>
