import * as Comlink from "comlink";
import type { RuntimeSettings } from "$lib/runtime/settings";
import type {
  ActivityDetailPayload,
  SeriesPayload,
  SyncResult,
  WorkerSyncProgressEvent,
} from "$lib/types/app";

export type WorkerClient = Comlink.Remote<WorkerApi>;

type WorkerApi = {
  setRuntimeSettings(
    settingsSnapshot: RuntimeSettings,
  ): Promise<{ ok: boolean }>;
  syncIncremental(
    onProgress?: (event: WorkerSyncProgressEvent) => void,
  ): Promise<SyncResult>;
  syncAll(
    onProgress?: (event: WorkerSyncProgressEvent) => void,
  ): Promise<SyncResult>;
  cancelCurrentSync(): Promise<{ ok: boolean; cancelled: boolean }>;
  resetLocalData(payload: {
    scope: "clear-activities" | "delete-all";
  }): Promise<unknown>;
  getSeriesPayload(): Promise<SeriesPayload>;
  getActivityDetail(payload: {
    activityId: string;
    includeStreamsIfMissing?: boolean;
  }): Promise<ActivityDetailPayload>;
};

let workerApiPromise: Promise<WorkerClient> | null = null;
let workerInstance: Worker | null = null;

export function getWorkerClient() {
  if (!workerApiPromise) {
    workerInstance = new Worker(
      new URL("../worker/edupro.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    workerApiPromise = Promise.resolve(Comlink.wrap<WorkerApi>(workerInstance));
  }

  return workerApiPromise;
}

export function terminateWorkerClient() {
  workerInstance?.terminate();
  workerInstance = null;
  workerApiPromise = null;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    terminateWorkerClient();
  });
}
