const statusEl = document.getElementById("status");
const lastSyncValueEl = document.getElementById("last-sync-value");
const latestActivityNameValueEl = document.getElementById("latest-activity-name-value");
const latestActivityTimeValueEl = document.getElementById("latest-activity-time-value");
const recentActivitiesListEl = document.getElementById("recent-activities-list");
const recentActivitiesCountEl = document.getElementById("recent-activities-count");
const recentActivitiesEmptyEl = document.getElementById("recent-activities-empty");
const recentActivitiesSearchEl = document.getElementById("recent-activities-search");
const leftColumnEl = document.getElementById("left-column");
const mobileLeftDrawerToggleEl = document.getElementById("mobile-left-drawer-toggle");
const mobileLeftDrawerCloseEl = document.getElementById("mobile-left-drawer-close");
const mobileLeftDrawerBackdropEl = document.getElementById("mobile-left-drawer-backdrop");
const appGridEl = document.getElementById("app-grid");
const latestValuesEl = document.getElementById("latest-values");
const chartRootEl = document.getElementById("chart-root");
const paceHrRootEl = document.getElementById("pace-hr-root");
const paceHrSummaryEl = document.getElementById("pace-hr-summary");
const paceHrComparableToggleEl = document.getElementById("pace-hr-comparable-toggle");
const paceHrComparableStrictnessEl = document.getElementById("pace-hr-comparable-strictness");
const paceHrComparableSummaryEl = document.getElementById("pace-hr-comparable-summary");
const paceHrComparableResetEl = document.getElementById("pace-hr-comparable-reset");
const heatmapRootEl = document.getElementById("heatmap-root");
const heatmapSummaryEl = document.getElementById("heatmap-summary");
const heatmapBinSizeEl = document.getElementById("heatmap-bin-size");
const paceAxisControlsEl = document.getElementById("pace-axis-controls");
const paceAxisMinEl = document.getElementById("pace-axis-min");
const paceAxisMaxEl = document.getElementById("pace-axis-max");
const paceAxisFillEl = document.getElementById("pace-axis-fill");
const paceAxisLabelEl = document.getElementById("pace-axis-label");
const settingsFormEl = document.getElementById("settings-form");
const apiKeyEl = document.getElementById("api-key");
const apiKeyStateEl = document.getElementById("api-key-state");
const hrZoneOverridesFormEl = document.getElementById("hr-zone-overrides-form");
const hrZoneOverridesRootEl = document.getElementById("hr-zone-overrides-root");
const hrZoneOverridesResetEl = document.getElementById("hr-zone-overrides-reset");
const hrZoneOverridesStateEl = document.getElementById("hr-zone-overrides-state");
const hrZoneSettingsSummaryEl = document.getElementById("hr-zone-settings-summary");
const fetchAllButtonEl = document.getElementById("fetch-all-button");
const syncButtonEl = document.getElementById("sync-button");
const clearActivityDataButtonEl = document.getElementById("clear-activity-data-button");
const deleteAllDataButtonEl = document.getElementById("delete-all-data-button");
const scrubControlsEl = document.getElementById("scrub-controls");
const scrubStartEl = document.getElementById("timeline-start");
const scrubEndEl = document.getElementById("timeline-end");
const scrubFillEl = document.getElementById("timeline-range-fill");
const scrubLabelEl = document.getElementById("scrub-label");
const timelineRangeSummaryEl = document.getElementById("timeline-range-summary");
const timelineRangeWarningEl = document.getElementById("timeline-range-warning");
const timelinePresetButtons = Array.from(document.querySelectorAll(".timeline-preset-button"));
const tolerancePanelEl = document.getElementById("tolerance-panel");
const toleranceBadgeEl = document.getElementById("tolerance-badge");
const toleranceBaselineIndicatorEl = document.getElementById("tolerance-baseline-indicator");
const toleranceMessageEl = document.getElementById("tolerance-message");
const toleranceMetricsEl = document.getElementById("tolerance-metrics");
const foundationalStatsSummaryEl = document.getElementById("foundational-stats-summary");
const foundationalStatsRootEl = document.getElementById("foundational-stats-root");
const monotonyVizEl = document.getElementById("monotony-viz");
const monotonyValueEl = document.getElementById("monotony-value");
const monotonyMarkerEl = document.getElementById("monotony-marker");
const monotonyTooltipEl = document.getElementById("monotony-tooltip");
const activityDetailOverlayEl = document.getElementById("activity-detail-overlay");
const activityDetailTitleEl = document.getElementById("activity-detail-title");
const activityDetailCloseEl = document.getElementById("activity-detail-close");
const activityDetailContentEl = document.getElementById("activity-detail-content");
const resyncNoticeEl = document.getElementById("resync-notice");
const resyncNoticeTextEl = document.getElementById("resync-notice-text");

const VISIBLE_LINES_STORAGE_KEY = "fitboard_visible_lines";
const EXTRA_LINES_STORAGE_KEY = "fitboard_extra_lines";
const VIEW_RANGE_STORAGE_KEY = "fitboard_view_range";
const PACE_AXIS_RANGE_STORAGE_KEY = "fitboard_pace_axis_range";
const PACE_HR_COLOR_RANGE_STORAGE_KEY = "fitboard_pace_hr_color_range";
const PACE_HR_COMPARABLE_STORAGE_KEY = "fitboard_pace_hr_comparable";
const DEV_RELOAD_SNAPSHOT_STORAGE_KEY = "fitboard_dev_reload_snapshot";
const ACTIVITY_DETAIL_TITLE_DEFAULT = "Activity Details";
const ACTIVITY_QUERY_PARAM = "activity";
const WINDOW_DAYS_DEFAULT = 90;
const RAMP_CAP_LINE_COLOR = "var(--ramp-cap-line)";
const API_KEY_PLACEHOLDER_DEFAULT = "Paste your Intervals.icu API key";
const API_KEY_PLACEHOLDER_STORED = "API key stored locally (enter new key to replace)";
const PACE_AXIS_SLIDER_STEPS = 1000;
const PACE_AXIS_MIN_GAP_STEPS = 5;
const PACE_AXIS_MIN_SPAN = 0.05;
const PACE_HR_COLOR_SLIDER_STEPS = 1000;
const PACE_HR_COLOR_MIN_GAP_STEPS = 5;
const PACE_HR_COLOR_PRESET_WINDOWS = [90, 180, 360];
const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_BIN_SECONDS_DEFAULT = 30;
const HEATMAP_COLOR_SLIDER_STEPS = 1000;
const HEATMAP_COLOR_MIN_GAP_STEPS = 5;
const HEATMAP_COLOR_MIN_SPAN = 1;
const SELECTED_ACTIVITY_HIGHLIGHT = "#f97316";
const COMPARABLE_STRICTNESS_OPTIONS = ["loose", "normal", "strict"];
const COMPARABLE_THRESHOLD_BY_STRICTNESS = {
  loose: {
    durationMinRatio: 0.73,
    durationMaxRatio: 1.3375,
    elevationDeltaM: 162,
    temperatureDeltaC: 10.8
  },
  normal: {
    durationMinRatio: 0.8,
    durationMaxRatio: 1.25,
    elevationDeltaM: 120,
    temperatureDeltaC: 8
  },
  strict: {
    durationMinRatio: 0.87,
    durationMaxRatio: 1.1625,
    elevationDeltaM: 78,
    temperatureDeltaC: 5.2
  }
};

const SERIES_META = [
  { key: "sum7", days: 7, label: "7 day sum", color: "var(--sum7)" },
  { key: "toleranceKmModel", days: null, label: "Tolerance km (model)", color: "var(--tolerance-model)" },
  { key: "sum7ma30", days: null, label: "30d avg of 7d sum", color: "var(--sum7ma30)" },
  { key: "sum7ma90", days: null, label: "90d avg of 7d sum", color: "var(--sum7ma90)" },
  { key: "sum14", days: 14, label: "14 day sum", color: "var(--sum14)" },
  { key: "sum30", days: 30, label: "30 day sum", color: "var(--sum30)" },
  { key: "sum90", days: 90, label: "90 day sum", color: "var(--sum90)" },
  { key: "sum180", days: 180, label: "180 day sum", color: "var(--sum180)" }
];

const OLD_DEFAULT_VISIBLE_LINE_KEYS = ["sum7", "toleranceKmModel", "sum7ma30", "sum7ma90", "sum14"];
const DEFAULT_VISIBLE_LINE_KEYS = ["sum7", "sum7ma90"];
const visibleLines = new Set(DEFAULT_VISIBLE_LINE_KEYS);
let latestSeriesData = [];
let latestPaceHrPoints = [];
let viewStartIndex = null;
let viewEndIndex = null;
let followLatest = true;
let hasStoredApiKey = false;
let showRampCapLine = true;
let showRunBars = true;
let scrubWindowDrag = null;
let paceAxisBoundMin = null;
let paceAxisBoundMax = null;
let paceAxisRangeMin = null;
let paceAxisRangeMax = null;
let paceHrColorBoundMin = null;
let paceHrColorBoundMax = null;
let paceHrColorRangeMin = null;
let paceHrColorRangeMax = null;
let paceHrColorRangeMode = "absolute";
let paceHrColorRangeWindowDays = null;
let heatmapBinSeconds = HEATMAP_BIN_SECONDS_DEFAULT;
let heatmapColorBoundMin = null;
let heatmapColorBoundMax = null;
let heatmapColorRangeMin = null;
let heatmapColorRangeMax = null;
let pendingViewRange = null;
let latestRunsData = [];
let latestHrZonesRunning = [];
let latestDefaultHrZonesRunning = [];
let latestHrZonesRunningOverride = [];
let latestRunningThresholdHr = null;
let latestDefaultRunningThresholdHr = null;
let latestRunningThresholdHrOverride = null;
const selectedActivityIds = new Set();
let selectionAnchorActivityId = null;
let latestRecentActivityIds = [];
let comparableRunsEnabled = false;
let comparableRunsStrictness = "normal";
const activityDetailCache = new Map();
const activityDetailInFlight = new Map();
let activeDetailActivityId = null;
let activityDetailRequestSerial = 0;
let recentActivitiesSearchQuery = "";
let pendingDevReloadSnapshot = null;
let devReloadCurrentToken = null;
let pendingUrlActivityId = null;
let syncInProgress = false;
let latestSeriesNoticeData = null;

function setSyncControlsDisabled(disabled) {
  const next = Boolean(disabled);
  if (fetchAllButtonEl) {
    fetchAllButtonEl.disabled = next;
  }
  if (syncButtonEl) {
    syncButtonEl.disabled = next;
  }
}

function setResetControlsDisabled(disabled) {
  const next = Boolean(disabled);
  if (clearActivityDataButtonEl) {
    clearActivityDataButtonEl.disabled = next;
  }
  if (deleteAllDataButtonEl) {
    deleteAllDataButtonEl.disabled = next;
  }
}

function renderResyncNotice(data) {
  if (!resyncNoticeEl || !resyncNoticeTextEl) {
    return;
  }
  if (syncInProgress) {
    resyncNoticeEl.hidden = true;
    return;
  }

  const staleCount = Number(data?.staleActivityMetaCount);
  const requiredVersion = Number(data?.activityMetaSourceVersion);
  const activityCount = Number(data?.activityCount);
  const resyncNeeded = data?.resyncNeeded === true;
  const hrZonesMissing = data?.hrZonesMissing === true;
  const shouldShow =
    hasStoredApiKey &&
    Number.isFinite(activityCount) &&
    activityCount > 0 &&
    resyncNeeded &&
    Number.isFinite(requiredVersion) &&
    requiredVersion > 0;

  if (!shouldShow) {
    resyncNoticeEl.hidden = true;
    resyncNoticeTextEl.textContent = "";
    return;
  }

  const staleMessage =
    Number.isFinite(staleCount) && staleCount > 0
      ? `${Math.round(staleCount)} synced ${staleCount === 1 ? "activity needs" : "activities need"} metadata refresh`
      : "";
  const zonesMessage = hrZonesMissing ? "running threshold-based HR zones are missing" : "";
  const combinedReason = [staleMessage, zonesMessage].filter(Boolean).join(", and ");
  const message = `${combinedReason || "Synced data is outdated"}; run Update or Reload All to refresh data from Intervals.icu.`;
  if (!message.trim()) {
    resyncNoticeTextEl.textContent = "";
    resyncNoticeEl.hidden = true;
    return;
  }
  resyncNoticeTextEl.textContent = message;
  resyncNoticeEl.hidden = false;
}

function updateFetchAllButtonLabel(activityCount) {
  if (!fetchAllButtonEl) {
    return;
  }

  const count = Number(activityCount);
  fetchAllButtonEl.textContent = Number.isFinite(count) && count > 0 ? "Reload All" : "Fetch All";
}

function setStatus(message) {
  statusEl.textContent = message;
}

function normalizeActivityId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function getSingleSelectedActivityId() {
  const selectedIds = Array.from(getSelectedActivityIdSet());
  return selectedIds.length === 1 ? selectedIds[0] : null;
}

function isActivityDetailOpen() {
  return Boolean(activityDetailOverlayEl?.classList.contains("is-open"));
}

function isMobilePanelsLayout() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 1080px)").matches;
}

function syncMobilePanelBodyState() {
  const hasOpenMobilePanel =
    isMobilePanelsLayout() && (Boolean(leftColumnEl?.classList.contains("is-mobile-open")) || isActivityDetailOpen());
  document.body.classList.toggle("has-mobile-panel-open", hasOpenMobilePanel);
}

function setMobileLeftDrawerOpen(open) {
  const shouldOpen = Boolean(open) && isMobilePanelsLayout();
  if (leftColumnEl) {
    leftColumnEl.classList.toggle("is-mobile-open", shouldOpen);
  }
  if (mobileLeftDrawerBackdropEl) {
    mobileLeftDrawerBackdropEl.classList.toggle("is-open", shouldOpen);
  }
  if (mobileLeftDrawerToggleEl) {
    mobileLeftDrawerToggleEl.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }
  syncMobilePanelBodyState();
}

function setActivityDetailOpenState(open) {
  const shouldOpen = Boolean(open);
  if (activityDetailOverlayEl) {
    activityDetailOverlayEl.classList.toggle("is-open", shouldOpen);
    activityDetailOverlayEl.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  }
  if (appGridEl) {
    appGridEl.classList.toggle("is-detail-open", shouldOpen);
  }
  if (shouldOpen && isMobilePanelsLayout()) {
    setMobileLeftDrawerOpen(false);
  }
  syncMobilePanelBodyState();
}

function readActivityIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return normalizeActivityId(params.get(ACTIVITY_QUERY_PARAM));
  } catch {
    return null;
  }
}

function persistActivityIdToUrl(activityId) {
  try {
    const url = new URL(window.location.href);
    const nextId = normalizeActivityId(activityId);
    if (nextId) {
      url.searchParams.set(ACTIVITY_QUERY_PARAM, nextId);
    } else {
      url.searchParams.delete(ACTIVITY_QUERY_PARAM);
    }
    const nextHref = `${url.pathname}${url.search}${url.hash}`;
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextHref !== currentHref) {
      window.history.replaceState(window.history.state, "", nextHref);
    }
  } catch {
    // Ignore URL persistence errors.
  }
}

