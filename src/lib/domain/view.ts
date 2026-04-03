import { isDateKey } from "$lib/domain/edupro-core.js";
import type {
  FoundationsModel,
  HeatmapModel,
  HrZone,
  PaceHrPoint,
  RollingSeriesPoint,
  RunSummary,
} from "$lib/types/app";

export const COMPARABLE_THRESHOLD_BY_STRICTNESS = {
  loose: {
    durationMinRatio: 0.73,
    durationMaxRatio: 1.3375,
    elevationDeltaM: 162,
    temperatureDeltaC: 10.8,
  },
  normal: {
    durationMinRatio: 0.8,
    durationMaxRatio: 1.25,
    elevationDeltaM: 120,
    temperatureDeltaC: 8,
  },
  strict: {
    durationMinRatio: 0.87,
    durationMaxRatio: 1.1625,
    elevationDeltaM: 78,
    temperatureDeltaC: 5.2,
  },
} as const;

export function normalizeComparableStrictness(value: string) {
  const normalized = String(value || "").toLowerCase();
  return normalized === "loose" || normalized === "strict"
    ? normalized
    : "normal";
}

export function formatDateLabel(dateKey: string | null) {
  if (!dateKey || !isDateKey(dateKey)) {
    return "n/a";
  }
  return dateKey;
}

