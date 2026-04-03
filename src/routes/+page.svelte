<script lang="ts">
  import { replaceState } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import ActivityDetailDrawer from "$lib/components/ActivityDetailDrawer.svelte";
  import ConnectionPanel from "$lib/components/ConnectionPanel.svelte";
  import ConnectionSection from "$lib/components/ConnectionSection.svelte";
  import FoundationsPanel from "$lib/components/FoundationsPanel.svelte";
  import HeatmapPanel from "$lib/components/HeatmapPanel.svelte";
  import HelpCard from "$lib/components/HelpCard.svelte";
  import HrZoneSettingsPanel from "$lib/components/HrZoneSettingsPanel.svelte";
  import PaceHrChart from "$lib/components/PaceHrChart.svelte";
  import RecentActivitiesPanel from "$lib/components/RecentActivitiesPanel.svelte";
  import RollingChart from "$lib/components/RollingChart.svelte";
  import TimelinePanel from "$lib/components/TimelinePanel.svelte";
  import TolerancePanel from "$lib/components/TolerancePanel.svelte";
  import {
    buildComparableContext,
    buildFoundations,
    buildHeatmap,
    clampRange,
    filterRunsByRange,
    filterRunsBySearch,
    isSyncedToday,
    normalizeComparableStrictness,
    rangeDatesFromSeries,
  } from "$lib/domain/view";
  import {
    computeDetailNavigationState,
    resolvePaceHrActivityClick,
    restoreActivityStateFromUrl,
  } from "$lib/runtime/activity-detail";
  import {
    loadUiPreferences,
    clearLocalUiStorage,
    persistComparableSettings,
    persistHeatmapPreferences,
    persistNumericRange,
    persistSyncPaused,
    persistVisibleLines,
    resetUiPreferences,
    type HeatmapOrientation,
  } from "$lib/runtime/preferences";
  import {
    computeFiniteBounds,
    resolveNumericRange,
  } from "$lib/runtime/ranges";
  import {
    normalizeActivityIds,
    reduceRecentActivitySelection,
  } from "$lib/runtime/selection";
  import { createSyncController } from "$lib/runtime/sync-controller";
  import {
    applyTimelinePreset,
    clearPersistedViewRange,
    persistViewRange,
    restoreViewRange,
    updateTimelineRange,
  } from "$lib/runtime/timeline";
  import { buildUrlSearch, serializeUrlState } from "$lib/runtime/url-state";
  import {
    getWorkerClient,
    type WorkerClient,
  } from "$lib/runtime/worker-client";
  import {
    blankOverrideRows,
    buildSettingsSummary,
    clearRuntimeSettings,
    loadRuntimeSettings,
    saveRuntimeSettings,
    validateRuntimeSettings,
  } from "$lib/runtime/settings";
  import type { RefreshOptions } from "$lib/runtime/sync";
  import type {
    ActivityDetailPayload,
    FoundationsModel,
    HeatmapModel,
    PaceHrPoint,
    RollingSeriesPoint,
    RunSummary,
    SeriesPayload,
  } from "$lib/types/app";

  let workerClient: WorkerClient | null = null;
  let status = "Loading...";
  let syncBusy = false;
  let syncStopping = false;
  let syncProgressPercent: number | null = null;
  const initialPreferences = loadUiPreferences();
  let syncPaused = initialPreferences.syncPaused;
  let runtimeSettings = loadRuntimeSettings();
  let summarySettings = buildSettingsSummary(runtimeSettings);
  let payload: SeriesPayload | null = null;
  let detail: ActivityDetailPayload | null = null;
  let activeDetailId: string | null = null;
  let searchQuery = "";
  let selectedIds: string[] = [];
  let selectionAnchorId: string | null = null;
  let startIndex: number | null = null;
  let endIndex: number | null = null;
  let showRampCapLine = true;
  let visibleLines = initialPreferences.visibleLines;
  let selectedOnlyEnabled = initialPreferences.selectedOnlyEnabled;
  let comparableEnabled = initialPreferences.comparableEnabled;
  let comparableStrictness = initialPreferences.comparableStrictness;
  let paceAxisRange = initialPreferences.paceAxisRange;
  let paceHrColorRange = initialPreferences.paceHrColorRange;
  let paceHrColorRangeCustomized =
    initialPreferences.paceHrColorRange.min !== null ||
    initialPreferences.paceHrColorRange.max !== null;
  let heatmapBinSize = initialPreferences.heatmapBinSize;
  let heatmapColorRange = initialPreferences.heatmapColorRange;
  let heatmapColorRangeCustomized =
    initialPreferences.heatmapColorRange.min !== null ||
    initialPreferences.heatmapColorRange.max !== null;
  let heatmapOrientation: HeatmapOrientation = "pace-y";
  let mobileMenuOpen = false;
  let urlStateReady = false;
  let urlStateSnapshot = "";
  let lastUrlStateKey = "";

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (mobileMenuOpen) {
        mobileMenuOpen = false;
      }
      if (detail) {
        closeDetail();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });

  function applySyncState(patch: {
    status?: string;
    syncBusy?: boolean;
    syncStopping?: boolean;
    syncProgressPercent?: number | null;
    syncPaused?: boolean;
  }) {
    if (patch.status !== undefined) status = patch.status;
    if (patch.syncBusy !== undefined) syncBusy = patch.syncBusy;
    if (patch.syncStopping !== undefined) syncStopping = patch.syncStopping;
    if (patch.syncProgressPercent !== undefined)
      syncProgressPercent = patch.syncProgressPercent;
    if (patch.syncPaused !== undefined) syncPaused = patch.syncPaused;
  }

  function isSyncErrorStatus(value: string) {
    return (
      value.startsWith("Intervals.icu API ") ||
      value === "Sync failed." ||
      value === "Could not stop the current sync."
    );
  }

  function resetUiState() {
    const resetPreferences = resetUiPreferences();
    clearPersistedViewRange();
    searchQuery = "";
    selectedIds = [];
    selectionAnchorId = null;
    startIndex = null;
    endIndex = null;
    detail = null;
    activeDetailId = null;
    showRampCapLine = true;
    visibleLines = resetPreferences.visibleLines;
    selectedOnlyEnabled = resetPreferences.selectedOnlyEnabled;
    comparableEnabled = resetPreferences.comparableEnabled;
    comparableStrictness = resetPreferences.comparableStrictness;
    paceAxisRange = resetPreferences.paceAxisRange;
    paceHrColorRange = resetPreferences.paceHrColorRange;
    paceHrColorRangeCustomized =
      resetPreferences.paceHrColorRange.min !== null ||
      resetPreferences.paceHrColorRange.max !== null;
    heatmapBinSize = resetPreferences.heatmapBinSize;
    heatmapColorRange = resetPreferences.heatmapColorRange;
    heatmapColorRangeCustomized =
      resetPreferences.heatmapColorRange.min !== null ||
      resetPreferences.heatmapColorRange.max !== null;
    heatmapOrientation = resetPreferences.heatmapOrientation;
    mobileMenuOpen = false;
    syncPaused = false;
    persistSyncPaused(false);
  }

  $: series = (payload?.series ?? []) as RollingSeriesPoint[];
  $: runs = (payload?.runs ?? []) as RunSummary[];
  $: latest = (
    visibleSeries.length
      ? visibleSeries[visibleSeries.length - 1]
      : (payload?.latest ?? null)
  ) as RollingSeriesPoint | null;
  $: clampedRange = clampRange(series, startIndex, endIndex);
  $: rangeStartIndex = clampedRange.startIndex;
  $: rangeEndIndex = clampedRange.endIndex;
  $: isFullTimelineRange =
    series.length > 0 &&
    rangeStartIndex === 0 &&
    rangeEndIndex === series.length - 1;
  $: visibleSeries =
    rangeStartIndex !== null && rangeEndIndex !== null && series.length
      ? series.slice(rangeStartIndex, rangeEndIndex + 1)
      : [];
  $: rangeDates = rangeDatesFromSeries(series, rangeStartIndex, rangeEndIndex);
  $: runsInRange = filterRunsByRange(
    runs,
    rangeDates.startDate,
    rangeDates.endDate,
  );
  $: sortedRunsInRange = [...runsInRange].sort(
    (a, b) =>
      Date.parse(b.startDateTime || b.date) -
      Date.parse(a.startDateTime || a.date),
  );
  $: recentRuns = filterRunsBySearch(sortedRunsInRange, searchQuery);
  $: pointsInRange = isFullTimelineRange
    ? ((payload?.paceHrPoints ?? []) as PaceHrPoint[])
    : ((payload?.paceHrPoints ?? []) as PaceHrPoint[]).filter((point) => {
        const date = String(point?.date || "");
        return (
          (!rangeDates.startDate || date >= rangeDates.startDate) &&
          (!rangeDates.endDate || date <= rangeDates.endDate)
        );
      });
  $: comparableContext = buildComparableContext(
    runsInRange,
    selectedIds,
    comparableStrictness,
  );
  $: comparableSummary =
    selectedIds.length && comparableContext.reference
      ? `Reference: ${comparableContext.reference.name || "Latest run"} · ${comparableContext.comparableIds.size} comparable runs`
      : "";
  $: hasSelectedActivities = selectedIds.length > 0;
  $: selectedOnlyPoints = hasSelectedActivities
    ? pointsInRange.filter((point) =>
        selectedIds.includes(String(point.activityId)),
      )
    : pointsInRange;
  $: comparablePoints = hasSelectedActivities
    ? pointsInRange.filter((point) =>
        comparableContext.comparableIds.has(String(point.activityId)),
      )
    : pointsInRange;
  $: visiblePaceHrPoints = selectedOnlyEnabled
    ? selectedOnlyPoints
    : comparableEnabled
      ? comparablePoints
      : pointsInRange;
  $: paceFilterBounds = computeFiniteBounds(
    visiblePaceHrPoints.map((point) => Number(point?.paceMinKm)),
    0.3,
  );
  $: resolvedPaceFilterRange = resolveNumericRange(
    paceAxisRange,
    paceFilterBounds,
    0.05,
  );
  $: heatmapPoints =
    paceAxisRange.min === null && paceAxisRange.max === null
      ? visiblePaceHrPoints
      : resolvedPaceFilterRange.min !== null &&
          resolvedPaceFilterRange.max !== null
        ? visiblePaceHrPoints.filter((point) => {
            const pace = Number(point?.paceMinKm);
            return (
              Number.isFinite(pace) &&
              pace >= Number(resolvedPaceFilterRange.min) &&
              pace <= Number(resolvedPaceFilterRange.max)
            );
          })
        : visiblePaceHrPoints;
  $: selectedDateKeys = runs
    .filter((run) => selectedIds.includes(String(run.id)))
    .map((run) => String(run.date));
  $: detailNavigation = computeDetailNavigationState(
    runs,
    selectedIds,
    activeDetailId,
  );
  $: selectedDetailRunIds = detailNavigation.selectedDetailRunIds;
  $: newerSelectedActivityId = detailNavigation.newerSelectedActivityId;
  $: olderSelectedActivityId = detailNavigation.olderSelectedActivityId;
  $: foundations = buildFoundations(
    runsInRange,
    visiblePaceHrPoints,
    payload?.hrZonesRunning ?? [],
  ) as FoundationsModel;
  $: heatmap = buildHeatmap(heatmapPoints, heatmapBinSize) as HeatmapModel;
  $: oldestRun = (runs.length ? runs[0] : null) as RunSummary | null;
  $: latestRun = (
    runs.length ? runs[runs.length - 1] : null
  ) as RunSummary | null;
  $: urlStateSnapshot = urlStateReady
    ? serializeUrlState(
        normalizeActivityIds(
          selectedIds,
          runs.map((run) => String(run.id)),
        ),
        activeDetailId && detail ? activeDetailId : null,
      )
    : "";
  $: if (urlStateReady && urlStateSnapshot) {
    syncUrlState();
  }
  $: if (!hasSelectedActivities) {
    selectedOnlyEnabled = false;
    comparableEnabled = false;
  }

  function syncUrlState(force = false) {
    if (typeof window === "undefined") {
      return;
    }

    const validIds = runs.map((run) => String(run.id));
    const normalizedSelectedIds = normalizeActivityIds(selectedIds, validIds);
    const nextKey = serializeUrlState(
      normalizedSelectedIds,
      activeDetailId && detail ? activeDetailId : null,
    );
    if (!force && nextKey === lastUrlStateKey) {
      return;
    }
    lastUrlStateKey = nextKey;

    const nextSearch = buildUrlSearch(
      normalizedSelectedIds,
      activeDetailId && detail ? activeDetailId : null,
    );
    const nextLocation = nextSearch
      ? resolve(`/?${nextSearch}` as `/?${string}`)
      : (resolve("/") as "/");
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    replaceState(nextLocation, window.history.state);
  }

  async function initialize() {
    workerClient = await getWorkerClient();
    await workerClient.setRuntimeSettings(runtimeSettings);
    await refresh();
    await restoreActivityFromUrl();
    urlStateReady = true;
    syncUrlState();
    if (syncPaused) {
      status = "Sync paused. Resume manually with Update.";
      return;
    }
    if (
      summarySettings.hasApiKey &&
      !isSyncedToday(payload?.syncedAt ?? null)
    ) {
      await syncController.runIncremental(true);
    }
  }

  async function refresh(options: Partial<RefreshOptions> = {}) {
    if (!workerClient) return;
    const reloadActiveDetail = options.reloadActiveDetail ?? true;
    const includeStreamsIfMissing = options.includeStreamsIfMissing ?? false;
    const updateStatus = options.updateStatus ?? true;
    payload = await workerClient.getSeriesPayload();
    summarySettings = buildSettingsSummary(runtimeSettings);
    ({ startIndex, endIndex } = restoreViewRange(payload?.series ?? []));
    if (updateStatus) {
      status = payload?.syncedAt
        ? ""
        : summarySettings.hasApiKey
          ? "API key saved. Ready to sync."
          : "Enter your Intervals.icu API key to start syncing.";
    }
    if (activeDetailId && reloadActiveDetail) {
      await loadDetail(activeDetailId, false, includeStreamsIfMissing);
    }
  }

  const syncController = createSyncController({
    getWorkerClient: () => workerClient,
    getHasApiKey: () => summarySettings.hasApiKey,
    getHasExistingActivities: () => runs.length > 0,
    getActiveDetailId: () => activeDetailId,
    getSyncBusy: () => syncBusy,
    getSyncStopping: () => syncStopping,
    refresh: (options: Partial<RefreshOptions>) => refresh(options),
    persistSyncPaused,
    applyState: applySyncState,
  });

  async function saveApiKey(apiKey: string) {
    const trimmed = String(apiKey || "").trim();
    const previousApiKey = runtimeSettings.apiKey;
    const hasExistingKey = summarySettings.hasApiKey;
    const isNewKey = trimmed.length > 0 && trimmed !== previousApiKey;

    if (!trimmed && hasExistingKey) {
      status = "API key unchanged.";
      return;
    }
    if (!trimmed) {
      status = "Enter an API key to save.";
      return;
    }
    runtimeSettings = saveRuntimeSettings({ apiKey: trimmed });
    summarySettings = buildSettingsSummary(runtimeSettings);
    await workerClient?.setRuntimeSettings(runtimeSettings);
    status = "API key saved.";
    await refresh();

    if (isNewKey) {
      await runReset("clear-activities");
      await syncController.runFetchAll();
    }
  }

  function handleApiKeyChange() {
    if (summarySettings.hasApiKey) {
      status = "API key saved. Ready to sync.";
      return;
    }
    status = "Enter an API key to save.";
  }

  async function saveOverrides(event: CustomEvent) {
    try {
      runtimeSettings = validateRuntimeSettings(
        event.detail,
        payload?.defaultRunningThresholdHr ?? null,
      );
      runtimeSettings = saveRuntimeSettings(runtimeSettings);
      await workerClient?.setRuntimeSettings(runtimeSettings);
      status = "HR zone overrides saved.";
      await refresh();
    } catch (error) {
      status =
        error instanceof Error
          ? error.message
          : "Failed to save HR zone overrides.";
    }
  }

  async function clearOverrides() {
    runtimeSettings = saveRuntimeSettings({
      runningThresholdHrOverride: null,
      hrZonesRunningOverride: blankOverrideRows(),
    });
    await workerClient?.setRuntimeSettings(runtimeSettings);
    status = "HR zone overrides cleared.";
    await refresh();
  }

  async function runReset(scope: "clear-activities" | "delete-all") {
    if (!workerClient) return;
    syncBusy = true;
    syncProgressPercent = null;
    try {
      await workerClient.resetLocalData({ scope });
      const savedApiKey = runtimeSettings.apiKey;
      resetUiState();
      if (scope === "delete-all") {
        runtimeSettings = clearRuntimeSettings();
      } else {
        clearLocalUiStorage();
        runtimeSettings = saveRuntimeSettings({
          apiKey: savedApiKey,
          runningThresholdHrOverride: null,
          hrZonesRunningOverride: blankOverrideRows(),
        });
      }
      summarySettings = buildSettingsSummary(runtimeSettings);
      await workerClient.setRuntimeSettings(runtimeSettings);
      await refresh();
      if (urlStateReady) {
        syncUrlState(true);
      }
      status =
        scope === "delete-all"
          ? "All local data deleted, including API key."
          : "Local activity data cleared. API key kept.";
    } catch (error) {
      status =
        error instanceof Error ? error.message : "Could not reset local data.";
    } finally {
      syncBusy = false;
    }
  }

  async function loadDetail(
    activityId: string,
    updateUrl = true,
    includeStreamsIfMissing = true,
  ) {
    if (!workerClient) return;
    try {
      activeDetailId = activityId;
      detail = await workerClient.getActivityDetail({
        activityId,
        includeStreamsIfMissing,
      });
      if (updateUrl && urlStateReady) {
        syncUrlState();
      }
    } catch (error) {
      status =
        error instanceof Error
          ? error.message
          : "Could not load activity details.";
    }
  }

  async function openActivity(
    activityId: string,
    options: {
      includeStreamsIfMissing?: boolean;
      updateUrl?: boolean;
      preserveSelection?: boolean;
    } = {},
  ) {
    const normalizedId = String(activityId || "").trim();
    if (!normalizedId) {
      return;
    }
    const preserveSelection =
      options.preserveSelection === true && selectedIds.includes(normalizedId);
    if (!preserveSelection) {
      selectedIds = [normalizedId];
    }
    selectionAnchorId = normalizedId;
    if (urlStateReady) {
      syncUrlState(true);
    }
    await loadDetail(
      normalizedId,
      options.updateUrl ?? true,
      options.includeStreamsIfMissing ?? true,
    );
  }

  async function handlePaceHrActivityClick(activityId: string) {
    const clickResolution = resolvePaceHrActivityClick(
      selectedIds,
      Boolean(detail),
      activityId,
    );
    if (!clickResolution.selectionAnchorId) {
      return;
    }
    selectedIds = clickResolution.selectedIds;
    selectionAnchorId = clickResolution.selectionAnchorId;
    if (clickResolution.shouldOpenDetail) {
      await openActivity(clickResolution.selectionAnchorId, {
        preserveSelection: clickResolution.preserveSelection,
      });
      return;
    }
    if (urlStateReady) {
      syncUrlState(true);
    }
  }

  async function restoreActivityFromUrl() {
    const restored = restoreActivityStateFromUrl(runs, window.location.href);
    if (restored.selectedIds.length) {
      selectedIds = restored.selectedIds;
      selectionAnchorId = restored.selectionAnchorId;
    }
    if (restored.detailActivityId) {
      await loadDetail(restored.detailActivityId, false);
    }
  }

  function closeDetail() {
    detail = null;
    activeDetailId = null;
    if (urlStateReady) {
      syncUrlState(true);
    }
  }

  async function showSelectedDetailNeighbor(direction: "older" | "newer") {
    const targetActivityId =
      direction === "older" ? olderSelectedActivityId : newerSelectedActivityId;
    if (!targetActivityId) {
      return;
    }
    await openActivity(targetActivityId, { preserveSelection: true });
  }

  function applyPreset(days: number | "all") {
    ({ startIndex, endIndex } = applyTimelinePreset(series, days));
    persistViewRange(series, startIndex, endIndex);
  }

  function handleRangeChange(which: "start" | "end", value: number) {
    ({ startIndex, endIndex } = updateTimelineRange(
      which,
      value,
      startIndex,
      endIndex,
    ));
    persistViewRange(series, startIndex, endIndex);
  }

  function handleSelection(event: CustomEvent) {
    const nextSelection = reduceRecentActivitySelection(
      selectedIds,
      selectionAnchorId,
      recentRuns,
      event.detail,
    );
    selectedIds = nextSelection.selectedIds;
    selectionAnchorId = nextSelection.selectionAnchorId;
    if (urlStateReady) {
      syncUrlState(true);
    }

    if (detail && activeDetailId && !selectedIds.includes(activeDetailId)) {
      if (selectedIds.length) {
        void openActivity(selectedIds[0], { preserveSelection: true });
      } else {
        closeDetail();
      }
    }
  }

  onMount(() => {
    void initialize();
    return () => {
      syncController.dispose();
    };
  });

  $: if (series.length) {
    persistViewRange(series, startIndex, endIndex);
  }
  $: persistHeatmapPreferences(heatmapBinSize, heatmapOrientation);
  $: persistNumericRange("paceAxisRange", paceAxisRange);
  $: persistComparableSettings({
    selectedOnlyEnabled,
    comparableEnabled,
    comparableStrictness,
  });

  function handlePaceHrColorRangeChange(event: CustomEvent) {
    paceHrColorRange = event.detail;
    paceHrColorRangeCustomized = true;
    persistNumericRange("paceHrColorRange", paceHrColorRange);
  }

  function handleHeatmapColorRangeChange(event: CustomEvent) {
    heatmapColorRange = event.detail;
    heatmapColorRangeCustomized = true;
    persistNumericRange("heatmapColorRange", heatmapColorRange);
  }
