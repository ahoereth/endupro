import { safeNumber } from "$lib/domain/shared.js";

function distanceKm(activity) {
  const raw = Number(activity.icu_distance ?? activity.distance ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return raw / 1000;
}

function normalizeHrBpm(activity) {
  const candidates = [
    activity.icu_average_hr,
    activity.average_hr,
    activity.avg_hr,
    activity.average_heartrate,
    activity.heartrate,
    activity.hr,
  ];

  for (const value of candidates) {
    const bpm = Number(value);
    if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 240) {
      return Number(bpm.toFixed(1));
    }
  }

  return null;
}

function normalizeMaxHrBpm(activity, fallback = null) {
  if (activity && typeof activity === "object") {
    const candidates = [
      activity.icu_max_hr,
      activity.max_hr,
      activity.maximum_hr,
      activity.max_heartrate,
      activity.heartrate_max,
      activity.maxHeartRate,
      activity.maxHrBpm,
      activity.maxHr,
      activity.hr_max,
    ];

    for (const value of candidates) {
      const bpm = Number(value);
      if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 260) {
        return Number(bpm.toFixed(1));
      }
    }
  }

  const fallbackValue = Number(fallback);
  if (
    Number.isFinite(fallbackValue) &&
    fallbackValue >= 30 &&
    fallbackValue <= 260
  ) {
    return Number(fallbackValue.toFixed(1));
  }

  return null;
}

function normalizeActivityName(activity, fallback = null) {
  if (!activity || typeof activity !== "object") {
    return fallback;
  }

  const candidates = [
    activity.name,
    activity.activity_name,
    activity.title,
    activity.workout_name,
    activity.workoutName,
    activity.icu_name,
    activity.activityName,
    activity.display_name,
    activity.label,
    activity.description,
    activity.notes,
  ];
  if (activity.workout && typeof activity.workout === "object") {
    candidates.push(
      activity.workout.name,
      activity.workout.title,
      activity.workout.label,
    );
  }
  if (activity.activity && typeof activity.activity === "object") {
    candidates.push(
      activity.activity.name,
      activity.activity.title,
      activity.activity.label,
    );
  }
  if (activity.event && typeof activity.event === "object") {
    candidates.push(
      activity.event.name,
      activity.event.title,
      activity.event.label,
    );
  }

  const found = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (found) {
    return found.trim();
  }

  return fallback;
}

function normalizeActivityStartDateTime(activity, fallback = null) {
  if (!activity || typeof activity !== "object") {
    return fallback;
  }

  const candidates = [
    activity.start_date_local,
    activity.start_date,
    activity.startDateTime,
    activity.started_at,
  ];
  const found = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (found) {
    return found.trim();
  }

  return fallback;
}

function parseDurationToSeconds(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (Number.isFinite(Number(value))) {
    const seconds = Number(value);
    return seconds > 0 ? Math.round(seconds) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric > 0 ? Math.round(numeric) : null;
  }

  if (!trimmed.includes(":")) {
    return null;
  }

  const parts = trimmed
    .split(":")
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part) && part >= 0);

  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.round(minutes * 60 + seconds);
  }

  const [hours, minutes, seconds] = parts;
  return Math.round(hours * 3600 + minutes * 60 + seconds);
}

function normalizeMovingTimeSec(activity, fallback = null) {
  if (activity && typeof activity === "object") {
    const candidates = [
      activity.icu_moving_time,
      activity.moving_time,
      activity.elapsed_time,
      activity.icu_elapsed_time,
      activity.duration,
      activity.movingTimeSec,
      activity.movingTime,
    ];

    for (const candidate of candidates) {
      const parsed = parseDurationToSeconds(candidate);
      if (parsed !== null && parsed > 0) {
        return parsed;
      }
    }
  }

  const fallbackParsed = parseDurationToSeconds(fallback);
  return fallbackParsed !== null && fallbackParsed > 0 ? fallbackParsed : null;
}

function normalizeElevationGainM(activity, fallback = null) {
  if (activity && typeof activity === "object") {
    const candidates = [
      activity.icu_elevation_gain,
      activity.total_elevation_gain,
      activity.elevation_gain,
      activity.elevationGainM,
      activity.elevationGain,
      activity.elev_gain,
      activity.climb,
      activity.total_ascent,
    ];

    for (const candidate of candidates) {
      const value = safeNumber(candidate);
      if (value !== null && value >= 0 && value <= 20000) {
        return Number(value.toFixed(1));
      }
    }
  }

  const fallbackValue = safeNumber(fallback);
  if (fallbackValue !== null && fallbackValue >= 0 && fallbackValue <= 20000) {
    return Number(fallbackValue.toFixed(1));
  }

  return null;
}

