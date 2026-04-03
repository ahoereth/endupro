import { describe, expect, it } from "vitest";
import {
  computeDetailNavigationState,
  resolvePaceHrActivityClick,
  restoreActivityStateFromUrl,
} from "../src/lib/runtime/activity-detail";
import type { RunSummary } from "../src/lib/types/app";

const runs: RunSummary[] = [
  {
    id: "a",
    date: "2026-03-01",
    name: "Run A",
    startDateTime: "2026-03-01T08:00:00Z",
    distanceKm: 10,
  },
  {
    id: "b",
    date: "2026-03-02",
    name: "Run B",
    startDateTime: "2026-03-02T08:00:00Z",
    distanceKm: 12,
  },
  {
    id: "c",
    date: "2026-03-03",
    name: "Run C",
    startDateTime: "2026-03-03T08:00:00Z",
    distanceKm: 14,
  },
];

describe("activity detail runtime", () => {
  it("restores selection and drawer state from the URL", () => {
    expect(
      restoreActivityStateFromUrl(runs, "?selected=a,c&activity=b"),
    ).toEqual({
      selectedIds: ["a", "c", "b"],
      selectionAnchorId: "a",
      detailActivityId: "b",
    });
  });

  it("derives detail neighbors from the selected activity set", () => {
    expect(computeDetailNavigationState(runs, ["a", "c", "b"], "b")).toEqual({
      selectedDetailRunIds: ["c", "b", "a"],
      activeDetailIndex: 1,
      newerSelectedActivityId: "c",
      olderSelectedActivityId: "a",
    });
  });

  it("requires a second click to open detail when the drawer is closed", () => {
    expect(resolvePaceHrActivityClick(["a"], false, "c")).toEqual({
      selectedIds: ["c"],
      selectionAnchorId: "c",
      shouldOpenDetail: false,
      preserveSelection: false,
    });
  });

  it("opens detail immediately when the activity is already selected", () => {
    expect(resolvePaceHrActivityClick(["a", "c"], false, "c")).toEqual({
      selectedIds: ["a", "c"],
      selectionAnchorId: "c",
      shouldOpenDetail: true,
      preserveSelection: true,
    });
  });
});
