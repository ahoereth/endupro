import {
  deriveSelectedDetailRunIds,
  normalizeActivityIds,
} from "$lib/runtime/selection";
import { parseUrlState } from "$lib/runtime/url-state";
import type { RunSummary } from "$lib/types/app";

export type RestoredActivityState = {
  selectedIds: string[];
  selectionAnchorId: string | null;
  detailActivityId: string | null;
};

export type DetailNavigationState = {
  selectedDetailRunIds: string[];
  activeDetailIndex: number;
  newerSelectedActivityId: string | null;
  olderSelectedActivityId: string | null;
};

export type PaceHrClickResolution = {
  selectedIds: string[];
  selectionAnchorId: string | null;
  shouldOpenDetail: boolean;
  preserveSelection: boolean;
};

export function restoreActivityStateFromUrl(
  runs: RunSummary[],
  search: string,
): RestoredActivityState {
  const validIds = runs.map((run) => String(run.id));
  const parsed = parseUrlState(search);
  const selectedIds = normalizeActivityIds(parsed.selectedIds, validIds);
  const detailActivityId =
    normalizeActivityIds(
      parsed.activeDetailId ? [parsed.activeDetailId] : [],
      validIds,
    )[0] ?? null;

  if (detailActivityId && !selectedIds.includes(detailActivityId)) {
    selectedIds.push(detailActivityId);
  }

  return {
    selectedIds,
    selectionAnchorId: selectedIds[0] ?? null,
    detailActivityId,
  };
}

export function computeDetailNavigationState(
  runs: RunSummary[],
  selectedIds: string[],
  activeDetailId: string | null,
): DetailNavigationState {
  const selectedDetailRunIds = deriveSelectedDetailRunIds(runs, selectedIds);
  const activeDetailIndex = activeDetailId
    ? selectedDetailRunIds.findIndex((id) => id === activeDetailId)
    : -1;

  return {
    selectedDetailRunIds,
    activeDetailIndex,
    newerSelectedActivityId:
      activeDetailIndex > 0
        ? selectedDetailRunIds[activeDetailIndex - 1]
        : null,
    olderSelectedActivityId:
      activeDetailIndex >= 0 &&
      activeDetailIndex < selectedDetailRunIds.length - 1
        ? selectedDetailRunIds[activeDetailIndex + 1]
        : null,
  };
}

export function resolvePaceHrActivityClick(
  selectedIds: string[],
  detailOpen: boolean,
  activityId: string,
): PaceHrClickResolution {
  const normalizedId = String(activityId || "").trim();
  if (!normalizedId) {
    return {
      selectedIds,
      selectionAnchorId: selectedIds[0] ?? null,
      shouldOpenDetail: false,
      preserveSelection: false,
    };
  }

  const alreadySelected = selectedIds.includes(normalizedId);
  if (detailOpen || alreadySelected) {
    return {
      selectedIds: alreadySelected ? selectedIds : [normalizedId],
      selectionAnchorId: normalizedId,
      shouldOpenDetail: true,
      preserveSelection: alreadySelected,
    };
  }

  return {
    selectedIds: [normalizedId],
    selectionAnchorId: normalizedId,
    shouldOpenDetail: false,
    preserveSelection: false,
  };
}