function captureDevReloadSnapshot() {
  const payload = {
    reason: "dev-live-reload",
    capturedAt: Date.now(),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    recentActivitiesScrollTop: recentActivitiesListEl ? recentActivitiesListEl.scrollTop : 0,
    recentActivitiesSearchQuery: String(recentActivitiesSearchEl?.value ?? recentActivitiesSearchQuery ?? "")
  };

  try {
    sessionStorage.setItem(DEV_RELOAD_SNAPSHOT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore snapshot persistence failures and reload without restoring ephemeral UI state.
  }
}

function consumeDevReloadSnapshot() {
  try {
    const raw = sessionStorage.getItem(DEV_RELOAD_SNAPSHOT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    sessionStorage.removeItem(DEV_RELOAD_SNAPSHOT_STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.reason !== "dev-live-reload") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function applyPendingDevReloadSnapshotEarly() {
  if (!pendingDevReloadSnapshot || typeof pendingDevReloadSnapshot !== "object") {
    return;
  }

  const query = pendingDevReloadSnapshot.recentActivitiesSearchQuery;
  if (typeof query === "string") {
    recentActivitiesSearchQuery = query;
    if (recentActivitiesSearchEl) {
      recentActivitiesSearchEl.value = query;
    }
  }
}

async function restorePendingDevReloadSnapshot() {
  const snapshot = pendingDevReloadSnapshot;
  pendingDevReloadSnapshot = null;
  if (!snapshot || typeof snapshot !== "object") {
    return;
  }

  const scrollX = Number(snapshot.scrollX);
  const scrollY = Number(snapshot.scrollY);
  const recentActivitiesScrollTop = Number(snapshot.recentActivitiesScrollTop);
  requestAnimationFrame(() => {
    if (Number.isFinite(scrollX) && Number.isFinite(scrollY)) {
      window.scrollTo(scrollX, scrollY);
    }
    if (recentActivitiesListEl && Number.isFinite(recentActivitiesScrollTop)) {
      recentActivitiesListEl.scrollTop = recentActivitiesScrollTop;
    }
  });
}

async function setupDevLiveReload() {
  if (typeof window.EventSource !== "function") {
    return;
  }

  let meta;
  try {
    const metaResponse = await fetch("/api/dev/reload-meta", { cache: "no-store" });
    if (!metaResponse.ok) {
      return;
    }
    meta = await metaResponse.json();
  } catch {
    return;
  }

  if (!meta || !meta.enabled) {
    return;
  }

  devReloadCurrentToken = typeof meta.token === "string" ? meta.token : null;
  const source = new EventSource("/api/dev/reload-events");
  source.addEventListener("reload-token", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data || "{}");
    } catch {
      return;
    }

    const nextToken = typeof payload?.token === "string" ? payload.token : "";
    if (!nextToken) {
      return;
    }

    if (!devReloadCurrentToken) {
      devReloadCurrentToken = nextToken;
      return;
    }
    if (nextToken === devReloadCurrentToken) {
      return;
    }

    devReloadCurrentToken = nextToken;
    captureDevReloadSnapshot();
    window.location.reload();
  });
}

function persistActivityDetailViewState() {
  try {
    persistActivityIdToUrl(getSingleSelectedActivityId());
  } catch {
    // Ignore storage errors.
  }
}

async function restoreActivityDetailFromUrlState() {
  if (!activityDetailOverlayEl || !activityDetailContentEl || isActivityDetailOpen()) {
    pendingUrlActivityId = null;
    return;
  }

  const urlActivityId = normalizeActivityId(pendingUrlActivityId);
  if (!urlActivityId) {
    pendingUrlActivityId = null;
    return;
  }

  const existsInRuns = latestRunsData.some((run) => normalizeActivityId(run?.id) === urlActivityId);
  if (!existsInRuns) {
    persistActivityIdToUrl(null);
    pendingUrlActivityId = null;
    return;
  }

  await openActivityDetail(urlActivityId, { selectActivity: true });
  pendingUrlActivityId = null;
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getActiveTimelineDateRange() {
  if (!Array.isArray(latestSeriesData) || !latestSeriesData.length || viewStartIndex === null || viewEndIndex === null) {
    return null;
  }

  const maxIndex = latestSeriesData.length - 1;
  const startIndex = Math.max(0, Math.min(maxIndex, Math.round(viewStartIndex)));
  const endIndex = Math.max(startIndex, Math.min(maxIndex, Math.round(viewEndIndex)));
  const startDate = String(latestSeriesData[startIndex]?.date || "");
  const endDate = String(latestSeriesData[endIndex]?.date || "");
  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    return null;
  }

  return { startDate, endDate };
}

function updateTimelinePresetButtons(series, startIndex, endIndex) {
  if (!timelinePresetButtons.length || !Array.isArray(series) || !series.length) {
    return;
  }

  const maxIndex = series.length - 1;
  const isAll = startIndex <= 0 && endIndex >= maxIndex;
  const windowLength = Math.max(1, endIndex - startIndex + 1);

  for (const button of timelinePresetButtons) {
    const rangeDays = button.getAttribute("data-range-days");
    let isActive = false;
    if (rangeDays === "all") {
      isActive = isAll;
    } else {
      const days = Number(rangeDays);
      isActive = Number.isFinite(days) && days > 0 && !isAll && endIndex >= maxIndex && windowLength === days;
    }
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function getSelectedActivityIdSet() {
  const ids = new Set();
  for (const value of selectedActivityIds) {
    const normalized = normalizeActivityId(value);
    if (normalized) {
      ids.add(normalized);
    }
  }
  return ids;
}

function getSelectedActivities() {
  const selectedIds = getSelectedActivityIdSet();
  if (!selectedIds.size || !Array.isArray(latestRunsData)) {
    return [];
  }

  return latestRunsData.filter((run) => selectedIds.has(normalizeActivityId(run?.id)));
}

function getSelectedActivityDateKeys() {
  const keys = new Set();
  for (const run of getSelectedActivities()) {
    const date = String(run?.date || "");
    if (isDateKey(date)) {
      keys.add(date);
    }
  }
  return keys;
}

function normalizeComparableStrictness(value) {
  const normalized = String(value || "").toLowerCase();
  return COMPARABLE_STRICTNESS_OPTIONS.includes(normalized) ? normalized : "normal";
}

function formatComparableStrictnessLabel(value) {
  const strictness = normalizeComparableStrictness(value);
  return strictness.charAt(0).toUpperCase() + strictness.slice(1);
}

function getComparableThresholds(value) {
  return COMPARABLE_THRESHOLD_BY_STRICTNESS[normalizeComparableStrictness(value)] || COMPARABLE_THRESHOLD_BY_STRICTNESS.normal;
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPositiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function median(values) {
  const usable = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!usable.length) {
    return null;
  }

  const sorted = usable.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function buildRunsInDateRange(rangeStartDate, rangeEndDate) {
  if (!Array.isArray(latestRunsData) || !latestRunsData.length) {
    return [];
  }

  return latestRunsData.filter((run) => {
    const date = String(run?.date || "");
    if (!isDateKey(date)) {
      return false;
    }
    if (rangeStartDate && date < rangeStartDate) {
      return false;
    }
    if (rangeEndDate && date > rangeEndDate) {
      return false;
    }
    return true;
  });
}

function buildRunLookup(runs) {
  const byId = new Map();
  for (const run of runs) {
    const id = normalizeActivityId(run?.id);
    if (id) {
      byId.set(id, run);
    }
  }
  return byId;
}

function findLatestRun(runs) {
  let latest = null;
  let latestTs = Number.NEGATIVE_INFINITY;
  for (const run of runs) {
    const ts = getRunTimestampMs(run);
    if (ts > latestTs) {
      latestTs = ts;
      latest = run;
    }
  }
  return latest;
}

function pickComparableReferenceRun(runsInRange, runById) {
  const selectedIds = Array.from(getSelectedActivityIdSet());
  if (selectedIds.length === 1) {
    const selectedRun = runById.get(selectedIds[0]);
    if (selectedRun) {
      return selectedRun;
    }
  }

  return findLatestRun(runsInRange);
}

function evaluateComparableRun(candidate, reference, thresholds) {
  const candidateId = normalizeActivityId(candidate?.id);
  const referenceId = normalizeActivityId(reference?.id);
  if (candidateId && referenceId && candidateId === referenceId) {
    return {
      comparable: true,
      durationOrDistanceUsed: false,
      elevationUsed: false,
      temperatureUsed: false
    };
  }

  const candidateMoving = toPositiveNumber(candidate?.movingTimeSec);
  const referenceMoving = toPositiveNumber(reference?.movingTimeSec);
  const candidateDistance = toPositiveNumber(candidate?.distanceKm);
  const referenceDistance = toPositiveNumber(reference?.distanceKm);
  const candidateElevation = toFiniteNumber(candidate?.elevationGainM);
  const referenceElevation = toFiniteNumber(reference?.elevationGainM);
  const candidateTemp = toFiniteNumber(candidate?.avgTempC);
  const referenceTemp = toFiniteNumber(reference?.avgTempC);

  let comparable = true;
  let checksApplied = 0;
  let durationOrDistanceUsed = false;
  let elevationUsed = false;
  let temperatureUsed = false;

  if (candidateMoving && referenceMoving) {
    const ratio = candidateMoving / referenceMoving;
    durationOrDistanceUsed = true;
    checksApplied += 1;
    if (ratio < thresholds.durationMinRatio || ratio > thresholds.durationMaxRatio) {
      comparable = false;
    }
  } else if (candidateDistance && referenceDistance) {
    const ratio = candidateDistance / referenceDistance;
    durationOrDistanceUsed = true;
    checksApplied += 1;
    if (ratio < thresholds.durationMinRatio || ratio > thresholds.durationMaxRatio) {
      comparable = false;
    }
  }

  if (Number.isFinite(candidateElevation) && Number.isFinite(referenceElevation)) {
    elevationUsed = true;
    checksApplied += 1;
    if (Math.abs(candidateElevation - referenceElevation) > thresholds.elevationDeltaM) {
      comparable = false;
    }
  }

  if (Number.isFinite(candidateTemp) && Number.isFinite(referenceTemp)) {
    temperatureUsed = true;
    checksApplied += 1;
    if (Math.abs(candidateTemp - referenceTemp) > thresholds.temperatureDeltaC) {
      comparable = false;
    }
  }

  if (checksApplied === 0) {
    comparable = false;
  }

  return {
    comparable,
    durationOrDistanceUsed,
    elevationUsed,
    temperatureUsed
  };
}

function formatComparableDimensionSummary(thresholds) {
  return `duration/distance ${thresholds.durationMinRatio.toFixed(2)}x-${thresholds.durationMaxRatio.toFixed(
    2
  )}x, elevation +/-${Math.round(thresholds.elevationDeltaM)}m, temperature +/-${thresholds.temperatureDeltaC.toFixed(1)}C`;
}

function buildComparableRunContext(rangeStartDate, rangeEndDate) {
  const runsInRange = buildRunsInDateRange(rangeStartDate, rangeEndDate);
  const runById = buildRunLookup(runsInRange);
  const referenceRun = pickComparableReferenceRun(runsInRange, runById);
  const thresholds = getComparableThresholds(comparableRunsStrictness);

  const comparableRunIds = new Set();
  let durationOrDistanceChecks = 0;
  let elevationChecks = 0;
  let temperatureChecks = 0;

  if (referenceRun) {
    const referenceId = normalizeActivityId(referenceRun.id);
    if (referenceId) {
      comparableRunIds.add(referenceId);
    }

    for (const run of runsInRange) {
      const runId = normalizeActivityId(run?.id);
      if (!runId) {
        continue;
      }

      const comparison = evaluateComparableRun(run, referenceRun, thresholds);
      if (comparison.durationOrDistanceUsed) {
        durationOrDistanceChecks += 1;
      }
      if (comparison.elevationUsed) {
        elevationChecks += 1;
      }
      if (comparison.temperatureUsed) {
        temperatureChecks += 1;
      }
      if (comparison.comparable) {
        comparableRunIds.add(runId);
      }
    }
  }

  return {
    runsInRange,
    runById,
    referenceRun,
    thresholds,
    comparableRunIds,
    durationOrDistanceChecks,
    elevationChecks,
    temperatureChecks
  };
}

function estimateValueAtTarget(points, targetX, getX, getY) {
  const pairs = points
    .map((point) => ({
      x: Number(getX(point)),
      y: Number(getY(point))
    }))
    .filter((pair) => Number.isFinite(pair.x) && Number.isFinite(pair.y));

  if (!pairs.length || !Number.isFinite(targetX)) {
    return null;
  }

  pairs.sort((a, b) => a.x - b.x);
  if (pairs.length === 1) {
    return pairs[0].y;
  }

  let nearest = pairs[0];
  let nearestDistance = Math.abs(targetX - pairs[0].x);
  for (const pair of pairs) {
    const distance = Math.abs(targetX - pair.x);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = pair;
    }
  }

  for (let i = 1; i < pairs.length; i += 1) {
    const left = pairs[i - 1];
    const right = pairs[i];
    if (left.x === right.x) {
      if (targetX === left.x) {
        return (left.y + right.y) / 2;
      }
      continue;
    }

    const within = targetX >= Math.min(left.x, right.x) && targetX <= Math.max(left.x, right.x);
    if (!within) {
      continue;
    }

    const t = (targetX - left.x) / (right.x - left.x);
    return left.y + t * (right.y - left.y);
  }

  return nearest.y;
}

function linearTrend(samples) {
  if (!Array.isArray(samples) || samples.length < 2) {
    return null;
  }

  const valid = samples
    .map((sample) => ({
      x: Number(sample?.x),
      y: Number(sample?.y)
    }))
    .filter((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y));

  if (valid.length < 2) {
    return null;
  }

  const n = valid.length;
  const meanX = valid.reduce((sum, sample) => sum + sample.x, 0) / n;
  const meanY = valid.reduce((sum, sample) => sum + sample.y, 0) / n;

  let sxx = 0;
  let sxy = 0;
  for (const sample of valid) {
    const dx = sample.x - meanX;
    sxx += dx * dx;
    sxy += dx * (sample.y - meanY);
  }

  if (sxx <= 0) {
    return null;
  }

  const slope = sxy / sxx;
  const ordered = [...valid].sort((a, b) => a.x - b.x);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  return {
    slope,
    first,
    last,
    delta: last.y - first.y
  };
}

function formatPaceDelta(minPerKm) {
  if (!Number.isFinite(minPerKm)) {
    return "n/a";
  }

  const sign = minPerKm < 0 ? "-" : "+";
  const absSeconds = Math.round(Math.abs(minPerKm) * 60);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  return `${sign}${mins}:${String(secs).padStart(2, "0")} /km`;
}

function summarizePaceHrProgress(points, runById, referenceRun) {
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const byActivityId = new Map();
  for (const point of points) {
    const activityId = normalizeActivityId(point?.activityId ?? point?.id);
    if (!activityId) {
      continue;
    }
    if (!byActivityId.has(activityId)) {
      byActivityId.set(activityId, []);
    }
    byActivityId.get(activityId).push(point);
  }

  if (byActivityId.size < 3) {
    return null;
  }

  const referenceId = normalizeActivityId(referenceRun?.id);
  const referencePoints = referenceId ? byActivityId.get(referenceId) || [] : [];
  const targetPace =
    median(referencePoints.map((point) => Number(point.paceMinKm))) ?? median(points.map((point) => Number(point.paceMinKm)));
  const targetHr =
    median(referencePoints.map((point) => Number(point.avgHrBpm))) ?? median(points.map((point) => Number(point.avgHrBpm)));

  if (!Number.isFinite(targetPace) || !Number.isFinite(targetHr)) {
    return null;
  }

  const hrSamples = [];
  const paceSamples = [];
  for (const [activityId, runPoints] of byActivityId.entries()) {
    const run = runById.get(activityId);
    const timestamp = getRunTimestampMs(run);
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    const estimatedHr = estimateValueAtTarget(
      runPoints,
      targetPace,
      (point) => point.paceMinKm,
      (point) => point.avgHrBpm
    );
    if (Number.isFinite(estimatedHr)) {
      hrSamples.push({ x: timestamp, y: estimatedHr });
    }

    const estimatedPace = estimateValueAtTarget(
      runPoints,
      targetHr,
      (point) => point.avgHrBpm,
      (point) => point.paceMinKm
    );
    if (Number.isFinite(estimatedPace)) {
      paceSamples.push({ x: timestamp, y: estimatedPace });
    }
  }

  const hrTrend = linearTrend(hrSamples);
  const paceTrend = linearTrend(paceSamples);
  if (!hrTrend && !paceTrend) {
    return null;
  }

  const parts = [];
  if (hrTrend) {
    const direction = hrTrend.delta < 0 ? "improving" : hrTrend.delta > 0 ? "worsening" : "flat";
    parts.push(`HR@${formatPace(targetPace)}: ${hrTrend.delta.toFixed(1)} bpm (${direction})`);
  }
  if (paceTrend) {
    const direction = paceTrend.delta < 0 ? "faster" : paceTrend.delta > 0 ? "slower" : "flat";
    parts.push(`Pace@${Math.round(targetHr)} bpm: ${formatPaceDelta(paceTrend.delta)} (${direction})`);
  }

  return parts.length ? parts.join(" | ") : null;
}

function setComparableControlsUi() {
  if (paceHrComparableToggleEl) {
    paceHrComparableToggleEl.checked = comparableRunsEnabled;
  }

  if (paceHrComparableStrictnessEl) {
    paceHrComparableStrictnessEl.value = normalizeComparableStrictness(comparableRunsStrictness);
    paceHrComparableStrictnessEl.disabled = !comparableRunsEnabled;
  }
}

function persistPaceHrComparableSettings() {
  try {
    localStorage.setItem(
      PACE_HR_COMPARABLE_STORAGE_KEY,
      JSON.stringify({
        enabled: Boolean(comparableRunsEnabled),
        strictness: normalizeComparableStrictness(comparableRunsStrictness)
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function loadPaceHrComparableSettings() {
  try {
    const raw = localStorage.getItem(PACE_HR_COMPARABLE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    comparableRunsEnabled = Boolean(parsed?.enabled);
    comparableRunsStrictness = normalizeComparableStrictness(parsed?.strictness);
  } catch {
    // Ignore storage errors.
  }
}

function handleRecentActivitySelection(activityId, options = {}) {
  const normalized = normalizeActivityId(activityId);
  if (!normalized) {
    return;
  }

  const shiftKey = Boolean(options.shiftKey);
  const altKey = Boolean(options.altKey);
  const selectedIds = getSelectedActivityIdSet();
  const isCurrentlySelected = selectedIds.has(normalized);

  if (shiftKey) {
    const allIds = latestRecentActivityIds;
    const anchorId = normalizeActivityId(selectionAnchorActivityId);
    const anchorIndex = anchorId ? allIds.indexOf(anchorId) : -1;
    const targetIndex = allIds.indexOf(normalized);
    if (anchorIndex >= 0 && targetIndex >= 0) {
      const from = Math.min(anchorIndex, targetIndex);
      const to = Math.max(anchorIndex, targetIndex);
      const rangeIds = allIds.slice(from, to + 1);
      if (altKey) {
        for (const id of rangeIds) {
          selectedIds.add(id);
        }
      } else {
        selectedIds.clear();
        for (const id of rangeIds) {
          selectedIds.add(id);
        }
      }
    } else if (altKey) {
      selectedIds.add(normalized);
    } else {
      selectedIds.clear();
      selectedIds.add(normalized);
    }
    selectionAnchorActivityId = normalized;
  } else if (altKey) {
    if (isCurrentlySelected) {
      selectedIds.delete(normalized);
    } else {
      selectedIds.add(normalized);
    }
    selectionAnchorActivityId = normalized;
  } else {
    if (isCurrentlySelected && selectedIds.size === 1) {
      selectedIds.clear();
    } else {
      selectedIds.clear();
      selectedIds.add(normalized);
    }
    selectionAnchorActivityId = normalized;
  }

  selectedActivityIds.clear();
  for (const id of selectedIds) {
    selectedActivityIds.add(id);
  }

  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  } else {
    renderRecentActivities({ runs: latestRunsData });
  }
  const detailPaneWasOpen = isActivityDetailOpen();
  persistActivityDetailViewState();
  if (detailPaneWasOpen) {
    void syncActivityDetailPanelToSelection();
  }
}

function selectOnlyActivity(activityId, options = {}) {
  const normalized = normalizeActivityId(activityId);
  if (!normalized) {
    return;
  }

  selectedActivityIds.clear();
  selectedActivityIds.add(normalized);
  selectionAnchorActivityId = normalized;
  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  } else {
    renderRecentActivities({ runs: latestRunsData });
  }
  persistActivityDetailViewState();
  if (options.syncDetail !== false) {
    void syncActivityDetailPanelToSelection();
  }
}

function baselineStatusClassFromApi(status) {
  if (status === "below baseline") {
    return "status-green";
  }
  if (status === "near baseline") {
    return "status-yellow";
  }
  if (status === "above baseline" || status === "above cap") {
    return "status-red";
  }
  return "status-gray";
}

function closeActivityDetailDrawer(options = {}) {
  const clearSelection = options.clearSelection !== false;
  setActivityDetailOpenState(false);
  activeDetailActivityId = null;
  activityDetailRequestSerial += 1;
  if (activityDetailTitleEl) {
    activityDetailTitleEl.textContent = ACTIVITY_DETAIL_TITLE_DEFAULT;
  }

  if (clearSelection) {
    selectedActivityIds.clear();
    selectionAnchorActivityId = null;
    if (latestSeriesData.length) {
      drawChart(latestSeriesData);
    } else {
      renderRecentActivities({ runs: latestRunsData });
    }
  }

  persistActivityDetailViewState();
}

async function syncActivityDetailPanelToSelection(options = {}) {
  const singleSelectedId = getSingleSelectedActivityId();
  if (!singleSelectedId) {
    closeActivityDetailDrawer({ clearSelection: false });
    return;
  }

  if (
    singleSelectedId === normalizeActivityId(activeDetailActivityId) &&
    (activityDetailCache.has(singleSelectedId) || activityDetailInFlight.has(singleSelectedId))
  ) {
    setActivityDetailOpenState(true);
    persistActivityDetailViewState();
    return;
  }

  await openActivityDetail(singleSelectedId, {
    selectActivity: false,
    forceReload: Boolean(options.forceReload)
  });
}

function renderActivityDetailLoading(activityId) {
  if (!activityDetailContentEl) {
    return;
  }

  if (activityDetailTitleEl) {
    activityDetailTitleEl.textContent = `Loading ${activityId}...`;
  }

  activityDetailContentEl.innerHTML = `<p class="field-hint">Loading activity ${escapeHtml(activityId)}...</p>`;
}

function renderActivityDetailError(activityId, message) {
  if (!activityDetailContentEl) {
    return;
  }

  if (activityDetailTitleEl) {
    activityDetailTitleEl.textContent = activityId || ACTIVITY_DETAIL_TITLE_DEFAULT;
  }

  activityDetailContentEl.innerHTML = `
    <p class="activity-detail-error">${escapeHtml(message || "Could not load activity details.")}</p>
    <button id="activity-detail-retry" type="button" class="secondary-button">Retry</button>
  `;
  const retryBtn = activityDetailContentEl.querySelector("#activity-detail-retry");
  retryBtn?.addEventListener("click", () => {
    openActivityDetail(activityId, { forceReload: true, selectActivity: true });
  });
}

function renderActivityDetailPayload(payload) {
  if (!activityDetailContentEl || !payload || typeof payload !== "object") {
    return;
  }

  const summary = payload.summary && typeof payload.summary === "object" ? payload.summary : {};
  const baseline = payload.baselineContext && typeof payload.baselineContext === "object" ? payload.baselineContext : {};
  const intervalPoints = Array.isArray(payload.intervalPoints) ? payload.intervalPoints : [];
  const splitKmPoints = Array.isArray(payload.splitKmPoints) ? payload.splitKmPoints : [];
  const detailStreamPoints = Array.isArray(payload.detailStreamPoints) ? payload.detailStreamPoints : [];
  const avgHrText = Number.isFinite(Number(summary.avgHrBpm)) ? `${Number(summary.avgHrBpm).toFixed(0)} avg` : null;
  const maxHrText = Number.isFinite(Number(summary.maxHrBpm)) ? `${Number(summary.maxHrBpm).toFixed(0)} max` : null;
  const hrSummaryText = [avgHrText, maxHrText].filter(Boolean).join(" / ") || "n/a";
  const baselineStatusClass = baselineStatusClassFromApi(baseline.status);
  const baselineStatusLabel =
    baseline.status === "n/a" || !baseline.status
      ? "n/a"
      : baseline.status
          .split(" ")
          .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
          .join(" ");
  const titleName = formatRunName(summary);
  const titleDate = formatRunDateTimeLabel(summary);
  if (activityDetailTitleEl) {
    activityDetailTitleEl.textContent = titleName || ACTIVITY_DETAIL_TITLE_DEFAULT;
  }
  const intervalsActivityUrl = buildIntervalsActivityUrl(summary.id);
  const intervalsActivityLink = intervalsActivityUrl
    ? `<p class="activity-detail-subtitle"><a class="activity-detail-link" href="${escapeHtml(
        intervalsActivityUrl
      )}" target="_blank" rel="noopener noreferrer">Open on Intervals.icu</a></p>`
    : "";

  const baselineDeltaText =
    Number.isFinite(Number(baseline.deltaPct)) && Number.isFinite(Number(baseline.deltaKm))
      ? `${formatSignedPct(Number(baseline.deltaPct))} (${formatSignedDistance(Number(baseline.deltaKm))})`
      : "n/a";
  const baselineHeadroomText = Number.isFinite(Number(baseline.headroomKm))
    ? `${formatSignedDistance(Number(baseline.headroomKm))}`
    : "n/a";

  const intervalTableRows = intervalPoints
    .map((row, idx) => {
      const index = Number.isFinite(Number(row.intervalIndex)) ? Number(row.intervalIndex) : idx + 1;
      const type = typeof row.intervalType === "string" && row.intervalType.trim() ? row.intervalType : "WORK";
      const distanceText = Number.isFinite(Number(row.distanceKm))
        ? formatDistance(Number(row.distanceKm))
        : "n/a";
      const paceText = Number.isFinite(Number(row.paceMinKm)) ? formatPace(Number(row.paceMinKm)) : "n/a";
      const hrText = Number.isFinite(Number(row.avgHrBpm)) ? `${Number(row.avgHrBpm).toFixed(0)} bpm` : "n/a";
      return `<tr>
        <td>${index}</td>
        <td>${escapeHtml(type)}</td>
        <td>${distanceText}</td>
        <td>${paceText}</td>
        <td>${hrText}</td>
      </tr>`;
    })
    .join("");
  const intervalDetailsBlock = intervalPoints.length
    ? `
      <div class="activity-detail-table-wrap">
        <table class="activity-detail-table">
          <thead><tr><th>#</th><th>Type</th><th>Distance</th><th>Pace</th><th>Avg HR</th></tr></thead>
          <tbody>${intervalTableRows}</tbody>
        </table>
      </div>
    `
    : `<p class="field-hint">No interval detail is available for this run.</p>`;

  const splitKmTableRows = splitKmPoints
    .map((row, idx) => {
      const splitLabel = Number.isFinite(Number(row.splitKm)) ? `${Math.round(Number(row.splitKm))}` : `${idx + 1}`;
      return `<tr>
        <td>${splitLabel}</td>
        <td>${formatDistance(Number(row.splitDistanceKm || row.distanceKm || 0))}</td>
        <td>${formatPace(Number(row.paceMinKm))}</td>
        <td>${Number.isFinite(Number(row.avgHrBpm)) ? `${Number(row.avgHrBpm).toFixed(0)} bpm` : "n/a"}</td>
      </tr>`;
    })
    .join("");
  const splitKmDetailsBlock = splitKmPoints.length
    ? `
      <div class="activity-detail-table-wrap">
        <table class="activity-detail-table">
          <thead><tr><th>Km</th><th>Distance</th><th>Pace</th><th>Avg HR</th></tr></thead>
          <tbody>${splitKmTableRows}</tbody>
        </table>
      </div>
    `
    : `<p class="field-hint">No kilometer splits are available for this run.</p>`;

  activityDetailContentEl.innerHTML = `
    <section class="activity-detail-summary">
      <p class="activity-detail-subtitle">${escapeHtml(titleDate)}</p>
      ${intervalsActivityLink}
      <div class="activity-detail-grid">
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">Distance</span>
          <span class="activity-detail-metric-value">${formatDistance(Number(summary.distanceKm || 0))}</span>
        </div>
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">Duration</span>
          <span class="activity-detail-metric-value">${formatDurationSeconds(summary.movingTimeSec)}</span>
        </div>
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">Pace</span>
          <span class="activity-detail-metric-value">${formatPace(Number(summary.paceMinKm))}</span>
        </div>
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">HR</span>
          <span class="activity-detail-metric-value">${hrSummaryText}</span>
        </div>
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">Elevation Gain</span>
          <span class="activity-detail-metric-value">${
            Number.isFinite(Number(summary.elevationGainM)) ? `${Number(summary.elevationGainM).toFixed(0)} m` : "n/a"
          }</span>
        </div>
        <div class="activity-detail-metric">
          <span class="activity-detail-metric-label">Load</span>
          <span class="activity-detail-metric-value">${formatLoad(summary.load)}</span>
        </div>
      </div>
    </section>
    <section class="activity-detail-section">
      <h3>Run Trace</h3>
      <p class="activity-detail-stream-note">Elapsed time on the x-axis. Separate rows show pace, heart rate, cadence, and altitude from the recorded activity stream.</p>
      <div id="activity-detail-stream-chart"></div>
    </section>
    <section class="activity-detail-section">
      <h3>Baseline Context (${escapeHtml(String(baseline.date || "n/a"))})</h3>
      <div class="activity-detail-baseline">
        <div class="activity-detail-baseline-status ${baselineStatusClass}">${escapeHtml(baselineStatusLabel)}</div>
        <div>7d sum: ${Number.isFinite(Number(baseline.sum7)) ? formatDistance(Number(baseline.sum7)) : "n/a"}</div>
        <div>90d avg of 7d sum: ${
          Number.isFinite(Number(baseline.sum7ma90)) ? formatDistance(Number(baseline.sum7ma90)) : "n/a"
        }</div>
        <div>Cap (+10%): ${Number.isFinite(Number(baseline.capKm)) ? formatDistance(Number(baseline.capKm)) : "n/a"}</div>
        <div>Baseline delta: ${baselineDeltaText}</div>
        <div>Headroom vs cap: ${baselineHeadroomText}</div>
      </div>
    </section>
    <section class="activity-detail-section">
      <h3>Intervals</h3>
      ${intervalDetailsBlock}
    </section>
    <section class="activity-detail-section">
      <h3>Kilometers</h3>
      ${splitKmDetailsBlock}
    </section>
  `;
  drawActivityDetailStreamChart(detailStreamPoints);
}

async function fetchActivityDetail(activityId) {
  const response = await fetch(`/api/activity/${encodeURIComponent(activityId)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Could not load activity details.");
  }
  return data;
}

async function loadActivityDetail(activityId, options = {}) {
  const forceReload = Boolean(options.forceReload);
  if (!forceReload && activityDetailCache.has(activityId)) {
    return activityDetailCache.get(activityId);
  }

  if (activityDetailInFlight.has(activityId)) {
    return activityDetailInFlight.get(activityId);
  }

  const request = fetchActivityDetail(activityId)
    .then((payload) => {
      activityDetailCache.set(activityId, payload);
      return payload;
    })
    .finally(() => {
      activityDetailInFlight.delete(activityId);
    });
  activityDetailInFlight.set(activityId, request);
  return request;
}

async function openActivityDetail(activityId, options = {}) {
  const normalized = normalizeActivityId(activityId);
  if (!normalized || !activityDetailOverlayEl || !activityDetailContentEl) {
    return;
  }

  const selectActivity = options.selectActivity !== false;
  if (selectActivity) {
    selectOnlyActivity(normalized, { syncDetail: false });
  }

  activeDetailActivityId = normalized;
  setActivityDetailOpenState(true);
  persistActivityDetailViewState();
  renderActivityDetailLoading(normalized);

  const requestSerial = ++activityDetailRequestSerial;
  try {
    const payload = await loadActivityDetail(normalized, { forceReload: Boolean(options.forceReload) });
    if (requestSerial !== activityDetailRequestSerial || activeDetailActivityId !== normalized) {
      return;
    }
    renderActivityDetailPayload(payload);
  } catch (error) {
    if (requestSerial !== activityDetailRequestSerial || activeDetailActivityId !== normalized) {
      return;
    }
    renderActivityDetailError(normalized, error?.message || "Could not load activity details.");
  }
}

function formatDateTime(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getRunTimestampMs(run) {
  if (!run || typeof run !== "object") {
    return Number.NEGATIVE_INFINITY;
  }

  const startedAtMs = Date.parse(run.startDateTime);
  if (Number.isFinite(startedAtMs)) {
    return startedAtMs;
  }

  if (typeof run.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.date)) {
    return parseDateKeyUTC(run.date).getTime();
  }

  return Number.NEGATIVE_INFINITY;
}

function sortRunsNewestFirst(runs) {
  return [...runs].sort((a, b) => {
    const tsDiff = getRunTimestampMs(b) - getRunTimestampMs(a);
    if (tsDiff !== 0) {
      return tsDiff;
    }

    return String(b?.id || "").localeCompare(String(a?.id || ""));
  });
}

function formatRunName(run) {
  if (typeof run?.name === "string" && run.name.trim().length) {
    return run.name.trim();
  }

  return "Unnamed run";
}

function formatRunDateTimeLabel(run) {
  const withTime = formatDateTime(run?.startDateTime);
  if (withTime) {
    return withTime;
  }

  if (typeof run?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(run.date)) {
    return `${formatDateLong(run.date)} (time unavailable)`;
  }

  return "n/a";
}

function buildIntervalsActivityUrl(activityId) {
  const normalized = normalizeActivityId(activityId);
  if (!normalized) {
    return null;
  }
  return `https://intervals.icu/activities/${encodeURIComponent(normalized)}`;
}

function normalizeFzfQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function fzfScore(haystack, rawQuery) {
  const query = normalizeFzfQuery(rawQuery);
  if (!query) {
    return 0;
  }

  const text = String(haystack || "").toLowerCase();
  if (!text) {
    return null;
  }

  let q = 0;
  let firstMatch = -1;
  let score = 0;
  let lastIdx = -2;

  for (let i = 0; i < text.length && q < query.length; i += 1) {
    if (text[i] !== query[q]) {
      continue;
    }

    if (firstMatch < 0) {
      firstMatch = i;
    }

    score += 1;
    if (i === lastIdx + 1) {
      score += 2;
    }
    if (i === 0 || text[i - 1] === " " || text[i - 1] === "-" || text[i - 1] === "_" || text[i - 1] === "/") {
      score += 1.5;
    }

    lastIdx = i;
    q += 1;
  }

  if (q !== query.length) {
    return null;
  }

  score += Math.max(0, 10 - Math.max(0, firstMatch));
  score += query.length * 0.5;
  return score;
}

function renderConnectionSummary(data) {
  const runs = Array.isArray(data?.runs) ? data.runs : [];
  const sortedRuns = sortRunsNewestFirst(runs);
  const mostRecent = sortedRuns.length ? sortedRuns[0] : null;

  if (lastSyncValueEl) {
    lastSyncValueEl.textContent = formatDateTime(data?.syncedAt) || "Not synced yet";
  }

  if (latestActivityNameValueEl) {
    latestActivityNameValueEl.textContent = mostRecent ? formatRunName(mostRecent) : "No activities synced yet";
  }

  if (latestActivityTimeValueEl) {
    latestActivityTimeValueEl.textContent = mostRecent ? formatRunDateTimeLabel(mostRecent) : "n/a";
  }
}

function isSyncedToday(syncedAt) {
  if (!syncedAt) {
    return false;
  }

  const syncedDate = new Date(syncedAt);
  if (!Number.isFinite(syncedDate.getTime())) {
    return false;
  }

  const now = new Date();
  return (
    syncedDate.getFullYear() === now.getFullYear() &&
    syncedDate.getMonth() === now.getMonth() &&
    syncedDate.getDate() === now.getDate()
  );
}

function renderRecentActivities(data, options = {}) {
  if (!recentActivitiesListEl || !recentActivitiesEmptyEl) {
    return;
  }

  const runs = Array.isArray(data?.runs) ? data.runs : [];
  const activeRange =
    options.range && isDateKey(options.range.startDate) && isDateKey(options.range.endDate)
      ? { startDate: options.range.startDate, endDate: options.range.endDate }
      : getActiveTimelineDateRange();
  const filteredRuns = activeRange
    ? runs.filter((run) => {
        const dateKey = String(run?.date || "");
        return isDateKey(dateKey) && dateKey >= activeRange.startDate && dateKey <= activeRange.endDate;
      })
    : runs;
  const recentRuns = sortRunsNewestFirst(filteredRuns);
  const query = normalizeFzfQuery(recentActivitiesSearchQuery);
  const shownRuns = query
    ? recentRuns
        .map((run) => {
          const haystack = [
            formatRunName(run),
            String(run?.date || ""),
            formatRunDateTimeLabel(run),
            Number.isFinite(Number(run?.distanceKm)) ? `${Number(run.distanceKm).toFixed(2)}km` : ""
          ].join(" ");
          const score = fzfScore(haystack, query);
          return score === null ? null : { run, score };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const scoreDiff = b.score - a.score;
          if (scoreDiff !== 0) {
            return scoreDiff;
          }
          return getRunTimestampMs(b.run) - getRunTimestampMs(a.run);
        })
        .map((entry) => entry.run)
    : recentRuns;
  latestRecentActivityIds = shownRuns.map((run) => normalizeActivityId(run?.id)).filter(Boolean);
  const selectedIds = getSelectedActivityIdSet();

  if (recentActivitiesCountEl) {
    recentActivitiesCountEl.textContent = shownRuns.length
      ? activeRange
        ? query
          ? `${shownRuns.length}/${recentRuns.length} matches in range`
          : `${shownRuns.length} in range`
        : query
          ? `${shownRuns.length}/${recentRuns.length} matches`
          : `${shownRuns.length} total`
      : "";
  }

  recentActivitiesListEl.innerHTML = "";
  recentActivitiesEmptyEl.hidden = shownRuns.length > 0;
  recentActivitiesEmptyEl.textContent = query
    ? activeRange
      ? "No activities match your search in the selected timeline range."
      : "No activities match your search."
    : activeRange
      ? "No synced activities in selected timeline range."
      : "No synced activities yet.";

  for (const run of shownRuns) {
    const item = document.createElement("li");
    item.className = "activity-item";
    const runId = normalizeActivityId(run?.id);
    const isSelected = runId !== null && selectedIds.has(runId);
    if (isSelected) {
      item.classList.add("is-selected");
    }
    item.setAttribute("role", "button");
    item.tabIndex = 0;
    item.setAttribute("aria-pressed", isSelected ? "true" : "false");
    item.addEventListener("click", (event) =>
      handleRecentActivitySelection(runId, {
        shiftKey: event.shiftKey,
        altKey: event.altKey
      })
    );
    item.addEventListener("dblclick", (event) => {
      event.preventDefault();
      openActivityDetail(runId, { selectActivity: true });
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleRecentActivitySelection(runId);
      }
    });

    const nameEl = document.createElement("div");
    nameEl.className = "activity-name";
    nameEl.textContent = formatRunName(run);
    const detailButtonEl = document.createElement("button");
    detailButtonEl.type = "button";
    detailButtonEl.className = "activity-detail-trigger";
    detailButtonEl.textContent = "Details";
    detailButtonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault();
      openActivityDetail(runId, { selectActivity: true });
    });
    const topEl = document.createElement("div");
    topEl.className = "activity-item-top";
    topEl.appendChild(nameEl);
    topEl.appendChild(detailButtonEl);

    const metaEl = document.createElement("div");
    metaEl.className = "activity-meta";
    const distanceText = Number.isFinite(Number(run?.distanceKm)) ? `${Number(run.distanceKm).toFixed(2)} km` : "distance n/a";
    metaEl.textContent = `${formatRunDateTimeLabel(run)} | ${distanceText}`;

    item.appendChild(topEl);
    item.appendChild(metaEl);
    recentActivitiesListEl.appendChild(item);
  }
}

function rerenderRecentActivitiesForCurrentRange() {
  const range = getActiveTimelineDateRange();
  if (range) {
    renderRecentActivities(
      { runs: latestRunsData },
      {
        range: {
          startDate: range.startDate,
          endDate: range.endDate
        }
      }
    );
  } else {
    renderRecentActivities({ runs: latestRunsData });
  }
}

function getValue(item, key) {
  const value = Number(item?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function formatDateLabel(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateLong(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatMonthYear(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function formatTimestampDateLabelUtc(timestampMs) {
  if (!Number.isFinite(timestampMs)) {
    return "n/a";
  }

  return formatDateLabel(formatDateKeyUTC(new Date(timestampMs)));
}

function formatDistance(value) {
  return `${value.toFixed(2)} km`;
}

function formatPace(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "n/a";
  }

  const whole = Math.floor(value);
  const secondsFloat = (value - whole) * 60;
  const roundedSeconds = Math.round(secondsFloat);
  const minutes = roundedSeconds >= 60 ? whole + 1 : whole;
  const seconds = roundedSeconds >= 60 ? 0 : roundedSeconds;
  return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
}

function formatDurationSeconds(value) {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "n/a";
  }

  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTemperatureC(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "n/a";
  }
  return `${n.toFixed(1)} C`;
}

function formatLoad(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return "n/a";
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDurationCompact(valueSec) {
  const totalSeconds = Number(valueSec);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0m";
  }
  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatCadence(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return "n/a";
  }
  return `${n.toFixed(0)} spm`;
}

function formatAltitude(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "n/a";
  }
  return `${n.toFixed(0)} m`;
}

function formatElapsedTimeLabel(value) {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "n/a";
  }

  const rounded = Math.round(totalSeconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function buildLinePath(points, xScale, yScale, valueKey) {
  let path = "";
  let drawing = false;
  for (const point of points) {
    const rawValue = point?.[valueKey];
    if (rawValue === null || rawValue === undefined || rawValue === "") {
      drawing = false;
      continue;
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      drawing = false;
      continue;
    }
    const command = drawing ? "L" : "M";
    path += `${command}${xScale(Number(point.elapsedSec)).toFixed(2)},${yScale(value).toFixed(2)} `;
    drawing = true;
  }
  return path.trim();
}

function findClosestDetailStreamIndex(points, elapsedSec) {
  if (!Array.isArray(points) || !points.length) {
    return -1;
  }

  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (Number(points[mid]?.elapsedSec) < elapsedSec) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const candidate = low;
  const previous = Math.max(0, candidate - 1);
  const candidateDiff = Math.abs(Number(points[candidate]?.elapsedSec) - elapsedSec);
  const previousDiff = Math.abs(Number(points[previous]?.elapsedSec) - elapsedSec);
  return previousDiff <= candidateDiff ? previous : candidate;
}

function drawActivityDetailStreamChart(points) {
  const root = activityDetailContentEl?.querySelector("#activity-detail-stream-chart");
  if (!root) {
    return;
  }

  const chartPoints = Array.isArray(points)
    ? points.map((point) => ({
        ...point,
        pacePlotMinKm:
          point?.paceMinKm === null || point?.paceMinKm === undefined || point?.paceMinKm === ""
            ? null
            : Number.isFinite(Number(point?.paceMinKm))
              ? Number(point.paceMinKm)
              : null
      }))
    : [];
  for (let i = 1; i < chartPoints.length; i += 1) {
    const prev = chartPoints[i - 1];
    const cur = chartPoints[i];
    const prevElapsed = Number(prev?.elapsedSec);
    const curElapsed = Number(cur?.elapsedSec);
    const prevDistance = Number(prev?.distanceKm);
    const curDistance = Number(cur?.distanceKm);
    const dt = curElapsed - prevElapsed;
    const ddKm = curDistance - prevDistance;
    if (!Number.isFinite(dt) || !Number.isFinite(ddKm) || dt <= 0 || ddKm <= 0.001) {
      continue;
    }
    const derivedPace = dt / 60 / ddKm;
    if (Number.isFinite(derivedPace) && derivedPace >= 2 && derivedPace <= 30) {
      chartPoints[i].pacePlotMinKm = derivedPace;
    }
  }
  for (let i = 0; i < chartPoints.length; i += 1) {
    if (Number.isFinite(Number(chartPoints[i]?.pacePlotMinKm))) {
      continue;
    }
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(chartPoints.length - 1, i + 2); j += 1) {
      const pace = Number(chartPoints[j]?.pacePlotMinKm);
      if (!Number.isFinite(pace) || pace < 2 || pace > 30) {
        continue;
      }
      sum += pace;
      count += 1;
    }
    chartPoints[i].pacePlotMinKm = count ? sum / count : null;
  }

  const seriesMeta = [
    {
      key: "pacePlotMinKm",
      label: "Pace",
      color: "#0f766e",
      format: formatPace,
      invert: true
    },
    {
      key: "hrBpm",
      label: "HR",
      color: "#dc2626",
      format: (value) => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(0)} bpm` : "n/a"),
      invert: false
    },
    {
      key: "cadenceSpm",
      label: "Cadence",
      color: "#7c3aed",
      format: formatCadence,
      invert: false
    },
    {
      key: "altitudeM",
      label: "Altitude",
      color: "#2563eb",
      format: formatAltitude,
      invert: false
    }
  ];

  const availableSeries = seriesMeta
    .map((meta) => ({
      ...meta,
      values: chartPoints
        .map((point) => {
          const rawValue = point?.[meta.key];
          if (rawValue === null || rawValue === undefined || rawValue === "") {
            return null;
          }
          const value = Number(rawValue);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value) => Number.isFinite(value))
    }))
    .filter((meta) => meta.values.length);

  if (!availableSeries.length) {
    root.innerHTML = `<p class="field-hint">Detailed run streams are not available for this activity.</p>`;
    return;
  }

  const width = 640;
  const margin = { top: 12, right: 14, bottom: 28, left: 54 };
  const panelHeight = 74;
  const panelGap = 16;
  const innerW = width - margin.left - margin.right;
  const height = margin.top + margin.bottom + availableSeries.length * panelHeight + Math.max(0, availableSeries.length - 1) * panelGap;
  const maxElapsed = Math.max(...points.map((point) => Number(point?.elapsedSec)).filter((value) => Number.isFinite(value)));
  const xScale = (elapsedSec) => margin.left + (innerW * elapsedSec) / Math.max(1, maxElapsed);
  const panelDomainByKey = new Map();

  function buildYScale(values, top, invert) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(max - min, invert ? 0.2 : 1);
    const pad = span * 0.1;
    const domainMin = invert ? max + pad : min - pad;
    const domainMax = invert ? Math.max(0.1, min - pad) : max + pad;
    return (value) => {
      const denom = domainMax - domainMin;
      const safeDenom = Math.abs(denom) < 0.0001 ? (denom < 0 ? -0.0001 : 0.0001) : denom;
      const t = (value - domainMin) / safeDenom;
      return top + panelHeight - t * panelHeight;
    };
  }

  const seriesBlocks = availableSeries
    .map((meta, index) => {
      const top = margin.top + index * (panelHeight + panelGap);
      const yScale = buildYScale(meta.values, top, meta.invert);
      panelDomainByKey.set(meta.key, { top, yScale });
      const midValue = meta.values.length ? meta.values[Math.floor(meta.values.length / 2)] : null;
      const path = buildLinePath(chartPoints, xScale, yScale, meta.key);
      const gridLines = [0, 0.5, 1]
        .map((ratio) => {
          const y = top + panelHeight * ratio;
          return `<line x1="${margin.left}" y1="${y.toFixed(2)}" x2="${(width - margin.right).toFixed(
            2
          )}" y2="${y.toFixed(2)}" stroke="#e3eeea" stroke-width="1" />`;
        })
        .join("");
      const axisLabel = Number.isFinite(midValue) ? meta.format(midValue) : meta.label;
      return `
        <g data-series="${meta.key}">
          ${gridLines}
          <text x="8" y="${(top + 14).toFixed(2)}" class="activity-detail-stream-label">${escapeHtml(meta.label)}</text>
          <text x="8" y="${(top + panelHeight - 4).toFixed(2)}" class="activity-detail-stream-axis">${escapeHtml(axisLabel)}</text>
          <path d="${path}" fill="none" stroke="${meta.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    })
    .join("");

  const tickCount = Math.min(6, Math.max(3, Math.round(innerW / 120)));
  const xTicks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    const elapsed = maxElapsed * ratio;
    const x = xScale(elapsed);
    return `
      <g>
        <line x1="${x.toFixed(2)}" y1="${margin.top}" x2="${x.toFixed(2)}" y2="${(height - margin.bottom).toFixed(
          2
        )}" stroke="#eef4f2" stroke-width="1" />
        <text x="${x.toFixed(2)}" y="${(height - 8).toFixed(2)}" text-anchor="middle" class="activity-detail-stream-axis">${escapeHtml(
          formatElapsedTimeLabel(elapsed)
        )}</text>
      </g>
    `;
  }).join("");

  root.innerHTML = `
    <div class="activity-detail-stream-wrap">
      <svg viewBox="0 0 ${width} ${height}" class="activity-detail-stream-svg" role="img" aria-label="Run pace, heart rate, cadence, and altitude over time">
        ${xTicks}
        ${seriesBlocks}
        <line id="activity-detail-stream-hover" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${(
          height - margin.bottom
        ).toFixed(2)}" stroke="#0f172a" stroke-width="1" stroke-dasharray="4 4" hidden />
        <rect id="activity-detail-stream-capture" x="${margin.left}" y="${margin.top}" width="${innerW}" height="${
    height - margin.top - margin.bottom
  }" fill="transparent" />
      </svg>
      <div id="activity-detail-stream-tooltip" class="chart-tooltip activity-detail-stream-tooltip" hidden></div>
    </div>
  `;

  const wrap = root.querySelector(".activity-detail-stream-wrap");
  const svgEl = root.querySelector("svg");
  const capture = root.querySelector("#activity-detail-stream-capture");
  const hoverLine = root.querySelector("#activity-detail-stream-hover");
  const tooltip = root.querySelector("#activity-detail-stream-tooltip");
  if (!wrap || !svgEl || !capture || !hoverLine || !tooltip) {
    return;
  }

  function clearHover() {
    hoverLine.setAttribute("hidden", "");
    tooltip.setAttribute("hidden", "");
  }

  function showHover(point, event) {
    const x = xScale(Number(point.elapsedSec));
    hoverLine.setAttribute("x1", x.toFixed(2));
    hoverLine.setAttribute("x2", x.toFixed(2));
    hoverLine.removeAttribute("hidden");
    tooltip.innerHTML = `
      <strong>${escapeHtml(formatElapsedTimeLabel(point.elapsedSec))}</strong><br/>
      Distance: ${escapeHtml(formatDistance(Number(point.distanceKm || 0)))}<br/>
      ${availableSeries.map((meta) => `${escapeHtml(meta.label)}: ${escapeHtml(meta.format(point[meta.key]))}`).join("<br/>")}
    `;
    tooltip.removeAttribute("hidden");

    const svgRect = svgEl.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const pointerX = Number.isFinite(event?.clientX) ? event.clientX - wrapRect.left : (x / width) * svgRect.width + (svgRect.left - wrapRect.left);
    const pointerY = Number.isFinite(event?.clientY) ? event.clientY - wrapRect.top : 0;
    const tooltipWidth = tooltip.offsetWidth || 220;
    const tooltipHeight = tooltip.offsetHeight || 120;
    const horizontalPadding = 8;
    const verticalPadding = 8;
    const targetLeft =
      pointerX <= wrapRect.width / 2 ? wrapRect.width - tooltipWidth - horizontalPadding : horizontalPadding;
    const targetTop =
      pointerY <= wrapRect.height / 2 ? wrapRect.height - tooltipHeight - verticalPadding : verticalPadding;
    const clampedLeft = Math.min(
      Math.max(horizontalPadding, wrapRect.width - tooltipWidth - horizontalPadding),
      Math.max(horizontalPadding, targetLeft)
    );
    const clampedTop = Math.min(
      Math.max(verticalPadding, wrapRect.height - tooltipHeight - verticalPadding),
      Math.max(verticalPadding, targetTop)
    );
    tooltip.style.left = `${clampedLeft}px`;
    tooltip.style.top = `${clampedTop}px`;
  }

  function moveHover(event) {
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width) {
      return;
    }
    const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
    const clamped = Math.min(width - margin.right, Math.max(margin.left, xInSvg));
    const elapsed = ((clamped - margin.left) / Math.max(1, innerW)) * maxElapsed;
    const index = findClosestDetailStreamIndex(chartPoints, elapsed);
    if (index < 0) {
      clearHover();
      return;
    }
    showHover(chartPoints[index], event);
  }

  capture.addEventListener("pointermove", moveHover);
  capture.addEventListener("pointerenter", moveHover);
  capture.addEventListener("pointerleave", clearHover);
  capture.addEventListener("pointercancel", clearHover);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPct(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  const pct = value * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function formatSignedDistance(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} km`;
}

function baselineDeltaStatus(deltaPct, current, baseline) {
  if (!Number.isFinite(deltaPct) || !Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) {
    return "gray";
  }

  const capKm = baseline * 1.1;
  if (current > capKm) {
    return "red";
  }

  if (deltaPct <= -0.05) {
    return "green";
  }
  if (deltaPct >= 0.05) {
    return "red";
  }
  return "yellow";
}

function getRunStartHour(run) {
  const startDateTime = typeof run?.startDateTime === "string" ? run.startDateTime : "";
  const hhmmMatch = startDateTime.match(/T(\d{2}):(\d{2})/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      return hour;
    }
  }

  const timestamp = Date.parse(startDateTime);
  if (Number.isFinite(timestamp)) {
    return new Date(timestamp).getHours();
  }

  return null;
}

