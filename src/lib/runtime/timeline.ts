import type { RollingSeriesPoint } from "$lib/types/app";

const VIEW_RANGE_STORAGE_KEY = "edupro_view_range";

export function clearPersistedViewRange() {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(VIEW_RANGE_STORAGE_KEY);
}

export function persistViewRange(
  series: RollingSeriesPoint[],
  startIndex: number | null,
  endIndex: number | null,
) {
  if (
    !series.length ||
    startIndex === null ||
    endIndex === null ||
    typeof localStorage === "undefined"
  ) {
    return;
  }

  const maxIndex = series.length - 1;
  if (startIndex === 0 && endIndex === maxIndex) {
    localStorage.setItem(
      VIEW_RANGE_STORAGE_KEY,
      JSON.stringify({ mode: "all" }),
    );
    return;
  }

  const windowLength = endIndex - startIndex + 1;
  if (endIndex === maxIndex) {
    localStorage.setItem(
      VIEW_RANGE_STORAGE_KEY,
      JSON.stringify({ mode: "latest-window", days: windowLength }),
    );
    return;
  }

  localStorage.setItem(
    VIEW_RANGE_STORAGE_KEY,
    JSON.stringify({
      mode: "absolute",
      startDate: series[startIndex]?.date,
      endDate: series[endIndex]?.date,
    }),
  );
}

export function restoreViewRange(series: RollingSeriesPoint[]) {
  if (!series.length) {
    return { startIndex: null, endIndex: null };
  }

  if (typeof localStorage === "undefined") {
    const endIndex = series.length - 1;
    return { startIndex: Math.max(0, endIndex - 89), endIndex };
  }

  try {
    const raw = localStorage.getItem(VIEW_RANGE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const maxIndex = series.length - 1;
    if (!parsed || parsed.mode === "latest-window") {
      const days = Number(parsed?.days) || 90;
      return {
        startIndex: Math.max(0, maxIndex - days + 1),
        endIndex: maxIndex,
      };
    }
    if (parsed.mode === "all") {
      return { startIndex: 0, endIndex: maxIndex };
    }
    const startIndex = series.findIndex(
      (item) => item.date === parsed.startDate,
    );
    const endIndex = series.findIndex((item) => item.date === parsed.endDate);
    if (startIndex >= 0 && endIndex >= startIndex) {
      return { startIndex, endIndex };
    }
  } catch {
    // ignore malformed persisted timeline state
  }

  const endIndex = series.length - 1;
  return { startIndex: Math.max(0, endIndex - 89), endIndex };
}

export function applyTimelinePreset(
  series: RollingSeriesPoint[],
  days: number | "all",
) {
  if (!series.length) {
    return { startIndex: null, endIndex: null };
  }
  const maxIndex = series.length - 1;
  if (days === "all") {
    return { startIndex: 0, endIndex: maxIndex };
  }
  return {
    startIndex: Math.max(0, maxIndex - days + 1),
    endIndex: maxIndex,
  };
}

export function updateTimelineRange(
  which: "start" | "end",
  value: number,
  startIndex: number | null,
  endIndex: number | null,
) {
  if (which === "start") {
    return { startIndex: Math.min(value, endIndex ?? value), endIndex };
  }
  return { startIndex, endIndex: Math.max(value, startIndex ?? value) };
}
