import {
  baselineStatusFromValues,
  blankHrZoneOverrideRows,
  buildActivityDetailStreamPoints,
  buildFiveZonesFromThresholdHr,
  collectPaceHrPoints,
  computeRollingSeries,
  computeRunHrZoneDurations,
  defaultSettings,
  enrichActivitiesWithPaceHrPoints,
  extractRunningThresholdHrBpm,
  fetchActivityStreams,
  fetchAthleteProfile,
  fetchIntervalsActivitiesInRange,
  formatDateUTC,
  isDateKey,
  mergeActivitiesById,
  normalizeSettings,
  resolveRunningHrZoneConfiguration,
  shouldForceRefreshActivityOnUpdate,
  safeNumber,
} from "$lib/domain/edupro-core.js";
import { db, type ActivityRecord, type SyncMetaRecord } from "$lib/worker/db";
import type {
  ActivityDetailPayload,
  SeriesPayload,
  WorkerSyncProgressEvent,
} from "$lib/types/app";

type RuntimeSettingsSnapshot = {
  apiKey: string;
  runningThresholdHrOverride: number | null;
  hrZonesRunningOverride: Array<{
    label: string;
    minBpm: number | null;
    maxBpm: number | null;
  }>;
};

type ResetPayload = { scope: "clear-activities" | "delete-all" };
type ActivityDetailRequest = {
  activityId: string;
  includeStreamsIfMissing?: boolean;
};
type SyncMode = "update" | "fetch-all";
type SyncActivityProgressEvent = {
  activity: ActivityRecord;
  stage: "detail" | "streams" | "cached" | "failed";
  isFinalForActivity: boolean;
  completedActivities: number;
  totalActivities: number;
  browserBlocked?: boolean;
  unsupported?: boolean;
  streamFetchSkipped?: boolean;
};
export type SyncProgressEvent = WorkerSyncProgressEvent;
type SyncProgressCallback = (
  event: WorkerSyncProgressEvent,
) => void | Promise<void>;

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function getDefaultMeta(): SyncMetaRecord {
  return {
    id: "singleton",
    syncedAt: null,
    lookbackMode: "all",
    lookbackDays: null,
    runningThresholdHr: null,
    hrZonesRunning: [],
  };
}

function buildSeriesCacheSignature(
  meta: SyncMetaRecord,
  activities: ActivityRecord[],
) {
  return [meta.syncedAt || "never", activities.length].join(":");
}

async function getMeta() {
  return (await db.syncMeta.get("singleton")) ?? getDefaultMeta();
}

async function getActivities() {
  return (await db.activities.toArray()) as ActivityRecord[];
}

function buildSeriesPayload(
  meta: SyncMetaRecord,
  activities: ActivityRecord[],
  runtimeSettings: RuntimeSettingsSnapshot,
): SeriesPayload {
  const zoneConfig = resolveRunningHrZoneConfiguration(
    meta.runningThresholdHr,
    runtimeSettings,
  );
  const { series, latest } = computeRollingSeries(activities, null);
  const paceHrPoints = collectPaceHrPoints(activities);

  return {
    syncedAt: meta.syncedAt,
    activityCount: activities.length,
    lookbackDays: "all",
    defaultRunningThresholdHr: zoneConfig.defaultRunningThresholdHr,
    runningThresholdHrOverride: zoneConfig.runningThresholdHrOverride,
    runningThresholdHr: zoneConfig.runningThresholdHr,
    defaultHrZonesRunning: zoneConfig.defaultHrZonesRunning,
    hrZonesRunningOverride: zoneConfig.hrZonesRunningOverride,
    hrZonesRunning: zoneConfig.hrZonesRunning,
    paceHrPoints,
    runs: activities.map((activity) => ({
      id: activity.id,
      date: activity.date,
      name:
        typeof activity.name === "string" && activity.name.trim().length
          ? activity.name.trim()
          : null,
      startDateTime:
        typeof activity.startDateTime === "string" && activity.startDateTime
          ? activity.startDateTime
          : null,
      type: typeof activity.type === "string" ? activity.type : null,
      distanceKm: Number(activity.distanceKm ?? 0),
      movingTimeSec: Number.isFinite(Number(activity.movingTimeSec))
        ? Number(activity.movingTimeSec)
        : null,
      elevationGainM: Number.isFinite(Number(activity.elevationGainM))
        ? Number(activity.elevationGainM)
        : null,
      avgTempC: Number.isFinite(Number(activity.avgTempC))
        ? Number(activity.avgTempC)
        : null,
      avgHrBpm: Number.isFinite(Number(activity.avgHrBpm))
        ? Number(activity.avgHrBpm)
        : null,
      maxHrBpm: Number.isFinite(Number(activity.maxHrBpm))
        ? Number(activity.maxHrBpm)
        : null,
      load: Number.isFinite(Number(activity.load))
        ? Number(activity.load)
        : null,
      hrZoneDurationsSec: computeRunHrZoneDurations(
        activity,
        zoneConfig.hrZonesRunning,
      ),
      paceMinKm: Number.isFinite(Number(activity.paceMinKm))
        ? Number(activity.paceMinKm)
        : null,
    })),
    series,
    latest,
  };
}