function buildNumericDistribution(values, bins) {
  const counts = Array.from({ length: bins.length }, () => 0);
  let total = 0;

  for (const rawValue of values) {
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      continue;
    }

    const idx = bins.findIndex((bin) => value >= bin.min && value < bin.max);
    if (idx < 0) {
      continue;
    }

    counts[idx] += 1;
    total += 1;
  }

  return {
    total,
    rows: bins.map((bin, idx) => ({
      label: bin.label,
      count: counts[idx]
    }))
  };
}

function buildCategoricalDistribution(labels, indexValues, count) {
  const counts = Array.from({ length: count }, () => 0);
  let total = 0;
  for (const rawIndex of indexValues) {
    const idx = Number(rawIndex);
    if (!Number.isFinite(idx) || idx < 0 || idx >= count) {
      continue;
    }

    counts[idx] += 1;
    total += 1;
  }

  return {
    total,
    rows: labels.map((label, idx) => ({
      label,
      count: counts[idx]
    }))
  };
}

function renderDistributionBlock(title, distribution) {
  const rows = Array.isArray(distribution?.rows) ? distribution.rows : [];
  const total = Number(distribution?.total) || 0;
  const maxCount = rows.length ? Math.max(...rows.map((row) => row.count), 0) : 0;

  const rowsHtml = rows
    .map((row) => {
      const widthPct = maxCount > 0 ? (row.count / maxCount) * 100 : 0;
      const pctText = total > 0 ? formatPct(row.count / total) : "0.0%";
      const valueLabel = typeof row.valueLabel === "string" && row.valueLabel.trim() ? row.valueLabel.trim() : String(row.count);
      return `
        <div class="foundation-row">
          <span class="foundation-label">${escapeHtml(row.label)}</span>
          <div class="foundation-bar-track">
            <div class="foundation-bar" style="width:${widthPct.toFixed(1)}%;"></div>
          </div>
          <span class="foundation-value">${escapeHtml(valueLabel)} (${pctText})</span>
        </div>
      `;
    })
    .join("");

  return `
    <section class="foundation-block">
      <h3 class="foundation-title">${escapeHtml(title)}${total > 0 ? ` (n=${total})` : ""}</h3>
      ${rowsHtml || `<p class="field-hint">No data.</p>`}
    </section>
  `;
}

function buildHrZoneTimeDistribution(runsInRange, hrZonesRunning) {
  if (!Array.isArray(hrZonesRunning) || !hrZonesRunning.length) {
    return {
      total: 0,
      rows: [],
      available: false
    };
  }

  const zoneTotals = Array.from({ length: hrZonesRunning.length }, () => 0);
  for (const run of runsInRange) {
    const durations = Array.isArray(run?.hrZoneDurationsSec) ? run.hrZoneDurationsSec : [];
    for (let i = 0; i < zoneTotals.length; i += 1) {
      const sec = Number(durations[i]);
      if (Number.isFinite(sec) && sec > 0) {
        zoneTotals[i] += sec;
      }
    }
  }
  const total = zoneTotals.reduce((sum, value) => sum + value, 0);
  return {
    total,
    rows: hrZonesRunning.map((zone, idx) => {
      const minBpm = Number(zone?.minBpm);
      const hasFiniteMax = zone?.maxBpm !== null && zone?.maxBpm !== undefined && zone?.maxBpm !== "";
      const maxBpm = hasFiniteMax ? Number(zone?.maxBpm) : null;
      const rangeText = Number.isFinite(maxBpm)
        ? `${Number.isFinite(minBpm) ? `${Math.round(minBpm)}-` : "<"}${Math.round(maxBpm)}`
        : Number.isFinite(minBpm)
          ? `>=${Math.round(minBpm)}`
          : "open";
      return {
        label: `${zone?.label || `Z${idx + 1}`} (${rangeText})`,
        count: Math.round(zoneTotals[idx] || 0),
        valueLabel: formatDurationCompact(zoneTotals[idx] || 0)
      };
    }),
    available: true
  };
}

function renderFoundationalStats(rangeStartDate, rangeEndDate) {
  if (!foundationalStatsRootEl || !foundationalStatsSummaryEl) {
    return;
  }

  if (!isDateKey(rangeStartDate) || !isDateKey(rangeEndDate)) {
    foundationalStatsSummaryEl.textContent = "";
    foundationalStatsRootEl.innerHTML = `<p class="field-hint">No selected timeline range.</p>`;
    return;
  }

  const runsInRange = buildRunsInDateRange(rangeStartDate, rangeEndDate);
  if (!runsInRange.length) {
    foundationalStatsSummaryEl.textContent = "No runs in selected range.";
    foundationalStatsRootEl.innerHTML = `<p class="field-hint">No runs in selected timeline range.</p>`;
    return;
  }

  const distancesKm = runsInRange.map((run) => Number(run?.distanceKm)).filter((value) => Number.isFinite(value) && value > 0);
  const durationsMin = runsInRange
    .map((run) => Number(run?.movingTimeSec) / 60)
    .filter((value) => Number.isFinite(value) && value > 0);
  const weekdayIndices = runsInRange
    .map((run) => {
      if (!isDateKey(run?.date)) {
        return null;
      }
      const weekday = parseDateKeyUTC(run.date).getUTCDay();
      return (weekday + 6) % 7; // Monday first
    })
    .filter((value) => Number.isFinite(value));
  const daytimeIndices = runsInRange
    .map((run) => {
      const hour = getRunStartHour(run);
      if (!Number.isFinite(hour)) {
        return null;
      }
      if (hour < 6) {
        return 0;
      }
      if (hour < 12) {
        return 1;
      }
      if (hour < 18) {
        return 2;
      }
      return 3;
    })
    .filter((value) => Number.isFinite(value));

  const pacePointsInRange = latestPaceHrPoints.filter((point) => {
    if (!point || typeof point !== "object") {
      return false;
    }

    const dateKey = String(point.date || "");
    if (!isDateKey(dateKey) || dateKey < rangeStartDate || dateKey > rangeEndDate) {
      return false;
    }

    const pace = Number(point.paceMinKm);
    return Number.isFinite(pace) && pace > 0;
  });
  const preferredPacePoints = pacePointsInRange.filter((point) => point.source === "interval" || point.source === "split-km");
  const paceSourceLabel = preferredPacePoints.length ? "interval/split pace" : "run-average pace";
  const paceSamples = preferredPacePoints.length
    ? preferredPacePoints.map((point) => Number(point.paceMinKm))
    : runsInRange.map((run) => Number(run?.paceMinKm)).filter((pace) => Number.isFinite(pace) && pace > 0);

  const distanceDistribution = buildNumericDistribution(distancesKm, [
    { label: "<5 km", min: 0, max: 5 },
    { label: "5-10 km", min: 5, max: 10 },
    { label: "10-15 km", min: 10, max: 15 },
    { label: "15-21 km", min: 15, max: 21.1 },
    { label: "21-30 km", min: 21.1, max: 30 },
    { label: ">=30 km", min: 30, max: Number.POSITIVE_INFINITY }
  ]);
  const paceDistribution = buildNumericDistribution(paceSamples, [
    { label: "<4:00", min: 0, max: 4 },
    { label: "4:00-4:30", min: 4, max: 4.5 },
    { label: "4:30-5:00", min: 4.5, max: 5 },
    { label: "5:00-5:30", min: 5, max: 5.5 },
    { label: "5:30-6:00", min: 5.5, max: 6 },
    { label: "6:00-6:30", min: 6, max: 6.5 },
    { label: "6:30-7:00", min: 6.5, max: 7 },
    { label: ">=7:00", min: 7, max: Number.POSITIVE_INFINITY }
  ]);
  const durationDistribution = buildNumericDistribution(durationsMin, [
    { label: "<30m", min: 0, max: 30 },
    { label: "30-60m", min: 30, max: 60 },
    { label: "60-90m", min: 60, max: 90 },
    { label: "90-120m", min: 90, max: 120 },
    { label: ">=120m", min: 120, max: Number.POSITIVE_INFINITY }
  ]);
  const daytimeDistribution = buildCategoricalDistribution(["Night", "Morning", "Afternoon", "Evening"], daytimeIndices, 4);
  const weekdayDistribution = buildCategoricalDistribution(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], weekdayIndices, 7);
  const hrZoneDistribution = buildHrZoneTimeDistribution(runsInRange, latestHrZonesRunning);
  const hrZoneTitle = Number.isFinite(Number(latestRunningThresholdHr))
    ? `Time in HR zones (LTHR ${Math.round(Number(latestRunningThresholdHr))} bpm)`
    : "Time in HR zones";

  const totalDistance = distancesKm.reduce((sum, value) => sum + value, 0);
  const medianDistance = median(distancesKm);
  const medianPace = median(paceSamples);
  foundationalStatsSummaryEl.textContent = `Runs: ${runsInRange.length} | Total: ${formatDistance(
    totalDistance
  )} | Median distance: ${
    Number.isFinite(medianDistance) ? formatDistance(medianDistance) : "n/a"
  } | Median ${paceSourceLabel}: ${Number.isFinite(medianPace) ? formatPace(medianPace) : "n/a"}`;

  foundationalStatsRootEl.innerHTML = `
    <div class="foundational-grid">
      ${renderDistributionBlock("Run distance", distanceDistribution)}
      ${renderDistributionBlock(`Pace (${paceSourceLabel})`, paceDistribution)}
      ${renderDistributionBlock("Start time of day", daytimeDistribution)}
      ${renderDistributionBlock("Weekday", weekdayDistribution)}
      ${renderDistributionBlock("Duration", durationDistribution)}
      ${
        hrZoneDistribution.available
          ? renderDistributionBlock(hrZoneTitle, hrZoneDistribution)
          : `<section class="foundation-block">
              <h3 class="foundation-title">${escapeHtml(hrZoneTitle)}</h3>
              <p class="field-hint">${
                hasStoredApiKey
                  ? "Running threshold-based HR zones are missing. Use the connection box update/resync flow to fetch running threshold HR from Intervals.icu."
                  : "Running threshold-based HR zones are unavailable. Add an API key and sync to fetch running threshold HR from Intervals.icu."
              }</p>
            </section>`
      }
    </div>
  `;
}

