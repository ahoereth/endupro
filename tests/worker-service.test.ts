import { beforeEach, describe, expect, it } from "vitest";
import { clearRuntimeSettings } from "../src/lib/runtime/settings";
import { db } from "../src/lib/worker/db";
import { EduproWorkerService } from "../src/lib/worker/service";

describe("EduproWorkerService", () => {
  beforeEach(async () => {
    await db.activities.clear();
    await db.syncMeta.clear();
    await db.derivedCache.clear();
    clearRuntimeSettings();
  });

  it("resets local activity data while keeping runtime settings in memory", async () => {
    const service = new EduproWorkerService();
    await service.setRuntimeSettings({
      apiKey: "secret",
      runningThresholdHrOverride: null,
      hrZonesRunningOverride: [],
    });

    const result = await service.resetLocalData({ scope: "clear-activities" });
    const meta = await db.syncMeta.get("singleton");

    expect(result).toMatchObject({
      ok: true,
      mode: "clear-activities",
      hasApiKey: true,
    });
    expect(meta?.syncedAt).toBeNull();
  });

  it("returns an empty initial series payload", async () => {
    const service = new EduproWorkerService();
    const payload = await service.getSeriesPayload();

    expect(payload.activityCount).toBe(0);
    expect(payload.series).toEqual([]);
    expect(payload.runs).toEqual([]);
    expect(payload.lookbackDays).toBe("all");
  });

  it("reports no-op cancellation when no sync is active", () => {
    const service = new EduproWorkerService();

    expect(service.cancelCurrentSync()).toEqual({ ok: true, cancelled: false });
  });
});