export class EduproWorkerService {
  runtimeSettings: RuntimeSettingsSnapshot = defaultSettings();
  activeSyncController: AbortController | null = null;

  cancelCurrentSync() {
    if (!this.activeSyncController) {
      return { ok: true, cancelled: false };
    }

    this.activeSyncController.abort();
    return { ok: true, cancelled: true };
  }

  async setRuntimeSettings(settingsSnapshot: RuntimeSettingsSnapshot) {
    this.runtimeSettings = normalizeSettings(settingsSnapshot);
    return { ok: true };
  }

  async syncIncremental(onProgress?: SyncProgressCallback) {
    return this.runSync("update", onProgress);
  }

  async syncAll(onProgress?: SyncProgressCallback) {
    return this.runSync("fetch-all", onProgress);
  }

  async resetLocalData({ scope }: ResetPayload) {
    if (scope !== "clear-activities" && scope !== "delete-all") {
      throw new Error("Invalid reset mode.");
    }

    await db.transaction(
      "rw",
      db.activities,
      db.syncMeta,
      db.derivedCache,
      async () => {
        await db.activities.clear();
        await db.derivedCache.clear();
        await db.syncMeta.put(getDefaultMeta());
      },
    );

    return {
      ok: true,
      mode: scope,
      hasApiKey:
        scope === "delete-all" ? false : Boolean(this.runtimeSettings.apiKey),
    };
  }