function parseDateKeyUTC(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatDateKeyUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysUTC(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isoWeekStartKey(dateKey) {
  const date = parseDateKeyUTC(dateKey);
  const weekday = date.getUTCDay(); // 0=Sun, 1=Mon
  const daysSinceMonday = (weekday + 6) % 7;
  return formatDateKeyUTC(addDaysUTC(date, -daysSinceMonday));
}

function drawEmptyHeatmap(message) {
  if (heatmapRootEl) {
    heatmapRootEl.innerHTML = `<div class="chart-empty">${message}</div>`;
  }
  if (heatmapSummaryEl) {
    heatmapSummaryEl.textContent = "";
  }
}

function heatmapColor(avgHr, minHr, maxHr) {
  if (!Number.isFinite(avgHr)) {
    return "#edf2f0";
  }

  if (!Number.isFinite(minHr) || !Number.isFinite(maxHr) || maxHr <= minHr) {
    return "hsl(2 96% 52%)";
  }

  const t = Math.max(0, Math.min(1, (avgHr - minHr) / (maxHr - minHr)));
  const emphasized = Math.pow(t, 0.72);
  const lightness = 84 - emphasized * 66;
  return `hsl(2 96% ${lightness.toFixed(1)}%)`;
}

function buildColorScaleGradient(minValue, maxValue, colorAtValue, steps = 8) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue <= minValue) {
    return "linear-gradient(90deg, #dbeafe, #1d4ed8)";
  }

  const stops = [];
  for (let i = 0; i < steps; i += 1) {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    const value = minValue + t * (maxValue - minValue);
    const color = colorAtValue(value);
    stops.push(`${color} ${(t * 100).toFixed(1)}%`);
  }

  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

function hasHeatmapColorBounds() {
  return (
    Number.isFinite(heatmapColorBoundMin) &&
    Number.isFinite(heatmapColorBoundMax) &&
    heatmapColorBoundMax > heatmapColorBoundMin
  );
}

function heatmapColorValueToSlider(value) {
  if (!hasHeatmapColorBounds()) {
    return 0;
  }

  const t = (value - heatmapColorBoundMin) / (heatmapColorBoundMax - heatmapColorBoundMin);
  return Math.round(Math.max(0, Math.min(1, t)) * HEATMAP_COLOR_SLIDER_STEPS);
}

function heatmapColorSliderToValue(sliderStep) {
  if (!hasHeatmapColorBounds()) {
    return 0;
  }

  const t = Math.max(0, Math.min(HEATMAP_COLOR_SLIDER_STEPS, sliderStep)) / HEATMAP_COLOR_SLIDER_STEPS;
  return heatmapColorBoundMin + t * (heatmapColorBoundMax - heatmapColorBoundMin);
}

function clampHeatmapColorRange() {
  if (!hasHeatmapColorBounds()) {
    heatmapColorRangeMin = null;
    heatmapColorRangeMax = null;
    return;
  }

  let min = Number.isFinite(heatmapColorRangeMin) ? heatmapColorRangeMin : heatmapColorBoundMin;
  let max = Number.isFinite(heatmapColorRangeMax) ? heatmapColorRangeMax : heatmapColorBoundMax;

  min = Math.max(heatmapColorBoundMin, Math.min(heatmapColorBoundMax, min));
  max = Math.max(heatmapColorBoundMin, Math.min(heatmapColorBoundMax, max));

  if (max - min < HEATMAP_COLOR_MIN_SPAN) {
    const center = (min + max) / 2;
    min = center - HEATMAP_COLOR_MIN_SPAN / 2;
    max = center + HEATMAP_COLOR_MIN_SPAN / 2;
  }

  if (min < heatmapColorBoundMin) {
    min = heatmapColorBoundMin;
  }
  if (max > heatmapColorBoundMax) {
    max = heatmapColorBoundMax;
  }
  if (max - min < HEATMAP_COLOR_MIN_SPAN) {
    min = heatmapColorBoundMin;
    max = heatmapColorBoundMax;
  }

  heatmapColorRangeMin = min;
  heatmapColorRangeMax = max;
}

function drawPaceHrHeatmap(points, rangeStartDate, rangeEndDate) {
  if (!heatmapRootEl) {
    return;
  }

  const binSeconds = Number.isFinite(heatmapBinSeconds) && heatmapBinSeconds > 0 ? heatmapBinSeconds : HEATMAP_BIN_SECONDS_DEFAULT;
  if (heatmapBinSizeEl && Number(heatmapBinSizeEl.value) !== binSeconds) {
    heatmapBinSizeEl.value = String(binSeconds);
  }

  const usable = points.filter((point) => {
    if (!point || typeof point !== "object") {
      return false;
    }
    if (rangeStartDate && String(point.date) < rangeStartDate) {
      return false;
    }
    if (rangeEndDate && String(point.date) > rangeEndDate) {
      return false;
    }

    const pace = Number(point.paceMinKm);
    const hr = Number(point.avgHrBpm);
    return Number.isFinite(pace) && pace > 0 && Number.isFinite(hr) && hr > 0;
  });
  const selectedIds = getSelectedActivityIdSet();

  if (!usable.length) {
    drawEmptyHeatmap("No pace/HR points in selected timeline range.");
    return;
  }

  const paceSeconds = usable.map((point) => Number(point.paceMinKm) * 60);
  const selectedMinSec = hasPaceAxisBounds() && Number.isFinite(paceAxisRangeMin) ? paceAxisRangeMin * 60 : Math.min(...paceSeconds);
  const selectedMaxSec = hasPaceAxisBounds() && Number.isFinite(paceAxisRangeMax) ? paceAxisRangeMax * 60 : Math.max(...paceSeconds);
  const clampedMinSec = Math.min(selectedMinSec, selectedMaxSec);
  const clampedMaxSec = Math.max(selectedMinSec, selectedMaxSec);

  const minBin = Math.floor(clampedMinSec / binSeconds);
  const maxBin = Math.max(minBin, Math.ceil(clampedMaxSec / binSeconds) - 1);
  const bins = Array.from({ length: maxBin - minBin + 1 }, (_, i) => minBin + i);
  if (!bins.length) {
    drawEmptyHeatmap("Not enough pace spread to build heatmap bins.");
    return;
  }

  const weekStart = isoWeekStartKey(rangeStartDate || usable[0].date);
  const weekEnd = isoWeekStartKey(rangeEndDate || usable[usable.length - 1].date);
  const weeks = [];
  for (let current = parseDateKeyUTC(weekStart), end = parseDateKeyUTC(weekEnd); current <= end; current = addDaysUTC(current, 7)) {
    weeks.push(formatDateKeyUTC(current));
  }
  if (!weeks.length) {
    drawEmptyHeatmap("Could not build weekly timeline for heatmap.");
    return;
  }

  const weekIndex = new Map(weeks.map((week, idx) => [week, idx]));
  const aggregates = new Map();
  const selectedCellCounts = new Map();
  for (const point of usable) {
    const pointPaceSec = Number(point.paceMinKm) * 60;
    if (pointPaceSec < clampedMinSec || pointPaceSec > clampedMaxSec) {
      continue;
    }

    const week = isoWeekStartKey(point.date);
    if (!weekIndex.has(week)) {
      continue;
    }

    const bin = Math.floor(pointPaceSec / binSeconds);
    if (bin < minBin || bin > maxBin) {
      continue;
    }

    const key = `${week}|${bin}`;
    if (!aggregates.has(key)) {
      aggregates.set(key, { sumHr: 0, count: 0 });
    }
    const bucket = aggregates.get(key);
    bucket.sumHr += Number(point.avgHrBpm);
    bucket.count += 1;

    if (selectedIds.size && selectedIds.has(normalizeActivityId(point.activityId ?? point.id))) {
      selectedCellCounts.set(key, (selectedCellCounts.get(key) || 0) + 1);
    }
  }

  const width = 980;
  const height = 380;
  const margin = { top: 24, right: 24, bottom: 56, left: 70 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const cols = weeks.length;
  const rows = bins.length;
  const cellW = innerW / Math.max(1, cols);
  const cellH = innerH / Math.max(1, rows);

  const cells = [];
  const cellByKey = new Map();
  const hrAverages = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const week = weeks[col];
      const bin = bins[row];
      const key = `${week}|${bin}`;
      const agg = aggregates.get(key);
      const avgHr = agg && agg.count > 0 ? agg.sumHr / agg.count : null;
      if (avgHr !== null) {
        hrAverages.push(avgHr);
      }

      const cell = {
        row,
        col,
        week,
        bin,
        avgHr,
        count: agg?.count ?? 0,
        x: margin.left + col * cellW,
        y: margin.top + row * cellH
      };
      cells.push(cell);
      cellByKey.set(key, cell);
    }
  }
  const selectedMarkers = Array.from(selectedCellCounts.entries())
    .map(([key, count]) => {
      const cell = cellByKey.get(key);
      if (!cell) {
        return null;
      }

      return {
        ...cell,
        count
      };
    })
    .filter(Boolean);

  const minHr = hrAverages.length ? Math.min(...hrAverages) : null;
  const maxHr = hrAverages.length ? Math.max(...hrAverages) : null;

  if (!Number.isFinite(minHr) || !Number.isFinite(maxHr)) {
    heatmapColorBoundMin = null;
    heatmapColorBoundMax = null;
    heatmapColorRangeMin = null;
    heatmapColorRangeMax = null;
    drawEmptyHeatmap("No heatmap cells with data in current range.");
    return;
  }

  heatmapColorBoundMin = minHr;
  heatmapColorBoundMax = maxHr > minHr ? maxHr : minHr + 1;
  clampHeatmapColorRange();
  function currentHeatmapLegendGradient() {
    return buildColorScaleGradient(
      heatmapColorBoundMin,
      heatmapColorBoundMax,
      (value) => heatmapColor(value, heatmapColorRangeMin, heatmapColorRangeMax)
    );
  }
  const heatmapLegendGradient = currentHeatmapLegendGradient();

  const rects = cells
    .map((cell, index) => {
      const fill = heatmapColor(cell.avgHr, heatmapColorRangeMin, heatmapColorRangeMax);
      return `<rect class="heatmap-cell" data-index="${index}" x="${cell.x.toFixed(2)}" y="${cell.y.toFixed(2)}" width="${(
        cellW - 1
      ).toFixed(2)}" height="${(cellH - 1).toFixed(2)}" fill="${fill}" rx="2" ry="2" />`;
    })
    .join("");
  const selectedMarkerRadius = Math.max(3.5, Math.min(cellW, cellH) * 0.28);
  const selectedMarkersSvg = selectedMarkers
    .map(
      (marker) =>
        `<circle cx="${(marker.x + cellW / 2).toFixed(2)}" cy="${(marker.y + cellH / 2).toFixed(
          2
        )}" r="${selectedMarkerRadius.toFixed(2)}" fill="none" stroke="${SELECTED_ACTIVITY_HIGHLIGHT}" stroke-width="2.2"/>`
    )
    .join("");
  const heatmapColorMinStep = heatmapColorValueToSlider(heatmapColorRangeMin);
  const heatmapColorMaxStep = heatmapColorValueToSlider(heatmapColorRangeMax);
  const heatmapColorStartPct = (heatmapColorMinStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;
  const heatmapColorEndPct = (heatmapColorMaxStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;

  const xTickTarget = 8;
  const xTickCount = Math.min(xTickTarget, Math.max(1, cols - 1));
  const xTicks = [];
  const usedX = new Set();
  for (let i = 0; i <= xTickCount; i += 1) {
    const idx = Math.round((cols - 1) * (i / xTickCount));
    if (usedX.has(idx)) {
      continue;
    }
    usedX.add(idx);
    xTicks.push({
      x: margin.left + (idx + 0.5) * cellW,
      label: formatMonthYear(weeks[idx])
    });
  }

  const yTickTarget = 7;
  const yTickCount = Math.min(yTickTarget, Math.max(1, rows - 1));
  const yTicks = [];
  const usedY = new Set();
  for (let i = 0; i <= yTickCount; i += 1) {
    const idx = Math.round((rows - 1) * (i / yTickCount));
    if (usedY.has(idx)) {
      continue;
    }
    usedY.add(idx);
    const bin = bins[idx];
    yTicks.push({
      y: margin.top + (idx + 0.5) * cellH,
      label: formatPace((bin * binSeconds) / 60).replace(" /km", "")
    });
  }

  const svg = `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Weekly pace-bin heart-rate heatmap">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" rx="12"/>
        ${rects}
        ${selectedMarkersSvg}
        ${xTicks
          .map(
            (tick) =>
              `<text x="${tick.x.toFixed(2)}" y="${height - margin.bottom + 20}" text-anchor="middle" font-size="12" fill="#5f736d">${tick.label}</text>`
          )
          .join("")}
        ${yTicks
          .map(
            (tick) =>
              `<text x="${margin.left - 10}" y="${(tick.y + 4).toFixed(
                2
              )}" text-anchor="end" font-size="12" fill="#5f736d">${tick.label}</text>`
          )
          .join("")}
        <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#475569">Week</text>
        <text x="18" y="${height / 2}" text-anchor="middle" font-size="12" fill="#475569" transform="rotate(-90 18 ${
          height / 2
        })">Pace bin (min/km)</text>
        <rect id="heatmap-hover-cell" x="${margin.left}" y="${margin.top}" width="${Math.max(1, cellW - 1)}" height="${Math.max(
          1,
          cellH - 1
        )}" fill="none" stroke="#0f172a" stroke-width="1.5" rx="2" ry="2" hidden />
        <rect id="heatmap-hover-capture" x="${margin.left}" y="${margin.top}" width="${innerW}" height="${innerH}" fill="transparent" />
      </svg>
      <div id="heatmap-tooltip" class="chart-tooltip" hidden></div>
    </div>
    <div class="color-scale-legend" aria-label="Heatmap color legend">
      <div class="color-scale-title">Cell color: average heart rate</div>
      <div class="color-scale-inline-range">
        <div id="heatmap-color-bar" class="color-scale-bar" style="background: ${heatmapLegendGradient};"></div>
        <div id="heatmap-color-inline-fill" class="color-scale-inline-fill" style="left: ${heatmapColorStartPct}%; width: ${Math.max(
          0,
          heatmapColorEndPct - heatmapColorStartPct
        )}%;"></div>
        <input
          id="heatmap-color-inline-min"
          class="color-scale-inline-input"
          type="range"
          min="0"
          max="${HEATMAP_COLOR_SLIDER_STEPS}"
          step="1"
          value="${heatmapColorMinStep}"
          aria-label="Heatmap color scale minimum"
        />
        <input
          id="heatmap-color-inline-max"
          class="color-scale-inline-input"
          type="range"
          min="0"
          max="${HEATMAP_COLOR_SLIDER_STEPS}"
          step="1"
          value="${heatmapColorMaxStep}"
          aria-label="Heatmap color scale maximum"
        />
      </div>
      <div class="color-scale-labels">
        <span id="heatmap-color-inline-min-label">${heatmapColorRangeMin.toFixed(0)} bpm</span>
        <span id="heatmap-color-inline-max-label">${heatmapColorRangeMax.toFixed(0)} bpm</span>
      </div>
    </div>
  `;

  heatmapRootEl.innerHTML = svg;

  function updateHeatmapSummary() {
    if (!heatmapSummaryEl) {
      return;
    }

    const filledCells = hrAverages.length;
    const hrText = hrAverages.length ? `${minHr.toFixed(0)}-${maxHr.toFixed(0)} bpm` : "n/a";
    const colorText =
      Number.isFinite(heatmapColorRangeMin) && Number.isFinite(heatmapColorRangeMax)
        ? `${heatmapColorRangeMin.toFixed(0)}-${heatmapColorRangeMax.toFixed(0)} bpm`
        : "n/a";
    const paceRangeText = `${formatPace(clampedMinSec / 60).replace(" /km", "")} - ${formatPace(clampedMaxSec / 60).replace(
      " /km",
      ""
    )} /km`;
    heatmapSummaryEl.textContent = `Weeks: ${weeks.length} | Bin: ${binSeconds}s | Pace range: ${paceRangeText} | Cells with data: ${filledCells}/${cells.length} | HR range: ${hrText} | Color scale: ${colorText}`;
  }
  updateHeatmapSummary();

  const chartWrap = heatmapRootEl.querySelector(".chart-wrap");
  const svgEl = heatmapRootEl.querySelector("svg");
  const capture = heatmapRootEl.querySelector("#heatmap-hover-capture");
  const hoverCell = heatmapRootEl.querySelector("#heatmap-hover-cell");
  const tooltip = heatmapRootEl.querySelector("#heatmap-tooltip");
  const heatmapColorBar = heatmapRootEl.querySelector("#heatmap-color-bar");
  const heatmapColorFill = heatmapRootEl.querySelector("#heatmap-color-inline-fill");
  const heatmapColorMinLabel = heatmapRootEl.querySelector("#heatmap-color-inline-min-label");
  const heatmapColorMaxLabel = heatmapRootEl.querySelector("#heatmap-color-inline-max-label");
  const heatmapColorMinInput = heatmapRootEl.querySelector("#heatmap-color-inline-min");
  const heatmapColorMaxInput = heatmapRootEl.querySelector("#heatmap-color-inline-max");
  const heatmapCellRects = Array.from(heatmapRootEl.querySelectorAll(".heatmap-cell"));
  if (!chartWrap || !svgEl || !capture || !hoverCell || !tooltip) {
    return;
  }

  function hideHover() {
    hoverCell.setAttribute("hidden", "");
    tooltip.setAttribute("hidden", "");
  }

  function showHover(cell) {
    if (!cell) {
      hideHover();
      return;
    }

    hoverCell.setAttribute("x", cell.x.toFixed(2));
    hoverCell.setAttribute("y", cell.y.toFixed(2));
    hoverCell.setAttribute("width", Math.max(1, cellW - 1).toFixed(2));
    hoverCell.setAttribute("height", Math.max(1, cellH - 1).toFixed(2));
    hoverCell.removeAttribute("hidden");

    const binStartSec = cell.bin * binSeconds;
    const binEndSec = (cell.bin + 1) * binSeconds;
    const weekStartDate = parseDateKeyUTC(cell.week);
    const weekEndDate = addDaysUTC(weekStartDate, 6);
    const weekLabel = `${formatDateLabel(formatDateKeyUTC(weekStartDate))} - ${formatDateLabel(formatDateKeyUTC(weekEndDate))}`;
    const hrLabel = Number.isFinite(cell.avgHr) ? `${cell.avgHr.toFixed(1)} bpm` : "No data";

    tooltip.innerHTML = `
      <strong>${weekLabel}</strong><br/>
      Pace bin: ${formatPace(binStartSec / 60).replace(" /km", "")} - ${formatPace(binEndSec / 60).replace(" /km", "")} /km<br/>
      Avg HR: ${hrLabel}<br/>
      Points: ${cell.count}
    `;
    tooltip.removeAttribute("hidden");

    const svgRect = svgEl.getBoundingClientRect();
    const wrapRect = chartWrap.getBoundingClientRect();
    const xPx = ((cell.x + cellW / 2) / width) * svgRect.width + (svgRect.left - wrapRect.left);
    const yPx = (cell.y / height) * svgRect.height + (svgRect.top - wrapRect.top);
    const clampedX = Math.min(wrapRect.width - 92, Math.max(92, xPx));
    const topSafe = Math.max(44, yPx);
    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${topSafe}px`;
  }

  function moveHover(event) {
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
    const yInSvg = ((event.clientY - rect.top) / rect.height) * height;
    const col = Math.floor((xInSvg - margin.left) / cellW);
    const row = Math.floor((yInSvg - margin.top) / cellH);

    if (col < 0 || col >= cols || row < 0 || row >= rows) {
      hideHover();
      return;
    }

    showHover(cells[row * cols + col]);
  }

  capture.addEventListener("pointermove", moveHover);
  capture.addEventListener("pointerenter", moveHover);
  capture.addEventListener("pointerdown", moveHover);
  capture.addEventListener("pointerleave", hideHover);
  capture.addEventListener("pointercancel", hideHover);
  chartWrap.addEventListener("pointerleave", hideHover);
  svgEl.addEventListener("pointerleave", hideHover);

  if (heatmapColorMinInput && heatmapColorMaxInput) {
    function updateInlineHeatmapLegendUi() {
      const minStep = heatmapColorValueToSlider(heatmapColorRangeMin);
      const maxStep = heatmapColorValueToSlider(heatmapColorRangeMax);
      if (heatmapColorBar) {
        heatmapColorBar.style.background = currentHeatmapLegendGradient();
      }
      if (heatmapColorFill) {
        const startPct = (minStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;
        const endPct = (maxStep / HEATMAP_COLOR_SLIDER_STEPS) * 100;
        heatmapColorFill.style.left = `${startPct}%`;
        heatmapColorFill.style.width = `${Math.max(0, endPct - startPct)}%`;
      }
      if (heatmapColorMinLabel && Number.isFinite(heatmapColorRangeMin)) {
        heatmapColorMinLabel.textContent = `${heatmapColorRangeMin.toFixed(0)} bpm`;
      }
      if (heatmapColorMaxLabel && Number.isFinite(heatmapColorRangeMax)) {
        heatmapColorMaxLabel.textContent = `${heatmapColorRangeMax.toFixed(0)} bpm`;
      }
    }

    function updateInlineHeatmapCellColors() {
      if (heatmapCellRects.length !== cells.length) {
        return;
      }
      for (let i = 0; i < heatmapCellRects.length; i += 1) {
        const cell = cells[i];
        const color = heatmapColor(cell.avgHr, heatmapColorRangeMin, heatmapColorRangeMax);
        heatmapCellRects[i].setAttribute("fill", color);
      }
    }

    function applyInlineHeatmapColorRangeChange(changed) {
      let nextMinStep = Number(heatmapColorMinInput.value);
      let nextMaxStep = Number(heatmapColorMaxInput.value);
      if (!Number.isFinite(nextMinStep) || !Number.isFinite(nextMaxStep)) {
        return;
      }

      nextMinStep = Math.max(0, Math.min(HEATMAP_COLOR_SLIDER_STEPS, Math.round(nextMinStep)));
      nextMaxStep = Math.max(0, Math.min(HEATMAP_COLOR_SLIDER_STEPS, Math.round(nextMaxStep)));

      if (changed === "min" && nextMinStep > nextMaxStep - HEATMAP_COLOR_MIN_GAP_STEPS) {
        nextMaxStep = Math.min(HEATMAP_COLOR_SLIDER_STEPS, nextMinStep + HEATMAP_COLOR_MIN_GAP_STEPS);
        heatmapColorMaxInput.value = String(nextMaxStep);
      }

      if (changed === "max" && nextMaxStep < nextMinStep + HEATMAP_COLOR_MIN_GAP_STEPS) {
        nextMinStep = Math.max(0, nextMaxStep - HEATMAP_COLOR_MIN_GAP_STEPS);
        heatmapColorMinInput.value = String(nextMinStep);
      }

      heatmapColorRangeMin = heatmapColorSliderToValue(nextMinStep);
      heatmapColorRangeMax = heatmapColorSliderToValue(nextMaxStep);
      clampHeatmapColorRange();
      updateInlineHeatmapLegendUi();
      updateInlineHeatmapCellColors();
      updateHeatmapSummary();
    }

    heatmapColorMinInput.addEventListener("input", () => applyInlineHeatmapColorRangeChange("min"));
    heatmapColorMaxInput.addEventListener("input", () => applyInlineHeatmapColorRangeChange("max"));
    heatmapColorMinInput.addEventListener("change", () => applyInlineHeatmapColorRangeChange("min"));
    heatmapColorMaxInput.addEventListener("change", () => applyInlineHeatmapColorRangeChange("max"));
    heatmapColorMinInput.addEventListener("pointerdown", () => {
      heatmapColorMinInput.style.zIndex = "4";
      heatmapColorMaxInput.style.zIndex = "3";
    });
    heatmapColorMaxInput.addEventListener("pointerdown", () => {
      heatmapColorMaxInput.style.zIndex = "4";
      heatmapColorMinInput.style.zIndex = "3";
    });
  }
}

function hasPaceAxisBounds() {
  return Number.isFinite(paceAxisBoundMin) && Number.isFinite(paceAxisBoundMax) && paceAxisBoundMax > paceAxisBoundMin;
}

function paceValueToSlider(value) {
  if (!hasPaceAxisBounds()) {
    return 0;
  }

  // Pace axis is reversed in the chart (left=slower, right=faster), so slider follows the same orientation.
  const t = (paceAxisBoundMax - value) / (paceAxisBoundMax - paceAxisBoundMin);
  return Math.round(Math.max(0, Math.min(1, t)) * PACE_AXIS_SLIDER_STEPS);
}

function paceSliderToValue(sliderStep) {
  if (!hasPaceAxisBounds()) {
    return 0;
  }

  const t = Math.max(0, Math.min(PACE_AXIS_SLIDER_STEPS, sliderStep)) / PACE_AXIS_SLIDER_STEPS;
  return paceAxisBoundMax - t * (paceAxisBoundMax - paceAxisBoundMin);
}

