import { describe, expect, it } from "vitest";
import { shouldForceRefreshActivityOnUpdate } from "../src/lib/domain/edupro-core.js";

describe("update enrichment policy", () => {
  it("forces refresh for activities within the last 30 days", () => {
    expect(
      shouldForceRefreshActivityOnUpdate({ date: "2026-03-15" }, "2026-03-31"),
    ).toBe(true);
    expect(
      shouldForceRefreshActivityOnUpdate({ date: "2026-03-01" }, "2026-03-31"),
    ).toBe(true);
  });

  it("does not force refresh for older activities", () => {
    expect(
      shouldForceRefreshActivityOnUpdate({ date: "2026-02-28" }, "2026-03-31"),
    ).toBe(false);
    expect(
      shouldForceRefreshActivityOnUpdate({ date: "2025-12-01" }, "2026-03-31"),
    ).toBe(false);
  });

  it("ignores invalid activity dates", () => {
    expect(
      shouldForceRefreshActivityOnUpdate({ date: null }, "2026-03-31"),
    ).toBe(false);
    expect(
      shouldForceRefreshActivityOnUpdate({ date: "bad-date" }, "2026-03-31"),
    ).toBe(false);
  });
});
