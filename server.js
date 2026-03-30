const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const ACTIVITIES_FILE = path.join(DATA_DIR, "activities.json");
const PACE_SOURCE_VERSION = 3;
const SPLIT_SOURCE_VERSION = 5;
const INTERVAL_SOURCE_VERSION = 2;
const ACTIVITY_META_SOURCE_VERSION = 2;
const SPLIT_FETCH_CONCURRENCY = 2;
const ACTIVITY_FETCH_MAX_RETRIES = 3;
const ACTIVITY_FETCH_RETRY_BASE_MS = 300;
const ACTIVITY_FETCH_RETRY_MAX_MS = 3_000;
const INCREMENTAL_ROLLING_BACKFILL_DAYS = 14;
const DEV_LIVE_RELOAD_ENABLED = process.env.FITBOARD_DEV_LIVE_RELOAD === "1";
const DEV_RELOAD_TOKEN = `${process.pid}-${Date.now()}`;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function jsonResponse(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function textResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await writeJson(SETTINGS_FILE, { apiKey: "" });
  }

  try {
    await fs.access(ACTIVITIES_FILE);
  } catch {
    await writeJson(ACTIVITIES_FILE, { syncedAt: null, lookbackDays: 365, activities: [] });
  }
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

async function parseJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

function formatDateUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysUTC(date, days) {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isoWeekStartKey(dateKey) {
  const date = parseDateKey(dateKey);
  const weekday = date.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = (weekday + 6) % 7;
  return formatDateUTC(addDaysUTC(date, -daysSinceMonday));
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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
    activity.hr
  ];

  for (const value of candidates) {
    const bpm = Number(value);
    if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 240) {
      return Number(bpm.toFixed(1));
    }
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
    activity.notes
  ];
  if (activity.workout && typeof activity.workout === "object") {
    candidates.push(activity.workout.name, activity.workout.title, activity.workout.label);
  }
  if (activity.activity && typeof activity.activity === "object") {
    candidates.push(activity.activity.name, activity.activity.title, activity.activity.label);
  }
  if (activity.event && typeof activity.event === "object") {
    candidates.push(activity.event.name, activity.event.title, activity.event.label);
  }

  const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
  if (found) {
    return found.trim();
  }

  return fallback;
}

function normalizeActivityStartDateTime(activity, fallback = null) {
  if (!activity || typeof activity !== "object") {
    return fallback;
  }

  const candidates = [activity.start_date_local, activity.start_date, activity.startDateTime, activity.started_at];
  const found = candidates.find((value) => typeof value === "string" && value.trim().length > 0);
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
      activity.movingTime
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
      activity.total_ascent
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

    // Heuristic: values in typical Fahrenheit range are converted to Celsius.
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
      activity.weather_temperature
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

function normalizePaceMinKm(activity, km) {
  const durationCandidates = [
    activity.icu_moving_time,
    activity.moving_time,
    activity.elapsed_time,
    activity.icu_elapsed_time,
    activity.duration
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

    // Intervals/other sources may provide either min/km or sec/km.
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

  // Keep broad bounds so trail/ultra effort can still be included.
  if (paceMinKm < 2 || paceMinKm > 30) {
    return null;
  }

  return Number(paceMinKm.toFixed(3));
}

function isRunActivity(activity) {
  const type = String(activity.type || "").toLowerCase();
  return type.includes("run");
}

function safeNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fillCumulativeStreamGaps(values) {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }

  const filled = values.slice();
  const firstKnown = filled.findIndex((value) => Number.isFinite(value));
  if (firstKnown < 0) {
    return [];
  }

  for (let i = 0; i < firstKnown; i += 1) {
    filled[i] = 0;
  }

  let previousKnownIndex = firstKnown;
  filled[previousKnownIndex] = Math.max(0, Number(filled[previousKnownIndex]));

  for (let i = previousKnownIndex + 1; i < filled.length; i += 1) {
    const current = filled[i];
    if (!Number.isFinite(current)) {
      continue;
    }

    const startValue = Number(filled[previousKnownIndex]);
    const endValue = Math.max(startValue, Number(current));
    const gap = i - previousKnownIndex;

    if (gap > 1) {
      const delta = endValue - startValue;
      for (let j = 1; j < gap; j += 1) {
        filled[previousKnownIndex + j] = startValue + (delta * j) / gap;
      }
    }

    filled[i] = endValue;
    previousKnownIndex = i;
  }

  for (let i = previousKnownIndex + 1; i < filled.length; i += 1) {
    filled[i] = Number(filled[previousKnownIndex]);
  }

  for (let i = 1; i < filled.length; i += 1) {
    if (!Number.isFinite(filled[i])) {
      filled[i] = Number(filled[i - 1]);
      continue;
    }
    if (filled[i] < filled[i - 1]) {
      filled[i] = Number(filled[i - 1]);
    }
  }

  return filled;
}

function extractStreamArray(payload, names) {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const name of names) {
    if (Array.isArray(payload[name])) {
      return payload[name];
    }
  }

  if (payload.data && typeof payload.data === "object") {
    for (const name of names) {
      if (Array.isArray(payload.data[name])) {
        return payload.data[name];
      }
    }
  }

  if (Array.isArray(payload.streams)) {
    for (const stream of payload.streams) {
      const type = String(stream?.type ?? stream?.name ?? "");
      if (names.includes(type) && Array.isArray(stream?.data)) {
        return stream.data;
      }
    }
  }

  if (Array.isArray(payload)) {
    for (const stream of payload) {
      const type = String(stream?.type ?? stream?.name ?? "");
      if (names.includes(type) && Array.isArray(stream?.data)) {
        return stream.data;
      }
    }
  }

  return [];
}