function clampPaceAxisRange() {
  if (!hasPaceAxisBounds()) {
    paceAxisRangeMin = null;
    paceAxisRangeMax = null;
    return;
  }

  let min = Number.isFinite(paceAxisRangeMin) ? paceAxisRangeMin : paceAxisBoundMin;
  let max = Number.isFinite(paceAxisRangeMax) ? paceAxisRangeMax : paceAxisBoundMax;

  min = Math.max(paceAxisBoundMin, Math.min(paceAxisBoundMax, min));
  max = Math.max(paceAxisBoundMin, Math.min(paceAxisBoundMax, max));

  if (max - min < PACE_AXIS_MIN_SPAN) {
    const center = (min + max) / 2;
    min = center - PACE_AXIS_MIN_SPAN / 2;
    max = center + PACE_AXIS_MIN_SPAN / 2;
  }

  if (min < paceAxisBoundMin) {
    min = paceAxisBoundMin;
  }
  if (max > paceAxisBoundMax) {
    max = paceAxisBoundMax;
  }
  if (max - min < PACE_AXIS_MIN_SPAN) {
    min = paceAxisBoundMin;
    max = paceAxisBoundMax;
  }

  paceAxisRangeMin = min;
  paceAxisRangeMax = max;
}

function updatePaceAxisControlsUi() {
  if (!paceAxisControlsEl || !paceAxisMinEl || !paceAxisMaxEl || !paceAxisLabelEl || !hasPaceAxisBounds()) {
    return;
  }

  clampPaceAxisRange();
  const slowStep = paceValueToSlider(paceAxisRangeMax);
  const fastStep = paceValueToSlider(paceAxisRangeMin);

  paceAxisControlsEl.hidden = false;
  paceAxisMinEl.min = "0";
  paceAxisMinEl.max = String(PACE_AXIS_SLIDER_STEPS);
  paceAxisMinEl.value = String(slowStep);
  paceAxisMaxEl.min = "0";
  paceAxisMaxEl.max = String(PACE_AXIS_SLIDER_STEPS);
  paceAxisMaxEl.value = String(fastStep);

  paceAxisLabelEl.textContent = `${formatPace(paceAxisRangeMax).replace(" /km", "")} - ${formatPace(paceAxisRangeMin).replace(
    " /km",
    ""
  )} /km (left -> right)`;

  if (paceAxisFillEl) {
    const startPct = (slowStep / PACE_AXIS_SLIDER_STEPS) * 100;
    const endPct = (fastStep / PACE_AXIS_SLIDER_STEPS) * 100;
    paceAxisFillEl.style.left = `${startPct}%`;
    paceAxisFillEl.style.width = `${Math.max(0, endPct - startPct)}%`;
  }
}

function hasPaceHrColorBounds() {
  return (
    Number.isFinite(paceHrColorBoundMin) &&
    Number.isFinite(paceHrColorBoundMax) &&
    paceHrColorBoundMax > paceHrColorBoundMin
  );
}

function paceHrColorValueToSlider(value) {
  if (!hasPaceHrColorBounds()) {
    return 0;
  }

  const t = (value - paceHrColorBoundMin) / (paceHrColorBoundMax - paceHrColorBoundMin);
  return Math.round(Math.max(0, Math.min(1, t)) * PACE_HR_COLOR_SLIDER_STEPS);
}

function paceHrColorSliderToValue(sliderStep) {
  if (!hasPaceHrColorBounds()) {
    return 0;
  }

  const t = Math.max(0, Math.min(PACE_HR_COLOR_SLIDER_STEPS, sliderStep)) / PACE_HR_COLOR_SLIDER_STEPS;
  return paceHrColorBoundMin + t * (paceHrColorBoundMax - paceHrColorBoundMin);
}

function clampPaceHrColorRange() {
  if (!hasPaceHrColorBounds()) {
    paceHrColorRangeMin = null;
    paceHrColorRangeMax = null;
    return;
  }

  let min = Number.isFinite(paceHrColorRangeMin) ? paceHrColorRangeMin : paceHrColorBoundMin;
  let max = Number.isFinite(paceHrColorRangeMax) ? paceHrColorRangeMax : paceHrColorBoundMax;

  min = Math.max(paceHrColorBoundMin, Math.min(paceHrColorBoundMax, min));
  max = Math.max(paceHrColorBoundMin, Math.min(paceHrColorBoundMax, max));

  const span = paceHrColorBoundMax - paceHrColorBoundMin;
  const minGapValue = Number.isFinite(span) && span > 0 ? (PACE_HR_COLOR_MIN_GAP_STEPS / PACE_HR_COLOR_SLIDER_STEPS) * span : 0;
  if (max - min < minGapValue) {
    min = paceHrColorBoundMin;
    max = paceHrColorBoundMax;
  }

  paceHrColorRangeMin = min;
  paceHrColorRangeMax = max;
}

function getPaceHrColorRangeToleranceMs() {
  if (!hasPaceHrColorBounds()) {
    return 0;
  }

  const span = paceHrColorBoundMax - paceHrColorBoundMin;
  if (!Number.isFinite(span) || span <= 0) {
    return 0;
  }

  return Math.max(60 * 1000, span / PACE_HR_COLOR_SLIDER_STEPS);
}

function getPaceHrColorWindowDaysFromCurrentRange() {
  if (!Number.isFinite(paceHrColorRangeMin) || !Number.isFinite(paceHrColorRangeMax)) {
    return null;
  }

  const spanMs = Math.max(0, paceHrColorRangeMax - paceHrColorRangeMin);
  return Math.max(1, Math.round(spanMs / DAY_MS) + 1);
}

function describePaceHrColorRangePersistence() {
  if (!Number.isFinite(paceHrColorRangeMin) || !Number.isFinite(paceHrColorRangeMax)) {
    return null;
  }

  if (!hasPaceHrColorBounds()) {
    return {
      mode: "absolute",
      min: Number(paceHrColorRangeMin),
      max: Number(paceHrColorRangeMax)
    };
  }

  const toleranceMs = getPaceHrColorRangeToleranceMs();
  const includesLatest = paceHrColorRangeMax >= paceHrColorBoundMax - toleranceMs;
  if (!includesLatest) {
    return {
      mode: "absolute",
      min: Number(paceHrColorRangeMin),
      max: Number(paceHrColorRangeMax)
    };
  }

  const includesEarliest = paceHrColorRangeMin <= paceHrColorBoundMin + toleranceMs;
  if (includesEarliest) {
    return { mode: "all" };
  }

  const days = getPaceHrColorWindowDaysFromCurrentRange();
  if (!Number.isFinite(days) || days <= 0) {
    return {
      mode: "absolute",
      min: Number(paceHrColorRangeMin),
      max: Number(paceHrColorRangeMax)
    };
  }

  return { mode: "latest_window", days: Math.round(days) };
}

function syncPaceHrColorRangeModeWithCurrentValues() {
  const descriptor = describePaceHrColorRangePersistence();
  if (!descriptor) {
    return null;
  }

  paceHrColorRangeMode = descriptor.mode;
  paceHrColorRangeWindowDays = descriptor.mode === "latest_window" ? descriptor.days : null;
  return descriptor;
}

function applyPaceHrColorRangeModeToCurrentBounds() {
  if (!hasPaceHrColorBounds()) {
    paceHrColorRangeMin = null;
    paceHrColorRangeMax = null;
    return;
  }

  if (paceHrColorRangeMode === "all") {
    paceHrColorRangeMin = paceHrColorBoundMin;
    paceHrColorRangeMax = paceHrColorBoundMax;
    clampPaceHrColorRange();
    return;
  }

  if (paceHrColorRangeMode === "latest_window") {
    const maxSpanDays = Math.max(1, Math.round((paceHrColorBoundMax - paceHrColorBoundMin) / DAY_MS) + 1);
    const requestedDays = Number(paceHrColorRangeWindowDays);
    const clampedDays = Number.isFinite(requestedDays)
      ? Math.max(1, Math.min(maxSpanDays, Math.round(requestedDays)))
      : maxSpanDays;

    paceHrColorRangeMax = paceHrColorBoundMax;
    paceHrColorRangeMin = paceHrColorBoundMax - (clampedDays - 1) * DAY_MS;
    clampPaceHrColorRange();
    paceHrColorRangeWindowDays = clampedDays;
    return;
  }

  clampPaceHrColorRange();
}

function linePath(points) {
  if (points.length === 0) {
    return "";
  }

  const [first, ...rest] = points;
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${rest
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")}`;
}

function linePathWithGaps(points) {
  let path = "";
  let drawing = false;

  for (const point of points) {
    if (point.y === null || !Number.isFinite(point.y)) {
      drawing = false;
      continue;
    }

    if (!drawing) {
      path += `M ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
      drawing = true;
    } else {
      path += `L ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
    }
  }

  return path.trim();
}

function makeSeriesPoints(series, key, xScale, yScale) {
  return series.map((item, i) => ({
    x: xScale(i),
    y: yScale(getValue(item, key))
  }));
}

function drawEmptyChart(message) {
  chartRootEl.innerHTML = `<div class="chart-empty">${message}</div>`;
}

function drawEmptyPaceHrChart(message, options = {}) {
  const hideControls = options.hideControls !== false;
  if (paceHrRootEl) {
    paceHrRootEl.innerHTML = `<div class="chart-empty">${message}</div>`;
  }
  if (paceHrSummaryEl) {
    paceHrSummaryEl.textContent = "";
  }
  if (paceHrComparableSummaryEl) {
    paceHrComparableSummaryEl.textContent = "";
  }
  if (paceHrComparableResetEl) {
    paceHrComparableResetEl.hidden = true;
  }
  if (paceAxisControlsEl && hideControls) {
    paceAxisControlsEl.hidden = true;
  }
}

function pearsonCorrelation(points) {
  if (!points.length) {
    return null;
  }

  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.paceMinKm, 0);
  const sumY = points.reduce((sum, point) => sum + point.avgHrBpm, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (const point of points) {
    const dx = point.paceMinKm - meanX;
    const dy = point.avgHrBpm - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX <= 0 || varY <= 0) {
    return null;
  }

  return cov / Math.sqrt(varX * varY);
}

function linearRegression(points) {
  if (!points.length) {
    return null;
  }

  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.paceMinKm, 0);
  const sumY = points.reduce((sum, point) => sum + point.avgHrBpm, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  for (const point of points) {
    const dx = point.paceMinKm - meanX;
    sxx += dx * dx;
    sxy += dx * (point.avgHrBpm - meanY);
  }

  if (sxx <= 0) {
    return null;
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

function correlationStrengthLabel(correlation) {
  if (!Number.isFinite(correlation)) {
    return "n/a";
  }

  const abs = Math.abs(correlation);
  if (abs < 0.2) {
    return "very weak";
  }
  if (abs < 0.4) {
    return "weak";
  }
  if (abs < 0.6) {
    return "moderate";
  }
  if (abs < 0.8) {
    return "strong";
  }
  return "very strong";
}

function drawPaceHrChart(points, rangeStartDate, rangeEndDate) {
  if (!paceHrRootEl) {
    return;
  }

  setComparableControlsUi();

  const comparableContext = buildComparableRunContext(rangeStartDate, rangeEndDate);
  const comparableModeActive = Boolean(comparableRunsEnabled && comparableContext.referenceRun);
  if (paceHrComparableResetEl) {
    paceHrComparableResetEl.hidden = true;
  }

  function updateComparableSummary(lowSample = false) {
    if (!paceHrComparableSummaryEl) {
      return;
    }

    if (!comparableRunsEnabled) {
      paceHrComparableSummaryEl.textContent = "";
      return;
    }

    if (!comparableContext.referenceRun) {
      paceHrComparableSummaryEl.textContent = "Comparable mode is on, but no reference run is available in the selected timeline.";
      return;
    }

    const strictnessLabel = formatComparableStrictnessLabel(comparableRunsStrictness);
    const includedRuns = comparableContext.comparableRunIds.size;
    const totalRuns = comparableContext.runsInRange.length;
    const referenceLabel = `${formatRunName(comparableContext.referenceRun)} (${formatRunDateTimeLabel(comparableContext.referenceRun)})`;
    const thresholdsLabel = formatComparableDimensionSummary(comparableContext.thresholds);
    const checksLabel = `checks used: duration/distance ${comparableContext.durationOrDistanceChecks}, elevation ${comparableContext.elevationChecks}, temperature ${comparableContext.temperatureChecks}`;
    const warningText = lowSample
      ? " | Low sample (<4 runs). Use Show all runs or choose Loose."
      : "";
    paceHrComparableSummaryEl.textContent = `Comparable mode (${strictnessLabel}) | Reference: ${referenceLabel} | Included runs: ${includedRuns}/${totalRuns} | ${thresholdsLabel} | ${checksLabel}${warningText}`;
  }

  const allUsablePoints = points.filter((point) => {
    if (!point || typeof point !== "object") {
      return false;
    }

    const pace = Number(point.paceMinKm);
    const hr = Number(point.avgHrBpm);
    return Number.isFinite(pace) && pace > 0 && Number.isFinite(hr) && hr > 0;
  });

  if (allUsablePoints.length < 2) {
    paceAxisBoundMin = null;
    paceAxisBoundMax = null;
    paceAxisRangeMin = null;
    paceAxisRangeMax = null;
    paceHrColorBoundMin = null;
    paceHrColorBoundMax = null;
    paceHrColorRangeMin = null;
    paceHrColorRangeMax = null;
    drawEmptyPaceHrChart("Need at least 2 pace/HR points in synced data.");
    updateComparableSummary();
    return;
  }

  const paceValues = allUsablePoints.map((point) => Number(point.paceMinKm));
  const hrValues = allUsablePoints.map((point) => Number(point.avgHrBpm));

  let paceMin = Math.min(...paceValues);
  let paceMax = Math.max(...paceValues);
  if (paceMin === paceMax) {
    paceMin -= 0.3;
    paceMax += 0.3;
  }

  paceAxisBoundMin = Math.max(0.1, paceMin);
  paceAxisBoundMax = Math.max(paceAxisBoundMin + 0.01, paceMax);
  clampPaceAxisRange();
  persistPaceAxisRange();
  updatePaceAxisControlsUi();

  const dateWindowPoints = allUsablePoints.filter((point) => {
    if (rangeStartDate && String(point.date) < rangeStartDate) {
      return false;
    }
    if (rangeEndDate && String(point.date) > rangeEndDate) {
      return false;
    }
    return true;
  });

  if (dateWindowPoints.length < 2) {
    drawEmptyPaceHrChart(
      rangeStartDate && rangeEndDate
        ? `Need at least 2 pace/HR points in ${rangeStartDate} - ${rangeEndDate}.`
        : "Need at least 2 pace/HR points.",
      { hideControls: false }
    );
    updateComparableSummary();
    return;
  }

  let comparableWindowPoints = dateWindowPoints;
  if (comparableModeActive) {
    comparableWindowPoints = dateWindowPoints.filter((point) =>
      comparableContext.comparableRunIds.has(normalizeActivityId(point.activityId ?? point.id))
    );
    const lowSample = comparableContext.comparableRunIds.size < 4;
    if (paceHrComparableResetEl) {
      paceHrComparableResetEl.hidden = !lowSample;
    }
    updateComparableSummary(lowSample);
  } else {
    updateComparableSummary();
  }

  if (!comparableWindowPoints.length) {
    drawEmptyPaceHrChart("No pace/HR points match comparable-run filters. Try Loose or show all runs.", { hideControls: false });
    return;
  }

  const usablePoints = comparableWindowPoints.filter((point) => {
    const pace = Number(point.paceMinKm);
    return pace >= paceAxisRangeMin && pace <= paceAxisRangeMax;
  });

  if (usablePoints.length < 2) {
    drawEmptyPaceHrChart("No points in current pace range. Widen the Pace Range slider.", { hideControls: false });
    return;
  }

  const width = 980;
  const height = 360;
  const margin = { top: 26, right: 24, bottom: 46, left: 56 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  let hrMin = Math.min(...hrValues);
  let hrMax = Math.max(...hrValues);

  if (hrMin === hrMax) {
    hrMin -= 3;
    hrMax += 3;
  }

  const hrPad = (hrMax - hrMin) * 0.12;
  const xMin = paceAxisRangeMin;
  const xMax = paceAxisRangeMax;
  const yMin = Math.max(20, hrMin - hrPad);
  const yMax = hrMax + hrPad;

  const xScale = (pace) => margin.left + ((xMax - pace) / Math.max(0.001, xMax - xMin)) * innerW;
  const yScale = (hr) => margin.top + innerH - ((hr - yMin) / Math.max(0.001, yMax - yMin)) * innerH;

  const correlation = pearsonCorrelation(usablePoints);
  const trend = linearRegression(usablePoints);
  const xTicks = 6;
  const yTicks = 5;

  const xGuides = [];
  for (let i = 0; i <= xTicks; i += 1) {
    const pace = xMax - ((xMax - xMin) * i) / xTicks;
    xGuides.push({ pace, x: xScale(pace), label: formatPace(pace).replace(" /km", "") });
  }

  const yGuides = [];
  for (let i = 0; i <= yTicks; i += 1) {
    const hr = yMin + ((yMax - yMin) * i) / yTicks;
    yGuides.push({ hr, y: yScale(hr) });
  }

  const fallbackTimestamps = comparableWindowPoints
    .map((point) => parseDateKeyUTC(point.date).getTime())
    .filter((value) => Number.isFinite(value));

  const rangeMinTime = rangeStartDate ? parseDateKeyUTC(rangeStartDate).getTime() : null;
  const rangeMaxTime = rangeEndDate ? parseDateKeyUTC(rangeEndDate).getTime() : null;
  const minTime = Number.isFinite(rangeMinTime)
    ? rangeMinTime
    : fallbackTimestamps.length
      ? Math.min(...fallbackTimestamps)
      : null;
  const maxTime = Number.isFinite(rangeMaxTime)
    ? rangeMaxTime
    : fallbackTimestamps.length
      ? Math.max(...fallbackTimestamps)
      : null;

  paceHrColorBoundMin = minTime;
  paceHrColorBoundMax = maxTime;
  applyPaceHrColorRangeModeToCurrentBounds();
  persistPaceHrColorRange();

  function pointDateColorFromTimestamp(ts) {
    const colorMinTime = Number.isFinite(paceHrColorRangeMin) ? paceHrColorRangeMin : minTime;
    const colorMaxTime = Number.isFinite(paceHrColorRangeMax) ? paceHrColorRangeMax : maxTime;
    if (!Number.isFinite(ts) || !Number.isFinite(colorMinTime) || !Number.isFinite(colorMaxTime) || colorMaxTime <= colorMinTime) {
      return "hsl(210 85% 62%)";
    }

    // Selected colormap min date = lightest blue, max date = darkest blue.
    const t = Math.max(0, Math.min(1, (ts - colorMinTime) / (colorMaxTime - colorMinTime)));
    const lightness = 84 - t * 48;
    return `hsl(210 86% ${lightness.toFixed(1)}%)`;
  }

  function pointDateColor(dateKey) {
    const ts = parseDateKeyUTC(dateKey).getTime();
    return pointDateColorFromTimestamp(ts);
  }

  function currentPaceDateLegendGradient() {
    return buildColorScaleGradient(
      paceHrColorBoundMin,
      paceHrColorBoundMax,
      (value) => pointDateColorFromTimestamp(value)
    );
  }

  const dateLegendGradient = currentPaceDateLegendGradient();
  const initialColorMinTime = Number.isFinite(paceHrColorRangeMin) ? paceHrColorRangeMin : minTime;
  const initialColorMaxTime = Number.isFinite(paceHrColorRangeMax) ? paceHrColorRangeMax : maxTime;
  const dateLegendStart = formatTimestampDateLabelUtc(initialColorMinTime);
  const dateLegendEnd = formatTimestampDateLabelUtc(initialColorMaxTime);
  const paceColorMinStep = paceHrColorValueToSlider(paceHrColorRangeMin);
  const paceColorMaxStep = paceHrColorValueToSlider(paceHrColorRangeMax);
  const paceColorStartPct = (paceColorMinStep / PACE_HR_COLOR_SLIDER_STEPS) * 100;
  const paceColorEndPct = (paceColorMaxStep / PACE_HR_COLOR_SLIDER_STEPS) * 100;

  const plottedPoints = usablePoints.map((point, index) => {
    const pace = Number(point.paceMinKm);
    const hr = Number(point.avgHrBpm);
    const segmentLabel =
      point.source === "interval"
        ? `Interval ${point.splitKm}`
        : point.source === "split-km"
          ? `Split ${point.splitKm}`
          : "Whole run";
    return {
      ...point,
      paceMinKm: pace,
      avgHrBpm: hr,
      segmentLabel,
      color: pointDateColor(point.date),
      x: xScale(pace),
      y: yScale(hr),
      pointIndex: index
    };
  });
  const selectedIds = getSelectedActivityIdSet();
  const selectedPlottedPoints = selectedIds.size
    ? plottedPoints.filter((point) => selectedIds.has(normalizeActivityId(point.activityId ?? point.id)))
    : [];

  const pointsSvg = plottedPoints
    .map((point) => {
      const title = `${formatDateLong(point.date)} | ${point.segmentLabel} | ${formatPace(point.paceMinKm)} | ${point.avgHrBpm.toFixed(
        0
      )} bpm | ${formatDistance(Number(point.distanceKm || 0))}`;

      return `<circle class="pace-hr-point" data-index="${point.pointIndex}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(
        2
      )}" r="4.2" fill="${point.color}" fill-opacity="0.9" stroke="#ffffff" stroke-width="1"><title>${title}</title></circle>`;
    })
    .join("");
  const selectedOutlinesSvg = selectedPlottedPoints
    .map(
      (point) =>
        `<circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="6.1" fill="none" stroke="${SELECTED_ACTIVITY_HIGHLIGHT}" stroke-width="2.2"/>`
    )
    .join("");

  let trendSvg = "";
  if (trend) {
    const yAtMin = trend.intercept + trend.slope * xMin;
    const yAtMax = trend.intercept + trend.slope * xMax;
    trendSvg = `<path d="M ${xScale(xMin).toFixed(2)} ${yScale(yAtMin).toFixed(2)} L ${xScale(xMax).toFixed(2)} ${yScale(
      yAtMax
    ).toFixed(2)}" fill="none" stroke="#0f172a" stroke-width="2" stroke-dasharray="6 5" />`;
  }

  const svg = `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Heart rate and pace correlation scatter plot">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" rx="12"/>

        ${yGuides
          .map(
            (tick) => `
          <line x1="${margin.left}" y1="${tick.y}" x2="${width - margin.right}" y2="${tick.y}" stroke="#e6ece9" stroke-width="1"/>
          <text x="${margin.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="12" fill="#5f736d">${tick.hr.toFixed(
              0
            )}</text>
        `
          )
          .join("")}

        ${xGuides
          .map(
            (tick) => `
          <line x1="${tick.x}" y1="${margin.top}" x2="${tick.x}" y2="${height - margin.bottom}" stroke="#f0f5f3" stroke-width="1"/>
          <text x="${tick.x}" y="${height - margin.bottom + 18}" text-anchor="middle" font-size="12" fill="#5f736d">${tick.label}</text>
        `
          )
          .join("")}

        ${trendSvg}
        ${pointsSvg}
        ${selectedOutlinesSvg}

        <line id="pace-hr-hover-v" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${
          height - margin.bottom
        }" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" hidden />
        <line id="pace-hr-hover-h" x1="${margin.left}" y1="${margin.top}" x2="${width - margin.right}" y2="${margin.top}" stroke="#334155" stroke-width="1" stroke-dasharray="4 4" hidden />
        <circle id="pace-hr-hover-dot" cx="${margin.left}" cy="${margin.top}" r="5.2" fill="#0f172a" stroke="#ffffff" stroke-width="1.5" hidden />
        <rect id="pace-hr-hover-capture" x="${margin.left}" y="${margin.top}" width="${innerW}" height="${innerH}" fill="transparent" style="cursor: crosshair;" />

        <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="12" fill="#475569">Pace (min/km)</text>
        <text x="16" y="${height / 2}" text-anchor="middle" font-size="12" fill="#475569" transform="rotate(-90 16 ${height / 2})">Heart rate (bpm)</text>
      </svg>
      <div id="pace-hr-tooltip" class="chart-tooltip" hidden></div>
    </div>
    <div class="color-scale-legend" aria-label="Scatter color legend">
      <div class="color-scale-title">Bubble color: run date</div>
      <div class="color-scale-inline-range">
        <div id="pace-hr-color-bar" class="color-scale-bar" style="background: ${dateLegendGradient};"></div>
        <div id="pace-hr-color-inline-fill" class="color-scale-inline-fill" style="left: ${paceColorStartPct}%; width: ${Math.max(
          0,
          paceColorEndPct - paceColorStartPct
        )}%;"></div>
        <input
          id="pace-hr-color-inline-min"
          class="color-scale-inline-input"
          type="range"
          min="0"
          max="${PACE_HR_COLOR_SLIDER_STEPS}"
          step="1"
          value="${paceColorMinStep}"
          aria-label="Date color scale minimum"
        />
        <input
          id="pace-hr-color-inline-max"
          class="color-scale-inline-input"
          type="range"
          min="0"
          max="${PACE_HR_COLOR_SLIDER_STEPS}"
          step="1"
          value="${paceColorMaxStep}"
          aria-label="Date color scale maximum"
        />
      </div>
      <div class="color-scale-labels">
        <span id="pace-hr-color-inline-min-label">${dateLegendStart}</span>
        <span id="pace-hr-color-inline-max-label">${dateLegendEnd}</span>
      </div>
      <div class="color-scale-presets" role="group" aria-label="Date color window presets">
        ${PACE_HR_COLOR_PRESET_WINDOWS.map(
          (days) =>
            `<button type="button" class="timeline-preset-button pace-hr-color-preset-button" data-range-days="${days}">Last ${days} days</button>`
        ).join("")}
      </div>
    </div>
  `;

  paceHrRootEl.innerHTML = svg;

  const chartWrap = paceHrRootEl.querySelector(".chart-wrap");
  const svgEl = paceHrRootEl.querySelector("svg");
  const capture = paceHrRootEl.querySelector("#pace-hr-hover-capture");
  const hoverV = paceHrRootEl.querySelector("#pace-hr-hover-v");
  const hoverH = paceHrRootEl.querySelector("#pace-hr-hover-h");
  const hoverDot = paceHrRootEl.querySelector("#pace-hr-hover-dot");
  const tooltip = paceHrRootEl.querySelector("#pace-hr-tooltip");
  const paceColorBar = paceHrRootEl.querySelector("#pace-hr-color-bar");
  const paceColorFill = paceHrRootEl.querySelector("#pace-hr-color-inline-fill");
  const paceColorMinLabel = paceHrRootEl.querySelector("#pace-hr-color-inline-min-label");
  const paceColorMaxLabel = paceHrRootEl.querySelector("#pace-hr-color-inline-max-label");
  const paceColorMinInput = paceHrRootEl.querySelector("#pace-hr-color-inline-min");
  const paceColorMaxInput = paceHrRootEl.querySelector("#pace-hr-color-inline-max");
  const paceColorPresetButtons = Array.from(paceHrRootEl.querySelectorAll(".pace-hr-color-preset-button"));
  const pacePointEls = Array.from(paceHrRootEl.querySelectorAll(".pace-hr-point"));

  if (chartWrap && svgEl && capture && hoverV && hoverH && hoverDot && tooltip) {
    const edgePad = 92;

    function hideHover() {
      hoverV.setAttribute("hidden", "");
      hoverH.setAttribute("hidden", "");
      hoverDot.setAttribute("hidden", "");
      tooltip.setAttribute("hidden", "");
    }

    function closestPoint(x, y) {
      let bestPoint = null;
      let bestDistanceSq = Infinity;

      for (const point of plottedPoints) {
        const dx = point.x - x;
        const dy = point.y - y;
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < bestDistanceSq) {
          bestDistanceSq = distanceSq;
          bestPoint = point;
        }
      }

      return bestPoint;
    }

    function showHover(point) {
      if (!point) {
        hideHover();
        return;
      }

      hoverV.setAttribute("x1", point.x);
      hoverV.setAttribute("x2", point.x);
      hoverV.removeAttribute("hidden");

      hoverH.setAttribute("y1", point.y);
      hoverH.setAttribute("y2", point.y);
      hoverH.removeAttribute("hidden");

      hoverDot.setAttribute("cx", point.x);
      hoverDot.setAttribute("cy", point.y);
      hoverDot.setAttribute("fill", point.color);
      hoverDot.removeAttribute("hidden");

      tooltip.innerHTML = `
        <strong>${formatDateLabel(point.date)}</strong><br/>
        ${point.segmentLabel}<br/>
        Pace: ${formatPace(point.paceMinKm)}<br/>
        HR: ${point.avgHrBpm.toFixed(0)} bpm<br/>
        Distance: ${formatDistance(Number(point.distanceKm || 0))}
      `;
      tooltip.removeAttribute("hidden");

      const svgRect = svgEl.getBoundingClientRect();
      const wrapRect = chartWrap.getBoundingClientRect();
      const xPx = (point.x / width) * svgRect.width + (svgRect.left - wrapRect.left);
      const yPx = (point.y / height) * svgRect.height + (svgRect.top - wrapRect.top);
      const clampedX = Math.min(wrapRect.width - edgePad, Math.max(edgePad, xPx));
      const topSafe = Math.max(44, yPx);

      tooltip.style.left = `${clampedX}px`;
      tooltip.style.top = `${topSafe}px`;
    }

    function moveHover(event) {
      const rect = svgEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
      const yInSvg = ((event.clientY - rect.top) / rect.height) * height;
      const x = Math.min(width - margin.right, Math.max(margin.left, xInSvg));
      const y = Math.min(height - margin.bottom, Math.max(margin.top, yInSvg));
      showHover(closestPoint(x, y));
    }

    function handleClosestPointClick(event) {
      const rect = svgEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
      const yInSvg = ((event.clientY - rect.top) / rect.height) * height;
      const x = Math.min(width - margin.right, Math.max(margin.left, xInSvg));
      const y = Math.min(height - margin.bottom, Math.max(margin.top, yInSvg));
      const point = closestPoint(x, y);
      const activityId = normalizeActivityId(point?.activityId ?? point?.id);
      if (!activityId) {
        return;
      }

      const selectedIdsNow = getSelectedActivityIdSet();
      if (selectedIdsNow.has(activityId)) {
        openActivityDetail(activityId, { selectActivity: false });
        return;
      }

      if (isActivityDetailOpen()) {
        openActivityDetail(activityId, { selectActivity: true });
        return;
      }

      selectOnlyActivity(activityId, { syncDetail: false });
      closeActivityDetailDrawer({ clearSelection: false });
    }

    capture.addEventListener("pointermove", moveHover);
    capture.addEventListener("pointerenter", moveHover);
    capture.addEventListener("pointerdown", moveHover);
    capture.addEventListener("click", handleClosestPointClick);
    capture.addEventListener("pointerleave", hideHover);
    capture.addEventListener("pointercancel", hideHover);
    capture.addEventListener("mouseleave", hideHover);
    chartWrap.addEventListener("pointerleave", hideHover);
    svgEl.addEventListener("pointerleave", hideHover);
    chartWrap.addEventListener("mouseleave", hideHover);
    svgEl.addEventListener("mouseleave", hideHover);
  }

  if (paceColorMinInput && paceColorMaxInput) {
    function updatePaceHrColorPresetButtonsUi() {
      if (!paceColorPresetButtons.length) {
        return;
      }

      for (const button of paceColorPresetButtons) {
        const days = Number(button.getAttribute("data-range-days"));
        const isActive =
          paceHrColorRangeMode === "latest_window" &&
          Number.isFinite(days) &&
          days > 0 &&
          Number(paceHrColorRangeWindowDays) === Math.round(days);
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      }
    }

    function updateInlinePaceHrLegendUi() {
      const minStep = paceHrColorValueToSlider(paceHrColorRangeMin);
      const maxStep = paceHrColorValueToSlider(paceHrColorRangeMax);
      paceColorMinInput.value = String(minStep);
      paceColorMaxInput.value = String(maxStep);
      if (paceColorBar) {
        paceColorBar.style.background = currentPaceDateLegendGradient();
      }
      if (paceColorFill) {
        const startPct = (minStep / PACE_HR_COLOR_SLIDER_STEPS) * 100;
        const endPct = (maxStep / PACE_HR_COLOR_SLIDER_STEPS) * 100;
        paceColorFill.style.left = `${startPct}%`;
        paceColorFill.style.width = `${Math.max(0, endPct - startPct)}%`;
      }
      if (paceColorMinLabel) {
        paceColorMinLabel.textContent = formatTimestampDateLabelUtc(paceHrColorRangeMin);
      }
      if (paceColorMaxLabel) {
        paceColorMaxLabel.textContent = formatTimestampDateLabelUtc(paceHrColorRangeMax);
      }
      updatePaceHrColorPresetButtonsUi();
    }

    function updateInlinePaceHrPointColors() {
      if (pacePointEls.length !== plottedPoints.length) {
        return;
      }
      for (let i = 0; i < pacePointEls.length; i += 1) {
        const point = plottedPoints[i];
        const color = pointDateColor(point.date);
        point.color = color;
        pacePointEls[i].setAttribute("fill", color);
      }
    }

    function applyInlinePaceHrColorRangeChange(changed, persist) {
      let nextMinStep = Number(paceColorMinInput.value);
      let nextMaxStep = Number(paceColorMaxInput.value);
      if (!Number.isFinite(nextMinStep) || !Number.isFinite(nextMaxStep)) {
        return;
      }

      nextMinStep = Math.max(0, Math.min(PACE_HR_COLOR_SLIDER_STEPS, Math.round(nextMinStep)));
      nextMaxStep = Math.max(0, Math.min(PACE_HR_COLOR_SLIDER_STEPS, Math.round(nextMaxStep)));

      if (changed === "min" && nextMinStep > nextMaxStep - PACE_HR_COLOR_MIN_GAP_STEPS) {
        nextMaxStep = Math.min(PACE_HR_COLOR_SLIDER_STEPS, nextMinStep + PACE_HR_COLOR_MIN_GAP_STEPS);
        paceColorMaxInput.value = String(nextMaxStep);
      }

      if (changed === "max" && nextMaxStep < nextMinStep + PACE_HR_COLOR_MIN_GAP_STEPS) {
        nextMinStep = Math.max(0, nextMaxStep - PACE_HR_COLOR_MIN_GAP_STEPS);
        paceColorMinInput.value = String(nextMinStep);
      }

      paceHrColorRangeMin = paceHrColorSliderToValue(nextMinStep);
      paceHrColorRangeMax = paceHrColorSliderToValue(nextMaxStep);
      paceHrColorRangeMode = "absolute";
      paceHrColorRangeWindowDays = null;
      clampPaceHrColorRange();
      syncPaceHrColorRangeModeWithCurrentValues();
      updateInlinePaceHrLegendUi();
      updateInlinePaceHrPointColors();
      if (persist) {
        persistPaceHrColorRange();
      }
    }

    function applyPaceHrColorPreset(days) {
      const parsedDays = Number(days);
      if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
        return;
      }

      paceHrColorRangeMode = "latest_window";
      paceHrColorRangeWindowDays = Math.round(parsedDays);
      applyPaceHrColorRangeModeToCurrentBounds();
      syncPaceHrColorRangeModeWithCurrentValues();
      updateInlinePaceHrLegendUi();
      updateInlinePaceHrPointColors();
      persistPaceHrColorRange();
    }

    paceColorMinInput.addEventListener("input", () => applyInlinePaceHrColorRangeChange("min", false));
    paceColorMaxInput.addEventListener("input", () => applyInlinePaceHrColorRangeChange("max", false));
    paceColorMinInput.addEventListener("change", () => applyInlinePaceHrColorRangeChange("min", true));
    paceColorMaxInput.addEventListener("change", () => applyInlinePaceHrColorRangeChange("max", true));
    paceColorMinInput.addEventListener("pointerdown", () => {
      paceColorMinInput.style.zIndex = "4";
      paceColorMaxInput.style.zIndex = "3";
    });
    paceColorMaxInput.addEventListener("pointerdown", () => {
      paceColorMaxInput.style.zIndex = "4";
      paceColorMinInput.style.zIndex = "3";
    });

    for (const button of paceColorPresetButtons) {
      button.addEventListener("click", () => {
        applyPaceHrColorPreset(button.getAttribute("data-range-days"));
      });
    }

    updateInlinePaceHrLegendUi();
    updateInlinePaceHrPointColors();
  }

  if (paceHrSummaryEl) {
    const direction =
      correlation === null
        ? "n/a"
        : correlation < 0
          ? "inverse (faster pace tends to higher HR)"
          : "direct (slower pace tends to higher HR)";
    const label = correlationStrengthLabel(correlation);
    const corrText = correlation === null ? "n/a" : correlation.toFixed(2);
    const uniqueRuns = new Set(usablePoints.map((point) => String(point.activityId ?? point.id ?? point.date))).size;
    const intervalCount = usablePoints.filter((point) => point.source === "interval").length;
    const splitCount = usablePoints.filter((point) => point.source === "split-km").length;
    const progressSummary = summarizePaceHrProgress(
      usablePoints,
      comparableContext.runById,
      comparableModeActive ? comparableContext.referenceRun : null
    );
    const baseSummary = `Points: ${usablePoints.length} (${intervalCount} intervals, ${splitCount} km splits, ${uniqueRuns} runs) | Pearson r: ${corrText} (${label}, ${direction})`;
    paceHrSummaryEl.textContent = progressSummary ? `${baseSummary} | ${progressSummary}` : baseSummary;
  }
}