function normalizeAvgTempC(activity, fallback = null) {
  function normalizeTempCandidate(candidate) {
    const value = safeNumber(candidate);
    if (value === null) {
      return null;
    }

    const celsius = value > 60 && value <= 140 ? (value - 32) * (5 / 9) : value;
    if (!Number.isFinite(celsius) || celsius < -50 || celsius > 60) {
      return null;
    }

    return Number(celsius.toFixed(1));
  }

  if (activity && typeof activity === "object") {
    const candidates = [
      activity.icu_average_temp,
      activity.average_temp,
      activity.avg_temp,
      activity.avgTempC,
      activity.avgTemp,
      activity.temperature,
      activity.temp,
      activity.weather_temperature,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeTempCandidate(candidate);
      if (normalized !== null) {
        return normalized;
      }
    }
  }

  return normalizeTempCandidate(fallback);
}

function normalizeLoad(activity, fallback = null) {
  if (activity && typeof activity === "object") {
    const candidates = [
      activity.icu_training_load,
      activity.training_load,
      activity.trainingLoad,
      activity.icu_load,
      activity.load,
      activity.relative_effort,
      activity.relativeEffort,
      activity.effort,
    ];

    for (const candidate of candidates) {
      const value = safeNumber(candidate);
      if (value !== null && value >= 0 && value <= 10000) {
        return Number(value.toFixed(1));
      }
    }
  }

  const fallbackValue = safeNumber(fallback);
  if (fallbackValue !== null && fallbackValue >= 0 && fallbackValue <= 10000) {
    return Number(fallbackValue.toFixed(1));
  }

  return null;
}

function normalizePaceMinKm(activity, km) {
  const durationCandidates = [
    activity.icu_moving_time,
    activity.moving_time,
    activity.elapsed_time,
    activity.icu_elapsed_time,
    activity.duration,
  ];
  for (const value of durationCandidates) {
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0 || km <= 0) {
      continue;
    }

    return Number((seconds / 60 / km).toFixed(3));
  }

  const paceCandidates = [activity.icu_average_pace, activity.average_pace];
  for (const value of paceCandidates) {
    if (typeof value === "string" && value.includes(":")) {
      const parts = value
        .split(":")
        .map((part) => Number(part))
        .filter((part) => Number.isFinite(part) && part >= 0);
      if (parts.length === 2) {
        const pace = parts[0] + parts[1] / 60;
        return Number(pace.toFixed(3));
      }
    }

    const pace = Number(value);
    if (!Number.isFinite(pace) || pace <= 0) {
      continue;
    }

    if (pace <= 30) {
      return Number(pace.toFixed(3));
    }
    if (pace <= 3600) {
      return Number((pace / 60).toFixed(3));
    }
  }

  return null;
}

function sanitizePaceMinKm(paceMinKm) {
  if (!Number.isFinite(paceMinKm)) {
    return null;
  }

  if (paceMinKm < 2 || paceMinKm > 30) {
    return null;
  }

  return Number(paceMinKm.toFixed(3));
}

function isRunActivity(activity) {
  const type = String(activity.type || "").toLowerCase();
  return type.includes("run");
}

