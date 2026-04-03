import * as Comlink from "comlink";
import {
  buildProgressPercent,
  buildProgressStatus,
  mergeRefreshOptions,
  type RefreshOptions,
} from "$lib/runtime/sync";
import type { WorkerClient } from "$lib/runtime/worker-client";
import type { SyncResult, WorkerSyncProgressEvent } from "$lib/types/app";

export type SyncUiStatePatch = {
  status?: string;
  syncBusy?: boolean;
  syncStopping?: boolean;
  syncProgressPercent?: number | null;
  syncPaused?: boolean;
};

type SyncControllerDeps = {
  getWorkerClient(): WorkerClient | null;
  getHasApiKey(): boolean;
  getHasExistingActivities(): boolean;
  getActiveDetailId(): string | null;
  getSyncBusy(): boolean;
  getSyncStopping(): boolean;
  refresh(options: Partial<RefreshOptions>): Promise<void>;
  persistSyncPaused(syncPaused: boolean): void;
  applyState(patch: SyncUiStatePatch): void;
};

export function createSyncController(deps: SyncControllerDeps) {
  let refreshQueue = Promise.resolve();
  let pendingRefreshOptions: RefreshOptions | null = null;
  let liveRefreshTimeout: ReturnType<typeof setTimeout> | null = null;
  let syncTokenSeed = 0;
  let activeSyncToken = 0;

  function queueRefresh(options: Partial<RefreshOptions> = {}) {
    pendingRefreshOptions = mergeRefreshOptions(pendingRefreshOptions, options);
    refreshQueue = refreshQueue
      .catch(() => undefined)
      .then(async () => {
        const nextOptions = pendingRefreshOptions;
        pendingRefreshOptions = null;
        if (!nextOptions) {
          return;
        }
        await deps.refresh(nextOptions);
      });
    return refreshQueue;
  }

  function scheduleLiveRefresh(options: Partial<RefreshOptions> = {}) {
    if (liveRefreshTimeout !== null) {
      pendingRefreshOptions = mergeRefreshOptions(
        pendingRefreshOptions,
        options,
      );
      return;
    }

    pendingRefreshOptions = mergeRefreshOptions(pendingRefreshOptions, options);
    liveRefreshTimeout = setTimeout(() => {
      liveRefreshTimeout = null;
      void queueRefresh();
    }, 120);
  }

  function makeSyncProgressHandler(actionLabel: string, syncToken: number) {
    return Comlink.proxy((event: WorkerSyncProgressEvent) => {
      if (syncToken !== activeSyncToken) {
        return;
      }

      const activeDetailId = deps.getActiveDetailId();
      if (event.refreshSuggested) {
        scheduleLiveRefresh({
          reloadActiveDetail:
            Boolean(activeDetailId) &&
            event.phase === "activity" &&
            event.activityId === activeDetailId,
          includeStreamsIfMissing: false,
          updateStatus: false,
        });
      }

      if (deps.getSyncStopping()) {
        return;
      }

      deps.applyState({
        syncProgressPercent: buildProgressPercent(event),
        status: buildProgressStatus(actionLabel, event),
      });

      if (
        Boolean(activeDetailId) &&
        event.phase === "activity" &&
        event.activityId === activeDetailId
      ) {
        void queueRefresh({
          reloadActiveDetail: true,
          includeStreamsIfMissing: false,
          updateStatus: false,
        });
      }
    });
  }

  async function finalizeSync(syncToken: number) {
    if (activeSyncToken === syncToken) {
      activeSyncToken = 0;
    }
    await queueRefresh({
      reloadActiveDetail: Boolean(deps.getActiveDetailId()),
      includeStreamsIfMissing: false,
      updateStatus: false,
    });
  }

  async function requestStopSync() {
    const workerClient = deps.getWorkerClient();
    if (!workerClient || !deps.getSyncBusy() || deps.getSyncStopping()) {
      return;
    }

    deps.applyState({
      syncStopping: true,
      status: "Pausing sync after the current request finishes...",
    });

    try {
      await workerClient.cancelCurrentSync();
    } catch {
      deps.applyState({
        syncStopping: false,
        status: "Could not stop the current sync.",
      });
    }
  }

  async function runIncremental(auto = false): Promise<SyncResult | null> {
    const workerClient = deps.getWorkerClient();
    if (!workerClient) {
      return null;
    }
    if (!deps.getHasApiKey()) {
      deps.applyState({ status: "Missing API key. Save it first." });
      return null;
    }

    const syncToken = ++syncTokenSeed;
    activeSyncToken = syncToken;
    deps.persistSyncPaused(false);
    deps.applyState({
      syncBusy: true,
      syncStopping: false,
      syncPaused: false,
      syncProgressPercent: 0,
      status: auto
        ? "Auto-updating from Intervals.icu..."
        : "Updating from Intervals.icu...",
    });

    try {
      const result = await workerClient.syncIncremental(
        makeSyncProgressHandler(
          auto
            ? "Auto-updating from Intervals.icu"
            : "Updating from Intervals.icu",
          syncToken,
        ),
      );
      await finalizeSync(syncToken);
      deps.persistSyncPaused(false);
      deps.applyState({
        syncPaused: false,
        status: `${auto ? "Auto-update" : "Update"} complete. Fetched ${result.fetchedCount} activities (${result.count} total)${
          result.browserBlocked
            ? " | Browser CORS blocked detail enrichment, so interval/split/detail streams may be limited."
            : ""
        }.`,
      });
      return result;
    } catch (error) {
      await finalizeSync(syncToken);
      if (error instanceof Error && error.name === "AbortError") {
        deps.persistSyncPaused(true);
        deps.applyState({
          syncPaused: true,
          status: `${auto ? "Auto-update" : "Update"} paused. Partial progress was kept locally. Run Update again to continue.`,
        });
        return null;
      }

      deps.applyState({
        status: error instanceof Error ? error.message : "Sync failed.",
      });
      return null;
    } finally {
      deps.applyState({
        syncBusy: false,
        syncStopping: false,
        syncProgressPercent: null,
      });
    }
  }

  async function runFetchAll(): Promise<SyncResult | null> {
    const workerClient = deps.getWorkerClient();
    if (!workerClient) {
      return null;
    }
    if (!deps.getHasApiKey()) {
      deps.applyState({ status: "Missing API key. Save it first." });
      return null;
    }

    const hadExistingActivities = deps.getHasExistingActivities();
    const syncToken = ++syncTokenSeed;
    activeSyncToken = syncToken;
    deps.persistSyncPaused(false);
    deps.applyState({
      syncBusy: true,
      syncStopping: false,
      syncPaused: false,
      syncProgressPercent: 0,
      status: hadExistingActivities
        ? "Reloading all historic data from Intervals.icu..."
        : "Fetching all historic data from Intervals.icu...",
    });

    try {
      const actionLabel = hadExistingActivities
        ? "Reloading all historic data from Intervals.icu"
        : "Fetching all historic data from Intervals.icu";
      const result = await workerClient.syncAll(
        makeSyncProgressHandler(actionLabel, syncToken),
      );
      await finalizeSync(syncToken);
      deps.persistSyncPaused(false);
      deps.applyState({
        syncPaused: false,
        status: `${hadExistingActivities ? "Reload all" : "Fetch all"} complete. Pulled ${result.count} run activities${
          result.browserBlocked
            ? " | Browser CORS blocked detail enrichment, so interval/split/detail streams may be limited."
            : ""
        }.`,
      });
      return result;
    } catch (error) {
      await finalizeSync(syncToken);
      if (error instanceof Error && error.name === "AbortError") {
        deps.persistSyncPaused(true);
        deps.applyState({
          syncPaused: true,
          status: `${hadExistingActivities ? "Hard reload" : "Fetch all"} paused. Partial progress was kept locally. Resume with Update or restart with Hard Reload Data.`,
        });
        return null;
      }

      deps.applyState({
        status: error instanceof Error ? error.message : "Sync failed.",
      });
      return null;
    } finally {
      deps.applyState({
        syncBusy: false,
        syncStopping: false,
        syncProgressPercent: null,
      });
    }
  }

  function dispose() {
    if (liveRefreshTimeout !== null) {
      clearTimeout(liveRefreshTimeout);
      liveRefreshTimeout = null;
    }
  }

  return {
    queueRefresh,
    scheduleLiveRefresh,
    requestStopSync,
    runIncremental,
    runFetchAll,
    dispose,
  };
}