function calculateToleranceSummary(series, endIndex) {
  const item = series[endIndex];
  if (!item) {
    return null;
  }

  const sum7 = getValue(item, "sum7");
  const sum7ma90 = getValue(item, "sum7ma90");
  if (!Number.isFinite(sum7ma90) || sum7ma90 <= 0) {
    return {
      status: "gray",
      label: "Insufficient Data",
      baselineStatus: "gray",
      baselineText: "Load vs baseline: n/a",
      message: "Need more history to compute 90d average and cap.",
      metrics: `7d: ${formatDistance(sum7)}`,
      deltaPct: null,
      deltaKm: null,
      capKm: null
    };
  }

  const deltaKm = sum7 - sum7ma90;
  const deltaPct = deltaKm / sum7ma90;
  const capKm = sum7ma90 * 1.1;
  const capDeltaKm = sum7 - capKm;

  let status = "yellow";
  let label = "Near Cap";
  if (sum7 <= sum7ma90) {
    status = "green";
    label = "Below Baseline";
  } else if (sum7 > capKm) {
    status = "red";
    label = "Above Cap";
  }
  const baselineStatus = baselineDeltaStatus(deltaPct, sum7, sum7ma90);
  const capContextText =
    capDeltaKm > 0
      ? `${formatSignedDistance(capDeltaKm)} above +10% cap`
      : `${formatSignedDistance(Math.abs(capDeltaKm))} below +10% cap`;
  const baselineText = `Load vs baseline: ${formatSignedPct(deltaPct)} (${formatSignedDistance(deltaKm)}), ${capContextText}`;

  return {
    status,
    label,
    baselineStatus,
    baselineText,
    message: "",
    metrics: `7d: ${formatDistance(sum7)} | 90d baseline: ${formatDistance(sum7ma90)} | +10% cap: ${formatDistance(capKm)}`,
    deltaPct,
    deltaKm,
    capKm
  };
}

function calculateMonotonySummary(series, endIndex) {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(endIndex)) {
    return null;
  }

  const idx = Math.max(0, Math.min(series.length - 1, Math.round(endIndex)));
  const start = Math.max(0, idx - 6);
  const window = series.slice(start, idx + 1);
  if (window.length < 7) {
    return null;
  }

  const values = window.map((item) => getValue(item, "dayKm")).filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length < 7) {
    return null;
  }

  const n = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n;
  const sd = Math.sqrt(Math.max(0, variance));

  let rawValue;
  if (mean <= 0) {
    rawValue = 0;
  } else if (sd <= 1e-9) {
    rawValue = Number.POSITIVE_INFINITY;
  } else {
    rawValue = mean / sd;
  }

  let status = "green";
  let label = "Low";
  if (rawValue > 2.0) {
    status = "red";
    label = "High";
  } else if (rawValue > 1.5) {
    status = "yellow";
    label = "Moderate";
  }

  const markerScaleMax = 3;
  const markerValue = Number.isFinite(rawValue) ? rawValue : markerScaleMax;
  const markerPct = Math.max(0, Math.min(100, (markerValue / markerScaleMax) * 100));
  const displayValue = Number.isFinite(rawValue) ? rawValue.toFixed(2) : `>${markerScaleMax.toFixed(1)}`;

  return {
    rawValue,
    displayValue,
    status,
    label,
    markerPct
  };
}

function monotonyInterpretationText(monotony) {
  if (!monotony || typeof monotony !== "object") {
    return "Monotony = 7d mean daily load / 7d standard deviation. Lower usually means more day-to-day variation.";
  }
  const base = `Monotony: ${monotony.displayValue} (${monotony.label}). Monotony = 7d mean daily load / 7d standard deviation.`;
  if (monotony.status === "green") {
    return `${base} Low (<1.5): generally healthy variation.`;
  }
  if (monotony.status === "yellow") {
    return `${base} Moderate (1.5-2.0): monitor for too many similar days.`;
  }
  return `${base} High (>2.0): very repetitive loading; consider adding easier/harder contrast.`;
}

function hideMonotonyTooltip() {
  if (monotonyTooltipEl) {
    monotonyTooltipEl.hidden = true;
  }
}

function showMonotonyTooltip(monotony) {
  if (!monotonyTooltipEl || !monotony || typeof monotony !== "object") {
    return;
  }

  monotonyTooltipEl.textContent = monotonyInterpretationText(monotony);
  monotonyTooltipEl.style.left = `${monotony.markerPct.toFixed(1)}%`;
  monotonyTooltipEl.hidden = false;
}

function renderTolerance(series, endIndex) {
  if (
    !tolerancePanelEl ||
    !toleranceBadgeEl ||
    !toleranceBaselineIndicatorEl ||
    !toleranceMessageEl ||
    !toleranceMetricsEl ||
    !series.length
  ) {
    return;
  }

  const tolerance = calculateToleranceSummary(series, endIndex);
  if (!tolerance) {
    tolerancePanelEl.hidden = true;
    return;
  }

  tolerancePanelEl.hidden = false;
  toleranceBadgeEl.classList.remove("status-green", "status-yellow", "status-red", "status-gray");
  toleranceBadgeEl.classList.add(`status-${tolerance.status}`);
  toleranceBadgeEl.textContent = tolerance.label;
  toleranceBaselineIndicatorEl.classList.remove("status-green", "status-yellow", "status-red", "status-gray");
  toleranceBaselineIndicatorEl.classList.add(`status-${tolerance.baselineStatus || "gray"}`);
  toleranceBaselineIndicatorEl.textContent = tolerance.baselineText || "Load vs baseline: n/a";
  toleranceMessageEl.textContent = tolerance.message || "";
  toleranceMessageEl.hidden = !tolerance.message;
  toleranceMetricsEl.textContent = tolerance.metrics;

  if (monotonyVizEl && monotonyValueEl && monotonyMarkerEl) {
    const monotony = calculateMonotonySummary(series, endIndex);
    if (!monotony) {
      monotonyVizEl.hidden = true;
      monotonyMarkerEl.removeAttribute("aria-label");
      monotonyMarkerEl.removeAttribute("tabindex");
      monotonyMarkerEl.onmouseenter = null;
      monotonyMarkerEl.onmouseleave = null;
      monotonyMarkerEl.onfocus = null;
      monotonyMarkerEl.onblur = null;
      hideMonotonyTooltip();
    } else {
      monotonyVizEl.hidden = false;
      monotonyValueEl.textContent = `${monotony.displayValue} (${monotony.label})`;
      const tooltipText = monotonyInterpretationText(monotony);
      monotonyMarkerEl.setAttribute("aria-label", tooltipText);
      monotonyMarkerEl.setAttribute("tabindex", "0");
      monotonyMarkerEl.style.cursor = "help";
      monotonyMarkerEl.onmouseenter = () => showMonotonyTooltip(monotony);
      monotonyMarkerEl.onmouseleave = () => hideMonotonyTooltip();
      monotonyMarkerEl.onfocus = () => showMonotonyTooltip(monotony);
      monotonyMarkerEl.onblur = () => hideMonotonyTooltip();
      if (monotony.status === "green") {
        monotonyValueEl.style.color = "#065f46";
        monotonyMarkerEl.style.background = "#15803d";
      } else if (monotony.status === "yellow") {
        monotonyValueEl.style.color = "#92400e";
        monotonyMarkerEl.style.background = "#d97706";
      } else {
        monotonyValueEl.style.color = "#991b1b";
        monotonyMarkerEl.style.background = "#dc2626";
      }
      monotonyMarkerEl.style.left = `${monotony.markerPct.toFixed(1)}%`;
      hideMonotonyTooltip();
    }
  }
}

function visibleMeta() {
  return SERIES_META.filter((meta) => visibleLines.has(meta.key));
}

function summaryText(prefix, item, metas) {
  if (!metas.length) {
    return `${prefix}: no lines selected`;
  }

  const values = metas
    .map((meta) => `${meta.days ? `${meta.days}d` : meta.label} ${formatDistance(getValue(item, meta.key))}`)
    .join(" | ");

  return `${prefix}: ${values}`;
}

function applyApiKeyUi() {
  if (!apiKeyEl) {
    return;
  }

  if (hasStoredApiKey) {
    apiKeyEl.classList.add("has-saved-key");
    apiKeyEl.placeholder = API_KEY_PLACEHOLDER_STORED;
    if (apiKeyStateEl) {
      apiKeyStateEl.textContent = "A key is stored locally. Enter a new key to replace it.";
    }
  } else {
    apiKeyEl.classList.remove("has-saved-key");
    apiKeyEl.placeholder = API_KEY_PLACEHOLDER_DEFAULT;
    if (apiKeyStateEl) {
      apiKeyStateEl.textContent = "No key stored yet.";
    }
  }
}

function blankHrZoneOverrideRows() {
  return Array.from({ length: 5 }, (_, idx) => ({
    label: `Z${idx + 1}`,
    minBpm: null,
    maxBpm: null
  }));
}

function normalizeHrZoneOverrideRows(rows) {
  const normalized = blankHrZoneOverrideRows();
  if (!Array.isArray(rows)) {
    return normalized;
  }
  for (let i = 0; i < normalized.length && i < rows.length; i += 1) {
    const row = rows[i] && typeof rows[i] === "object" ? rows[i] : {};
    const minValue = Number(row.minBpm);
    const maxValue = Number(row.maxBpm);
    normalized[i] = {
      label: `Z${i + 1}`,
      minBpm: Number.isFinite(minValue) ? Number(minValue) : null,
      maxBpm: Number.isFinite(maxValue) ? Number(maxValue) : null
    };
  }
  return normalized;
}