function normalizeDistanceStreamMeters(distanceRaw, expectedKm) {
  const values = distanceRaw.map((value) => safeNumber(value)).map((value) => (value === null ? null : Math.max(0, value)));
  const finite = values.filter((value) => value !== null);
  if (!finite.length) {
    return [];
  }

  const maxDistance = Math.max(...finite);
  const expectedM = Number(expectedKm) * 1000;
  let scale = 1;

  if (Number.isFinite(expectedM) && expectedM > 0) {
    const ratioMeters = maxDistance / expectedM;
    const ratioKm = (maxDistance * 1000) / expectedM;
    if (Math.abs(ratioKm - 1) < Math.abs(ratioMeters - 1)) {
      scale = 1000;
    }
  } else if (maxDistance > 0 && maxDistance < 200) {
    scale = 1000;
  }

  const scaled = values.map((value) => (value === null ? null : value * scale));
  return fillCumulativeStreamGaps(scaled);
}

function normalizeTimeStreamSeconds(timeRaw, targetLength) {
  const values = timeRaw.map((value) => safeNumber(value));
  if (values.length !== targetLength) {
    return Array.from({ length: targetLength }, (_, i) => i);
  }

  const finite = values.filter((value) => value !== null);
  if (!finite.length) {
    return Array.from({ length: targetLength }, (_, i) => i);
  }

  const maxValue = Math.max(...finite);
  const scale = maxValue > 500_000 ? 0.001 : 1;
  return values.map((value, i) => (value === null ? i : value * scale));
}

function normalizeHrStream(hrRaw, targetLength) {
  const values = hrRaw.map((value) => safeNumber(value));
  if (values.length !== targetLength) {
    return Array.from({ length: targetLength }, () => null);
  }

  return values.map((value) => (value !== null && value >= 30 && value <= 240 ? value : null));
}

function buildPerKmSplitPoints(activity, streamPayload) {
  const distanceRaw = extractStreamArray(streamPayload, ["distance", "dist"]);
  if (!distanceRaw.length) {
    return [];
  }

  const distanceM = normalizeDistanceStreamMeters(distanceRaw, activity.distanceKm);
  if (distanceM.length < 2) {
    return [];
  }

  const timeS = normalizeTimeStreamSeconds(extractStreamArray(streamPayload, ["time", "seconds", "moving_time"]), distanceM.length);
  const hr = normalizeHrStream(extractStreamArray(streamPayload, ["heartrate", "heart_rate", "hr"]), distanceM.length);

  const buckets = new Map();
  function ensureBucket(index) {
    if (!buckets.has(index)) {
      buckets.set(index, { distM: 0, timeS: 0, hrWeightedSum: 0, hrWeight: 0 });
    }
    return buckets.get(index);
  }

  for (let i = 1; i < distanceM.length; i += 1) {
    const prevDist = distanceM[i - 1];
    const curDist = distanceM[i];
    const prevTime = timeS[i - 1];
    const curTime = timeS[i];

    if (!Number.isFinite(prevDist) || !Number.isFinite(curDist) || curDist <= prevDist) {
      continue;
    }

    const distanceDelta = curDist - prevDist;
    const rawTimeDelta = Number.isFinite(curTime) && Number.isFinite(prevTime) ? curTime - prevTime : 1;
    const timeDelta = rawTimeDelta > 0 ? rawTimeDelta : 1;

    let startDist = prevDist;
    let remainingDist = distanceDelta;
    let remainingTime = timeDelta;

    while (remainingDist > 0) {
      const kmIndex = Math.floor(startDist / 1000);
      const kmEnd = (kmIndex + 1) * 1000;
      const distToBoundary = kmEnd - startDist;
      const takeDist = Math.min(remainingDist, distToBoundary);
      const timePart = remainingTime * (takeDist / remainingDist);

      const bucket = ensureBucket(kmIndex);
      bucket.distM += takeDist;
      bucket.timeS += timePart;

      const hrValue = hr[i];
      if (Number.isFinite(hrValue)) {
        bucket.hrWeightedSum += hrValue * timePart;
        bucket.hrWeight += timePart;
      }

      startDist += takeDist;
      remainingDist -= takeDist;
      remainingTime -= timePart;
    }
  }

  const points = [];
  const ordered = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  const lastBucketIndex = ordered.length ? ordered[ordered.length - 1][0] : -1;
  for (const [kmIndex, bucket] of ordered) {
    const isFinalPartialBucket = kmIndex === lastBucketIndex && Number.isFinite(bucket.distM) && bucket.distM >= 200;
    if (
      !Number.isFinite(bucket.distM) ||
      (!isFinalPartialBucket && bucket.distM < 990) ||
      !Number.isFinite(bucket.timeS) ||
      bucket.timeS <= 0
    ) {
      continue;
    }

    const paceMinKm = sanitizePaceMinKm(bucket.timeS / 60 / (bucket.distM / 1000));
    if (paceMinKm === null) {
      continue;
    }

    const avgHrBpm = bucket.hrWeight > 0 ? Number((bucket.hrWeightedSum / bucket.hrWeight).toFixed(1)) : null;
    points.push({
      activityId: activity.id,
      date: activity.date,
      splitKm: kmIndex + 1,
      splitDistanceKm: Number((bucket.distM / 1000).toFixed(3)),
      paceMinKm,
      avgHrBpm
    });
  }

  return points;
}

