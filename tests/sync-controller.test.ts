import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSyncController } from "../src/lib/runtime/sync-controller";
import type { SyncResult, WorkerSyncProgressEvent } from "../src/lib/types/app";
import type { WorkerClient } from "../src/lib/runtime/worker-client";

type SyncState = {
  status: string;
  syncBusy: boolean;
  syncStopping: boolean;
  syncProgressPercent: number | null;
  syncPaused: boolean;
};

type MockWorkerClient = {
  setRuntimeSettings: ReturnType<typeof vi.fn>;
  syncIncremental: ReturnType<typeof vi.fn>;
  syncAll: ReturnType<typeof vi.fn>;
  cancelCurrentSync: ReturnType<typeof vi.fn>;
  resetLocalData: ReturnType<typeof vi.fn>;
  getSeriesPayload: ReturnType<typeof vi.fn>;
  getActivityDetail: ReturnType<typeof vi.fn>;
};

function makeSyncResult(overrides: Partial<SyncResult> = {}): SyncResult {
  return {
    ok: true,
    syncMode: "update",
    syncOldestDate: "1970-01-01",
    syncNewestDate: "2026-03-31",
    syncedAt: "2026-03-31T10:00:00Z",
    count: 3,
    fetchedCount: 2,
    splitPoints: 0,
    splitRunsRebuilt: 0,
    splitRunsCached: 0,
    splitRunsFailed: 0,
    splitUnsupported: false,
    browserBlocked: false,
    lookbackDays: "all",
    ...overrides,
  };
}

function makeWorker(
  overrides: Partial<MockWorkerClient> = {},
): MockWorkerClient {
  return {
    setRuntimeSettings: vi.fn(),
    syncIncremental: vi.fn(),
    syncAll: vi.fn(),
    cancelCurrentSync: vi.fn(async () => ({ ok: true, cancelled: true })),
    resetLocalData: vi.fn(),
    getSeriesPayload: vi.fn(),
    getActivityDetail: vi.fn(),
    ...overrides,
  };
}

describe("sync controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("emits progressive refreshes during incremental sync and finalizes cleanly", async () => {
    const state: SyncState = {
      status: "",
      syncBusy: false,
      syncStopping: false,
      syncProgressPercent: null,
      syncPaused: false,
    };
    const refreshCalls: Array<Record<string, unknown>> = [];
    const pausedValues: boolean[] = [];

    const worker = makeWorker({
      syncIncremental: vi.fn(
        async (onProgress?: (event: WorkerSyncProgressEvent) => void) => {
          await onProgress?.({
            phase: "list",
            syncMode: "update",
            count: 3,
            completedActivities: 0,
            totalActivities: 3,
            refreshSuggested: true,
          });
          await onProgress?.({
            phase: "activity",
            syncMode: "update",
            completedActivities: 1,
            totalActivities: 3,
            activityId: "run-1",
            requestStage: "streams",
            isFinalForActivity: true,
            refreshSuggested: true,
          });
          return makeSyncResult();
        },
      ),
    });

    const controller = createSyncController({
      getWorkerClient: () => worker as unknown as WorkerClient,
      getHasApiKey: () => true,
      getHasExistingActivities: () => true,
      getActiveDetailId: () => "run-1",
      getSyncBusy: () => state.syncBusy,
      getSyncStopping: () => state.syncStopping,
      refresh: async (options) => {
        refreshCalls.push({ ...options });
      },
      persistSyncPaused: (value) => pausedValues.push(value),
      applyState: (patch) => Object.assign(state, patch),
    });

    const syncPromise = controller.runIncremental(false);
    await vi.runAllTimersAsync();
    await syncPromise;

    expect(refreshCalls.length).toBeGreaterThan(0);
    expect(refreshCalls.some((call) => call.reloadActiveDetail === true)).toBe(
      true,
    );
    expect(pausedValues).toContain(false);
    expect(state.status).toContain("Update complete.");
    expect(state.syncBusy).toBe(false);
    expect(state.syncProgressPercent).toBeNull();
  });

  it("persists paused state when the sync is aborted", async () => {
    const state: SyncState = {
      status: "",
      syncBusy: false,
      syncStopping: false,
      syncProgressPercent: null,
      syncPaused: false,
    };
    const pausedValues: boolean[] = [];

    const abortError = new Error("Sync cancelled.");
    abortError.name = "AbortError";

    const worker = makeWorker({
      syncIncremental: vi.fn(async () => {
        throw abortError;
      }),
    });

    const controller = createSyncController({
      getWorkerClient: () => worker as unknown as WorkerClient,
      getHasApiKey: () => true,
      getHasExistingActivities: () => false,
      getActiveDetailId: () => null,
      getSyncBusy: () => state.syncBusy,
      getSyncStopping: () => state.syncStopping,
      refresh: async () => undefined,
      persistSyncPaused: (value) => pausedValues.push(value),
      applyState: (patch) => Object.assign(state, patch),
    });

    await controller.runIncremental(false);

    expect(pausedValues).toContain(true);
    expect(state.syncPaused).toBe(true);
    expect(state.status).toContain("paused");
    expect(state.syncBusy).toBe(false);
  });

  it("requests sync cancellation only while a sync is active", async () => {
    const state: SyncState = {
      status: "",
      syncBusy: true,
      syncStopping: false,
      syncProgressPercent: 45,
      syncPaused: false,
    };

    const worker = makeWorker();
    const controller = createSyncController({
      getWorkerClient: () => worker as unknown as WorkerClient,
      getHasApiKey: () => true,
      getHasExistingActivities: () => true,
      getActiveDetailId: () => null,
      getSyncBusy: () => state.syncBusy,
      getSyncStopping: () => state.syncStopping,
      refresh: async () => undefined,
      persistSyncPaused: vi.fn(),
      applyState: (patch) => Object.assign(state, patch),
    });

    await controller.requestStopSync();

    expect(worker.cancelCurrentSync).toHaveBeenCalledTimes(1);
    expect(state.syncStopping).toBe(true);
    expect(state.status).toContain("Pausing sync");
  });
});