</script>

<svelte:head>
  <title>endupro</title>
</svelte:head>

<main class="layout">
  <header class="hero">
    <div class="hero-top">
      <div class="hero-copy">
        <div class="hero-kicker">endurance progress tracker</div>
        <h1 class="hero-logo">endupro</h1>
        <p>Track and analyse enduracnce training progress fully locally.</p>
      </div>
      <button
        type="button"
        class="mobile-chrome-button"
        aria-expanded={mobileMenuOpen}
        on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
      >
        Menu
      </button>
    </div>
  </header>

  <button
    type="button"
    class="mobile-panel-backdrop"
    class:is-visible={mobileMenuOpen}
    aria-label="Close navigation menu"
    on:click={() => (mobileMenuOpen = false)}
  ></button>

  <div class="app-grid" class:is-detail-open={Boolean(detail)}>
    <ConnectionSection
      {status}
      hasApiKey={summarySettings.hasApiKey}
      syncedAt={payload?.syncedAt ?? null}
      {oldestRun}
      {latestRun}
      {syncBusy}
      {syncStopping}
      {syncProgressPercent}
      activityCount={payload?.activityCount ?? 0}
      {mobileMenuOpen}
      onCloseMenu={() => (mobileMenuOpen = false)}
      onSaveKey={saveApiKey}
      onKeyChange={handleApiKeyChange}
      onUpdate={() => syncController.runIncremental(false)}
      onStopSync={syncController.requestStopSync}
      onClearActivities={() => {
        if (
          window.confirm(
            "Delete all activities and synced charts? Your saved API key will be kept.",
          )
        ) {
          void runReset("clear-activities");
        }
      }}
      onDeleteAll={() => {
        if (
          window.confirm(
            "Delete all data, including your saved API key? This cannot be undone.",
          )
        ) {
          void runReset("delete-all");
        }
      }}
    >
      <RecentActivitiesPanel
        runs={recentRuns}
        {searchQuery}
        {selectedIds}
        {activeDetailId}
        totalRunsInRange={runsInRange.length}
        on:search={(event) => (searchQuery = event.detail.value)}
        on:select={handleSelection}
        on:open={(event) =>
          openActivity(event.detail.activityId, {
            preserveSelection: selectedIds.includes(
              String(event.detail.activityId),
            ),
          })}
      />
    </ConnectionSection>

    <section class="right-column">
      {#if syncBusy && syncProgressPercent !== null}
        <section class="card mobile-sync-progress-card">
          <h2>Sync Progress</h2>
          <div
            class="sync-progress"
            aria-label="Sync progress"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={syncProgressPercent}
            role="progressbar"
          >
            <div class="sync-progress-track">
              <div
                class="sync-progress-fill"
                style={`width: ${syncProgressPercent}%`}
              ></div>
            </div>
            <span class="sync-progress-value">{syncProgressPercent}%</span>
          </div>
        </section>
      {/if}

      <TimelinePanel
        {series}
        startIndex={rangeStartIndex}
        endIndex={rangeEndIndex}
        activityCount={runsInRange.length}
        hasRunsInRange={runsInRange.length > 0}
        on:preset={(event) => applyPreset(event.detail.days)}
        on:change={(event) =>
          handleRangeChange(event.detail.which, event.detail.value)}
      />
      <TolerancePanel {latest} series={visibleSeries} />
      <FoundationsPanel {foundations} />
      <RollingChart
        series={visibleSeries}
        {selectedDateKeys}
        {visibleLines}
        {showRampCapLine}
        runs={runsInRange}
        on:legendchange={(event) => {
          visibleLines = event.detail.visibleLines;
          showRampCapLine = event.detail.showRampCapLine;
          persistVisibleLines(visibleLines);
        }}
        on:openrun={(event) =>
          openActivity(event.detail.activityId, {
            preserveSelection: selectedIds.includes(
              String(event.detail.activityId),
            ),
          })}
      />
      <PaceHrChart
        points={visiblePaceHrPoints}
        {selectedOnlyEnabled}
        {comparableEnabled}
        strictness={comparableStrictness}
        {comparableSummary}
        {selectedIds}
        paceRangeMin={paceAxisRange.min}
        paceRangeMax={paceAxisRange.max}
        colorRangeMin={paceHrColorRangeCustomized ? paceHrColorRange.min : null}
        colorRangeMax={paceHrColorRangeCustomized ? paceHrColorRange.max : null}
        on:toggleselectedonly={(event) => {
          selectedOnlyEnabled = event.detail.value;
          if (selectedOnlyEnabled) {
            comparableEnabled = false;
          }
        }}
        on:togglecomparable={(event) => {
          comparableEnabled = event.detail.value;
          if (comparableEnabled) {
            selectedOnlyEnabled = false;
          }
        }}
        on:changestrictness={(event) =>
          (comparableStrictness = normalizeComparableStrictness(
            event.detail.value,
          ))}
        on:resetcomparable={() => {
          selectedOnlyEnabled = false;
          comparableEnabled = false;
        }}
        on:changepacerange={(event) => (paceAxisRange = event.detail)}
        on:changecolorrange={handlePaceHrColorRangeChange}
        on:openactivity={(event) =>
          handlePaceHrActivityClick(event.detail.activityId)}
      />
      {#key `${heatmapBinSize}-${heatmap.weekKeys.length}-${heatmap.bins.length}-${heatmap.cells.length}-${heatmapPoints.length}`}
        <HeatmapPanel
          model={heatmap}
          binSeconds={heatmapBinSize}
          colorRangeMin={heatmapColorRangeCustomized
            ? heatmapColorRange.min
            : null}
          colorRangeMax={heatmapColorRangeCustomized
            ? heatmapColorRange.max
            : null}
          on:changebinsize={(event) => (heatmapBinSize = event.detail.value)}
          on:changecolorrange={handleHeatmapColorRangeChange}
        />
      {/key}
      <HelpCard />
      <HrZoneSettingsPanel
        defaultThreshold={payload?.defaultRunningThresholdHr ?? null}
        appliedThreshold={payload?.runningThresholdHr ?? null}
        defaultZones={payload?.defaultHrZonesRunning ?? []}
        appliedZones={payload?.hrZonesRunning ?? []}
        overrideZones={payload?.hrZonesRunningOverride ?? []}
        on:save={saveOverrides}
        on:clear={clearOverrides}
      />
    </section>

    <ActivityDetailDrawer
      {detail}
      open={Boolean(detail)}
      canShowOlder={Boolean(olderSelectedActivityId)}
      canShowNewer={Boolean(newerSelectedActivityId)}
      paceRangeMin={resolvedPaceFilterRange.min}
      paceRangeMax={resolvedPaceFilterRange.max}
      on:close={closeDetail}
      on:showolder={() => showSelectedDetailNeighbor("older")}
      on:shownewer={() => showSelectedDetailNeighbor("newer")}
    />
  </div>
</main>
