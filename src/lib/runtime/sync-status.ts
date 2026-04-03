import type { WorkerSyncProgressEvent } from "$lib/types/app";

export function buildProgressStatus(
  actionLabel: string,
  _event: WorkerSyncProgressEvent,
) {
  return `${actionLabel}...`;
}
