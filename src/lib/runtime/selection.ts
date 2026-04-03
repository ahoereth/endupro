import type {
  RecentActivitiesSelectionEvent,
  RunSummary,
} from "$lib/types/app";

export function normalizeActivityIds(
  values: Array<string | null | undefined>,
  validIds: string[],
) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => value.length > 0 && validIds.includes(value))
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

export function reduceRecentActivitySelection(
  currentSelectedIds: string[],
  selectionAnchorId: string | null,
  visibleRuns: RunSummary[],
  event: RecentActivitiesSelectionEvent,
) {
  const { activityId, shiftKey, altKey } = event;
  const visibleIds = visibleRuns.map((run) => String(run.id));
  const currentIndex = visibleIds.indexOf(activityId);
  const anchorIndex = selectionAnchorId
    ? visibleIds.indexOf(selectionAnchorId)
    : -1;
  let nextSelectedIds = currentSelectedIds;

  if (shiftKey && currentIndex >= 0) {
    const safeAnchor = anchorIndex >= 0 ? anchorIndex : currentIndex;
    const [min, max] = [safeAnchor, currentIndex].sort(
      (left, right) => left - right,
    );
    const nextRange = visibleIds.slice(min, max + 1);
    nextSelectedIds = altKey
      ? Array.from(new Set([...currentSelectedIds, ...nextRange]))
      : nextRange;
  } else if (altKey) {
    nextSelectedIds = currentSelectedIds.includes(activityId)
      ? currentSelectedIds.filter((id) => id !== activityId)
      : [...currentSelectedIds, activityId];
  } else if (
    currentSelectedIds.length === 1 &&
    currentSelectedIds[0] === activityId
  ) {
    nextSelectedIds = [];
  } else {
    nextSelectedIds = [activityId];
  }

  return {
    selectedIds: nextSelectedIds,
    selectionAnchorId: nextSelectedIds.length ? activityId : null,
  };
}

export function deriveSelectedDetailRunIds(
  runs: RunSummary[],
  selectedIds: string[],
) {
  return selectedIds
    .map((id) => runs.find((run) => String(run.id) === String(id)))
    .filter(Boolean)
    .sort(
      (a, b) =>
        Date.parse(b.startDateTime || b.date || "") -
        Date.parse(a.startDateTime || a.date || ""),
    )
    .map((run) => String(run!.id));
}