  async getSeriesPayload() {
    const meta = await getMeta();
    const activities = await getActivities();
    const payload = buildSeriesPayload(meta, activities, this.runtimeSettings);

    const cachedKey = "series:all";
    const signature = buildSeriesCacheSignature(meta, activities);
    const cached = await db.derivedCache.get(cachedKey);
    if (!cached || cached.signature !== signature) {
      await db.derivedCache.put({
        key: cachedKey,
        signature,
        payload: {
          series: payload.series,
          latest: payload.latest,
          paceHrPoints: payload.paceHrPoints,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    return payload;
  }

  async getActivityDetail({
    activityId,
    includeStreamsIfMissing = true,
  }: ActivityDetailRequest): Promise<ActivityDetailPayload> {
    const activities = await getActivities();
    const activityIndex = activities.findIndex(
      (item) => String(item?.id || "") === activityId,
    );
    const activity = activityIndex >= 0 ? activities[activityIndex] : null;
    if (!activity) {
      throw new Error("Activity not found.");
    }

    let detailStreamPoints = Array.isArray(activity.detailStreamPoints)
      ? activity.detailStreamPoints
      : [];

    if (
      (!detailStreamPoints.length || activity.detailStreamsFetched !== true) &&
      includeStreamsIfMissing
    ) {
      const apiKey = String(this.runtimeSettings.apiKey || "").trim();
      if (apiKey) {
        try {
          const { unsupported, unsupportedReason, payload } =
            await fetchActivityStreams(apiKey, activity.id);
          if (unsupported) {
            if (unsupportedReason !== "browser_blocked") {
              detailStreamPoints = [];
              activity.detailStreamPoints = [];
              activity.detailStreamsFetched = true;
            }
          } else {
            detailStreamPoints = buildActivityDetailStreamPoints(
              activity,
              payload,
            );
            activity.detailStreamPoints = detailStreamPoints;
            activity.detailStreamsFetched = true;
          }
          await db.activities.put(activity);
        } catch {
          detailStreamPoints = Array.isArray(activity.detailStreamPoints)
            ? activity.detailStreamPoints
            : [];
        }
      }
    }

    if (
      !detailStreamPoints.length &&
      Array.isArray(activity.detailStreamPoints)
    ) {
      detailStreamPoints = activity.detailStreamPoints;
    }

    const { series } = computeRollingSeries(activities, null);
    const baselineItem = series.find(
      (item) => String(item?.date || "") === String(activity?.date || ""),
    );
    const sum7 =
      baselineItem && Number.isFinite(Number(baselineItem.sum7))
        ? Number(baselineItem.sum7)
        : null;
    const sum7ma90 =
      baselineItem && Number.isFinite(Number(baselineItem.sum7ma90))
        ? Number(baselineItem.sum7ma90)
        : null;
    const capKm =
      Number.isFinite(sum7ma90) && sum7ma90 > 0
        ? Number((sum7ma90 * 1.1).toFixed(3))
        : null;
    const headroomKm =
      Number.isFinite(capKm) && Number.isFinite(sum7)
        ? Number((capKm - sum7).toFixed(3))
        : null;
    const deltaKm =
      Number.isFinite(sum7) && Number.isFinite(sum7ma90) && sum7ma90 > 0
        ? Number((sum7 - sum7ma90).toFixed(3))
        : null;
    const deltaPct =
      Number.isFinite(deltaKm) && Number.isFinite(sum7ma90) && sum7ma90 > 0
        ? Number((deltaKm / sum7ma90).toFixed(4))
        : null;

    return {
      summary: {
        id: activity.id,
        date: isDateKey(activity.date) ? activity.date : null,
        name:
          typeof activity.name === "string" && activity.name.trim().length
            ? activity.name.trim()
            : null,
        startDateTime:
          typeof activity.startDateTime === "string" && activity.startDateTime
            ? activity.startDateTime
            : null,
        type: typeof activity.type === "string" ? activity.type : null,
        distanceKm: Number.isFinite(Number(activity.distanceKm))
          ? Number(activity.distanceKm)
          : null,
        movingTimeSec: Number.isFinite(Number(activity.movingTimeSec))
          ? Number(activity.movingTimeSec)
          : null,
        paceMinKm: Number.isFinite(Number(activity.paceMinKm))
          ? Number(activity.paceMinKm)
          : null,
        avgHrBpm: Number.isFinite(Number(activity.avgHrBpm))
          ? Number(activity.avgHrBpm)
          : null,
        maxHrBpm: Number.isFinite(Number(activity.maxHrBpm))
          ? Number(activity.maxHrBpm)
          : null,
        elevationGainM: Number.isFinite(Number(activity.elevationGainM))
          ? Number(activity.elevationGainM)
          : null,
        avgTempC: Number.isFinite(Number(activity.avgTempC))
          ? Number(activity.avgTempC)
          : null,
        load: Number.isFinite(Number(activity.load))
          ? Number(activity.load)
          : null,
      },
      intervalPoints: Array.isArray(activity.intervalPoints)
        ? activity.intervalPoints
        : [],
      splitKmPoints: Array.isArray(activity.splitKmPoints)
        ? activity.splitKmPoints
        : [],
      detailStreamPoints: Array.isArray(detailStreamPoints)
        ? detailStreamPoints
        : [],
      baselineContext: {
        date: isDateKey(activity.date) ? activity.date : null,
        sum7,
        sum7ma90,
        capKm,
        headroomKm,
        deltaKm,
        deltaPct,
        status: baselineStatusFromValues(sum7, sum7ma90),
      },
    };
  }

  async runSync(mode: SyncMode, onProgress?: SyncProgressCallback) {
    if (this.activeSyncController) {
      throw new Error("A sync is already in progress.");
    }

    const abortController = new AbortController();
    this.activeSyncController = abortController;
    const { signal } = abortController;

    try {
      const apiKey = String(this.runtimeSettings.apiKey || "").trim();
      if (!apiKey) {
        throw new Error(
          "Missing Intervals.icu API key. Save it in settings first.",
        );
      }

      const currentMeta = await getMeta();
      const previousActivities = await getActivities();
      const previousById = new Map(
        previousActivities.map((activity) => [
          String(activity.id || ""),
          activity,
        ]),
      );
      const newestDate = formatDateUTC(new Date());

      let activities: ActivityRecord[] = [];
      let fetchedActivities: ActivityRecord[] = [];
      let lookbackMode: "all" | "days" = "all";
      let lookbackDays = null;
      let syncOldestDate = "1970-01-01";

      const buildCurrentMeta = (
        overrides: Partial<SyncMetaRecord> = {},
      ): SyncMetaRecord => ({
        id: "singleton",
        syncedAt: currentMeta.syncedAt,
        lookbackMode,
        lookbackDays,
        runningThresholdHr: safeNumber(currentMeta.runningThresholdHr),
        hrZonesRunning: Array.isArray(currentMeta.hrZonesRunning)
          ? currentMeta.hrZonesRunning
          : blankHrZoneOverrideRows(),
        ...overrides,
      });

      const emitProgress = (event: SyncProgressEvent) => {
        if (typeof onProgress === "function") {
          void onProgress(event);
        }
      };

      const writePartialState = async () => {
        const partialMeta = buildCurrentMeta();

        await db.transaction(
          "rw",
          db.activities,
          db.syncMeta,
          db.derivedCache,
          async () => {
            if (mode === "fetch-all") {
              await db.activities.clear();
            }
            await db.activities.bulkPut(activities);
            await db.syncMeta.put(partialMeta);
            await db.derivedCache.clear();
          },
        );
      };

      if (mode === "update") {
        syncOldestDate = "1970-01-01";
        fetchedActivities = (await fetchIntervalsActivitiesInRange(
          apiKey,
          syncOldestDate,
          newestDate,
          previousById,
          { signal },
        )) as ActivityRecord[];
        activities = mergeActivitiesById(
          previousActivities,
          fetchedActivities,
        ) as ActivityRecord[];
      } else {
        fetchedActivities = (await fetchIntervalsActivitiesInRange(
          apiKey,
          "1970-01-01",
          newestDate,
          previousById,
          { signal },
        )) as ActivityRecord[];
        activities = fetchedActivities;
        lookbackMode = "all";
        lookbackDays = null;
      }

      await writePartialState();
      emitProgress({
        phase: "list",
        syncMode: mode,
        fetchedCount: fetchedActivities.length,
        count: activities.length,
        completedActivities: 0,
        totalActivities: activities.length,
        refreshSuggested: true,
      });

      const splitStats = await enrichActivitiesWithPaceHrPoints(
        apiKey,
        activities,
        {
          signal,
          forceRefreshActivity:
            mode === "update"
              ? (activity: ActivityRecord) =>
                  shouldForceRefreshActivityOnUpdate(activity, newestDate)
              : undefined,
          onProgress: async (event: SyncActivityProgressEvent) => {
            await db.activities.put(event.activity);
            emitProgress({
              phase: "activity",
              syncMode: mode,
              fetchedCount: fetchedActivities.length,
              count: activities.length,
              completedActivities: event.completedActivities,
              totalActivities: event.totalActivities,
              activityId: String(event.activity?.id || ""),
              activityDate:
                typeof event.activity?.date === "string"
                  ? event.activity.date
                  : null,
              requestStage: event.stage,
              isFinalForActivity: event.isFinalForActivity,
              browserBlocked: event.browserBlocked === true,
              unsupported: event.unsupported === true,
              streamFetchSkipped: event.streamFetchSkipped === true,
              refreshSuggested: event.isFinalForActivity === true,
            });
          },
        },
      );

      if (signal.aborted) {
        throw new DOMException("Sync cancelled.", "AbortError");
      }

      let runningThresholdHr = safeNumber(currentMeta.runningThresholdHr);
      let hrZonesRunning = buildFiveZonesFromThresholdHr(runningThresholdHr);
      try {
        const { unsupported, payload } = await fetchAthleteProfile(apiKey, {
          signal,
        });
        if (!unsupported) {
          const fetchedThresholdHr = extractRunningThresholdHrBpm(payload);
          if (Number.isFinite(fetchedThresholdHr)) {
            runningThresholdHr = fetchedThresholdHr;
          }
          hrZonesRunning = buildFiveZonesFromThresholdHr(runningThresholdHr);
        }
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          throw error;
        }
        hrZonesRunning =
          currentMeta.hrZonesRunning ?? blankHrZoneOverrideRows();
      }

      emitProgress({
        phase: "profile",
        syncMode: mode,
        fetchedCount: fetchedActivities.length,
        count: activities.length,
        completedActivities: activities.length,
        totalActivities: activities.length,
        refreshSuggested: true,
      });

      const nextMeta: SyncMetaRecord = {
        id: "singleton",
        syncedAt: new Date().toISOString(),
        lookbackMode,
        lookbackDays,
        runningThresholdHr: Number.isFinite(runningThresholdHr)
          ? Number(runningThresholdHr.toFixed(1))
          : null,
        hrZonesRunning,
      };

      await db.transaction(
        "rw",
        db.activities,
        db.syncMeta,
        db.derivedCache,
        async () => {
          await db.activities.bulkPut(activities);
          await db.syncMeta.put(nextMeta);
          await db.derivedCache.clear();
        },
      );

      emitProgress({
        phase: "complete",
        syncMode: mode,
        fetchedCount: fetchedActivities.length,
        count: activities.length,
        completedActivities: activities.length,
        totalActivities: activities.length,
        syncedAt: nextMeta.syncedAt,
        refreshSuggested: true,
      });

      return {
        ok: true,
        syncMode: mode,
        syncOldestDate,
        syncNewestDate: newestDate,
        syncedAt: nextMeta.syncedAt,
        count: activities.length,
        fetchedCount: fetchedActivities.length,
        splitPoints: splitStats.pointCount,
        splitRunsRebuilt: splitStats.rebuiltRuns,
        splitRunsCached: splitStats.cacheHits,
        splitRunsFailed: splitStats.failedRuns,
        splitUnsupported: splitStats.unsupported,
        browserBlocked: splitStats.browserBlocked === true,
        lookbackDays: lookbackMode === "all" ? "all" : lookbackDays,
      };
    } finally {
      if (this.activeSyncController === abortController) {
        this.activeSyncController = null;
      }
    }
  }
}