function buildIntervalPoints(activity, detailPayload) {
  const intervals = Array.isArray(detailPayload?.icu_intervals) ? detailPayload.icu_intervals : [];
  if (!intervals.length) {
    return [];
  }

  const points = [];
  for (let i = 0; i < intervals.length; i += 1) {
    const interval = intervals[i];
    if (!interval || typeof interval !== "object") {
      continue;
    }

    const distanceM = safeNumber(interval.distance);
    const movingTimeS = safeNumber(interval.moving_time ?? interval.elapsed_time);
    const avgHr = safeNumber(interval.average_heartrate ?? interval.average_hr ?? interval.heartrate);
    const distanceKm =
      Number.isFinite(distanceM) && distanceM >= 0 ? Number((Math.max(0, distanceM) / 1000).toFixed(3)) : null;
    const paceMinKm =
      Number.isFinite(movingTimeS) && movingTimeS > 0 && Number.isFinite(distanceKm) && distanceKm > 0
        ? sanitizePaceMinKm(movingTimeS / 60 / distanceKm)
        : null;
    const avgHrBpm =
      Number.isFinite(avgHr) && avgHr >= 30 && avgHr <= 240 ? Number(avgHr.toFixed(1)) : null;

    points.push({
      activityId: activity.id,
      date: activity.date,
      intervalIndex: i + 1,
      intervalType: String(interval.type || ""),
      distanceKm,
      movingTimeSec: Number.isFinite(movingTimeS) && movingTimeS > 0 ? Number(movingTimeS) : null,
      paceMinKm,
      avgHrBpm,
      chartEligible: Number.isFinite(paceMinKm) && paceMinKm > 0 && Number.isFinite(avgHrBpm) && avgHrBpm > 0
    });
  }

  return points;
}

function shouldDerivePerKmSplitsFromStreams(activity, intervalPoints) {
  const usableIntervals = Array.isArray(intervalPoints)
    ? intervalPoints.filter((point) => point && Number.isFinite(Number(point.distanceKm)) && Number(point.distanceKm) > 0)
    : [];
  return usableIntervals.length <= 2;
}

function isRetryableStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function parseRetryAfterMs(headerValue) {
  if (!headerValue) {
    return null;
  }
  const asSeconds = Number(headerValue);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }

  const asDate = Date.parse(headerValue);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchActivityJsonWithRetry(apiKey, url, activityId, label) {
  const auth = Buffer.from(`API_KEY:${apiKey}`, "utf8").toString("base64");
  let lastError = null;

  for (let attempt = 0; attempt <= ACTIVITY_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json"
        }
      });

      if (response.status === 404) {
        return { unsupported: true, payload: null };
      }

      if (!response.ok) {
        const body = await response.text();
        const shortBody = body.length > 200 ? `${body.slice(0, 200)}...` : body;
        const retryable = isRetryableStatus(response.status);
        lastError = new Error(
          `${label} API ${response.status} for activity ${activityId}: ${shortBody || response.statusText}`
        );

        if (!retryable || attempt >= ACTIVITY_FETCH_MAX_RETRIES) {
          throw lastError;
        }

        const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
        const exponentialMs = Math.min(ACTIVITY_FETCH_RETRY_BASE_MS * 2 ** attempt, ACTIVITY_FETCH_RETRY_MAX_MS);
        const waitMs = retryAfterMs !== null ? retryAfterMs : exponentialMs;
        await sleep(waitMs);
        continue;
      }

      return { unsupported: false, payload: await response.json() };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= ACTIVITY_FETCH_MAX_RETRIES) {
        throw lastError;
      }
      const waitMs = Math.min(ACTIVITY_FETCH_RETRY_BASE_MS * 2 ** attempt, ACTIVITY_FETCH_RETRY_MAX_MS);
      await sleep(waitMs);
    }
  }

  throw lastError || new Error(`${label} API failed for activity ${activityId}`);
}

async function fetchActivityWithIntervals(apiKey, activityId) {
  const url = new URL(`https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}`);
  url.searchParams.set("intervals", "true");
  return fetchActivityJsonWithRetry(apiKey, url, activityId, "Activity");
}

async function fetchActivityStreams(apiKey, activityId) {
  const url = new URL(`https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}/streams.json`);
  url.searchParams.set("types", "distance,time,heartrate");
  return fetchActivityJsonWithRetry(apiKey, url, activityId, "Streams");
}

