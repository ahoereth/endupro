<script lang="ts">
  import { formatDuration, formatPace } from "$lib/domain/view";
  import type { ActivityDetailStreamPoint } from "$lib/types/app";

  type StreamChartPoint = ActivityDetailStreamPoint & {
    pacePlotMinKm: number | null;
  };

  export let points: ActivityDetailStreamPoint[] = [];
  export let paceRangeMin: number | null = null;
  export let paceRangeMax: number | null = null;

  let wrapperEl: HTMLDivElement | null = null;
  let hoverPointIndex: number | null = null;
  let hoverX = 0;
  let hoverCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right" =
    "top-right";

  function formatCadence(value: number | null) {
    return Number.isFinite(value) ? `${Math.round(value)} spm` : "n/a";
  }

  function formatAltitude(value: number | null) {
    return Number.isFinite(value) ? `${Math.round(value)} m` : "n/a";
  }

  function formatHr(value: number | null) {
    return Number.isFinite(value) ? `${Math.round(value)} bpm` : "n/a";
  }

  function smoothPace(points: ActivityDetailStreamPoint[]): StreamChartPoint[] {
    const next = points.map((point) => ({
      ...point,
      pacePlotMinKm:
        point?.paceMinKm === null || point?.paceMinKm === undefined
          ? null
          : Number.isFinite(Number(point?.paceMinKm))
            ? Number(point.paceMinKm)
            : null,
    }));

    for (let i = 1; i < next.length; i += 1) {
      const prev = next[i - 1];
      const cur = next[i];
      const prevElapsed = Number(prev?.elapsedSec);
      const curElapsed = Number(cur?.elapsedSec);
      const prevDistance = Number(prev?.distanceKm);
      const curDistance = Number(cur?.distanceKm);
      const dt = curElapsed - prevElapsed;
      const ddKm = curDistance - prevDistance;
      if (
        !Number.isFinite(dt) ||
        !Number.isFinite(ddKm) ||
        dt <= 0 ||
        ddKm <= 0.001
      ) {
        continue;
      }
      const derivedPace = dt / 60 / ddKm;
      if (
        Number.isFinite(derivedPace) &&
        derivedPace >= 2 &&
        derivedPace <= 30
      ) {
        next[i].pacePlotMinKm = derivedPace;
      }
    }

    return next;
  }

  $: chartPoints = smoothPace(points);
  $: seriesMeta = [
    {
      key: "pacePlotMinKm",
      label: "Pace",
      color: "#0f766e",
      format: formatPace,
      invert: true,
    },
    {
      key: "hrBpm",
      label: "HR",
      color: "#dc2626",
      format: formatHr,
      invert: false,
    },
    {
      key: "cadenceSpm",
      label: "Cadence",
      color: "#7c3aed",
      format: formatCadence,
      invert: false,
    },
    {
      key: "altitudeM",
      label: "Altitude",
      color: "#2563eb",
      format: formatAltitude,
      invert: false,
    },
  ];
  $: availableSeries = seriesMeta
    .map((meta) => ({
      ...meta,
      values: chartPoints
        .map((point) => {
          const value = Number(point?.[meta.key]);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value) => Number.isFinite(value)),
    }))
    .filter((meta) => meta.values.length);

  const width = 640;
  const margin = { top: 12, right: 14, bottom: 42, left: 34 };
  const panelHeight = 74;
  const panelGap = 16;

  $: innerWidth = width - margin.left - margin.right;
  $: height =
    margin.top +
    margin.bottom +
    availableSeries.length * panelHeight +
    Math.max(0, availableSeries.length - 1) * panelGap;
  $: maxElapsed = Math.max(
    1,
    ...chartPoints
      .map((point) => Number(point?.elapsedSec))
      .filter((value) => Number.isFinite(value)),
  );
  $: xScale = (elapsedSec: number) =>
    margin.left + (innerWidth * elapsedSec) / Math.max(1, maxElapsed);

  function buildYScale(
    values: number[],
    top: number,
    invert: boolean,
    domainOverride?: { min: number | null; max: number | null },
  ) {
    const min =
      Number.isFinite(Number(domainOverride?.min)) &&
      Number.isFinite(Number(domainOverride?.max)) &&
      Number(domainOverride.max) > Number(domainOverride.min)
        ? Number(domainOverride.min)
        : Math.min(...values);
    const max =
      Number.isFinite(Number(domainOverride?.min)) &&
      Number.isFinite(Number(domainOverride?.max)) &&
      Number(domainOverride.max) > Number(domainOverride.min)
        ? Number(domainOverride.max)
        : Math.max(...values);
    const span = Math.max(max - min, invert ? 0.2 : 1);
    const pad = span * 0.1;
    const useOverride =
      Number.isFinite(Number(domainOverride?.min)) &&
      Number.isFinite(Number(domainOverride?.max)) &&
      Number(domainOverride.max) > Number(domainOverride.min);
    const domainMin = invert
      ? useOverride
        ? max
        : max + pad
      : useOverride
        ? min
        : min - pad;
    const domainMax = invert
      ? useOverride
        ? Math.max(0.1, min)
        : Math.max(0.1, min - pad)
      : useOverride
        ? max
        : max + pad;
    return (value: number) => {
      const denom = domainMax - domainMin || 0.0001;
      const t = (value - domainMin) / denom;
      return top + panelHeight - t * panelHeight;
    };
  }

  function buildLinePath(key: string, yScale: (value: number) => number) {
    let path = "";
    let drawing = false;
    for (const point of chartPoints) {
      const rawValue = Number(point?.[key]);
      if (!Number.isFinite(rawValue)) {
        drawing = false;
        continue;
      }
      path += `${drawing ? "L" : "M"}${xScale(Number(point.elapsedSec)).toFixed(2)},${yScale(rawValue).toFixed(2)} `;
      drawing = true;
    }
    return path.trim();
  }

  function findNearestPointIndex(targetElapsedSec: number) {
    if (!chartPoints.length) {
      return null;
    }
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < chartPoints.length; index += 1) {
      const elapsedSec = Number(chartPoints[index]?.elapsedSec);
      if (!Number.isFinite(elapsedSec)) {
        continue;
      }
      const distance = Math.abs(elapsedSec - targetElapsedSec);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }
    return bestIndex;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!wrapperEl || !chartPoints.length) {
      hoverPointIndex = null;
      return;
    }
    const rect = wrapperEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      hoverPointIndex = null;
      return;
    }
    const localX = ((event.clientX - rect.left) / rect.width) * width;
    const localY = ((event.clientY - rect.top) / rect.height) * height;
    if (
      localX < margin.left ||
      localX > width - margin.right ||
      localY < margin.top ||
      localY > height - margin.bottom
    ) {
      hoverPointIndex = null;
      return;
    }
    const clampedX = Math.max(
      margin.left,
      Math.min(width - margin.right, localX),
    );
    const targetElapsedSec =
      ((clampedX - margin.left) / Math.max(1, innerWidth)) * maxElapsed;
    const nearestIndex = findNearestPointIndex(targetElapsedSec);
    if (nearestIndex === null) {
      hoverPointIndex = null;
      return;
    }
    hoverPointIndex = nearestIndex;
    hoverX = xScale(Number(chartPoints[nearestIndex]?.elapsedSec || 0));
    const pointerOnLeft = localX < width / 2;
    const pointerOnTop = localY < height / 2;
    hoverCorner = pointerOnLeft
      ? pointerOnTop
        ? "bottom-right"
        : "top-right"
      : pointerOnTop
        ? "bottom-left"
        : "top-left";
  }

  function clearHover() {
    hoverPointIndex = null;
  }

  $: hoverPoint =
    hoverPointIndex !== null ? chartPoints[hoverPointIndex] : null;
  $: tooltipStyle =
    hoverCorner === "top-left"
      ? "top:8px;left:8px;"
      : hoverCorner === "top-right"
        ? "top:8px;right:8px;"
        : hoverCorner === "bottom-left"
          ? "bottom:8px;left:8px;"
          : "bottom:8px;right:8px;";
