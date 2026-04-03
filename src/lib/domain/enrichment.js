import {
  normalizeActivityName,
  normalizeActivityStartDateTime,
  normalizeAvgTempC,
  normalizeElevationGainM,
  normalizeLoad,
  normalizeMaxHrBpm,
  normalizeMovingTimeSec,
} from "$lib/domain/activity-normalization.js";
import {
  buildIntervalPoints,
  buildPerKmSplitPoints,
  shouldDerivePerKmSplitsFromStreams,
} from "$lib/domain/stream-processing.js";
import {
  fetchActivityStreams,
  fetchActivityWithIntervals,
} from "$lib/infra/intervals-api.js";

const SPLIT_FETCH_CONCURRENCY = 1;

async function enrichActivitiesWithPaceHrPoints(
  apiKey,
  activities,
  options = {},
) {
  let streamsUnsupported = false;
  let browserBlocked = false;
  let rebuiltRuns = 0;
  let pointCount = 0;
  let failedRuns = 0;
  let cacheHits = 0;
  let cursor = 0;
  let completedActivities = 0;
  const processingOrder = activities
    .map((activity, index) => ({ activity, index }))
    .sort((left, right) => {
      const leftStartDateTime =
        typeof left.activity?.startDateTime === "string"
          ? left.activity.startDateTime
          : "";
      const rightStartDateTime =
        typeof right.activity?.startDateTime === "string"
          ? right.activity.startDateTime
          : "";
      const startDateTimeComparison =
        rightStartDateTime.localeCompare(leftStartDateTime);
      if (startDateTimeComparison !== 0) {
        return startDateTimeComparison;
      }

      const leftDate =
        typeof left.activity?.date === "string" ? left.activity.date : "";
      const rightDate =
        typeof right.activity?.date === "string" ? right.activity.date : "";
      const dateComparison = rightDate.localeCompare(leftDate);
      if (dateComparison !== 0) {
        return dateComparison;
      }

      const leftId =
        typeof left.activity?.id === "string"
          ? left.activity.id
          : String(left.activity?.id ?? "");
      const rightId =
        typeof right.activity?.id === "string"
          ? right.activity.id
          : String(right.activity?.id ?? "");
      const idComparison = rightId.localeCompare(leftId);
      if (idComparison !== 0) {
        return idComparison;
      }

      return left.index - right.index;
    });
  const onProgress =
    typeof options?.onProgress === "function" ? options.onProgress : null;
  const forceRefreshActivity =
    typeof options?.forceRefreshActivity === "function"
      ? options.forceRefreshActivity
      : null;
  const signal = options?.signal;

  function throwIfAborted() {
    if (signal?.aborted) {
      const error = new Error("Sync cancelled.");
      error.name = "AbortError";
      throw error;
    }
  }

  async function reportProgress(
    activity,
    stage,
    isFinalForActivity,
    details = {},
  ) {
    if (!onProgress || !activity || typeof activity !== "object") {
      return;
    }

    await onProgress({
      activity,
      stage,
      isFinalForActivity,
      completedActivities,
      totalActivities: activities.length,
      ...details,
    });
  }

  async function worker() {
    while (true) {
      throwIfAborted();
      const index = cursor;
      cursor += 1;

      if (index >= processingOrder.length) {
        return;
      }

      const activity = processingOrder[index]?.activity;
      if (!activity || typeof activity !== "object") {
        continue;
      }

      if (
        !forceRefreshActivity?.(activity) &&
        activity.detailsFetched === true &&
        Array.isArray(activity.intervalPoints) &&
        activity.splitsResolved === true &&
        Array.isArray(activity.splitKmPoints)
      ) {
        cacheHits += 1;
        pointCount +=
          activity.intervalPoints.length + activity.splitKmPoints.length;
        completedActivities += 1;
        await reportProgress(activity, "cached", true);
        continue;
      }

      const previousState = {
        name: activity.name,
        startDateTime: activity.startDateTime,
        movingTimeSec: activity.movingTimeSec,
        elevationGainM: activity.elevationGainM,
        avgTempC: activity.avgTempC,
        maxHrBpm: activity.maxHrBpm,
        load: activity.load,
        detailsFetched: activity.detailsFetched === true,
        intervalPoints: Array.isArray(activity.intervalPoints)
          ? activity.intervalPoints
          : [],
        splitKmPoints: Array.isArray(activity.splitKmPoints)
          ? activity.splitKmPoints
          : [],
        splitsResolved: activity.splitsResolved === true,
      };

      try {
        const {
          unsupported: detailsUnsupported,
          unsupportedReason: detailUnsupportedReason,
          payload: detailPayload,
        } = await fetchActivityWithIntervals(apiKey, activity.id, { signal });
        if (detailsUnsupported) {
          if (detailUnsupportedReason === "browser_blocked") {
            browserBlocked = true;
            streamsUnsupported = true;
            activity.name = previousState.name ?? activity.name;
            activity.startDateTime =
              previousState.startDateTime ?? activity.startDateTime;
            activity.movingTimeSec =
              previousState.movingTimeSec ?? activity.movingTimeSec;
            activity.elevationGainM =
              previousState.elevationGainM ?? activity.elevationGainM;
            activity.avgTempC = previousState.avgTempC ?? activity.avgTempC;
            activity.maxHrBpm = previousState.maxHrBpm ?? activity.maxHrBpm;
            activity.load = previousState.load ?? activity.load;
            activity.detailsFetched = previousState.detailsFetched === true;
            activity.intervalPoints = previousState.intervalPoints;
            activity.splitKmPoints = previousState.splitKmPoints;
            activity.splitsResolved = previousState.splitsResolved === true;
            completedActivities += 1;
            await reportProgress(activity, "detail", true, {
              browserBlocked: true,
              unsupported: true,
            });
            continue;
          }

          activity.intervalPoints = previousState.intervalPoints;
          activity.detailsFetched = previousState.detailsFetched === true;
        } else {
          const detailName = normalizeActivityName(
            detailPayload,
            normalizeActivityName(activity, null),
          );
          if (detailName) {
            activity.name = detailName;
          }
          const detailStartDateTime = normalizeActivityStartDateTime(
            detailPayload,
            normalizeActivityStartDateTime(activity, null),
          );
          if (detailStartDateTime) {
            activity.startDateTime = detailStartDateTime;
          }
          activity.movingTimeSec = normalizeMovingTimeSec(
            detailPayload,
            normalizeMovingTimeSec(activity, null),
          );
          activity.elevationGainM = normalizeElevationGainM(
            detailPayload,
            normalizeElevationGainM(activity, null),
          );
          activity.avgTempC = normalizeAvgTempC(
            detailPayload,
            normalizeAvgTempC(activity, null),
          );
          activity.maxHrBpm = normalizeMaxHrBpm(
            detailPayload,
            normalizeMaxHrBpm(activity, null),
          );
          activity.load = normalizeLoad(
            detailPayload,
            normalizeLoad(activity, null),
          );
          activity.detailsFetched = true;

          const intervalPoints = buildIntervalPoints(activity, detailPayload);
          activity.intervalPoints = intervalPoints;
          pointCount += intervalPoints.length;
        }

        const hasIntervalPoints =
          Array.isArray(activity.intervalPoints) &&
          activity.intervalPoints.length > 0;
        const shouldDeriveSplits = shouldDerivePerKmSplitsFromStreams(
          activity,
          activity.intervalPoints,
        );
        if (hasIntervalPoints && !shouldDeriveSplits) {
          activity.splitKmPoints = [];
          activity.splitsResolved = true;
          rebuiltRuns += 1;
          completedActivities += 1;
          await reportProgress(activity, "detail", true, {
            streamFetchSkipped: true,
            unsupported: detailsUnsupported === true,
          });
          continue;
        }

        await reportProgress(activity, "detail", false, {
          unsupported: detailsUnsupported === true,
        });

        const {
          unsupported: notSupported,
          unsupportedReason,
          payload,
        } = await fetchActivityStreams(apiKey, activity.id, { signal });
        if (notSupported) {
          streamsUnsupported = true;
          if (unsupportedReason === "browser_blocked") {
            browserBlocked = true;
            activity.splitKmPoints = previousState.splitKmPoints;
            activity.splitsResolved = previousState.splitsResolved === true;
          } else {
            activity.splitKmPoints = [];
            activity.splitsResolved = true;
          }
          completedActivities += 1;
          await reportProgress(activity, "streams", true, {
            browserBlocked: unsupportedReason === "browser_blocked",
            unsupported: true,
          });
          continue;
        }

        const points = buildPerKmSplitPoints(activity, payload);
        activity.splitKmPoints = points;
        activity.splitsResolved = true;
        rebuiltRuns += 1;
        pointCount += points.length;
        completedActivities += 1;
        await reportProgress(activity, "streams", true);
      } catch {
        if (signal?.aborted) {
          const error = new Error("Sync cancelled.");
          error.name = "AbortError";
          throw error;
        }
        failedRuns += 1;
        activity.name = previousState.name;
        activity.startDateTime = previousState.startDateTime;
        activity.movingTimeSec = previousState.movingTimeSec;
        activity.elevationGainM = previousState.elevationGainM;
        activity.avgTempC = previousState.avgTempC;
        activity.detailsFetched = previousState.detailsFetched === true;
        activity.intervalPoints = previousState.intervalPoints;
        activity.splitKmPoints = previousState.splitKmPoints;
        activity.splitsResolved = previousState.splitsResolved === true;
        completedActivities += 1;
        await reportProgress(activity, "failed", true);
      }
    }
  }

  const concurrency = Math.min(
    SPLIT_FETCH_CONCURRENCY,
    Math.max(1, activities.length),
  );
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    pointCount,
    rebuiltRuns,
    failedRuns,
    cacheHits,
    unsupported: streamsUnsupported,
    browserBlocked,
  };
}

export { enrichActivitiesWithPaceHrPoints };