async function enrichActivitiesWithPaceHrPoints(apiKey, activities) {
  let streamsUnsupported = false;
  let rebuiltRuns = 0;
  let pointCount = 0;
  let failedRuns = 0;
  let cacheHits = 0;
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= activities.length) {
        return;
      }

      const activity = activities[index];
      if (!activity || typeof activity !== "object") {
        continue;
      }

      if (
        activity.intervalSourceVersion === INTERVAL_SOURCE_VERSION &&
        Array.isArray(activity.intervalPoints) &&
        activity.splitSourceVersion === SPLIT_SOURCE_VERSION &&
        Array.isArray(activity.splitKmPoints) &&
        activity.metaSourceVersion === ACTIVITY_META_SOURCE_VERSION
      ) {
        cacheHits += 1;
        pointCount += activity.intervalPoints.length + activity.splitKmPoints.length;
        continue;
      }

      const previousState = {
        name: activity.name,
        startDateTime: activity.startDateTime,
        movingTimeSec: activity.movingTimeSec,
        elevationGainM: activity.elevationGainM,
        avgTempC: activity.avgTempC,
        metaSourceVersion: activity.metaSourceVersion,
        intervalPoints: Array.isArray(activity.intervalPoints) ? activity.intervalPoints : [],
        intervalSourceVersion: activity.intervalSourceVersion,
        splitKmPoints: Array.isArray(activity.splitKmPoints) ? activity.splitKmPoints : [],
        splitSourceVersion: activity.splitSourceVersion
      };

      try {
        const { unsupported: detailsUnsupported, payload: detailPayload } = await fetchActivityWithIntervals(apiKey, activity.id);
        if (detailsUnsupported) {
          activity.intervalPoints = [];
          activity.intervalSourceVersion = 0;
          activity.metaSourceVersion = ACTIVITY_META_SOURCE_VERSION;
        } else {
          const detailName = normalizeActivityName(detailPayload, normalizeActivityName(activity, null));
          if (detailName) {
            activity.name = detailName;
          }
          const detailStartDateTime = normalizeActivityStartDateTime(
            detailPayload,
            normalizeActivityStartDateTime(activity, null)
          );
          if (detailStartDateTime) {
            activity.startDateTime = detailStartDateTime;
          }
          activity.movingTimeSec = normalizeMovingTimeSec(detailPayload, normalizeMovingTimeSec(activity, null));
          activity.elevationGainM = normalizeElevationGainM(detailPayload, normalizeElevationGainM(activity, null));
          activity.avgTempC = normalizeAvgTempC(detailPayload, normalizeAvgTempC(activity, null));
          activity.metaSourceVersion = ACTIVITY_META_SOURCE_VERSION;

          const intervalPoints = buildIntervalPoints(activity, detailPayload);
          activity.intervalPoints = intervalPoints;
          activity.intervalSourceVersion = INTERVAL_SOURCE_VERSION;
          pointCount += intervalPoints.length;
        }

        // If interval blocks look coarse (for example one big WORK block), derive per-km points from streams.
        const hasIntervalPoints = Array.isArray(activity.intervalPoints) && activity.intervalPoints.length > 0;
        const shouldDeriveSplits = shouldDerivePerKmSplitsFromStreams(activity, activity.intervalPoints);
        if (hasIntervalPoints && !shouldDeriveSplits) {
          activity.splitKmPoints = [];
          activity.splitSourceVersion = SPLIT_SOURCE_VERSION;
          rebuiltRuns += 1;
          continue;
        }

        const { unsupported: notSupported, payload } = await fetchActivityStreams(apiKey, activity.id);
        if (notSupported) {
          streamsUnsupported = true;
          activity.splitKmPoints = [];
          activity.splitSourceVersion = 0;
          continue;
        }

        const points = buildPerKmSplitPoints(activity, payload);
        activity.splitKmPoints = points;
        activity.splitSourceVersion = SPLIT_SOURCE_VERSION;
        rebuiltRuns += 1;
        pointCount += points.length;
      } catch {
        failedRuns += 1;
        activity.name = previousState.name;
        activity.startDateTime = previousState.startDateTime;
        activity.movingTimeSec = previousState.movingTimeSec;
        activity.elevationGainM = previousState.elevationGainM;
        activity.avgTempC = previousState.avgTempC;
        activity.metaSourceVersion = previousState.metaSourceVersion;
        activity.intervalPoints = previousState.intervalPoints;
        activity.intervalSourceVersion = previousState.intervalSourceVersion;
        activity.splitKmPoints = previousState.splitKmPoints;
        activity.splitSourceVersion = previousState.splitSourceVersion;
      }
    }
  }

  const concurrency = Math.min(SPLIT_FETCH_CONCURRENCY, Math.max(1, activities.length));
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return { pointCount, rebuiltRuns, failedRuns, cacheHits, unsupported: streamsUnsupported };
}

