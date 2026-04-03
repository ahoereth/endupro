import { describe, expect, it, vi } from "vitest";
import { shuffleActivitiesForUpdate } from "../src/lib/domain/sync-policy";

describe("sync policy", () => {
  it("keeps first-update activity order stable", () => {
    const activities = [{ id: "a" }, { id: "b" }, { id: "c" }];

    expect(shuffleActivitiesForUpdate(activities, null)).toBe(activities);
  });

  it("shuffles later update activity order", () => {
    const activities = [{ id: "a" }, { id: "b" }, { id: "c" }];
    vi.spyOn(Math, "random").mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);

    expect(
      shuffleActivitiesForUpdate(activities, "2026-04-01T00:00:00Z"),
    ).toEqual([{ id: "b" }, { id: "a" }, { id: "c" }]);
  });
});