function normalizeActivities(items, existingById = new Map()) {
  const byId = new Map();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      continue;
    }

    if (!isRunActivity(item)) {
      continue;
    }

    const km = distanceKm(item);
    if (km <= 0) {
      continue;
    }
    const avgHrBpm = normalizeHrBpm(item);
    const paceMinKm = sanitizePaceMinKm(normalizePaceMinKm(item, km));

    const existingByRawId = item.id ? existingById.get(String(item.id)) : null;
    const movingTimeSec = normalizeMovingTimeSec(
      item,
      normalizeMovingTimeSec(existingByRawId, null),
    );
    const elevationGainM = normalizeElevationGainM(
      item,
      normalizeElevationGainM(existingByRawId, null),
    );
    const avgTempC = normalizeAvgTempC(
      item,
      normalizeAvgTempC(existingByRawId, null),
    );
    const maxHrBpm = normalizeMaxHrBpm(
      item,
      normalizeMaxHrBpm(existingByRawId, null),
    );
    const load = normalizeLoad(item, normalizeLoad(existingByRawId, null));
    const startDateTime = normalizeActivityStartDateTime(
      item,
      normalizeActivityStartDateTime(existingByRawId, ""),
    );
    if (!startDateTime) {
      continue;
    }
    const date = startDateTime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }

    const id = String(item.id || `${date}-${Math.random()}`);
    const cached = existingById.get(id);
    const cachedIntervals = Array.isArray(cached?.intervalPoints)
      ? cached.intervalPoints
      : [];
    const cachedSplits = Array.isArray(cached?.splitKmPoints)
      ? cached.splitKmPoints
      : [];
    const cachedDetailStreams = Array.isArray(cached?.detailStreamPoints)
      ? cached.detailStreamPoints
      : [];
    const resolvedName = normalizeActivityName(
      item,
      normalizeActivityName(cached, null),
    );
    const resolvedStartDateTime = normalizeActivityStartDateTime(
      item,
      normalizeActivityStartDateTime(cached, startDateTime),
    );
    const resolvedMovingTimeSec = normalizeMovingTimeSec(
      item,
      normalizeMovingTimeSec(cached, movingTimeSec),
    );
    const resolvedElevationGainM = normalizeElevationGainM(
      item,
      normalizeElevationGainM(cached, elevationGainM),
    );
    const resolvedAvgTempC = normalizeAvgTempC(
      item,
      normalizeAvgTempC(cached, avgTempC),
    );
    const resolvedMaxHrBpm = normalizeMaxHrBpm(
      item,
      normalizeMaxHrBpm(cached, maxHrBpm),
    );
    const resolvedLoad = normalizeLoad(item, normalizeLoad(cached, load));
    byId.set(id, {
      id,
      date,
      name: resolvedName,
      startDateTime: resolvedStartDateTime,
      movingTimeSec: resolvedMovingTimeSec,
      elevationGainM: resolvedElevationGainM,
      avgTempC: resolvedAvgTempC,
      maxHrBpm: resolvedMaxHrBpm,
      load: resolvedLoad,
      detailsFetched: cached?.detailsFetched === true,
      type: item.type,
      distanceKm: Number(km.toFixed(3)),
      avgHrBpm,
      paceMinKm,
      intervalPoints: cachedIntervals,
      splitsResolved: cached?.splitsResolved === true,
      splitKmPoints: cachedSplits,
      detailStreamsFetched: cached?.detailStreamsFetched === true,
      detailStreamPoints: cachedDetailStreams,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** @returns {import("$lib/types/app").PaceHrPoint[]} */
function collectPaceHrPoints(activities) {
  const points = [];

  for (const activity of activities) {
    const activityName = normalizeActivityName(activity, null);
    const intervalPoints = Array.isArray(activity.intervalPoints)
      ? activity.intervalPoints
      : [];
    const usableIntervals = intervalPoints.filter(
      (point) =>
        point &&
        (point.chartEligible === true || point.chartEligible === undefined) &&
        Number.isFinite(Number(point.paceMinKm)) &&
        Number(point.paceMinKm) > 0 &&
        Number.isFinite(Number(point.avgHrBpm)) &&
        Number(point.avgHrBpm) > 0,
    );

    const splitPoints = Array.isArray(activity.splitKmPoints)
      ? activity.splitKmPoints
      : [];
    const usableSplits = splitPoints.filter(
      (point) =>
        point &&
        Number.isFinite(Number(point.paceMinKm)) &&
        Number(point.paceMinKm) > 0 &&
        Number.isFinite(Number(point.avgHrBpm)) &&
        Number(point.avgHrBpm) > 0,
    );

    const preferSplits =
      usableSplits.length > 0 &&
      (usableIntervals.length <= 2 ||
        usableSplits.length > usableIntervals.length);

    if (usableIntervals.length && !preferSplits) {
      for (const interval of usableIntervals) {
        points.push({
          source: "interval",
          activityId: activity.id,
          activityName,
          date: activity.date,
          splitKm: Number(interval.intervalIndex ?? 0),
          distanceKm: Number(interval.distanceKm ?? 0),
          paceMinKm: Number(interval.paceMinKm),
          avgHrBpm: Number(interval.avgHrBpm),
        });
      }
      continue;
    }

    if (usableSplits.length) {
      for (const split of usableSplits) {
        points.push({
          source: "split-km",
          activityId: activity.id,
          activityName,
          date: activity.date,
          splitKm: Number(split.splitKm ?? 0),
          distanceKm: Number(split.splitDistanceKm ?? 1),
          paceMinKm: Number(split.paceMinKm),
          avgHrBpm: Number(split.avgHrBpm),
        });
      }
      continue;
    }

    const runPaceOk = Number.isFinite(Number(activity.paceMinKm));
    const runHrOk = Number.isFinite(Number(activity.avgHrBpm));
    if (!runPaceOk || !runHrOk) {
      continue;
    }

    points.push({
      source: "run",
      activityId: activity.id,
      activityName,
      date: activity.date,
      splitKm: null,
      distanceKm: Number(activity.distanceKm ?? 0),
      paceMinKm: Number(activity.paceMinKm),
      avgHrBpm: Number(activity.avgHrBpm),
    });
  }

  return points;
}

function extractRunningThresholdHrBpm(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const directCandidates = [
    payload.runningThresholdHr,
    payload.running_threshold_hr,
    payload.runningThresholdHeartrate,
    payload.running_threshold_heartrate,
    payload.runThresholdHr,
    payload.run_threshold_hr,
    payload.lthr,
    payload.run_lthr,
    payload.running?.thresholdHr,
    payload.running?.threshold_hr,
    payload.running?.lthr,
  ];
  for (const candidate of directCandidates) {
    const value = safeNumber(candidate);
    if (value !== null && value >= 120 && value <= 240) {
      return Number(value.toFixed(1));
    }
  }

  const stack = [payload];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(node)) {
      const lowered = key.toLowerCase();
      if (
        (lowered.includes("lthr") ||
          (lowered.includes("threshold") && lowered.includes("hr")) ||
          lowered.includes("heart_rate_threshold")) &&
        Number.isFinite(Number(value))
      ) {
        const numeric = Number(value);
        if (numeric >= 120 && numeric <= 240) {
          return Number(numeric.toFixed(1));
        }
      }
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return null;
}

export {
  collectPaceHrPoints,
  distanceKm,
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
};