function isFiniteInputValue(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasAnyHrZoneOverrides(rows) {
  return normalizeHrZoneOverrideRows(rows).some((row) => isFiniteInputValue(row.minBpm) || isFiniteInputValue(row.maxBpm));
}

function formatHrZoneRange(zone) {
  const minBpm = Number(zone?.minBpm);
  const maxBpm = Number(zone?.maxBpm);
  if (Number.isFinite(minBpm) && Number.isFinite(maxBpm)) {
    return `${Math.round(minBpm)}-${Math.round(maxBpm)} bpm`;
  }
  if (Number.isFinite(minBpm)) {
    return `>=${Math.round(minBpm)} bpm`;
  }
  if (Number.isFinite(maxBpm)) {
    return `<${Math.round(maxBpm)} bpm`;
  }
  return "n/a";
}

function renderHrZoneOverridesForm() {
  if (!hrZoneOverridesRootEl) {
    return;
  }

  const overrideRows = normalizeHrZoneOverrideRows(latestHrZonesRunningOverride);
  const defaultZones = Array.isArray(latestDefaultHrZonesRunning) ? latestDefaultHrZonesRunning : [];
  const appliedZones = Array.isArray(latestHrZonesRunning) ? latestHrZonesRunning : [];
  const defaultThresholdText = isFiniteInputValue(latestDefaultRunningThresholdHr)
    ? `${Math.round(Number(latestDefaultRunningThresholdHr))} bpm`
    : "n/a";
  const appliedThresholdText = isFiniteInputValue(latestRunningThresholdHr)
    ? `${Math.round(Number(latestRunningThresholdHr))} bpm`
    : "n/a";
  const thresholdOverrideValue = isFiniteInputValue(latestRunningThresholdHrOverride)
    ? String(Number(latestRunningThresholdHrOverride))
    : "";
  const zoneOverrideRowsActive = overrideRows.filter(
    (row) => isFiniteInputValue(row.minBpm) || isFiniteInputValue(row.maxBpm)
  ).length;

  if (hrZoneSettingsSummaryEl) {
    hrZoneSettingsSummaryEl.textContent = [
      `Default LTHR ${defaultThresholdText}`,
      `Applied ${appliedThresholdText}`,
      zoneOverrideRowsActive > 0 ? `Zone overrides ${zoneOverrideRowsActive}` : "No zone overrides"
    ].join(" | ");
  }
  if (hrZoneOverridesStateEl && !hrZoneOverridesStateEl.textContent.trim()) {
    hrZoneOverridesStateEl.textContent = "Blank override fields use defaults.";
  }

  const zoneRowsHtml = overrideRows
    .map((row, idx) => {
      const defaultZone = defaultZones[idx] || null;
      const appliedZone = appliedZones[idx] || defaultZone || null;
      const overrideMinValue = isFiniteInputValue(row.minBpm) ? String(Number(row.minBpm)) : "";
      const overrideMaxValue = isFiniteInputValue(row.maxBpm) ? String(Number(row.maxBpm)) : "";
      return `
        <div class="hr-zone-settings-row">
          <div class="hr-zone-settings-cell hr-zone-settings-label">${escapeHtml(row.label)}</div>
          <div class="hr-zone-settings-cell hr-zone-settings-default">${escapeHtml(formatHrZoneRange(defaultZone))}</div>
          <div class="hr-zone-settings-cell hr-zone-settings-applied">${escapeHtml(formatHrZoneRange(appliedZone))}</div>
          <input
            class="hr-zone-settings-input"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            max="260"
            name="zone-${idx}-min"
            value="${escapeHtml(overrideMinValue)}"
            placeholder="default"
            aria-label="${escapeHtml(row.label)} minimum override"
          />
          <input
            class="hr-zone-settings-input"
            type="number"
            inputmode="decimal"
            step="0.1"
            min="0"
            max="260"
            name="zone-${idx}-max"
            value="${escapeHtml(overrideMaxValue)}"
            placeholder="${idx === overrideRows.length - 1 ? "open" : "default"}"
            aria-label="${escapeHtml(row.label)} maximum override"
          />
        </div>
      `;
    })
    .join("");

  hrZoneOverridesRootEl.innerHTML = `
    <div class="hr-zone-settings-table">
      <div class="hr-zone-settings-head">Setting</div>
      <div class="hr-zone-settings-head">Default</div>
      <div class="hr-zone-settings-head">Applied</div>
      <div class="hr-zone-settings-head">Override Min</div>
      <div class="hr-zone-settings-head">Override Max</div>

      <div class="hr-zone-settings-row hr-zone-settings-row-threshold">
        <div class="hr-zone-settings-cell hr-zone-settings-label">LTHR</div>
        <div class="hr-zone-settings-cell hr-zone-settings-default">${escapeHtml(defaultThresholdText)}</div>
        <div class="hr-zone-settings-cell hr-zone-settings-applied">${escapeHtml(appliedThresholdText)}</div>
        <input
          class="hr-zone-settings-input hr-zone-settings-input-span-2"
          type="number"
          inputmode="decimal"
          step="0.1"
          min="80"
          max="240"
          name="running-threshold-override"
          value="${escapeHtml(thresholdOverrideValue)}"
          placeholder="default"
          aria-label="Running threshold heart rate override"
        />
      </div>

      ${zoneRowsHtml}
    </div>
  `;
}

function readHrZoneOverridesFromForm() {
  const rows = blankHrZoneOverrideRows();
  if (!hrZoneOverridesFormEl) {
    return {
      runningThresholdHrOverride: null,
      hrZonesRunningOverride: rows
    };
  }

  const thresholdInput = hrZoneOverridesFormEl.querySelector('input[name="running-threshold-override"]');
  const thresholdValue = thresholdInput ? thresholdInput.value.trim() : "";
  const runningThresholdHrOverride = thresholdValue ? Number(thresholdValue) : null;

  for (let i = 0; i < rows.length; i += 1) {
    const minInput = hrZoneOverridesFormEl.querySelector(`input[name="zone-${i}-min"]`);
    const maxInput = hrZoneOverridesFormEl.querySelector(`input[name="zone-${i}-max"]`);
    const minValue = minInput ? minInput.value.trim() : "";
    const maxValue = maxInput ? maxInput.value.trim() : "";
    rows[i] = {
      label: `Z${i + 1}`,
      minBpm: minValue ? Number(minValue) : null,
      maxBpm: maxValue ? Number(maxValue) : null
    };
  }

  return {
    runningThresholdHrOverride: Number.isFinite(runningThresholdHrOverride) ? runningThresholdHrOverride : null,
    hrZonesRunningOverride: rows
  };
}

function persistVisibleLines() {
  try {
    const keys = SERIES_META.map((meta) => meta.key).filter((key) => visibleLines.has(key));
    localStorage.setItem(VISIBLE_LINES_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Ignore storage errors.
  }
}

function loadVisibleLines() {
  try {
    const raw = localStorage.getItem(VISIBLE_LINES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const keys = JSON.parse(raw);
    if (!Array.isArray(keys)) {
      return;
    }

    const valid = keys.filter((key) => SERIES_META.some((meta) => meta.key === key));
    if (!valid.length) {
      return;
    }

    const normalizedStored = [...new Set(valid)].sort();
    const normalizedOldDefaults = [...OLD_DEFAULT_VISIBLE_LINE_KEYS].sort();
    const matchesOldDefaults =
      normalizedStored.length === normalizedOldDefaults.length &&
      normalizedStored.every((key, idx) => key === normalizedOldDefaults[idx]);
    if (matchesOldDefaults) {
      return;
    }

    visibleLines.clear();
    for (const key of valid) {
      visibleLines.add(key);
    }
  } catch {
    // Ignore storage errors.
  }
}

function persistExtraLines() {
  try {
    localStorage.setItem(
      EXTRA_LINES_STORAGE_KEY,
      JSON.stringify({
        rampCap: showRampCapLine,
        runBars: showRunBars
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function loadExtraLines() {
  try {
    const raw = localStorage.getItem(EXTRA_LINES_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.rampCap === "boolean") {
        showRampCapLine = parsed.rampCap;
      }
      if (typeof parsed.runBars === "boolean") {
        showRunBars = parsed.runBars;
      }
    }
  } catch {
    // Ignore storage errors.
  }
}

function persistViewRange(series) {
  if (!Array.isArray(series) || !series.length || viewStartIndex === null || viewEndIndex === null) {
    return;
  }

  const maxIndex = series.length - 1;
  const startIndex = Math.max(0, Math.min(maxIndex, Math.round(viewStartIndex)));
  const endIndex = Math.max(startIndex, Math.min(maxIndex, Math.round(viewEndIndex)));
  const startDate = String(series[startIndex]?.date || "");
  const endDate = String(series[endIndex]?.date || "");
  if (!startDate || !endDate) {
    return;
  }

  let payload = { mode: "absolute", startDate, endDate };
  if (endIndex >= maxIndex) {
    if (startIndex <= 0) {
      payload = { mode: "all" };
    } else {
      payload = { mode: "latest_window", days: endIndex - startIndex + 1 };
    }
  }

  try {
    localStorage.setItem(VIEW_RANGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

function loadViewRange() {
  try {
    const raw = localStorage.getItem(VIEW_RANGE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.mode === "all") {
        pendingViewRange = { mode: "all" };
        return;
      }

      if (parsed.mode === "latest_window") {
        const days = Number(parsed.days);
        if (Number.isFinite(days) && days > 0) {
          pendingViewRange = { mode: "latest_window", days: Math.round(days) };
          return;
        }
      }

      const startDate = typeof parsed.startDate === "string" ? parsed.startDate : null;
      const endDate = typeof parsed.endDate === "string" ? parsed.endDate : null;
      if (isDateKey(startDate) && isDateKey(endDate)) {
        pendingViewRange = { mode: "absolute", startDate, endDate };
        return;
      }
    }
  } catch {
    // Ignore storage errors.
  }
}

function persistPaceAxisRange() {
  if (!Number.isFinite(paceAxisRangeMin) || !Number.isFinite(paceAxisRangeMax)) {
    return;
  }

  try {
    localStorage.setItem(
      PACE_AXIS_RANGE_STORAGE_KEY,
      JSON.stringify({
        min: Number(paceAxisRangeMin),
        max: Number(paceAxisRangeMax)
      })
    );
  } catch {
    // Ignore storage errors.
  }
}

function loadPaceAxisRange() {
  try {
    const raw = localStorage.getItem(PACE_AXIS_RANGE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const min = Number(parsed?.min);
    const max = Number(parsed?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return;
    }

    paceAxisRangeMin = min;
    paceAxisRangeMax = max;
  } catch {
    // Ignore storage errors.
  }
}

function persistPaceHrColorRange() {
  if (!Number.isFinite(paceHrColorRangeMin) || !Number.isFinite(paceHrColorRangeMax)) {
    return;
  }

  const descriptor = syncPaceHrColorRangeModeWithCurrentValues();
  if (!descriptor) {
    return;
  }

  let payload;
  if (descriptor.mode === "all") {
    payload = { mode: "all" };
  } else if (descriptor.mode === "latest_window") {
    payload = { mode: "latest_window", days: Math.round(descriptor.days) };
  } else {
    payload = {
      mode: "absolute",
      min: Number(paceHrColorRangeMin),
      max: Number(paceHrColorRangeMax)
    };
  }

  try {
    localStorage.setItem(PACE_HR_COLOR_RANGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

function loadPaceHrColorRange() {
  paceHrColorRangeMin = null;
  paceHrColorRangeMax = null;
  paceHrColorRangeMode = "absolute";
  paceHrColorRangeWindowDays = null;

  try {
    const raw = localStorage.getItem(PACE_HR_COLOR_RANGE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (parsed.mode === "all") {
      paceHrColorRangeMode = "all";
      return;
    }

    if (parsed.mode === "latest_window") {
      const days = Number(parsed.days);
      if (Number.isFinite(days) && days > 0) {
        paceHrColorRangeMode = "latest_window";
        paceHrColorRangeWindowDays = Math.round(days);
        return;
      }
      return;
    }

    const min = Number(parsed?.min);
    const max = Number(parsed?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return;
    }

    paceHrColorRangeMode = "absolute";
    paceHrColorRangeMin = min;
    paceHrColorRangeMax = max;
  } catch {
    // Ignore storage errors.
  }
}

function findFirstSeriesIndexAtOrAfter(series, dateKey) {
  for (let i = 0; i < series.length; i += 1) {
    if (String(series[i]?.date || "") >= dateKey) {
      return i;
    }
  }

  return series.length - 1;
}

function findLastSeriesIndexAtOrBefore(series, dateKey) {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (String(series[i]?.date || "") <= dateKey) {
      return i;
    }
  }

  return 0;
}

function drawChart(series) {
  latestSeriesData = series;

  if (!series.length) {
    drawEmptyChart("No synced running data yet.");
    drawEmptyPaceHrChart("No synced running data yet.");
    drawEmptyHeatmap("No synced running data yet.");
    renderFoundationalStats(null, null);
    latestValuesEl.textContent = "";
    viewStartIndex = null;
    viewEndIndex = null;
    followLatest = true;
    if (tolerancePanelEl) {
      tolerancePanelEl.hidden = true;
    }
    if (scrubControlsEl) {
      scrubControlsEl.hidden = true;
    }
    for (const button of timelinePresetButtons) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
    if (timelineRangeSummaryEl) {
      timelineRangeSummaryEl.textContent = "";
    }
    if (timelineRangeWarningEl) {
      timelineRangeWarningEl.hidden = true;
      timelineRangeWarningEl.textContent = "No activities in selected timeline range.";
    }
    renderRecentActivities({ runs: latestRunsData });
    return;
  }

  const maxIndex = series.length - 1;
  const defaultWindowDays = Math.min(WINDOW_DAYS_DEFAULT, series.length);

  if (viewStartIndex === null || viewEndIndex === null) {
    viewEndIndex = maxIndex;
    viewStartIndex = Math.max(0, maxIndex - defaultWindowDays + 1);
    followLatest = true;

    if (pendingViewRange && typeof pendingViewRange === "object") {
      if (pendingViewRange.mode === "all") {
        viewStartIndex = 0;
        viewEndIndex = maxIndex;
        followLatest = true;
      } else if (pendingViewRange.mode === "latest_window") {
        const days = Number(pendingViewRange.days);
        const windowLength = Number.isFinite(days) && days > 0 ? Math.round(days) : defaultWindowDays;
        viewEndIndex = maxIndex;
        viewStartIndex = Math.max(0, maxIndex - Math.min(windowLength, series.length) + 1);
        followLatest = true;
      } else if (isDateKey(pendingViewRange.startDate) && isDateKey(pendingViewRange.endDate)) {
        const restoredStart = findFirstSeriesIndexAtOrAfter(series, pendingViewRange.startDate);
        const restoredEnd = findLastSeriesIndexAtOrBefore(series, pendingViewRange.endDate);
        viewStartIndex = Math.max(0, Math.min(maxIndex, restoredStart));
        viewEndIndex = Math.max(viewStartIndex, Math.min(maxIndex, restoredEnd));
        followLatest = viewEndIndex >= maxIndex;
      }
    }
    pendingViewRange = null;
  }

  if (followLatest) {
    const currentWindowLength = Math.max(1, viewEndIndex - viewStartIndex + 1);
    viewEndIndex = maxIndex;
    viewStartIndex = Math.max(0, maxIndex - currentWindowLength + 1);
  }

  viewStartIndex = Math.max(0, Math.min(maxIndex, viewStartIndex));
  viewEndIndex = Math.max(viewStartIndex, Math.min(maxIndex, viewEndIndex));
  persistViewRange(series);

  const windowSeries = series.slice(viewStartIndex, viewEndIndex + 1);
  const runsInWindow = buildRunsInDateRange(windowSeries[0].date, windowSeries[windowSeries.length - 1].date);
  if (timelineRangeSummaryEl) {
    const count = runsInWindow.length;
    timelineRangeSummaryEl.textContent = `${count} ${count === 1 ? "activity" : "activities"}`;
  }
  if (timelineRangeWarningEl) {
    timelineRangeWarningEl.hidden = runsInWindow.length > 0;
    timelineRangeWarningEl.textContent = "No activities in selected timeline range.";
  }
  const windowRangeLabel = `${windowSeries[0].date} - ${windowSeries[windowSeries.length - 1].date}`;
  renderFoundationalStats(windowSeries[0].date, windowSeries[windowSeries.length - 1].date);
  renderRecentActivities(
    { runs: latestRunsData },
    {
      range: {
        startDate: windowSeries[0].date,
        endDate: windowSeries[windowSeries.length - 1].date
      }
    }
  );
  drawPaceHrChart(latestPaceHrPoints, windowSeries[0].date, windowSeries[windowSeries.length - 1].date);
  drawPaceHrHeatmap(latestPaceHrPoints, windowSeries[0].date, windowSeries[windowSeries.length - 1].date);

  if (scrubControlsEl && scrubStartEl && scrubEndEl && scrubLabelEl) {
    const startPct = maxIndex > 0 ? (viewStartIndex / maxIndex) * 100 : 0;
    const endPct = maxIndex > 0 ? (viewEndIndex / maxIndex) * 100 : 100;

    scrubControlsEl.hidden = false;
    scrubStartEl.min = "0";
    scrubStartEl.max = String(maxIndex);
    scrubStartEl.value = String(viewStartIndex);
    scrubEndEl.min = "0";
    scrubEndEl.max = String(maxIndex);
    scrubEndEl.value = String(viewEndIndex);
    scrubLabelEl.textContent = windowRangeLabel;
    if (scrubFillEl) {
      scrubFillEl.style.left = `${startPct}%`;
      scrubFillEl.style.width = `${Math.max(0, endPct - startPct)}%`;
    }
  }
  updateTimelinePresetButtons(series, viewStartIndex, viewEndIndex);

  renderTolerance(series, viewEndIndex);

  const metas = visibleMeta();
  const latest = windowSeries[windowSeries.length - 1];
  const latestSummary = summaryText(viewEndIndex === maxIndex ? "Now" : formatDateLabel(latest.date), latest, metas);
  latestValuesEl.textContent = latestSummary;

  const width = 980;
  const height = 420;
  const margin = { top: 26, right: 26, bottom: 44, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const maxY = Math.max(
    1,
    ...windowSeries.flatMap((item) => metas.map((meta) => getValue(item, meta.key)))
  );
  const yDomainMax = Math.max(1, maxY * 1.12);

  const xScale = (index) => {
    if (windowSeries.length <= 1) {
      return margin.left;
    }

    return margin.left + (index / (windowSeries.length - 1)) * innerW;
  };

  const yScale = (value) => margin.top + innerH - (value / yDomainMax) * innerH;
  const selectedDateKeys = getSelectedActivityDateKeys();
  const selectedLineXs = [];
  if (selectedDateKeys.size) {
    for (let i = 0; i < windowSeries.length; i += 1) {
      if (selectedDateKeys.has(windowSeries[i].date)) {
        selectedLineXs.push(xScale(i));
      }
    }
  }

  const rampCapValues = windowSeries.map((_, idx) => {
    const globalIdx = viewStartIndex + idx;
    const baseline = getValue(series[globalIdx], "sum7ma90");
    return baseline && baseline > 0 ? baseline * 1.1 : null;
  });
  const rampCapPath = linePathWithGaps(
    rampCapValues.map((value, idx) => ({
      x: xScale(idx),
      y: value === null ? null : yScale(value)
    }))
  );
  const rampCapLineEnabled = showRampCapLine;
  const maxVisibleSeriesValue = Math.max(
    0,
    ...windowSeries.flatMap((item) => metas.map((meta) => getValue(item, meta.key)).filter(Number.isFinite))
  );
  const maxRampCapValue = rampCapLineEnabled
    ? Math.max(0, ...rampCapValues.filter((value) => Number.isFinite(value)))
    : 0;
  const tooltipAnchorValue = Math.max(maxVisibleSeriesValue, maxRampCapValue);
  const tooltipAnchorY = yScale(tooltipAnchorValue);

  const yTicks = 5;
  const yGuides = [];
  for (let i = 0; i <= yTicks; i += 1) {
    const value = (yDomainMax / yTicks) * i;
    yGuides.push({ value, y: yScale(value) });
  }

  const xTicks = 6;
  const xGuides = [];
  for (let i = 0; i <= xTicks; i += 1) {
    const idx = Math.round((windowSeries.length - 1) * (i / xTicks));
    xGuides.push({ x: xScale(idx), label: formatDateLabel(windowSeries[idx].date) });
  }

  const dayIndexByDate = new Map(windowSeries.map((item, idx) => [String(item?.date || ""), idx]));
  const runsByDate = new Map();
  for (const run of latestRunsData) {
    const dateKey = String(run?.date || "");
    const dayIndex = dayIndexByDate.get(dateKey);
    if (!Number.isFinite(dayIndex)) {
      continue;
    }

    const distanceKm = Number(run?.distanceKm);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
      continue;
    }

    if (!runsByDate.has(dateKey)) {
      runsByDate.set(dateKey, []);
    }
    runsByDate.get(dateKey).push({
      id: normalizeActivityId(run?.id),
      date: dateKey,
      name: formatRunName(run),
      distanceKm
    });
  }

  const daySpacing = windowSeries.length > 1 ? innerW / (windowSeries.length - 1) : innerW;
  const runGroupWidth = Math.max(2.2, Math.min(20, daySpacing * 0.72));
  const runBars = [];
  for (const [dateKey, runsOnDay] of runsByDate.entries()) {
    const dayIndex = dayIndexByDate.get(dateKey);
    if (!Number.isFinite(dayIndex) || !Array.isArray(runsOnDay) || !runsOnDay.length) {
      continue;
    }

    const centerX = xScale(dayIndex);
    const runCount = runsOnDay.length;
    const barGap = runCount > 1 ? 1 : 0;
    const computedBarWidth = (runGroupWidth - barGap * (runCount - 1)) / runCount;
    const barWidth = Math.max(1.2, Math.min(7, computedBarWidth));
    const totalWidth = runCount * barWidth + barGap * (runCount - 1);
    const startX = centerX - totalWidth / 2;

    for (let i = 0; i < runsOnDay.length; i += 1) {
      const run = runsOnDay[i];
      const topY = yScale(run.distanceKm);
      const baseY = yScale(0);
      const heightPx = Math.max(1, baseY - topY);
      const x = startX + i * (barWidth + barGap);
      const title = `${formatDateLabel(run.date)} | ${run.name} | ${formatDistance(run.distanceKm)}`;
      runBars.push({
        activityId: run.id,
        date: run.date,
        name: run.name,
        distanceKm: run.distanceKm,
        x,
        y: topY,
        width: barWidth,
        height: heightPx,
        title
      });
    }
  }

  const paths = Object.fromEntries(
    metas.map((meta) => [meta.key, linePath(makeSeriesPoints(windowSeries, meta.key, xScale, yScale))])
  );

  const svg = `
    <div class="chart-wrap">
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Rolling run distance sums">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white" rx="12"/>

      ${yGuides
        .map(
          (tick) => `
        <line x1="${margin.left}" y1="${tick.y}" x2="${width - margin.right}" y2="${tick.y}" stroke="#e6ece9" stroke-width="1"/>
        <text x="${margin.left - 10}" y="${tick.y + 4}" text-anchor="end" font-size="12" fill="#5f736d">${tick.value.toFixed(
            1
          )}</text>
      `
        )
        .join("")}

      ${xGuides
        .map(
          (tick) => `
        <line x1="${tick.x}" y1="${margin.top}" x2="${tick.x}" y2="${height - margin.bottom}" stroke="#f0f5f3" stroke-width="1"/>
        <text x="${tick.x}" y="${height - margin.bottom + 18}" text-anchor="middle" font-size="12" fill="#5f736d">${tick.label}</text>
      `
        )
        .join("")}

      ${
        showRunBars
          ? runBars
              .map(
                (bar) =>
                  `<rect class="rolling-run-bar" data-activity-id="${escapeHtml(
                    String(bar.activityId || "")
                  )}" x="${bar.x.toFixed(2)}" y="${bar.y.toFixed(2)}" width="${bar.width.toFixed(2)}" height="${bar.height.toFixed(
                    2
                  )}" fill="#7aaea1" fill-opacity="0.5" stroke="#5c8f83" stroke-opacity="0.65" stroke-width="0.6" rx="1"><title>${escapeHtml(
                    bar.title
                  )}</title></rect>`
              )
              .join("")
          : ""
      }

      ${metas
        .map(
          (meta) =>
            `<path d="${paths[meta.key]}" fill="none" stroke="${meta.color}" stroke-width="2.4"/>`
        )
        .join("")}
      ${
        rampCapLineEnabled
          ? `<path d="${rampCapPath}" fill="none" stroke="${RAMP_CAP_LINE_COLOR}" stroke-width="2" stroke-dasharray="7 5"/>`
          : ""
      }
      ${selectedLineXs
        .map(
          (lineX) =>
            `<line x1="${lineX.toFixed(2)}" y1="${margin.top}" x2="${lineX.toFixed(2)}" y2="${
              height - margin.bottom
            }" stroke="${SELECTED_ACTIVITY_HIGHLIGHT}" stroke-width="2.1" stroke-dasharray="6 4"/>`
        )
        .join("")}

      <line id="hover-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${
        height - margin.bottom
      }" stroke="#3d5751" stroke-width="1.1" stroke-dasharray="4 4" hidden/>
      ${SERIES_META.map(
        (meta) =>
          `<circle id="hover-dot-${meta.key}" r="4.5" fill="${meta.color}" stroke="white" stroke-width="1.5" hidden/>`
      ).join("")}
      <circle id="hover-dot-ramp-cap" r="4.5" fill="${RAMP_CAP_LINE_COLOR}" stroke="white" stroke-width="1.5" hidden/>

      <rect id="hover-capture" x="${margin.left}" y="${margin.top}" width="${innerW}" height="${innerH}" fill="transparent" />
    </svg>
    <div id="chart-tooltip" class="chart-tooltip" hidden></div>
    </div>

    <div class="legend">
      ${SERIES_META.map(
        (meta) => `
        <button
          type="button"
          class="legend-item legend-toggle ${visibleLines.has(meta.key) ? "" : "is-off"}"
          data-key="${meta.key}"
          aria-pressed="${visibleLines.has(meta.key) ? "true" : "false"}"
        >
          <span class="swatch" style="background:${meta.color}"></span>
          ${meta.label}
        </button>
      `
      ).join("")}
      <button
        type="button"
        class="legend-item legend-toggle legend-toggle-extra ramp-cap-legend ${showRampCapLine ? "" : "is-off"}"
        data-extra="ramp-cap"
        aria-pressed="${showRampCapLine ? "true" : "false"}"
      >
        <span class="swatch ramp-cap-swatch"></span>
        10% cap (90d avg +10%)
      </button>
      <button
        type="button"
        class="legend-item legend-toggle legend-toggle-extra ${showRunBars ? "" : "is-off"}"
        data-extra="run-bars"
        aria-pressed="${showRunBars ? "true" : "false"}"
      >
        <span class="swatch" style="background:#7aaea1; border:1px solid rgba(92, 143, 131, 0.65);"></span>
        Run bars
      </button>
    </div>
  `;

  chartRootEl.innerHTML = svg;

  const chartWrap = chartRootEl.querySelector(".chart-wrap");
  const svgEl = chartRootEl.querySelector("svg");
  const capture = chartRootEl.querySelector("#hover-capture");
  const hoverLine = chartRootEl.querySelector("#hover-line");
  const tooltip = chartRootEl.querySelector("#chart-tooltip");

  if (!chartWrap || !svgEl || !capture || !hoverLine || !tooltip) {
    return;
  }

  const hoverDots = new Map(
    SERIES_META.map((meta) => [meta.key, chartRootEl.querySelector(`#hover-dot-${meta.key}`)])
  );
  const rampCapDot = chartRootEl.querySelector("#hover-dot-ramp-cap");

  const edgePad = 82;

  function showHover(index) {
    const item = windowSeries[index];
    const x = xScale(index);

    hoverLine.setAttribute("x1", x);
    hoverLine.setAttribute("x2", x);
    hoverLine.removeAttribute("hidden");

    for (const meta of SERIES_META) {
      const dot = hoverDots.get(meta.key);
      if (!dot) {
        continue;
      }

      if (!visibleLines.has(meta.key)) {
        dot.setAttribute("hidden", "");
        continue;
      }

      const y = yScale(getValue(item, meta.key));
      dot.setAttribute("cx", x);
      dot.setAttribute("cy", y);
      dot.removeAttribute("hidden");
    }

    const rampCapValue = rampCapValues[index];
    const sum7Value = getValue(item, "sum7");
    const baselineValue = getValue(item, "sum7ma90");
    const baselineHasValue = Number.isFinite(baselineValue) && baselineValue > 0;
    const baselineDeltaKm = baselineHasValue ? sum7Value - baselineValue : null;
    const baselineDeltaPct = baselineHasValue ? baselineDeltaKm / baselineValue : null;
    const baselineIndicatorText = baselineHasValue
      ? `Baseline: ${formatSignedPct(baselineDeltaPct)} (${formatSignedDistance(baselineDeltaKm)})`
      : "Baseline: n/a";
    const runsOnDate = runsByDate.get(item.date) ?? [];
    const runRows = runsOnDate.map(
      (run) =>
        `<div class="chart-tooltip-run-item">${escapeHtml(run.name)} (${formatDistance(Number(run.distanceKm || 0))})</div>`
    );
    while (runRows.length < 2) {
      runRows.push('<div class="chart-tooltip-run-item chart-tooltip-run-item-placeholder">&nbsp;</div>');
    }
    const runsText = `<div class="chart-tooltip-runs">${runRows.join("")}</div>`;

    if (rampCapDot) {
      if (rampCapLineEnabled && rampCapValue !== null && Number.isFinite(rampCapValue)) {
        const yCap = yScale(rampCapValue);
        rampCapDot.setAttribute("cx", x);
        rampCapDot.setAttribute("cy", yCap);
        rampCapDot.removeAttribute("hidden");
      } else {
        rampCapDot.setAttribute("hidden", "");
      }
    }

    const hoverMetas = visibleMeta();
    latestValuesEl.textContent = summaryText(formatDateLabel(item.date), item, hoverMetas);
    const rampCapText =
      rampCapLineEnabled && rampCapValue !== null && Number.isFinite(rampCapValue)
        ? `<br/>Cap (+10% vs 90d avg): ${formatDistance(rampCapValue)} (${sum7Value <= rampCapValue ? "within" : "above"})`
        : "";

    tooltip.innerHTML = `
      <strong>${formatDateLabel(item.date)}</strong><br/>
      ${baselineIndicatorText}<br/>
      ${hoverMetas
        .map((meta) => `${meta.days ? `${meta.days}d` : meta.label}: ${formatDistance(getValue(item, meta.key))}`)
        .join("<br/>")}
      ${rampCapText}
      ${runsText}
    `;
    tooltip.removeAttribute("hidden");

    const svgRect = svgEl.getBoundingClientRect();
    const wrapRect = chartWrap.getBoundingClientRect();
    const xPx = (x / width) * svgRect.width + (svgRect.left - wrapRect.left);
    const topPx = ((tooltipAnchorY - margin.top) / innerH) * svgRect.height + (svgRect.top - wrapRect.top);
    const clampedX = Math.min(wrapRect.width - edgePad, Math.max(edgePad, xPx));
    const topSafe = Math.max(44, topPx);

    tooltip.style.left = `${clampedX}px`;
    tooltip.style.top = `${topSafe}px`;
  }

  function clearHover() {
    hoverLine.setAttribute("hidden", "");
    capture.style.cursor = "";

    for (const dot of hoverDots.values()) {
      dot?.setAttribute("hidden", "");
    }
    rampCapDot?.setAttribute("hidden", "");

    tooltip.setAttribute("hidden", "");
    latestValuesEl.textContent = latestSummary;
  }

  function moveHover(event) {
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width) {
      return;
    }

    capture.style.cursor = findRunBarAtEvent(event) ? "pointer" : "";

    const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
    const clamped = Math.min(width - margin.right, Math.max(margin.left, xInSvg));
    const t = innerW <= 0 ? 0 : (clamped - margin.left) / innerW;
    const index = Math.round(t * (windowSeries.length - 1));
    showHover(index);
  }

  function findRunBarAtEvent(event) {
    if (!showRunBars) {
      return null;
    }

    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const xInSvg = ((event.clientX - rect.left) / rect.width) * width;
    const yInSvg = ((event.clientY - rect.top) / rect.height) * height;
    for (const bar of runBars) {
      if (
        xInSvg >= bar.x &&
        xInSvg <= bar.x + bar.width &&
        yInSvg >= bar.y &&
        yInSvg <= bar.y + bar.height
      ) {
        return bar;
      }
    }
    return null;
  }

  function handleChartClick(event) {
    const clickedBar = findRunBarAtEvent(event);
    const clickedActivityId = normalizeActivityId(clickedBar?.activityId);
    if (clickedActivityId) {
      openActivityDetail(clickedActivityId, { selectActivity: true });
    }
  }

  capture.addEventListener("pointermove", moveHover);
  capture.addEventListener("pointerenter", moveHover);
  capture.addEventListener("click", handleChartClick);
  capture.addEventListener("pointerleave", clearHover);
  capture.addEventListener("pointercancel", clearHover);
  capture.addEventListener("mouseleave", clearHover);
  chartWrap.addEventListener("pointerleave", clearHover);
  svgEl.addEventListener("pointerleave", clearHover);
  chartWrap.addEventListener("mouseleave", clearHover);
  svgEl.addEventListener("mouseleave", clearHover);

  const toggles = chartRootEl.querySelectorAll(".legend-toggle");
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      const extra = toggle.getAttribute("data-extra");
      if (extra === "ramp-cap") {
        showRampCapLine = !showRampCapLine;
        persistExtraLines();
        drawChart(latestSeriesData);
        return;
      }
      if (extra === "run-bars") {
        showRunBars = !showRunBars;
        persistExtraLines();
        drawChart(latestSeriesData);
        return;
      }

      const key = toggle.getAttribute("data-key");
      if (!key) {
        return;
      }

      const currentlyVisible = visibleLines.has(key);
      if (currentlyVisible && visibleLines.size === 1) {
        return;
      }

      if (currentlyVisible) {
        visibleLines.delete(key);
      } else {
        visibleLines.add(key);
      }

      persistVisibleLines();
      drawChart(latestSeriesData);
    });
  }

}

