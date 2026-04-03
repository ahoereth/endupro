export {
  collectPaceHrPoints,
  extractRunningThresholdHrBpm,
  normalizeActivities,
  normalizeActivityName,
  normalizeActivityStartDateTime,
  normalizeAvgTempC,
  normalizeElevationGainM,
  normalizeHrBpm,
  normalizeLoad,
  normalizeMaxHrBpm,
  normalizeMovingTimeSec,
  normalizePaceMinKm,
  sanitizePaceMinKm,
} from "$lib/domain/activity-normalization.js";

export { enrichActivitiesWithPaceHrPoints } from "$lib/domain/enrichment.js";

export {
  applyHrZoneOverrides,
  blankHrZoneOverrideRows,
  buildFiveZonesFromThresholdHr,
  defaultSettings,
  normalizeHrZoneOverrideRows,
  normalizeSettings,
  normalizeThresholdOverride,
  resolveRunningHrZoneConfiguration,
} from "$lib/domain/hr-zones.js";

export {
  baselineStatusFromValues,
  computeRollingSeries,
} from "$lib/domain/rolling-series.js";

export {
  HR_ZONE_COUNT,
  INCREMENTAL_ROLLING_BACKFILL_DAYS,
  UPDATE_RECENT_RELOAD_DAYS,
  addDaysUTC,
  formatDateUTC,
  isDateKey,
  parseDateKey,
  safeNumber,
} from "$lib/domain/shared.js";

export {
  deriveIncrementalOldestDate,
  deriveUpdateOldestDate,
  fetchIntervalsActivities,
  latestActivityDateKey,
  mergeActivitiesById,
  normalizeLookbackDaysValue,
  resolveStoredLookbackInfo,
  shouldForceRefreshActivityOnUpdate,
  shuffleActivitiesForUpdate,
} from "$lib/domain/sync-policy.js";

export {
  buildActivityDetailStreamPoints,
  computeRunHrZoneDurations,
} from "$lib/domain/stream-processing.js";

export {
  fetchActivityStreams,
  fetchActivityWithIntervals,
  fetchAthleteProfile,
  fetchIntervalsActivitiesInRange,
} from "$lib/infra/intervals-api.js";
