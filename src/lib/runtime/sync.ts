import type { WorkerSyncProgressEvent } from "$lib/types/app";

export type RefreshOptions = {
  reloadActiveDetail: boolean;
  includeStreamsIfMissing: boolean;
  updateStatus: boolean;
};

export function mergeRefreshOptions(
  current: RefreshOptions | null,
  next: Partial<RefreshOptions>,
): RefreshOptions {
  return {
    reloadActiveDetail: Boolean(
      current?.reloadActiveDetail || next.reloadActiveDetail,
    ),
    includeStreamsIfMissing: Boolean(
      current?.includeStreamsIfMissing || next.includeStreamsIfMissing,
    ),
    updateStatus: Boolean(current?.updateStatus || next.updateStatus),
  };
}

export function buildProgressStatus(
  actionLabel: string,
  event: WorkerSyncProgressEvent,
) {
  if (event.phase === "list") {
    return `${actionLabel}... loaded ${event.count ?? 0} run summaries. Enriching newest activities first.`;
  }
  if (event.phase === "profile") {
    return `${actionLabel}... updating athlete profile and HR zones.`;
  }
  if (event.phase === "activity") {
    const completed = Number(event.completedActivities ?? 0);
    const total = Number(event.totalActivities ?? 0);
    if (event.requestStage === "detail") {
      return `${actionLabel}... activity details updated. ${completed}/${total} activities completed.`;
    }
    if (event.requestStage === "streams") {
      return `${actionLabel}... stream enrichment updated. ${completed}/${total} activities completed.`;
    }
    if (event.requestStage === "cached") {
      return `${actionLabel}... reused cached enrichment. ${completed}/${total} activities completed.`;
    }
    return `${actionLabel}... processed ${completed}/${total} activities.`;
  }
  if (event.phase === "complete") {
    return `${actionLabel}... finalizing sync results.`;
  }
  return `${actionLabel}...`;
}

export function buildProgressPercent(event: WorkerSyncProgressEvent) {
  if (event.phase === "complete" || event.phase === "profile") {
    return 100;
  }
  const total = Number(event.totalActivities ?? 0);
  const completed = Number(event.completedActivities ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }
  if (!Number.isFinite(completed) || completed <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}