async function refreshSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) {
    hasStoredApiKey = false;
    latestRunningThresholdHrOverride = null;
    latestHrZonesRunningOverride = blankHrZoneOverrideRows();
    applyApiKeyUi();
    renderHrZoneOverridesForm();
    setStatus("Could not load API key settings.");
    return;
  }

  const data = await response.json();
  hasStoredApiKey = Boolean(data.hasApiKey);
  latestRunningThresholdHrOverride = isFiniteInputValue(data.runningThresholdHrOverride)
    ? Number(data.runningThresholdHrOverride)
    : null;
  latestHrZonesRunningOverride = normalizeHrZoneOverrideRows(data.hrZonesRunningOverride);
  applyApiKeyUi();
  renderHrZoneOverridesForm();
  if (!hasStoredApiKey) {
    renderResyncNotice({ activityCount: 0, staleActivityMetaCount: 0, activityMetaSourceVersion: null });
  }

  if (hasStoredApiKey) {
    setStatus("API key saved. Ready to sync.");
  } else {
    setStatus("Enter your Intervals.icu API key to start syncing.");
  }
}

async function refreshChart() {
  const response = await fetch("/api/series");
  const data = await response.json();
  latestSeriesNoticeData = data;
  latestRunsData = Array.isArray(data.runs) ? data.runs : [];
  latestHrZonesRunning = Array.isArray(data.hrZonesRunning) ? data.hrZonesRunning : [];
  latestDefaultHrZonesRunning = Array.isArray(data.defaultHrZonesRunning) ? data.defaultHrZonesRunning : [];
  latestHrZonesRunningOverride = normalizeHrZoneOverrideRows(data.hrZonesRunningOverride);
  latestDefaultRunningThresholdHr = isFiniteInputValue(data.defaultRunningThresholdHr) ? Number(data.defaultRunningThresholdHr) : null;
  latestRunningThresholdHrOverride = isFiniteInputValue(data.runningThresholdHrOverride) ? Number(data.runningThresholdHrOverride) : null;
  latestRunningThresholdHr = isFiniteInputValue(data.runningThresholdHr) ? Number(data.runningThresholdHr) : null;
  renderHrZoneOverridesForm();
  const latestRunIds = new Set(latestRunsData.map((run) => normalizeActivityId(run?.id)).filter(Boolean));
  if (selectedActivityIds.size || selectionAnchorActivityId) {
    for (const selectedId of Array.from(selectedActivityIds)) {
      if (!latestRunIds.has(normalizeActivityId(selectedId))) {
        selectedActivityIds.delete(selectedId);
      }
    }
    const normalizedAnchor = normalizeActivityId(selectionAnchorActivityId);
    if (!normalizedAnchor || !latestRunIds.has(normalizedAnchor)) {
      selectionAnchorActivityId = null;
    }
  }
  const normalizedOpenDetail = normalizeActivityId(activeDetailActivityId);
  if (normalizedOpenDetail && !latestRunIds.has(normalizedOpenDetail)) {
    closeActivityDetailDrawer({ clearSelection: false });
  }
  renderConnectionSummary(data);
  renderResyncNotice(data);
  updateFetchAllButtonLabel(data.activityCount);

  if (Array.isArray(data.paceHrPoints) && data.paceHrPoints.length) {
    latestPaceHrPoints = data.paceHrPoints;
  } else {
    latestPaceHrPoints = Array.isArray(data.runs)
      ? data.runs.map((run) => ({
          ...run,
          source: "run",
          activityId: run.id,
          splitKm: null
        }))
      : [];
  }
  drawChart(data.series || []);
  void syncActivityDetailPanelToSelection();

  if (data.syncedAt) {
    setStatus(`Loaded ${data.activityCount} run activities.`);
  }

  return data;
}

async function runSync(options = {}) {
  const auto = Boolean(options.auto);
  if (!hasStoredApiKey) {
    return { ok: false, skipped: true, reason: "missing_api_key" };
  }

  syncInProgress = true;
  setSyncControlsDisabled(true);
  setResetControlsDisabled(true);
  renderResyncNotice(latestSeriesNoticeData);
  setStatus(auto ? "Last sync is older than today. Auto-updating from Intervals.icu..." : "Updating from Intervals.icu...");

  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "update" })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Sync failed.");
      return { ok: false, error: data.error || "Sync failed." };
    }

    const splitText = Number.isFinite(Number(data.splitPoints)) && Number(data.splitPoints) > 0
      ? `, built ${Math.round(Number(data.splitPoints))} pace/HR points`
      : "";
    const unsupportedText = data.splitUnsupported ? " (per-km stream fallback unavailable via API for this account)" : "";
    const fetchedCount = Number.isFinite(Number(data.fetchedCount)) ? Math.round(Number(data.fetchedCount)) : 0;
    const totalCount = Number.isFinite(Number(data.count)) ? Math.round(Number(data.count)) : 0;
    const prefix = auto ? "Auto-update complete." : "Update complete.";
    setStatus(`${prefix} Fetched ${fetchedCount} activities (${totalCount} total)${splitText}.${unsupportedText}`);
    await refreshChart();
    return { ok: true, data };
  } catch (error) {
    setStatus(error.message || "Sync failed.");
    return { ok: false, error: error.message || "Sync failed." };
  } finally {
    syncInProgress = false;
    setSyncControlsDisabled(false);
    setResetControlsDisabled(false);
    renderResyncNotice(latestSeriesNoticeData);
  }
}

async function runFetchAll() {
  if (!hasStoredApiKey) {
    setStatus("Missing API key. Save it first.");
    return { ok: false, skipped: true, reason: "missing_api_key" };
  }

  syncInProgress = true;
  setSyncControlsDisabled(true);
  setResetControlsDisabled(true);
  renderResyncNotice(latestSeriesNoticeData);
  setStatus((latestRunsData?.length || 0) > 0 ? "Reloading all historic data from Intervals.icu..." : "Fetching all historic data from Intervals.icu...");

  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fetch-all" })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Sync failed.");
      return { ok: false, error: data.error || "Sync failed." };
    }

    const splitText = Number.isFinite(Number(data.splitPoints)) && Number(data.splitPoints) > 0
      ? `, built ${Math.round(Number(data.splitPoints))} pace/HR points`
      : "";
    const unsupportedText = data.splitUnsupported ? " (per-km stream fallback unavailable via API for this account)" : "";
    const prefix = (latestRunsData?.length || 0) > 0 ? "Reload all complete." : "Fetch all complete.";
    setStatus(`${prefix} Pulled ${Math.round(Number(data.count) || 0)} run activities${splitText}.${unsupportedText}`);
    await refreshChart();
    return { ok: true, data };
  } catch (error) {
    setStatus(error.message || "Sync failed.");
    return { ok: false, error: error.message || "Sync failed." };
  } finally {
    syncInProgress = false;
    setSyncControlsDisabled(false);
    setResetControlsDisabled(false);
    renderResyncNotice(latestSeriesNoticeData);
  }
}

async function runLocalDataReset(mode) {
  const normalizedMode = String(mode || "").toLowerCase();
  if (normalizedMode !== "clear-activities" && normalizedMode !== "delete-all") {
    return { ok: false, error: "Invalid reset mode." };
  }

  syncInProgress = true;
  setSyncControlsDisabled(true);
  setResetControlsDisabled(true);
  renderResyncNotice(latestSeriesNoticeData);
  setStatus(
    normalizedMode === "delete-all" ? "Deleting all local data..." : "Clearing local activity data..."
  );

  try {
    const response = await fetch("/api/local-data/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: normalizedMode })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(data.error || "Could not reset local data.");
      return { ok: false, error: data.error || "Could not reset local data." };
    }

    hasStoredApiKey = Boolean(data.hasApiKey);
    closeActivityDetailDrawer({ clearSelection: true });
    activityDetailCache.clear();
    activityDetailInFlight.clear();
    await refreshSettings();
    await refreshChart();
    setStatus(
      normalizedMode === "delete-all"
        ? "All local data deleted, including API key."
        : "Local activity data cleared. API key kept."
    );
    return { ok: true, data };
  } catch (error) {
    setStatus(error.message || "Could not reset local data.");
    return { ok: false, error: error.message || "Could not reset local data." };
  } finally {
    syncInProgress = false;
    setSyncControlsDisabled(false);
    setResetControlsDisabled(false);
    renderResyncNotice(latestSeriesNoticeData);
  }
}

settingsFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const apiKey = apiKeyEl.value.trim();
  if (!apiKey) {
    if (hasStoredApiKey) {
      setStatus("API key unchanged.");
      apiKeyEl.value = "";
      applyApiKeyUi();
    } else {
      setStatus("Enter an API key to save.");
    }
    return;
  }

  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey })
    });

    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Failed to save API key.");
      return;
    }

    hasStoredApiKey = Boolean(data.hasApiKey);
    apiKeyEl.value = "";
    applyApiKeyUi();
    setStatus(hasStoredApiKey ? "API key saved." : "API key cleared.");
  } catch (error) {
    setStatus(error.message || "Failed to save API key.");
  }
});

hrZoneOverridesFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = readHrZoneOverridesFromForm();
  if (hrZoneOverridesStateEl) {
    hrZoneOverridesStateEl.textContent = "Saving overrides...";
  }

  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (hrZoneOverridesStateEl) {
        hrZoneOverridesStateEl.textContent = data.error || "Failed to save HR zone overrides.";
      }
      setStatus(data.error || "Failed to save HR zone overrides.");
      return;
    }

    if (hrZoneOverridesStateEl) {
      hrZoneOverridesStateEl.textContent = "Overrides saved.";
    }
    await refreshSettings();
    await refreshChart();
    setStatus("HR zone overrides saved.");
  } catch (error) {
    const message = error.message || "Failed to save HR zone overrides.";
    if (hrZoneOverridesStateEl) {
      hrZoneOverridesStateEl.textContent = message;
    }
    setStatus(message);
  }
});

hrZoneOverridesResetEl?.addEventListener("click", async () => {
  if (hrZoneOverridesStateEl) {
    hrZoneOverridesStateEl.textContent = "Clearing overrides...";
  }
  try {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runningThresholdHrOverride: null,
        hrZonesRunningOverride: blankHrZoneOverrideRows()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (hrZoneOverridesStateEl) {
        hrZoneOverridesStateEl.textContent = data.error || "Failed to clear HR zone overrides.";
      }
      setStatus(data.error || "Failed to clear HR zone overrides.");
      return;
    }

    if (hrZoneOverridesStateEl) {
      hrZoneOverridesStateEl.textContent = "Overrides cleared.";
    }
    await refreshSettings();
    await refreshChart();
    setStatus("HR zone overrides cleared.");
  } catch (error) {
    const message = error.message || "Failed to clear HR zone overrides.";
    if (hrZoneOverridesStateEl) {
      hrZoneOverridesStateEl.textContent = message;
    }
    setStatus(message);
  }
});

syncButtonEl.addEventListener("click", async () => {
  await runSync({ auto: false });
});
fetchAllButtonEl?.addEventListener("click", async () => {
  await runFetchAll();
});
clearActivityDataButtonEl?.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Delete all activities and synced charts? Your saved API key will be kept."
  );
  if (!confirmed) {
    return;
  }
  await runLocalDataReset("clear-activities");
});
deleteAllDataButtonEl?.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Delete all data, including your saved API key? This cannot be undone."
  );
  if (!confirmed) {
    return;
  }
  await runLocalDataReset("delete-all");
});

function applyRangeChange(changed) {
  if (!scrubStartEl || !scrubEndEl || !latestSeriesData.length) {
    return;
  }

  const maxIndex = latestSeriesData.length - 1;
  let nextStart = Number(scrubStartEl.value);
  let nextEnd = Number(scrubEndEl.value);

  if (!Number.isFinite(nextStart) || !Number.isFinite(nextEnd)) {
    return;
  }

  nextStart = Math.max(0, Math.min(maxIndex, Math.round(nextStart)));
  nextEnd = Math.max(0, Math.min(maxIndex, Math.round(nextEnd)));

  if (changed === "start" && nextStart > nextEnd) {
    nextEnd = nextStart;
    scrubEndEl.value = String(nextEnd);
  }

  if (changed === "end" && nextEnd < nextStart) {
    nextStart = nextEnd;
    scrubStartEl.value = String(nextStart);
  }

  viewStartIndex = nextStart;
  viewEndIndex = nextEnd;
  followLatest = nextEnd >= maxIndex;
  drawChart(latestSeriesData);
}

function applyTimelinePreset(rangeDays) {
  if (!Array.isArray(latestSeriesData) || !latestSeriesData.length) {
    return;
  }

  const maxIndex = latestSeriesData.length - 1;
  if (rangeDays === "all") {
    viewStartIndex = 0;
    viewEndIndex = maxIndex;
    followLatest = true;
    drawChart(latestSeriesData);
    return;
  }

  const days = Number(rangeDays);
  if (!Number.isFinite(days) || days <= 0) {
    return;
  }

  const windowLength = Math.max(1, Math.min(maxIndex + 1, Math.round(days)));
  viewEndIndex = maxIndex;
  viewStartIndex = Math.max(0, maxIndex - windowLength + 1);
  followLatest = true;
  drawChart(latestSeriesData);
}

function applyPaceAxisRangeChange(changed) {
  if (!paceAxisMinEl || !paceAxisMaxEl || !hasPaceAxisBounds()) {
    return;
  }

  let nextSlowStep = Number(paceAxisMinEl.value);
  let nextFastStep = Number(paceAxisMaxEl.value);
  if (!Number.isFinite(nextSlowStep) || !Number.isFinite(nextFastStep)) {
    return;
  }

  nextSlowStep = Math.max(0, Math.min(PACE_AXIS_SLIDER_STEPS, Math.round(nextSlowStep)));
  nextFastStep = Math.max(0, Math.min(PACE_AXIS_SLIDER_STEPS, Math.round(nextFastStep)));

  if (changed === "min" && nextSlowStep > nextFastStep - PACE_AXIS_MIN_GAP_STEPS) {
    nextFastStep = Math.min(PACE_AXIS_SLIDER_STEPS, nextSlowStep + PACE_AXIS_MIN_GAP_STEPS);
    paceAxisMaxEl.value = String(nextFastStep);
  }

  if (changed === "max" && nextFastStep < nextSlowStep + PACE_AXIS_MIN_GAP_STEPS) {
    nextSlowStep = Math.max(0, nextFastStep - PACE_AXIS_MIN_GAP_STEPS);
    paceAxisMinEl.value = String(nextSlowStep);
  }

  paceAxisRangeMax = paceSliderToValue(nextSlowStep);
  paceAxisRangeMin = paceSliderToValue(nextFastStep);
  clampPaceAxisRange();
  drawChart(latestSeriesData);
}

function beginScrubWindowDrag(event) {
  if (!scrubFillEl || !latestSeriesData.length || viewStartIndex === null || viewEndIndex === null) {
    return;
  }

  const slider = scrubFillEl.closest(".range-slider");
  if (!slider) {
    return;
  }

  const rect = slider.getBoundingClientRect();
  if (!rect.width) {
    return;
  }

  const maxIndex = latestSeriesData.length - 1;
  if (maxIndex <= 0) {
    return;
  }

  scrubWindowDrag = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    sliderWidth: rect.width,
    maxIndex,
    startStart: viewStartIndex,
    startEnd: viewEndIndex
  };

  scrubFillEl.classList.add("is-dragging");
  event.preventDefault();
}

function moveScrubWindowDrag(event) {
  if (!scrubWindowDrag || event.pointerId !== scrubWindowDrag.pointerId || !latestSeriesData.length) {
    return;
  }

  const windowLength = scrubWindowDrag.startEnd - scrubWindowDrag.startStart;
  const deltaX = event.clientX - scrubWindowDrag.startClientX;
  const deltaIndex = Math.round((deltaX / scrubWindowDrag.sliderWidth) * scrubWindowDrag.maxIndex);
  const maxStart = Math.max(0, scrubWindowDrag.maxIndex - windowLength);
  const nextStart = Math.max(0, Math.min(maxStart, scrubWindowDrag.startStart + deltaIndex));
  const nextEnd = nextStart + windowLength;

  if (nextStart === viewStartIndex && nextEnd === viewEndIndex) {
    return;
  }

  viewStartIndex = nextStart;
  viewEndIndex = nextEnd;
  followLatest = nextEnd >= scrubWindowDrag.maxIndex;
  drawChart(latestSeriesData);
}

function endScrubWindowDrag(event) {
  if (!scrubWindowDrag || event.pointerId !== scrubWindowDrag.pointerId) {
    return;
  }

  scrubWindowDrag = null;
  scrubFillEl?.classList.remove("is-dragging");
}

scrubStartEl?.addEventListener("input", () => applyRangeChange("start"));
scrubEndEl?.addEventListener("input", () => applyRangeChange("end"));
scrubFillEl?.addEventListener("pointerdown", beginScrubWindowDrag);
for (const button of timelinePresetButtons) {
  button.addEventListener("click", () => applyTimelinePreset(button.getAttribute("data-range-days")));
}
paceAxisMinEl?.addEventListener("input", () => applyPaceAxisRangeChange("min"));
paceAxisMaxEl?.addEventListener("input", () => applyPaceAxisRangeChange("max"));
recentActivitiesSearchEl?.addEventListener("input", () => {
  recentActivitiesSearchQuery = recentActivitiesSearchEl.value || "";
  rerenderRecentActivitiesForCurrentRange();
});
recentActivitiesSearchEl?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    recentActivitiesSearchEl.value = "";
    recentActivitiesSearchQuery = "";
    rerenderRecentActivitiesForCurrentRange();
  }
});
paceHrComparableToggleEl?.addEventListener("change", () => {
  comparableRunsEnabled = Boolean(paceHrComparableToggleEl.checked);
  setComparableControlsUi();
  persistPaceHrComparableSettings();
  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  }
});
paceHrComparableStrictnessEl?.addEventListener("change", () => {
  comparableRunsStrictness = normalizeComparableStrictness(paceHrComparableStrictnessEl.value);
  setComparableControlsUi();
  persistPaceHrComparableSettings();
  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  }
});
paceHrComparableResetEl?.addEventListener("click", () => {
  comparableRunsEnabled = false;
  setComparableControlsUi();
  persistPaceHrComparableSettings();
  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  }
});
heatmapBinSizeEl?.addEventListener("change", () => {
  const parsed = Number(heatmapBinSizeEl.value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return;
  }

  heatmapBinSeconds = Math.round(parsed);
  if (latestSeriesData.length) {
    drawChart(latestSeriesData);
  }
});
mobileLeftDrawerToggleEl?.addEventListener("click", () => {
  setMobileLeftDrawerOpen(!leftColumnEl?.classList.contains("is-mobile-open"));
});
mobileLeftDrawerCloseEl?.addEventListener("click", () => {
  setMobileLeftDrawerOpen(false);
});
mobileLeftDrawerBackdropEl?.addEventListener("click", () => {
  setMobileLeftDrawerOpen(false);
});
document.addEventListener("click", (event) => {
  if (!isMobilePanelsLayout() || !leftColumnEl?.classList.contains("is-mobile-open")) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (leftColumnEl?.contains(target) || mobileLeftDrawerToggleEl?.contains(target)) {
    return;
  }

  setMobileLeftDrawerOpen(false);
});
activityDetailOverlayEl?.addEventListener("click", (event) => {
  if (event.target === activityDetailOverlayEl && isMobilePanelsLayout()) {
    closeActivityDetailDrawer({ clearSelection: false });
  }
});
window.addEventListener("pointermove", moveScrubWindowDrag);
window.addEventListener("pointerup", endScrubWindowDrag);
window.addEventListener("pointercancel", endScrubWindowDrag);

scrubStartEl?.addEventListener("pointerdown", () => {
  scrubStartEl.style.zIndex = "4";
  if (scrubEndEl) {
    scrubEndEl.style.zIndex = "3";
  }
});

scrubEndEl?.addEventListener("pointerdown", () => {
  scrubEndEl.style.zIndex = "4";
  if (scrubStartEl) {
    scrubStartEl.style.zIndex = "3";
  }
});

paceAxisMinEl?.addEventListener("pointerdown", () => {
  paceAxisMinEl.style.zIndex = "4";
  if (paceAxisMaxEl) {
    paceAxisMaxEl.style.zIndex = "3";
  }
});

paceAxisMaxEl?.addEventListener("pointerdown", () => {
  paceAxisMaxEl.style.zIndex = "4";
  if (paceAxisMinEl) {
    paceAxisMinEl.style.zIndex = "3";
  }
});
activityDetailCloseEl?.addEventListener("click", closeActivityDetailDrawer);
activityDetailContentEl?.addEventListener("scroll", () => {
  if (isActivityDetailOpen()) {
    persistActivityDetailViewState();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && leftColumnEl?.classList.contains("is-mobile-open")) {
    setMobileLeftDrawerOpen(false);
    return;
  }
  if (event.key === "Escape" && isActivityDetailOpen()) {
    closeActivityDetailDrawer();
  }
});
window.addEventListener("resize", () => {
  if (!isMobilePanelsLayout()) {
    setMobileLeftDrawerOpen(false);
  } else {
    syncMobilePanelBodyState();
  }
});
window.addEventListener("beforeunload", () => {
  persistActivityDetailViewState();
});

async function boot() {
  try {
    setActivityDetailOpenState(false);
    pendingUrlActivityId = readActivityIdFromUrl();
    pendingDevReloadSnapshot = consumeDevReloadSnapshot();
    applyPendingDevReloadSnapshotEarly();
    if (recentActivitiesSearchEl) {
      recentActivitiesSearchQuery = recentActivitiesSearchEl.value || "";
    }
    if (heatmapBinSizeEl) {
      const parsedBin = Number(heatmapBinSizeEl.value);
      if (Number.isFinite(parsedBin) && parsedBin > 0) {
        heatmapBinSeconds = Math.round(parsedBin);
      }
    }
    loadVisibleLines();
    loadExtraLines();
    loadViewRange();
    loadPaceAxisRange();
    loadPaceHrColorRange();
    loadPaceHrComparableSettings();
    setComparableControlsUi();
    await refreshSettings();
    const initialChartData = await refreshChart();
    if (hasStoredApiKey && !isSyncedToday(initialChartData?.syncedAt)) {
      await runSync({ auto: true });
    }
    await restorePendingDevReloadSnapshot();
    await restoreActivityDetailFromUrlState();
    void setupDevLiveReload();
  } catch (error) {
    setStatus(error.message || "Failed to load dashboard.");
    drawEmptyChart("Could not load data.");
  }
}

boot();