</script>

{#if availableSeries.length}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="activity-detail-stream-wrap"
    bind:this={wrapperEl}
    on:pointermove={handlePointerMove}
    on:pointerleave={clearHover}
  >
    <svg
      viewBox={`0 0 ${width} ${height}`}
      class="activity-detail-stream-svg"
      role="img"
      aria-label="Run pace, heart rate, cadence, and altitude over time"
    >
      <defs>
        {#each availableSeries as meta, index (meta.key)}
          {@const top = margin.top + index * (panelHeight + panelGap)}
          <clipPath id={`activity-stream-clip-${meta.key}`}>
            <rect
              x={margin.left}
              y={top}
              width={innerWidth}
              height={panelHeight}
            />
          </clipPath>
        {/each}
      </defs>
      {#each Array.from( { length: Math.min(6, Math.max(3, Math.round(innerWidth / 120))) }, ) as _tick, index (index)}
        {@const ratio =
          index /
          Math.max(
            1,
            Math.min(6, Math.max(3, Math.round(innerWidth / 120))) - 1,
          )}
        {@const elapsed = maxElapsed * ratio}
        {@const x = xScale(elapsed)}
        <g>
          <line
            x1={x}
            y1={margin.top}
            x2={x}
            y2={height - margin.bottom}
            stroke="#eef4f2"
            stroke-width="1"
          />
          <text
            {x}
            y={height - 8}
            text-anchor="middle"
            class="activity-detail-stream-axis">{formatDuration(elapsed)}</text
          >
        </g>
      {/each}

      {#each availableSeries as meta, index (meta.key)}
        {@const top = margin.top + index * (panelHeight + panelGap)}
        {@const yScale = buildYScale(
          meta.values as number[],
          top,
          meta.invert,
          meta.key === "pacePlotMinKm"
            ? { min: paceRangeMin, max: paceRangeMax }
            : undefined,
        )}
        <g data-series={meta.key}>
          {#each [0, 0.5, 1] as ratio}
            <line
              x1={margin.left}
              y1={top + panelHeight * ratio}
              x2={width - margin.right}
              y2={top + panelHeight * ratio}
              stroke="#e3eeea"
              stroke-width="1"
            />
          {/each}
          <text
            x={10}
            y={top + panelHeight / 2}
            text-anchor="middle"
            transform={`rotate(-90 10 ${top + panelHeight / 2})`}
            class="activity-detail-stream-label"
          >
            {meta.label}
          </text>
          <path
            d={buildLinePath(meta.key, yScale)}
            fill="none"
            stroke={meta.color}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            clip-path={`url(#activity-stream-clip-${meta.key})`}
          />
        </g>
      {/each}
      {#if hoverPoint}
        <line
          x1={hoverX}
          y1={margin.top}
          x2={hoverX}
          y2={height - margin.bottom}
          stroke="#0f172a"
          stroke-width="1.5"
          stroke-dasharray="4 4"
        />
      {/if}
      <text
        x={margin.left + innerWidth / 2}
        y={height - 8}
        text-anchor="middle"
        class="activity-detail-stream-label">Elapsed Time</text
      >
    </svg>
    {#if hoverPoint}
      <div
        class={`activity-detail-stream-tooltip ${hoverCorner}`}
        style={tooltipStyle}
      >
        <div class="activity-detail-stream-tooltip-title">
          {formatDuration(Number(hoverPoint.elapsedSec))}
        </div>
        {#each seriesMeta as meta}
          <div class="activity-detail-stream-tooltip-row">
            <span
              class="activity-detail-stream-tooltip-label"
              style={`color:${meta.color}`}>{meta.label}</span
            >
            <span
              >{meta.format(
                Number.isFinite(Number(hoverPoint?.[meta.key]))
                  ? Number(hoverPoint[meta.key])
                  : null,
              )}</span
            >
          </div>
        {/each}
      </div>
    {/if}
  </div>
{:else}
  <p class="field-hint">
    Detailed run streams are not available for this activity.
  </p>
{/if}
