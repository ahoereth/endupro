import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_VISIBLE_LINES,
  clearLocalUiStorage,
  loadUiPreferences,
  persistComparableSettings,
  persistHeatmapPreferences,
  persistNumericRange,
  persistSyncPaused,
  persistVisibleLines,
  resetUiPreferences,
} from "../src/lib/runtime/preferences";
import {
  resolveNumericRange,
  sliderStepToValue,
  valueToSliderStep,
} from "../src/lib/runtime/ranges";
import {
  buildUrlSearch,
  parseUrlState,
  serializeUrlState,
} from "../src/lib/runtime/url-state";
import {
  deriveSelectedDetailRunIds,
  normalizeActivityIds,
  reduceRecentActivitySelection,
} from "../src/lib/runtime/selection";
import {
  applyTimelinePreset,
  clearPersistedViewRange,
  persistViewRange,
  restoreViewRange,
  updateTimelineRange,
} from "../src/lib/runtime/timeline";
import type { RollingSeriesPoint, RunSummary } from "../src/lib/types/app";

function makeSeries(days: number): RollingSeriesPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return {
      date: `2026-03-${day}`,
      dayKm: index,
      sum7: index,
      sum7ma30: index,
      sum7ma90: index,
      toleranceKmModel: index,
      sum14: index,
      sum28: index,
      sum30: index,
      sum90: index,
      sum180: index,
    };
  });
}

describe("app runtime integration", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    clearLocalUiStorage();
    clearPersistedViewRange();
  });

  it("round-trips persisted preferences and resets cleanly", () => {
    persistVisibleLines(["sum30", "sum90"]);
    persistComparableSettings({
      selectedOnlyEnabled: true,
      comparableEnabled: false,
      comparableStrictness: "strict",
    });
    persistNumericRange("paceAxisRange", { min: 4.1, max: 5.4 });
    persistNumericRange("paceHrColorRange", { min: 1000, max: 2000 });
    persistNumericRange("heatmapColorRange", { min: 130, max: 180 });
    persistHeatmapPreferences(60, "pace-y");
    persistSyncPaused(true);

    expect(loadUiPreferences()).toMatchObject({
      visibleLines: ["sum30", "sum90"],
      selectedOnlyEnabled: true,
      comparableStrictness: "strict",
      heatmapBinSize: 60,
      heatmapOrientation: "pace-y",
      syncPaused: true,
    });

    expect(resetUiPreferences()).toMatchObject({
      visibleLines: DEFAULT_VISIBLE_LINES,
      selectedOnlyEnabled: false,
      comparableEnabled: false,
      heatmapBinSize: 30,
      heatmapOrientation: "pace-x",
      syncPaused: false,
    });
  });

  it("round-trips url selection state for drawer restore", () => {
    const search = buildUrlSearch(["a", "b", "c"], "b");

    expect(serializeUrlState(["a", "b", "c"], "b")).toBe(
      '{"selectedIds":["a","b","c"],"activeDetailId":"b"}',
    );
    expect(parseUrlState(`?${search}`)).toEqual({
      selectedIds: ["a", "b", "c"],
      activeDetailId: "b",
    });
  });

  it("applies recent activity selection semantics and detail ordering", () => {
    const runs: RunSummary[] = [
      {
        id: "a",
        date: "2026-03-01",
        name: "Run A",
        startDateTime: "2026-03-01T08:00:00Z",
        type: "Run",
        distanceKm: 10,
        movingTimeSec: 3600,
        elevationGainM: null,
        avgTempC: null,
        avgHrBpm: null,
        maxHrBpm: null,
        load: null,
        hrZoneDurationsSec: [],
        paceMinKm: 6,
      },
      {
        id: "b",
        date: "2026-03-02",
        name: "Run B",
        startDateTime: "2026-03-02T08:00:00Z",
        type: "Run",
        distanceKm: 10,
        movingTimeSec: 3600,
        elevationGainM: null,
        avgTempC: null,
        avgHrBpm: null,
        maxHrBpm: null,
        load: null,
        hrZoneDurationsSec: [],
        paceMinKm: 6,
      },
      {
        id: "c",
        date: "2026-03-03",
        name: "Run C",
        startDateTime: "2026-03-03T08:00:00Z",
        type: "Run",
        distanceKm: 10,
        movingTimeSec: 3600,
        elevationGainM: null,
        avgTempC: null,
        avgHrBpm: null,
        maxHrBpm: null,
        load: null,
        hrZoneDurationsSec: [],
        paceMinKm: 6,
      },
    ];

    const shiftSelection = reduceRecentActivitySelection(["a"], "a", runs, {
      activityId: "c",
      shiftKey: true,
      altKey: false,
    });
    expect(shiftSelection.selectedIds).toEqual(["a", "b", "c"]);

    const toggleSelection = reduceRecentActivitySelection(
      ["a", "b"],
      "b",
      runs,
      {
        activityId: "b",
        shiftKey: false,
        altKey: true,
      },
    );
    expect(toggleSelection.selectedIds).toEqual(["a"]);

    expect(deriveSelectedDetailRunIds(runs, ["a", "c"])).toEqual(["c", "a"]);
    expect(
      normalizeActivityIds(
        ["c", "bad", "a", "c"],
        runs.map((run) => run.id),
      ),
    ).toEqual(["c", "a"]);
  });

  it("persists and restores timeline state across presets and custom ranges", () => {
    const series = makeSeries(120);

    expect(applyTimelinePreset(series, "all")).toEqual({
      startIndex: 0,
      endIndex: 119,
    });
    expect(updateTimelineRange("start", 12, 0, 119)).toEqual({
      startIndex: 12,
      endIndex: 119,
    });

    persistViewRange(series, 10, 25);
    expect(restoreViewRange(series)).toEqual({ startIndex: 10, endIndex: 25 });

    persistViewRange(series, 0, 119);
    expect(restoreViewRange(series)).toEqual({ startIndex: 0, endIndex: 119 });
  });

  it("shares canonical range math between page and sliders", () => {
    const resolved = resolveNumericRange(
      { min: null, max: null },
      { min: 4, max: 6 },
      0.1,
    );
    expect(resolved).toEqual({ min: 4, max: 6 });

    const step = valueToSliderStep(5.5, 4, 6, 1000, true);
    const value = sliderStepToValue(step, 4, 6, 1000, true);
    expect(value).toBeCloseTo(5.5, 2);
  });
});
