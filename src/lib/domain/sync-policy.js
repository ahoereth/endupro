import {
  INCREMENTAL_ROLLING_BACKFILL_DAYS,
  UPDATE_RECENT_RELOAD_DAYS,
  addDaysUTC,
  formatDateUTC,
  isDateKey,
  parseDateKey,
} from "$lib/domain/shared.js";
import { fetchIntervalsActivitiesInRange } from "$lib/infra/intervals-api.js";

function normalizeLookbackDaysValue(requested, fallback = 365) {
  if (requested === "all") {
    return null;
  }
  const parsed = Number(requested ?? fallback);
  if (!Number.isFinite(parsed)) {
    return Math.max(30, Math.min(Math.round(fallback), 3650));
  }
  return Math.max(30, Math.min(Math.round(parsed), 3650));
}

function resolveStoredLookbackInfo(data) {
  const mode =
    data?.lookbackMode === "all" || data?.lookbackDays === "all"
      ? "all"
      : "days";
  const days =
    mode === "all" ? null : normalizeLookbackDaysValue(data?.lookbackDays, 365);
  return { lookbackMode: mode, lookbackDays: days };
}

function latestActivityDateKey(activities) {
  if (!Array.isArray(activities) || !activities.length) {
    return null;
  }

  let latest = null;
  for (const activity of activities) {
    const date = String(activity?.date || "");
    if (!isDateKey(date)) {
      continue;
    }
    if (!latest || date > latest) {
      latest = date;
    }
  }
  return latest;
}

function deriveIncrementalOldestDate(
  currentData,
  previousActivities,
  fallbackLookbackDays,
  newestDate,
) {
  const syncedAtMs = Date.parse(String(currentData?.syncedAt || ""));
  const latestExistingDate = latestActivityDateKey(previousActivities);
  let anchorDate = null;

  if (Number.isFinite(syncedAtMs)) {
    anchorDate = formatDateUTC(new Date(syncedAtMs));
  } else if (latestExistingDate) {
    anchorDate = latestExistingDate;
  }

  if (anchorDate && isDateKey(anchorDate)) {
    return formatDateUTC(
      addDaysUTC(parseDateKey(anchorDate), -INCREMENTAL_ROLLING_BACKFILL_DAYS),
    );
  }

  if (Number.isFinite(fallbackLookbackDays) && fallbackLookbackDays > 0) {
    return formatDateUTC(
      addDaysUTC(parseDateKey(newestDate), -Math.round(fallbackLookbackDays)),
    );
  }

  return "1970-01-01";
}

function deriveUpdateOldestDate(previousActivities, newestDate) {
  const latestExistingDate = latestActivityDateKey(previousActivities);
  const minRecentDate = formatDateUTC(
    addDaysUTC(parseDateKey(newestDate), -UPDATE_RECENT_RELOAD_DAYS),
  );
  if (latestExistingDate && isDateKey(latestExistingDate)) {
    return latestExistingDate < minRecentDate
      ? latestExistingDate
      : minRecentDate;
  }
  return minRecentDate;
}

function shouldForceRefreshActivityOnUpdate(
  activity,
  newestDate,
  reloadWindowDays = UPDATE_RECENT_RELOAD_DAYS,
) {
  const activityDate = String(activity?.date || "");
  if (!isDateKey(activityDate) || !isDateKey(newestDate)) {
    return false;
  }

  const days = Number(reloadWindowDays);
  if (!Number.isFinite(days) || days <= 0) {
    return false;
  }

  const refreshOldestDate = formatDateUTC(
    addDaysUTC(parseDateKey(newestDate), -Math.round(days)),
  );
  return activityDate >= refreshOldestDate;
}

function shuffleActivitiesForUpdate(activities, syncedAt) {
  if (!Array.isArray(activities)) {
    return [];
  }
  if (!syncedAt) {
    return activities;
  }

  const shuffled = [...activities];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function mergeActivitiesById(existingActivities, fetchedActivities) {
  const byId = new Map();

  for (const activity of existingActivities) {
    if (!activity || typeof activity !== "object") {
      continue;
    }
    const id = String(activity.id || "").trim();
    if (!id) {
      continue;
    }
    byId.set(id, activity);
  }

  for (const activity of fetchedActivities) {
    if (!activity || typeof activity !== "object") {
      continue;
    }
    const id = String(activity.id || "").trim();
    if (!id) {
      continue;
    }
    byId.set(id, activity);
  }

  return Array.from(byId.values()).sort((a, b) => {
    const dateA = String(a?.date || "");
    const dateB = String(b?.date || "");
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return String(a?.id || "").localeCompare(String(b?.id || ""));
  });
}

async function fetchIntervalsActivities(
  apiKey,
  lookbackDays,
  existingById = new Map(),
  options = {},
) {
  const newestDate = formatDateUTC(new Date());
  const oldestDate =
    Number.isFinite(lookbackDays) && lookbackDays > 0
      ? formatDateUTC(
          addDaysUTC(parseDateKey(newestDate), -Math.round(lookbackDays)),
        )
      : "1970-01-01";
  return fetchIntervalsActivitiesInRange(
    apiKey,
    oldestDate,
    newestDate,
    existingById,
    options,
  );
}

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
};
