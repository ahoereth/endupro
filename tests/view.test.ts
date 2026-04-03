import { describe, expect, it } from "vitest";
import {
  buildComparableContext,
  clampRange,
  filterRunsBySearch,
} from "../src/lib/domain/view";

describe("view helpers", () => {
  it("keeps range indices inside available bounds", () => {
    expect(clampRange([1, 2, 3], -10, 20)).toEqual({
      startIndex: 0,
      endIndex: 2,
    });
  });

  it("filters runs using fuzzy subsequence search", () => {
    const runs = [
      { id: "1", name: "Morning Easy Run", date: "2026-03-01" },
      { id: "2", name: "Track Session", date: "2026-03-02" },
    ];

    expect(filterRunsBySearch(runs, "mer").map((run) => run.id)).toEqual(["1"]);
  });

  it("builds comparable context around selected run", () => {
    const runs = [
      {
        id: "a",
        date: "2026-03-01",
        movingTimeSec: 3600,
        distanceKm: 10,
        elevationGainM: 80,
        avgTempC: 10,
      },
      {
        id: "b",
        date: "2026-03-02",
        movingTimeSec: 3700,
        distanceKm: 10.2,
        elevationGainM: 90,
        avgTempC: 11,
      },
      {
        id: "c",
        date: "2026-03-03",
        movingTimeSec: 6500,
        distanceKm: 18,
        elevationGainM: 250,
        avgTempC: 22,
      },
    ];

    const context = buildComparableContext(runs, ["a"], "normal");

    expect(context.reference?.id).toBe("a");
    expect(context.comparableIds.has("a")).toBe(true);
    expect(context.comparableIds.has("b")).toBe(true);
    expect(context.comparableIds.has("c")).toBe(false);
  });
});
