import type { NumericRange } from "$lib/types/app";
import { normalizeComparableStrictness } from "$lib/domain/view";
import { normalizeStoredNumericRange } from "$lib/runtime/ranges";

export type HeatmapOrientation = "pace-x" | "pace-y";

export type UiPreferences = {
  visibleLines: string[];
  selectedOnlyEnabled: boolean;
  comparableEnabled: boolean;
  comparableStrictness: string;
  paceAxisRange: NumericRange;
  paceHrColorRange: NumericRange;
  heatmapBinSize: number;
  heatmapColorRange: NumericRange;
  heatmapOrientation: HeatmapOrientation;
  syncPaused: boolean;
};

export const DEFAULT_VISIBLE_LINES = [
  "sum7",
  "weekly",
  "sum7ma90",
  "toleranceKmModel",
];

const STORAGE_KEYS = {
  visibleLines: "edupro_visible_lines",
  comparable: "edupro_pace_hr_comparable",
  paceAxisRange: "edupro_pace_axis_range",
  paceHrColorRange: "edupro_pace_hr_color_range",
  heatmapBinSize: "edupro_heatmap_bin_size",
  heatmapColorRange: "edupro_heatmap_color_range",
  heatmapOrientation: "edupro_heatmap_orientation",
  syncPaused: "edupro_sync_paused",
  fundamentalsCollapsed: "edupro_fundamentals_collapsed",
} as const;

export const LOCAL_UI_STORAGE_KEYS = [
  STORAGE_KEYS.visibleLines,
  STORAGE_KEYS.comparable,
  STORAGE_KEYS.paceAxisRange,
  STORAGE_KEYS.paceHrColorRange,
  STORAGE_KEYS.heatmapBinSize,
  STORAGE_KEYS.heatmapColorRange,
  STORAGE_KEYS.heatmapOrientation,
  STORAGE_KEYS.syncPaused,
  STORAGE_KEYS.fundamentalsCollapsed,
];

function readJson(key: string) {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadUiPreferences(): UiPreferences {
  const visibleLinesRaw = readJson(STORAGE_KEYS.visibleLines);
  const comparableRaw = readJson(STORAGE_KEYS.comparable) ?? {};
  const heatmapOrientationRaw =
    typeof localStorage === "undefined"
      ? ""
      : String(localStorage.getItem(STORAGE_KEYS.heatmapOrientation) || "");
  const heatmapBinSizeRaw =
    typeof localStorage === "undefined"
      ? NaN
      : Number(localStorage.getItem(STORAGE_KEYS.heatmapBinSize));

  return {
    visibleLines:
      Array.isArray(visibleLinesRaw) && visibleLinesRaw.length
        ? visibleLinesRaw
        : [...DEFAULT_VISIBLE_LINES],
    selectedOnlyEnabled: Boolean(comparableRaw?.selectedOnlyEnabled),
    comparableEnabled: Boolean(comparableRaw?.enabled),
    comparableStrictness: normalizeComparableStrictness(
      comparableRaw?.strictness,
    ),
    paceAxisRange: normalizeStoredNumericRange(
      readJson(STORAGE_KEYS.paceAxisRange) ?? { min: null, max: null },
    ),
    paceHrColorRange: normalizeStoredNumericRange(
      readJson(STORAGE_KEYS.paceHrColorRange) ?? { min: null, max: null },
    ),
    heatmapBinSize:
      Number.isFinite(heatmapBinSizeRaw) && heatmapBinSizeRaw > 0
        ? heatmapBinSizeRaw
        : 30,
    heatmapColorRange: normalizeStoredNumericRange(
      readJson(STORAGE_KEYS.heatmapColorRange) ?? { min: null, max: null },
    ),
    heatmapOrientation:
      heatmapOrientationRaw === "pace-y" ? "pace-y" : "pace-x",
    syncPaused:
      typeof localStorage !== "undefined" &&
      localStorage.getItem(STORAGE_KEYS.syncPaused) === "true",
  };
}

export function persistVisibleLines(visibleLines: string[]) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.visibleLines, JSON.stringify(visibleLines));
}

export function persistNumericRange(
  key: keyof Pick<
    typeof STORAGE_KEYS,
    "paceAxisRange" | "paceHrColorRange" | "heatmapColorRange"
  >,
  range: NumericRange,
) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(
    STORAGE_KEYS[key],
    JSON.stringify({
      min: Number.isFinite(Number(range?.min)) ? Number(range.min) : null,
      max: Number.isFinite(Number(range?.max)) ? Number(range.max) : null,
    }),
  );
}

export function persistComparableSettings(
  settings: Pick<
    UiPreferences,
    "selectedOnlyEnabled" | "comparableEnabled" | "comparableStrictness"
  >,
) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(
    STORAGE_KEYS.comparable,
    JSON.stringify({
      selectedOnlyEnabled: settings.selectedOnlyEnabled,
      enabled: settings.comparableEnabled,
      strictness: settings.comparableStrictness,
    }),
  );
}

export function persistHeatmapPreferences(
  binSize: number,
  orientation: HeatmapOrientation,
) {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.heatmapBinSize, String(binSize));
  localStorage.setItem(STORAGE_KEYS.heatmapOrientation, orientation);
}

export function persistSyncPaused(syncPaused: boolean) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (syncPaused) {
    localStorage.setItem(STORAGE_KEYS.syncPaused, "true");
  } else {
    localStorage.removeItem(STORAGE_KEYS.syncPaused);
  }
}

export function persistFundamentalsCollapsed(collapsed: boolean) {
  if (typeof localStorage === "undefined") {
    return;
  }
  if (collapsed) {
    localStorage.setItem(STORAGE_KEYS.fundamentalsCollapsed, "true");
  } else {
    localStorage.removeItem(STORAGE_KEYS.fundamentalsCollapsed);
  }
}

export function clearLocalUiStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }
  for (const key of LOCAL_UI_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function resetUiPreferences(): UiPreferences {
  clearLocalUiStorage();
  return loadUiPreferences();
}