function collectPaceHrPoints(activities) {
  const points = [];

  for (const activity of activities) {
    const intervalPoints = Array.isArray(activity.intervalPoints) ? activity.intervalPoints : [];
    const usableIntervals = intervalPoints.filter(
      (point) =>
        point &&
        (point.chartEligible === true ||
          point.chartEligible === undefined) &&
        Number.isFinite(Number(point.paceMinKm)) &&
        Number(point.paceMinKm) > 0 &&
        Number.isFinite(Number(point.avgHrBpm)) &&
        Number(point.avgHrBpm) > 0
    );

    const splitPoints = Array.isArray(activity.splitKmPoints) ? activity.splitKmPoints : [];
    const usableSplits = splitPoints.filter(
      (point) =>
        point &&
        Number.isFinite(Number(point.paceMinKm)) &&
        Number(point.paceMinKm) > 0 &&
        Number.isFinite(Number(point.avgHrBpm)) &&
        Number(point.avgHrBpm) > 0
    );

    const preferSplits =
      usableSplits.length > 0 && (usableIntervals.length <= 2 || usableSplits.length > usableIntervals.length);

    if (usableIntervals.length && !preferSplits) {
      for (const interval of usableIntervals) {
        points.push({
          source: "interval",
          activityId: activity.id,
          date: activity.date,
          splitKm: Number(interval.intervalIndex ?? 0),
          distanceKm: Number(interval.distanceKm ?? 0),
          paceMinKm: Number(interval.paceMinKm),
          avgHrBpm: Number(interval.avgHrBpm)
        });
      }
      continue;
    }

    if (usableSplits.length) {
      for (const split of usableSplits) {
        points.push({
          source: "split-km",
          activityId: activity.id,
          date: activity.date,
          splitKm: Number(split.splitKm ?? 0),
          distanceKm: Number(split.splitDistanceKm ?? 1),
          paceMinKm: Number(split.paceMinKm),
          avgHrBpm: Number(split.avgHrBpm)
        });
      }
      continue;
    }

    const runPaceOk = activity.paceSourceVersion === PACE_SOURCE_VERSION && Number.isFinite(Number(activity.paceMinKm));
    const runHrOk = Number.isFinite(Number(activity.avgHrBpm));
    if (!runPaceOk || !runHrOk) {
      continue;
    }

    points.push({
      source: "run",
      activityId: activity.id,
      date: activity.date,
      splitKm: null,
      distanceKm: Number(activity.distanceKm ?? 0),
      paceMinKm: Number(activity.paceMinKm),
      avgHrBpm: Number(activity.avgHrBpm)
    });
  }

  return points;
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
    const movingTimeSec = normalizeMovingTimeSec(item, normalizeMovingTimeSec(existingByRawId, null));
    const elevationGainM = normalizeElevationGainM(item, normalizeElevationGainM(existingByRawId, null));
    const avgTempC = normalizeAvgTempC(item, normalizeAvgTempC(existingByRawId, null));
    const startDateTime = normalizeActivityStartDateTime(item, normalizeActivityStartDateTime(existingByRawId, ""));
    if (!startDateTime) {
      continue;
    }
    const date = startDateTime.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      continue;
    }

    const id = String(item.id || `${date}-${Math.random()}`);
    const cached = existingById.get(id);
    const cachedIntervals =
      cached?.intervalSourceVersion === INTERVAL_SOURCE_VERSION && Array.isArray(cached?.intervalPoints) ? cached.intervalPoints : [];
    const cachedSplits =
      cached?.splitSourceVersion === SPLIT_SOURCE_VERSION && Array.isArray(cached?.splitKmPoints) ? cached.splitKmPoints : [];
    const resolvedName = normalizeActivityName(item, normalizeActivityName(cached, null));
    const resolvedStartDateTime = normalizeActivityStartDateTime(item, normalizeActivityStartDateTime(cached, startDateTime));
    const resolvedMovingTimeSec = normalizeMovingTimeSec(item, normalizeMovingTimeSec(cached, movingTimeSec));
    const resolvedElevationGainM = normalizeElevationGainM(item, normalizeElevationGainM(cached, elevationGainM));
    const resolvedAvgTempC = normalizeAvgTempC(item, normalizeAvgTempC(cached, avgTempC));
    const cachedMetaVersion = Number(cached?.metaSourceVersion);
    const resolvedMetaVersion =
      Number.isFinite(cachedMetaVersion) && Math.round(cachedMetaVersion) === ACTIVITY_META_SOURCE_VERSION
        ? ACTIVITY_META_SOURCE_VERSION
        : 0;

    byId.set(id, {
      id,
      date,
      name: resolvedName,
      startDateTime: resolvedStartDateTime,
      movingTimeSec: resolvedMovingTimeSec,
      elevationGainM: resolvedElevationGainM,
      avgTempC: resolvedAvgTempC,
      metaSourceVersion: resolvedMetaVersion,
      type: item.type,
      distanceKm: Number(km.toFixed(3)),
      avgHrBpm,
      paceMinKm,
      paceSourceVersion: PACE_SOURCE_VERSION,
      intervalSourceVersion: cached?.intervalSourceVersion ?? 0,
      intervalPoints: cachedIntervals,
      splitSourceVersion: cached?.splitSourceVersion ?? 0,
      splitKmPoints: cachedSplits
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function computeRollingSeries(activities, daysToShow = 365) {
  if (!activities.length) {
    return { series: [], latest: null };
  }

  const today = parseDateKey(formatDateUTC(new Date()));
  const totalsByDate = new Map();

  for (const activity of activities) {
    const existing = totalsByDate.get(activity.date) ?? 0;
    totalsByDate.set(activity.date, existing + activity.distanceKm);
  }

  const firstDate = parseDateKey(activities[0].date);
  const hasFiniteWindow = Number.isFinite(daysToShow) && daysToShow > 0;
  const chartStart = hasFiniteWindow ? addDaysUTC(today, -Math.round(daysToShow) + 1) : firstDate;
  const fullStart = firstDate < chartStart ? firstDate : chartStart;

  const dates = [];
  const totals = [];

  for (let current = new Date(fullStart); current <= today; current = addDaysUTC(current, 1)) {
    const key = formatDateUTC(current);
    dates.push(key);
    totals.push(totalsByDate.get(key) ?? 0);
  }

  const prefix = [0];
  for (const value of totals) {
    prefix.push(prefix[prefix.length - 1] + value);
  }

  function rollingSum(index, window) {
    const startIndex = Math.max(0, index - window + 1);
    const sum = prefix[index + 1] - prefix[startIndex];
    return Number(sum.toFixed(3));
  }

  function rollingAverageFromSeries(values, index, window) {
    const startIndex = Math.max(0, index - window + 1);
    const points = index - startIndex + 1;

    let sum = 0;
    for (let i = startIndex; i <= index; i += 1) {
      sum += values[i];
    }

    return Number((sum / points).toFixed(3));
  }

  function mean(values) {
    if (!values.length) {
      return 0;
    }

    return values.reduce((acc, value) => acc + value, 0) / values.length;
  }

  const chartIndex = hasFiniteWindow ? Math.max(0, dates.findIndex((d) => d >= formatDateUTC(chartStart))) : 0;

  const series = [];
  const sum7Series = [];
  for (let i = chartIndex; i < dates.length; i += 1) {
    const sum7 = rollingSum(i, 7);
    sum7Series.push(sum7);
    const localIdx = sum7Series.length - 1;

    series.push({
      date: dates[i],
      dayKm: Number(totals[i].toFixed(3)),
      sum7,
      sum7ma30: rollingAverageFromSeries(sum7Series, localIdx, 30),
      sum7ma90: rollingAverageFromSeries(sum7Series, localIdx, 90),
      toleranceKmModel: null,
      sum14: rollingSum(i, 14),
      sum28: rollingSum(i, 28),
      sum30: rollingSum(i, 30),
      sum90: rollingSum(i, 90),
      sum180: rollingSum(i, 180)
    });
  }

  // Build a Garmin-like distance-only tolerance model:
  // update weekly from prior weekly history over all available data.
  // Behavior is intentionally sticky on decreases:
  // - long baseline window (26w) with small recent-week influence
  // - asymmetric rate limits (+10% up, -2% down)
  // - 2-week no-drop grace before applying any decrease
  const weekBuckets = new Map();
  for (let i = 0; i < series.length; i += 1) {
    const point = series[i];
    const weekStart = isoWeekStartKey(point.date);
    if (!weekBuckets.has(weekStart)) {
      weekBuckets.set(weekStart, {
        start: weekStart,
        km: 0,
        indices: []
      });
    }
    const bucket = weekBuckets.get(weekStart);
    bucket.km += point.dayKm;
    bucket.indices.push(i);
  }

  const orderedWeeks = Array.from(weekBuckets.values()).sort((a, b) => a.start.localeCompare(b.start));
  const LONG_WINDOW_WEEKS = 26;
  const RECENT_WINDOW_WEEKS = 4;
  const WEIGHT_LONG = 0.8;
  const WEIGHT_RECENT = 0.2;
  const UP_CAP = 1.1;
  const DOWN_CAP = 0.98;
  const NO_DROP_GRACE_WEEKS = 2;

  let prevTol = null;
  let downwardPressureStreak = 0;
  for (let i = 0; i < orderedWeeks.length; i += 1) {
    const currentWeek = orderedWeeks[i];
    let tol;

    if (i === 0) {
      tol = currentWeek.km;
    } else {
      const history = orderedWeeks.slice(0, i).map((entry) => entry.km);
      const recent = orderedWeeks.slice(Math.max(0, i - RECENT_WINDOW_WEEKS), i).map((entry) => entry.km);
      const long = orderedWeeks.slice(Math.max(0, i - LONG_WINDOW_WEEKS), i).map((entry) => entry.km);

      const recentMean = mean(recent.length ? recent : history);
      const longMean = mean(long.length ? long : history);
      const base = WEIGHT_LONG * longMean + WEIGHT_RECENT * recentMean;
      if (prevTol === null) {
        tol = base;
      } else {
        if (base >= prevTol) {
          downwardPressureStreak = 0;
          tol = Math.min(prevTol * UP_CAP, base);
        } else {
          downwardPressureStreak += 1;
          if (downwardPressureStreak <= NO_DROP_GRACE_WEEKS) {
            tol = prevTol;
          } else {
            tol = Math.max(prevTol * DOWN_CAP, base);
          }
        }
      }
    }

    prevTol = Number(Math.max(0, tol).toFixed(3));
    for (const index of currentWeek.indices) {
      series[index].toleranceKmModel = prevTol;
    }
  }

  const latest = series[series.length - 1] ?? null;
  return { series, latest };
}

function baselineStatusFromValues(current, baseline) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline) || baseline <= 0) {
    return "n/a";
  }

  const deltaPct = (current - baseline) / baseline;
  if (current > baseline * 1.1) {
    return "above cap";
  }
  if (deltaPct <= -0.05) {
    return "below baseline";
  }
  if (deltaPct >= 0.05) {
    return "above baseline";
  }
  return "near baseline";
}