export function formatDateTimeLabel(value: string | null) {
  if (!value) {
    return "n/a";
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function formatDistance(value: number | null) {
  return Number.isFinite(value) ? `${value.toFixed(2)} km` : "n/a";
}

export function formatSignedDistance(value: number | null) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} km`;
}

export function formatPace(value: number | null) {
  if (!Number.isFinite(value) || value <= 0) {
    return "n/a";
  }
  const whole = Math.floor(value);
  const secondsFloat = (value - whole) * 60;
  const roundedSeconds = Math.round(secondsFloat);
  const minutes = roundedSeconds >= 60 ? whole + 1 : whole;
  const seconds = roundedSeconds >= 60 ? 0 : roundedSeconds;
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

export function formatDuration(value: number | null) {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "n/a";
  }
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDurationCompact(valueSec: number | null) {
  const totalSeconds = Number(valueSec);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0m";
  }
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatPercent(value: number | null) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatHrZoneRange(minBpm: number | null, maxBpm: number | null) {
  const hasMin = Number.isFinite(Number(minBpm));
  const hasMax = Number.isFinite(Number(maxBpm));
  if (hasMin && hasMax) {
    return `${Math.round(Number(minBpm))}-${Math.round(Number(maxBpm))} bpm`;
  }
  if (hasMin) {
    return `>=${Math.round(Number(minBpm))} bpm`;
  }
  if (hasMax) {
    return `<=${Math.round(Number(maxBpm))} bpm`;
  }
  return null;
}

export function isSyncedToday(syncedAt: string | null) {
  if (!syncedAt) {
    return false;
  }
  const parsed = Date.parse(syncedAt);
  if (!Number.isFinite(parsed)) {
    return false;
  }
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const syncedDate = new Date(parsed);
  const syncedKey = `${syncedDate.getFullYear()}-${String(syncedDate.getMonth() + 1).padStart(2, "0")}-${String(
    syncedDate.getDate(),
  ).padStart(2, "0")}`;
  return currentKey === syncedKey;
}

export function clampRange<T>(
  items: T[],
  startIndex: number | null,
  endIndex: number | null,
) {
  if (!items.length) {
    return { startIndex: null, endIndex: null };
  }

  const maxIndex = items.length - 1;
  const safeEnd = Number.isFinite(endIndex)
    ? Math.max(0, Math.min(maxIndex, Math.round(endIndex as number)))
    : maxIndex;
  const safeStart = Number.isFinite(startIndex)
    ? Math.max(0, Math.min(safeEnd, Math.round(startIndex as number)))
    : Math.max(0, maxIndex - 89);
  return { startIndex: safeStart, endIndex: safeEnd };
}

export function rangeDatesFromSeries(
  series: Array<{ date: string }>,
  startIndex: number | null,
  endIndex: number | null,
) {
  if (!series.length || startIndex === null || endIndex === null) {
    return { startDate: null, endDate: null };
  }
  return {
    startDate: series[startIndex]?.date ?? null,
    endDate: series[endIndex]?.date ?? null,
  };
}

export function filterRunsByRange<T extends { date?: string | null }>(
  runs: T[],
  startDate: string | null,
  endDate: string | null,
) {
  return runs.filter((run) => {
    const date = String(run?.date || "");
    if (!isDateKey(date)) {
      return false;
    }
    if (startDate && date < startDate) {
      return false;
    }
    if (endDate && date > endDate) {
      return false;
    }
    return true;
  });
}

function fuzzyScore(haystack: string, needle: string) {
  if (!needle) {
    return 1;
  }
  let score = 0;
  let lastIndex = -1;
  const lowerHaystack = haystack.toLowerCase();
  for (const char of needle.toLowerCase()) {
    const nextIndex = lowerHaystack.indexOf(char, lastIndex + 1);
    if (nextIndex < 0) {
      return -1;
    }
    score += nextIndex === lastIndex + 1 ? 2 : 1;
    lastIndex = nextIndex;
  }
  return score;
}

export function filterRunsBySearch<
  T extends { name?: string | null; date?: string | null },
>(runs: T[], query: string) {
  const needle = String(query || "").trim();
  if (!needle) {
    return runs;
  }

  return runs
    .map((run) => {
      const searchable = `${run?.name || ""} ${run?.date || ""}`;
      return { run, score: fuzzyScore(searchable, needle) };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.run);
}

function getRunTimestampMs(run: {
  startDateTime?: string | null;
  date?: string | null;
}) {
  const start =
    typeof run?.startDateTime === "string"
      ? Date.parse(run.startDateTime)
      : NaN;
  if (Number.isFinite(start)) {
    return start;
  }
  const date = String(run?.date || "");
  if (isDateKey(date)) {
    return Date.parse(`${date}T00:00:00`);
  }
  return Number.NEGATIVE_INFINITY;
}

function evaluateComparableRun(
  candidate: RunSummary,
  reference: RunSummary,
  thresholds: (typeof COMPARABLE_THRESHOLD_BY_STRICTNESS)[keyof typeof COMPARABLE_THRESHOLD_BY_STRICTNESS],
) {
  if (String(candidate?.id || "") === String(reference?.id || "")) {
    return true;
  }
  const candidateMoving = Number(candidate?.movingTimeSec);
  const referenceMoving = Number(reference?.movingTimeSec);
  const candidateDistance = Number(candidate?.distanceKm);
  const referenceDistance = Number(reference?.distanceKm);
  const candidateElevation = Number(candidate?.elevationGainM);
  const referenceElevation = Number(reference?.elevationGainM);
  const candidateTemp = Number(candidate?.avgTempC);
  const referenceTemp = Number(reference?.avgTempC);

  let checksApplied = 0;
  let comparable = true;
  if (
    Number.isFinite(candidateMoving) &&
    candidateMoving > 0 &&
    Number.isFinite(referenceMoving) &&
    referenceMoving > 0
  ) {
    const ratio = candidateMoving / referenceMoving;
    checksApplied += 1;
    comparable =
      comparable &&
      ratio >= thresholds.durationMinRatio &&
      ratio <= thresholds.durationMaxRatio;
  } else if (
    Number.isFinite(candidateDistance) &&
    candidateDistance > 0 &&
    Number.isFinite(referenceDistance) &&
    referenceDistance > 0
  ) {
    const ratio = candidateDistance / referenceDistance;
    checksApplied += 1;
    comparable =
      comparable &&
      ratio >= thresholds.durationMinRatio &&
      ratio <= thresholds.durationMaxRatio;
  }

  if (
    Number.isFinite(candidateElevation) &&
    Number.isFinite(referenceElevation)
  ) {
    checksApplied += 1;
    comparable =
      comparable &&
      Math.abs(candidateElevation - referenceElevation) <=
        thresholds.elevationDeltaM;
  }

  if (Number.isFinite(candidateTemp) && Number.isFinite(referenceTemp)) {
    checksApplied += 1;
    comparable =
      comparable &&
      Math.abs(candidateTemp - referenceTemp) <= thresholds.temperatureDeltaC;
  }

  return checksApplied > 0 && comparable;
}

export function buildComparableContext(
  runs: RunSummary[],
  selectedIds: string[],
  strictness: string,
) {
  const sorted = [...runs].sort(
    (a, b) => getRunTimestampMs(b) - getRunTimestampMs(a),
  );
  const runById = new Map(sorted.map((run) => [String(run.id), run]));
  const reference =
    selectedIds.length === 1 && runById.has(selectedIds[0])
      ? runById.get(selectedIds[0])
      : (sorted[0] ?? null);
  const thresholds =
    COMPARABLE_THRESHOLD_BY_STRICTNESS[
      normalizeComparableStrictness(strictness)
    ];
  const comparableIds = new Set<string>();

  if (!reference) {
    return { reference: null, comparableIds, thresholds };
  }

  for (const run of sorted) {
    if (evaluateComparableRun(run, reference, thresholds)) {
      comparableIds.add(String(run.id));
    }
  }

  return { reference, comparableIds, thresholds };
}

export function pearsonCorrelation(
  points: Array<{ paceMinKm: number; avgHrBpm: number }>,
) {
  if (!points.length) {
    return null;
  }
  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.paceMinKm, 0);
  const sumY = points.reduce((sum, point) => sum + point.avgHrBpm, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const point of points) {
    const dx = point.paceMinKm - meanX;
    const dy = point.avgHrBpm - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }
  if (varX <= 0 || varY <= 0) {
    return null;
  }
  return cov / Math.sqrt(varX * varY);
}

export function linearRegression(
  points: Array<{ paceMinKm: number; avgHrBpm: number }>,
) {
  if (!points.length) {
    return null;
  }
  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.paceMinKm, 0);
  const sumY = points.reduce((sum, point) => sum + point.avgHrBpm, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  for (const point of points) {
    const dx = point.paceMinKm - meanX;
    sxx += dx * dx;
    sxy += dx * (point.avgHrBpm - meanY);
  }
  if (sxx <= 0) {
    return null;
  }
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function computeToleranceStatus(latest: RollingSeriesPoint | null) {
  if (
    !latest ||
    !Number.isFinite(Number(latest.sum7)) ||
    !Number.isFinite(Number(latest.sum7ma90))
  ) {
    return { badge: "Insufficient Data", tone: "status-gray" };
  }
  const sum7 = Number(latest.sum7);
  const baseline = Number(latest.sum7ma90);
  if (baseline <= 0) {
    return { badge: "Insufficient Data", tone: "status-gray" };
  }
  if (sum7 > baseline * 1.1) {
    return { badge: "Above Cap", tone: "status-red" };
  }
  if (sum7 < baseline * 0.95) {
    return { badge: "Below Baseline", tone: "status-green" };
  }
  return { badge: "Near Cap", tone: "status-yellow" };
}

export function computeMonotonySummary(
  series: Array<{ dayKm?: number | null }>,
  endIndex: number | null = series.length ? series.length - 1 : null,
) {
  if (
    !Array.isArray(series) ||
    !series.length ||
    !Number.isFinite(Number(endIndex))
  ) {
    return null;
  }

  const idx = Math.max(
    0,
    Math.min(series.length - 1, Math.round(Number(endIndex))),
  );
  const start = Math.max(0, idx - 6);
  const window = series.slice(start, idx + 1);
  if (window.length < 7) {
    return null;
  }

  const values = window
    .map((item) => Number(item?.dayKm))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length < 7) {
    return null;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const sd = Math.sqrt(Math.max(0, variance));

  let rawValue: number;
  if (mean <= 0) {
    rawValue = 0;
  } else if (sd <= 1e-9) {
    rawValue = Number.POSITIVE_INFINITY;
  } else {
    rawValue = mean / sd;
  }

  let status = "green";
  let label = "Low";
  if (rawValue > 2.0) {
    status = "red";
    label = "High";
  } else if (rawValue > 1.5) {
    status = "yellow";
    label = "Moderate";
  }

  const markerScaleMax = 3;
  const markerValue = Number.isFinite(rawValue) ? rawValue : markerScaleMax;
  const markerPct = Math.max(
    0,
    Math.min(100, (markerValue / markerScaleMax) * 100),
  );
  const displayValue = Number.isFinite(rawValue)
    ? rawValue.toFixed(2)
    : `>${markerScaleMax.toFixed(1)}`;

  return {
    rawValue,
    displayValue,
    status,
    label,
    markerPct,
  };
}

export function monotonyInterpretationText(monotony: {
  displayValue: string;
  label: string;
  status: string;
}) {
  if (!monotony || typeof monotony !== "object") {
    return "Monotony = 7d mean daily load / 7d standard deviation. Lower usually means more day-to-day variation.";
  }
  const base = `Monotony: ${monotony.displayValue} (${monotony.label}). Monotony = 7d mean daily load / 7d standard deviation.`;
  if (monotony.status === "green") {
    return `${base} Low (<1.5): generally healthy variation.`;
  }
  if (monotony.status === "yellow") {
    return `${base} Moderate (1.5-2.0): monitor for too many similar days.`;
  }
  return `${base} High (>2.0): very repetitive loading; consider adding easier/harder contrast.`;
}

function buildNumericDistribution(
  values: number[],
  bins: Array<{ label: string; min: number; max: number }>,
) {
  const counts = Array.from({ length: bins.length }, () => 0);
  let total = 0;
  for (const rawValue of values) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      continue;
    }
    const idx = bins.findIndex((bin) => value >= bin.min && value < bin.max);
    if (idx < 0) {
      continue;
    }
    counts[idx] += 1;
    total += 1;
  }
  return {
    total,
    rows: bins.map((bin, idx) => ({ label: bin.label, count: counts[idx] })),
  };
}

function buildCategoricalDistribution(
  labels: string[],
  indexValues: number[],
  count: number,
) {
  const counts = Array.from({ length: count }, () => 0);
  let total = 0;
  for (const rawIndex of indexValues) {
    const idx = Number(rawIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= count) {
      continue;
    }
    counts[idx] += 1;
    total += 1;
  }
  return {
    total,
    rows: labels.map((label, idx) => ({ label, count: counts[idx] })),
  };
}

function getRunStartHour(run: RunSummary) {
  const startDateTime =
    typeof run?.startDateTime === "string" ? run.startDateTime : "";
  const hhmmMatch = startDateTime.match(/T(\d{2}):(\d{2})/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      return hour;
    }
  }
  const timestamp = Date.parse(startDateTime);
  if (Number.isFinite(timestamp)) {
    return new Date(timestamp).getHours();
  }
  return null;
}

export function buildFoundations(
  runs: RunSummary[],
  paceHrPoints: PaceHrPoint[],
  hrZonesRunning: HrZone[],
): FoundationsModel {
  const distancesKm = runs
    .map((run) => Number(run?.distanceKm))
    .filter((value) => Number.isFinite(value) && value > 0);
  const durationsMin = runs
    .map((run) => Number(run?.movingTimeSec) / 60)
    .filter((value) => Number.isFinite(value) && value > 0);
  const weekdayIndices = runs
    .map((run) => {
      if (!isDateKey(run?.date)) {
        return null;
      }
      const weekday = new Date(`${run.date}T00:00:00Z`).getUTCDay();
      return (weekday + 6) % 7;
    })
    .filter((value) => Number.isFinite(value)) as number[];
  const daytimeIndices = runs
    .map((run) => {
      const hour = getRunStartHour(run);
      if (!Number.isFinite(hour)) {
        return null;
      }
      if (hour < 6) return 0;
      if (hour < 10) return 1;
      if (hour < 14) return 2;
      if (hour < 18) return 3;
      return 4;
    })
    .filter((value) => Number.isFinite(value)) as number[];

  const preferredPacePoints = paceHrPoints.filter(
    (point) => point.source === "interval" || point.source === "split-km",
  );
  const paceSamples = preferredPacePoints.length
    ? preferredPacePoints.map((point) => Number(point.paceMinKm))
    : runs
        .map((run) => Number(run?.paceMinKm))
        .filter((pace) => Number.isFinite(pace) && pace > 0);

  const hrZoneRows =
    Array.isArray(hrZonesRunning) && hrZonesRunning.length
      ? hrZonesRunning
      : Array.from({ length: 5 }, (_, idx) => ({
          label: `Z${idx + 1}`,
          minBpm: null,
          maxBpm: null,
        }));
  const zoneTotals = Array.from({ length: hrZoneRows.length }, () => 0);
  for (const run of runs) {
    const durations = Array.isArray(run?.hrZoneDurationsSec)
      ? run.hrZoneDurationsSec
      : [];
    for (let i = 0; i < zoneTotals.length; i += 1) {
      const sec = Number(durations[i]);
      if (Number.isFinite(sec) && sec > 0) {
        zoneTotals[i] += sec;
      }
    }
  }

  return {
    summary: `${runs.length} runs`,
    blocks: [
      {
        title: "Distance",
        ...buildNumericDistribution(distancesKm, [
          { label: "<5 km", min: 0, max: 5 },
          { label: "5-10 km", min: 5, max: 10 },
          { label: "10-15 km", min: 10, max: 15 },
          { label: "15-21 km", min: 15, max: 21.1 },
          { label: "21-30 km", min: 21.1, max: 30 },
          { label: ">=30 km", min: 30, max: Number.POSITIVE_INFINITY },
        ]),
      },
      {
        title: "Pace",
        ...buildNumericDistribution(paceSamples, [
          { label: "<4:00", min: 0, max: 4 },
          { label: "4:00-4:30", min: 4, max: 4.5 },
          { label: "4:30-5:00", min: 4.5, max: 5 },
          { label: "5:00-5:30", min: 5, max: 5.5 },
          { label: "5:30-6:00", min: 5.5, max: 6 },
          { label: "6:00-6:30", min: 6, max: 6.5 },
          { label: "6:30-7:00", min: 6.5, max: 7 },
          { label: ">=7:00", min: 7, max: Number.POSITIVE_INFINITY },
        ]),
      },
      {
        title: "Duration",
        ...buildNumericDistribution(durationsMin, [
          { label: "<30m", min: 0, max: 30 },
          { label: "30-60m", min: 30, max: 60 },
          { label: "60-90m", min: 60, max: 90 },
          { label: "90-120m", min: 90, max: 120 },
          { label: ">=120m", min: 120, max: Number.POSITIVE_INFINITY },
        ]),
      },
      {
        title: "Start Time",
        ...buildCategoricalDistribution(
          ["Early AM", "Late AM", "Afternoon", "Evening", "Night"],
          daytimeIndices,
          5,
        ),
      },
      {
        title: "Weekday",
        ...buildCategoricalDistribution(
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          weekdayIndices,
          7,
        ),
      },
      {
        title: "HR Zones",
        total: zoneTotals.reduce((sum, value) => sum + value, 0),
        rows: hrZoneRows.map((zone, idx) => ({
          label: [
            zone?.label || `Z${idx + 1}`,
            formatHrZoneRange(zone?.minBpm ?? null, zone?.maxBpm ?? null),
          ]
            .filter(Boolean)
            .join(" · "),
          count: Math.round(zoneTotals[idx] || 0),
          valueLabel: formatDurationCompact(zoneTotals[idx] || 0),
        })),
      },
    ],
  };
}

export function buildHeatmap(
  points: PaceHrPoint[],
  binSeconds: number,
): HeatmapModel {
  const usable = points
    .filter(
      (point) =>
        Number.isFinite(Number(point?.paceMinKm)) &&
        Number(point.paceMinKm) > 0 &&
        Number.isFinite(Number(point?.avgHrBpm)) &&
        Number(point.avgHrBpm) > 0 &&
        point?.date,
    )
    .map((point) => ({
      date: String(point.date),
      paceSecKm: Math.round(Number(point.paceMinKm) * 60),
      avgHrBpm: Number(point.avgHrBpm),
    }));

  function startOfWeekUtc(dateKey: string) {
    const date = new Date(`${dateKey}T00:00:00Z`);
    const weekday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - weekday);
    return date;
  }

  const weekMap = new Map<
    string,
    Map<number, { totalHr: number; count: number }>
  >();
  for (const point of usable) {
    const date = startOfWeekUtc(point.date);
    const weekKey = date.toISOString().slice(0, 10);
    const bin = Math.floor(point.paceSecKm / Math.max(1, binSeconds));
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, new Map());
    }
    const week = weekMap.get(weekKey)!;
    const current = week.get(bin) ?? { totalHr: 0, count: 0 };
    current.totalHr += point.avgHrBpm;
    current.count += 1;
    week.set(bin, current);
  }

  const weekKeys: string[] = [];
  if (usable.length) {
    const dates = usable.map((point) => point.date).sort();
    const start = startOfWeekUtc(dates[0]);
    const end = startOfWeekUtc(dates[dates.length - 1]);
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      weekKeys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    }
  }
  const bins = Array.from(
    new Set(
      Array.from(weekMap.values()).flatMap((week) => Array.from(week.keys())),
    ),
  ).sort((a, b) => a - b);
  const cells = weekKeys.flatMap((weekKey) =>
    bins.map((bin) => {
      const row = weekMap.get(weekKey)?.get(bin);
      return {
        weekKey,
        bin,
        avgHrBpm: row && row.count ? row.totalHr / row.count : null,
      };
    }),
  );

  return { weekKeys, bins, cells };
}
