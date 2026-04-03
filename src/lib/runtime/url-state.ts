const ACTIVITY_QUERY_PARAM = "activity";
const SELECTED_QUERY_PARAM = "selected";

export type ParsedUrlState = {
  selectedIds: string[];
  activeDetailId: string | null;
};

export function serializeUrlState(
  selectedIds: string[],
  activeDetailId: string | null,
) {
  return JSON.stringify({
    selectedIds,
    activeDetailId,
  });
}

export function buildUrlSearch(
  selectedIds: string[],
  activeDetailId: string | null,
) {
  const searchParams = new URLSearchParams();
  if (selectedIds.length) {
    searchParams.set(SELECTED_QUERY_PARAM, selectedIds.join(","));
  }
  if (activeDetailId && selectedIds.includes(activeDetailId)) {
    searchParams.set(ACTIVITY_QUERY_PARAM, activeDetailId);
  }
  return searchParams.toString();
}

export function parseUrlState(search: string): ParsedUrlState {
  const url = new URL(
    search.startsWith("http")
      ? search
      : `http://localhost${search.startsWith("?") ? search : `?${search}`}`,
  );
  const selectedIds = String(url.searchParams.get(SELECTED_QUERY_PARAM) || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const activeDetailId =
    String(url.searchParams.get(ACTIVITY_QUERY_PARAM) || "").trim() || null;
  return { selectedIds, activeDetailId };
}