async function fetchIntervalsActivities(apiKey, lookbackDays, existingById = new Map()) {
  const newestDate = formatDateUTC(new Date());
  const oldestDate =
    Number.isFinite(lookbackDays) && lookbackDays > 0
      ? formatDateUTC(addDaysUTC(parseDateKey(newestDate), -Math.round(lookbackDays)))
      : "1970-01-01";
  return fetchIntervalsActivitiesInRange(apiKey, oldestDate, newestDate, existingById);
}

async function fetchIntervalsActivitiesInRange(apiKey, oldestDate, newestDate, existingById = new Map()) {
  const url = new URL("https://intervals.icu/api/v1/athlete/0/activities");
  url.searchParams.set("oldest", oldestDate);
  url.searchParams.set("newest", newestDate);

  const auth = Buffer.from(`API_KEY:${apiKey}`, "utf8").toString("base64");

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    const shortBody = body.length > 400 ? `${body.slice(0, 400)}...` : body;
    throw new Error(`Intervals.icu API ${response.status}: ${shortBody || response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Intervals.icu response format.");
  }

  return normalizeActivities(payload, existingById);
}

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
  const mode = data?.lookbackMode === "all" || data?.lookbackDays === "all" ? "all" : "days";
  const days = mode === "all" ? null : normalizeLookbackDaysValue(data?.lookbackDays, 365);
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

function deriveIncrementalOldestDate(currentData, previousActivities, fallbackLookbackDays, newestDate) {
  const syncedAtMs = Date.parse(String(currentData?.syncedAt || ""));
  const latestExistingDate = latestActivityDateKey(previousActivities);
  let anchorDate = null;

  if (Number.isFinite(syncedAtMs)) {
    anchorDate = formatDateUTC(new Date(syncedAtMs));
  } else if (latestExistingDate) {
    anchorDate = latestExistingDate;
  }

  if (anchorDate && isDateKey(anchorDate)) {
    return formatDateUTC(addDaysUTC(parseDateKey(anchorDate), -INCREMENTAL_ROLLING_BACKFILL_DAYS));
  }

  if (Number.isFinite(fallbackLookbackDays) && fallbackLookbackDays > 0) {
    return formatDateUTC(addDaysUTC(parseDateKey(newestDate), -Math.round(fallbackLookbackDays)));
  }

  return "1970-01-01";
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

async function handleApi(req, res, url) {
  if (url.pathname === "/api/dev/reload-meta" && req.method === "GET") {
    return jsonResponse(res, 200, {
      enabled: DEV_LIVE_RELOAD_ENABLED,
      token: DEV_LIVE_RELOAD_ENABLED ? DEV_RELOAD_TOKEN : null
    });
  }

  if (url.pathname === "/api/dev/reload-events" && req.method === "GET") {
    if (!DEV_LIVE_RELOAD_ENABLED) {
      return jsonResponse(res, 404, { error: "Not found." });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const sendReloadToken = () => {
      writeSseEvent(res, "reload-token", { token: DEV_RELOAD_TOKEN, at: new Date().toISOString() });
    };
    sendReloadToken();

    const heartbeatMs = 20_000;
    const heartbeat = setInterval(() => {
      writeSseEvent(res, "ping", { at: new Date().toISOString() });
    }, heartbeatMs);

    req.on("close", () => {
      clearInterval(heartbeat);
    });
    req.on("aborted", () => {
      clearInterval(heartbeat);
    });
    return;
  }

  if (url.pathname === "/api/settings" && req.method === "GET") {
    const settings = await readJson(SETTINGS_FILE, { apiKey: "" });
    const hasApiKey = typeof settings.apiKey === "string" && settings.apiKey.length > 0;
    return jsonResponse(res, 200, { hasApiKey });
  }

  if (url.pathname === "/api/settings" && req.method === "PUT") {
    try {
      const body = await parseJsonBody(req);
      const apiKey = String(body.apiKey || "").trim();

      await writeJson(SETTINGS_FILE, { apiKey });
      return jsonResponse(res, 200, { ok: true, hasApiKey: apiKey.length > 0 });
    } catch {
      return jsonResponse(res, 400, { error: "Invalid JSON body." });
    }
  }

  if (url.pathname === "/api/sync" && req.method === "POST") {
    const settings = await readJson(SETTINGS_FILE, { apiKey: "" });
    const apiKey = String(settings.apiKey || "").trim();

    if (!apiKey) {
      return jsonResponse(res, 400, { error: "Missing Intervals.icu API key. Save it in settings first." });
    }

    let body = {};
    try {
      body = await parseJsonBody(req);
    } catch {
      return jsonResponse(res, 400, { error: "Invalid JSON body." });
    }

    const requestedMode = String(body.mode || "").toLowerCase();
    const requested = body.lookbackDays;
    const wantsExplicitRange = requested === "all" || Number.isFinite(Number(requested));
    const syncMode = requestedMode === "range" || requestedMode === "incremental"
      ? requestedMode
      : wantsExplicitRange
        ? "range"
        : "incremental";
    const requestedLookbackDays = normalizeLookbackDaysValue(requested, 365);
    const requestedLookbackMode = requested === "all" ? "all" : "days";

    try {
      const currentData = await readJson(ACTIVITIES_FILE, { syncedAt: null, lookbackMode: "days", lookbackDays: 365, activities: [] });
      const previousActivities = Array.isArray(currentData.activities) ? currentData.activities : [];
      const previousById = new Map(previousActivities.map((activity) => [String(activity.id || ""), activity]));

      const newestDate = formatDateUTC(new Date());
      let activities = [];
      let fetchedActivities = [];
      let lookbackMode = requestedLookbackMode;
      let lookbackDays = requestedLookbackDays;
      let syncOldestDate = "1970-01-01";
      let syncNewestDate = newestDate;

      if (syncMode === "incremental") {
        const storedLookback = resolveStoredLookbackInfo(currentData);
        lookbackMode = storedLookback.lookbackMode;
        lookbackDays = storedLookback.lookbackDays;

        if (lookbackMode !== "all" && !Number.isFinite(lookbackDays)) {
          lookbackMode = requestedLookbackMode;
          lookbackDays = requestedLookbackDays;
        }

        syncOldestDate = deriveIncrementalOldestDate(currentData, previousActivities, requestedLookbackDays, newestDate);
        fetchedActivities = await fetchIntervalsActivitiesInRange(apiKey, syncOldestDate, syncNewestDate, previousById);
        activities = mergeActivitiesById(previousActivities, fetchedActivities);
      } else {
        syncOldestDate =
          Number.isFinite(lookbackDays) && lookbackDays > 0
            ? formatDateUTC(addDaysUTC(parseDateKey(newestDate), -Math.round(lookbackDays)))
            : "1970-01-01";
        fetchedActivities = await fetchIntervalsActivitiesInRange(apiKey, syncOldestDate, syncNewestDate, previousById);
        activities = fetchedActivities;
      }

      const splitStats = await enrichActivitiesWithPaceHrPoints(apiKey, activities);
      const payload = {
        syncedAt: new Date().toISOString(),
        lookbackMode,
        lookbackDays,
        activities
      };

      await writeJson(ACTIVITIES_FILE, payload);

      return jsonResponse(res, 200, {
        ok: true,
        syncMode,
        syncOldestDate,
        syncNewestDate,
        syncedAt: payload.syncedAt,
        count: activities.length,
        fetchedCount: fetchedActivities.length,
        splitPoints: splitStats.pointCount,
        splitRunsRebuilt: splitStats.rebuiltRuns,
        splitRunsCached: splitStats.cacheHits,
        splitRunsFailed: splitStats.failedRuns,
        splitUnsupported: splitStats.unsupported,
        lookbackDays: lookbackMode === "all" ? "all" : lookbackDays
      });
    } catch (error) {
      return jsonResponse(res, 502, { error: error.message || "Sync failed." });
    }
  }

  if (url.pathname === "/api/series" && req.method === "GET") {
    const data = await readJson(ACTIVITIES_FILE, { syncedAt: null, lookbackMode: "days", lookbackDays: 365, activities: [] });
    const activities = Array.isArray(data.activities) ? data.activities : [];
    const lookbackMode = data.lookbackMode === "all" || data.lookbackDays === "all" ? "all" : "days";
    const requestedLookback = Number(data.lookbackDays ?? 365);
    const lookbackDays =
      lookbackMode === "all"
        ? null
        : Number.isFinite(requestedLookback)
          ? Math.max(30, Math.min(Math.round(requestedLookback), 3650))
          : 365;
    const { series, latest } = computeRollingSeries(activities, lookbackDays);
    const paceHrPoints = collectPaceHrPoints(activities);

    return jsonResponse(res, 200, {
      syncedAt: data.syncedAt || null,
      activityCount: activities.length,
      lookbackDays: lookbackMode === "all" ? "all" : lookbackDays,
      paceHrPoints,
      runs: activities.map((activity) => ({
        id: activity.id,
        date: activity.date,
        name: typeof activity.name === "string" && activity.name.trim().length ? activity.name.trim() : null,
        startDateTime: typeof activity.startDateTime === "string" && activity.startDateTime ? activity.startDateTime : null,
        type: activity.type,
        distanceKm: Number(activity.distanceKm ?? 0),
        movingTimeSec: Number.isFinite(Number(activity.movingTimeSec)) ? Number(activity.movingTimeSec) : null,
        elevationGainM: Number.isFinite(Number(activity.elevationGainM)) ? Number(activity.elevationGainM) : null,
        avgTempC: Number.isFinite(Number(activity.avgTempC)) ? Number(activity.avgTempC) : null,
        avgHrBpm: Number.isFinite(Number(activity.avgHrBpm)) ? Number(activity.avgHrBpm) : null,
        paceMinKm:
          activity.paceSourceVersion === PACE_SOURCE_VERSION && Number.isFinite(Number(activity.paceMinKm))
            ? Number(activity.paceMinKm)
            : null
      })),
      series,
      latest
    });
  }

  const activityDetailMatch = url.pathname.match(/^\/api\/activity\/([^/]+)$/);
  if (activityDetailMatch && req.method === "GET") {
    let activityId = "";
    try {
      activityId = decodeURIComponent(activityDetailMatch[1] || "").trim();
    } catch {
      return jsonResponse(res, 400, { error: "Invalid activity id." });
    }

    if (!activityId) {
      return jsonResponse(res, 400, { error: "Missing activity id." });
    }

    const data = await readJson(ACTIVITIES_FILE, { syncedAt: null, lookbackMode: "days", lookbackDays: 365, activities: [] });
    const activities = Array.isArray(data.activities) ? data.activities : [];
    const activity = activities.find((item) => String(item?.id || "") === activityId);
    if (!activity) {
      return jsonResponse(res, 404, { error: "Activity not found." });
    }

    const lookbackMode = data.lookbackMode === "all" || data.lookbackDays === "all" ? "all" : "days";
    const requestedLookback = Number(data.lookbackDays ?? 365);
    const lookbackDays =
      lookbackMode === "all"
        ? null
        : Number.isFinite(requestedLookback)
          ? Math.max(30, Math.min(Math.round(requestedLookback), 3650))
          : 365;
    const { series } = computeRollingSeries(activities, lookbackDays);
    const seriesByDate = new Map(series.map((item) => [String(item?.date || ""), item]));
    const baselineItem = seriesByDate.get(String(activity?.date || ""));

    const sum7 = baselineItem && Number.isFinite(Number(baselineItem.sum7)) ? Number(baselineItem.sum7) : null;
    const sum7ma90 = baselineItem && Number.isFinite(Number(baselineItem.sum7ma90)) ? Number(baselineItem.sum7ma90) : null;
    const capKm = Number.isFinite(sum7ma90) && sum7ma90 > 0 ? Number((sum7ma90 * 1.1).toFixed(3)) : null;
    const headroomKm =
      Number.isFinite(capKm) && Number.isFinite(sum7) ? Number((capKm - sum7).toFixed(3)) : null;
    const deltaKm =
      Number.isFinite(sum7) && Number.isFinite(sum7ma90) && sum7ma90 > 0 ? Number((sum7 - sum7ma90).toFixed(3)) : null;
    const deltaPct =
      Number.isFinite(deltaKm) && Number.isFinite(sum7ma90) && sum7ma90 > 0 ? Number((deltaKm / sum7ma90).toFixed(4)) : null;
    const baselineStatus =
      Number.isFinite(sum7) && Number.isFinite(sum7ma90) && sum7ma90 > 0
        ? baselineStatusFromValues(sum7, sum7ma90)
        : "n/a";

    return jsonResponse(res, 200, {
      summary: {
        id: activity.id,
        date: isDateKey(activity.date) ? activity.date : null,
        name: typeof activity.name === "string" && activity.name.trim().length ? activity.name.trim() : null,
        startDateTime: typeof activity.startDateTime === "string" && activity.startDateTime ? activity.startDateTime : null,
        type: activity.type || null,
        distanceKm: Number.isFinite(Number(activity.distanceKm)) ? Number(activity.distanceKm) : null,
        movingTimeSec: Number.isFinite(Number(activity.movingTimeSec)) ? Number(activity.movingTimeSec) : null,
        paceMinKm:
          activity.paceSourceVersion === PACE_SOURCE_VERSION && Number.isFinite(Number(activity.paceMinKm))
            ? Number(activity.paceMinKm)
            : null,
        avgHrBpm: Number.isFinite(Number(activity.avgHrBpm)) ? Number(activity.avgHrBpm) : null,
        elevationGainM: Number.isFinite(Number(activity.elevationGainM)) ? Number(activity.elevationGainM) : null,
        avgTempC: Number.isFinite(Number(activity.avgTempC)) ? Number(activity.avgTempC) : null
      },
      intervalPoints: Array.isArray(activity.intervalPoints) ? activity.intervalPoints : [],
      splitKmPoints: Array.isArray(activity.splitKmPoints) ? activity.splitKmPoints : [],
      baselineContext: {
        date: isDateKey(activity.date) ? activity.date : null,
        sum7,
        sum7ma90,
        capKm,
        headroomKm,
        deltaKm,
        deltaPct,
        status: baselineStatus
      }
    });
  }

  return false;
}

async function serveStatic(req, res, url) {
  const routePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = path.normalize(path.join(PUBLIC_DIR, routePath));

  if (!resolved.startsWith(PUBLIC_DIR)) {
    textResponse(res, 400, "Invalid path");
    return true;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      return false;
    }

    const ext = path.extname(resolved);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.readFile(resolved);

    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

async function start() {
  await ensureDataFiles();

  const server = http.createServer(async (req, res) => {
    try {
      if (!req.url || !req.method) {
        textResponse(res, 400, "Bad request");
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

      if (url.pathname.startsWith("/api/")) {
        const handled = await handleApi(req, res, url);
        if (handled !== false) {
          return;
        }
      }

      const served = await serveStatic(req, res, url);
      if (served) {
        return;
      }

      textResponse(res, 404, "Not found");
    } catch (error) {
      textResponse(res, 500, `Server error: ${error.message || "unknown error"}`);
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Fitboard running at http://${HOST}:${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
