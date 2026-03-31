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
const ACTIVITY_META_SOURCE_VERSION = 3;
const DETAIL_STREAM_SOURCE_VERSION = 2;
const HR_ZONE_COUNT = 5;
const DEFAULT_LTHR_ZONE_EDGE_PCTS = [85, 90, 95, 100];
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

function blankHrZoneOverrideRows() {
  return Array.from({ length: HR_ZONE_COUNT }, (_, idx) => ({
    label: `Z${idx + 1}`,
    minBpm: null,
    maxBpm: null
  }));
}

function defaultSettings() {
  return {
    apiKey: "",
    runningThresholdHrOverride: null,
    hrZonesRunningOverride: blankHrZoneOverrideRows()
  };
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await writeJson(SETTINGS_FILE, defaultSettings());
  }

  try {
    await fs.access(ACTIVITIES_FILE);
  } catch {
    await writeJson(ACTIVITIES_FILE, {
      syncedAt: null,
      lookbackDays: 365,
      runningThresholdHr: null,
      hrZonesRunning: [],
      activities: []
    });
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
      activity.hr_max
    ];

    for (const value of candidates) {
      const bpm = Number(value);
      if (Number.isFinite(bpm) && bpm >= 30 && bpm <= 260) {
        return Number(bpm.toFixed(1));
      }
    }
  }

  const fallbackValue = Number(fallback);
  if (Number.isFinite(fallbackValue) && fallbackValue >= 30 && fallbackValue <= 260) {
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
      activity.effort
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

function normalizeThresholdOverride(value) {
  const numeric = safeNumber(value);
  if (numeric === null) {
    return null;
  }
  if (numeric < 80 || numeric > 240) {
    throw new Error("Running threshold HR override must be between 80 and 240 bpm.");
  }
  return Number(numeric.toFixed(1));
}

function normalizeHrZoneOverrideRows(raw) {
  const rows = blankHrZoneOverrideRows();
  if (!Array.isArray(raw)) {
    return rows;
  }
  for (let i = 0; i < HR_ZONE_COUNT && i < raw.length; i += 1) {
    const entry = raw[i] && typeof raw[i] === "object" ? raw[i] : {};
    const minValue = safeNumber(entry.minBpm ?? entry.min ?? entry.lower ?? entry.from ?? null);
    const maxValue = safeNumber(entry.maxBpm ?? entry.max ?? entry.upper ?? entry.to ?? null);
    if (minValue !== null && (minValue < 0 || minValue > 260)) {
      throw new Error(`Zone ${i + 1} min override must be between 0 and 260 bpm.`);
    }
    if (maxValue !== null && (maxValue < 0 || maxValue > 260)) {
      throw new Error(`Zone ${i + 1} max override must be between 0 and 260 bpm.`);
    }
    rows[i] = {
      label: `Z${i + 1}`,
      minBpm: minValue === null ? null : Number(minValue.toFixed(1)),
      maxBpm: maxValue === null ? null : Number(maxValue.toFixed(1))
    };
  }
  return rows;
}

function hasAnyHrZoneOverrides(rows) {
  return Array.isArray(rows) && rows.some((row) => safeNumber(row?.minBpm) !== null || safeNumber(row?.maxBpm) !== null);
}

function buildZonesFromOverrideRows(rows) {
  if (!Array.isArray(rows) || rows.length < HR_ZONE_COUNT) {
    return [];
  }
  const zones = rows.slice(0, HR_ZONE_COUNT).map((row, idx) => {
    const minValue = safeNumber(row?.minBpm);
    const maxValue = safeNumber(row?.maxBpm);
    return {
      label: `Z${idx + 1}`,
      minBpm: minValue !== null ? Number(minValue.toFixed(1)) : idx === 0 ? 0 : null,
      maxBpm: maxValue !== null ? Number(maxValue.toFixed(1)) : idx === HR_ZONE_COUNT - 1 ? null : null
    };
  });
  return isValidHrZones(zones) ? zones : [];
}

function applyHrZoneOverrides(baseZones, rows) {
  if (!Array.isArray(baseZones) || baseZones.length < HR_ZONE_COUNT) {
    return [];
  }
  const normalizedRows = normalizeHrZoneOverrideRows(rows);
  const merged = baseZones.slice(0, HR_ZONE_COUNT).map((zone, idx) => ({
    label: zone?.label || `Z${idx + 1}`,
    minBpm: safeNumber(normalizedRows[idx]?.minBpm) !== null ? Number(normalizedRows[idx].minBpm) : Number(zone.minBpm),
    maxBpm: safeNumber(normalizedRows[idx]?.maxBpm) !== null ? Number(normalizedRows[idx].maxBpm) : zone.maxBpm
  }));
  return isValidHrZones(merged) ? merged : [];
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    apiKey: typeof source.apiKey === "string" ? source.apiKey.trim() : "",
    runningThresholdHrOverride: normalizeThresholdOverride(source.runningThresholdHrOverride),
    hrZonesRunningOverride: normalizeHrZoneOverrideRows(source.hrZonesRunningOverride)
  };
}

function resolveRunningHrZoneConfiguration(defaultThresholdHr, settings) {
  const normalizedSettings = normalizeSettings(settings);
  const defaultThreshold = safeNumber(defaultThresholdHr);
  const thresholdOverride = safeNumber(normalizedSettings.runningThresholdHrOverride);
  const effectiveThreshold = thresholdOverride !== null ? Number(thresholdOverride) : defaultThreshold;
  const defaultZones = buildFiveZonesFromThresholdHr(defaultThreshold);
  const thresholdZones = buildFiveZonesFromThresholdHr(effectiveThreshold);
  const zoneOverrides = normalizeHrZoneOverrideRows(normalizedSettings.hrZonesRunningOverride);
  let effectiveZones = [];
  if (thresholdZones.length) {
    effectiveZones = hasAnyHrZoneOverrides(zoneOverrides) ? applyHrZoneOverrides(thresholdZones, zoneOverrides) : thresholdZones;
  } else if (hasAnyHrZoneOverrides(zoneOverrides)) {
    effectiveZones = buildZonesFromOverrideRows(zoneOverrides);
  }
  return {
    defaultRunningThresholdHr: defaultThreshold === null ? null : Number(defaultThreshold.toFixed(1)),
    runningThresholdHrOverride: thresholdOverride === null ? null : Number(thresholdOverride.toFixed(1)),
    runningThresholdHr: effectiveThreshold === null ? null : Number(effectiveThreshold.toFixed(1)),
    defaultHrZonesRunning: defaultZones,
    hrZonesRunningOverride: zoneOverrides,
    hrZonesRunning: effectiveZones
  };
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

function normalizeScalarStream(raw, targetLength, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const values = raw.map((value) => safeNumber(value));
  if (values.length !== targetLength) {
    return Array.from({ length: targetLength }, () => null);
  }

  return values.map((value) => (value !== null && value >= min && value <= max ? value : null));
}

function normalizeCadenceStream(cadenceRaw, targetLength) {
  const values = normalizeScalarStream(cadenceRaw, targetLength, { min: 20, max: 160 });
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return values;
  }

  const maxValue = Math.max(...finite);
  const multiplier = maxValue <= 130 ? 2 : 1;
  return values.map((value) => (Number.isFinite(value) ? Number((value * multiplier).toFixed(1)) : null));
}

function normalizeAltitudeStream(altitudeRaw, targetLength) {
  return normalizeScalarStream(altitudeRaw, targetLength, { min: -1000, max: 10000 }).map((value) =>
    Number.isFinite(value) ? Number(value.toFixed(1)) : null
  );
}

function buildActivityDetailStreamPoints(activity, streamPayload) {
  const distanceRaw = extractStreamArray(streamPayload, ["distance", "dist"]);
  const timeRaw = extractStreamArray(streamPayload, ["time", "seconds", "moving_time"]);
  const hrRaw = extractStreamArray(streamPayload, ["heartrate", "heart_rate", "hr"]);
  const cadenceRaw = extractStreamArray(streamPayload, ["cadence", "run_cadence", "steps_per_minute"]);
  const altitudeRaw = extractStreamArray(streamPayload, ["altitude", "elevation", "alt", "ele"]);
  const targetLength = Math.max(distanceRaw.length, timeRaw.length, hrRaw.length, cadenceRaw.length, altitudeRaw.length);
  if (targetLength < 2 || !timeRaw.length || !distanceRaw.length) {
    return [];
  }

  const distanceM = normalizeDistanceStreamMeters(distanceRaw, activity.distanceKm);
  if (distanceM.length !== targetLength) {
    return [];
  }

  const timeS = normalizeTimeStreamSeconds(timeRaw, targetLength);
  const hr = normalizeHrStream(hrRaw, targetLength);
  const cadence = normalizeCadenceStream(cadenceRaw, targetLength);
  const altitude = normalizeAltitudeStream(altitudeRaw, targetLength);
  const rawPace = Array.from({ length: targetLength }, () => null);

  for (let i = 1; i < targetLength; i += 1) {
    const prevTime = Number(timeS[i - 1]);
    const curTime = Number(timeS[i]);
    const prevDist = Number(distanceM[i - 1]);
    const curDist = Number(distanceM[i]);
    const dt = curTime - prevTime;
    const dd = curDist - prevDist;
    if (!Number.isFinite(dt) || !Number.isFinite(dd) || dt <= 0 || dd <= 0.5) {
      continue;
    }
    rawPace[i] = sanitizePaceMinKm((dt / 60) / (dd / 1000));
  }

  const smoothedPace = rawPace.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 2); j <= Math.min(targetLength - 1, i + 2); j += 1) {
      const value = rawPace[j];
      if (!Number.isFinite(value)) {
        continue;
      }
      sum += value;
      count += 1;
    }
    if (!count) {
      return null;
    }
    return sanitizePaceMinKm(sum / count);
  });

  const points = [];

  for (let i = 0; i < targetLength; i += 1) {
    const elapsedSec = Number.isFinite(timeS[i]) ? Math.max(0, timeS[i]) : i;

    points.push({
      elapsedSec: Number(elapsedSec.toFixed(1)),
      distanceKm: Number((Number(distanceM[i]) / 1000).toFixed(3)),
      paceMinKm: smoothedPace[i],
      hrBpm: Number.isFinite(hr[i]) ? Number(hr[i].toFixed(1)) : null,
      cadenceSpm: Number.isFinite(cadence[i]) ? Number(cadence[i].toFixed(1)) : null,
      altitudeM: Number.isFinite(altitude[i]) ? Number(altitude[i].toFixed(1)) : null
    });
  }

  if (points.length <= 1200) {
    return points;
  }

  const reduced = [];
  const lastIndex = points.length - 1;
  for (let i = 0; i < 1200; i += 1) {
    const sourceIndex = Math.round((i / 1199) * lastIndex);
    reduced.push(points[sourceIndex]);
  }
  return reduced;
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
  const endpoint = `${label} ${url.toString()}`;

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
        console.error(
          `[fitboard] ${endpoint} failed (attempt ${attempt + 1}/${ACTIVITY_FETCH_MAX_RETRIES + 1})` +
            ` status=${response.status} retryable=${retryable} target=${activityId} body=${shortBody || response.statusText}`
        );
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
      console.error(
        `[fitboard] ${endpoint} request error (attempt ${attempt + 1}/${ACTIVITY_FETCH_MAX_RETRIES + 1})` +
          ` target=${activityId}: ${lastError.message}`
      );
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

async function fetchAthleteProfile(apiKey) {
  const url = new URL("https://intervals.icu/api/v1/athlete/0");
  return fetchActivityJsonWithRetry(apiKey, url, "athlete", "Athlete");
}

async function fetchActivityStreams(apiKey, activityId) {
  const url = new URL(`https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}/streams.json`);
  url.searchParams.set("types", "distance,time,heartrate,cadence,altitude");
  return fetchActivityJsonWithRetry(apiKey, url, activityId, "Streams");
}

function zoneEdgeListToZones(edges) {
  const thresholds = Array.from(
    new Set(
      edges
        .map((value) => safeNumber(value))
        .filter((value) => value !== null && value > 0 && value < 260)
        .map((value) => Number(value.toFixed(1)))
    )
  ).sort((a, b) => a - b);
  if (thresholds.length < HR_ZONE_COUNT - 1) {
    return [];
  }

  // Intervals may provide more than 5 zones (e.g. 7 boundaries).
  // For 5-zone charts, anchor to the lower boundaries so Z1 does not become overly wide.
  const chosen = thresholds.slice(0, HR_ZONE_COUNT - 1);
  const zones = [];
  let min = 0;
  for (let i = 0; i < HR_ZONE_COUNT; i += 1) {
    const max = i < chosen.length ? chosen[i] : null;
    zones.push({
      label: `Z${i + 1}`,
      minBpm: Number(min.toFixed(1)),
      maxBpm: Number.isFinite(max) ? Number(max.toFixed(1)) : null
    });
    if (Number.isFinite(max)) {
      min = max;
    }
  }
  return zones;
}

function isValidHrZones(zones) {
  if (!Array.isArray(zones) || zones.length < HR_ZONE_COUNT) {
    return false;
  }
  const normalized = zones.slice(0, HR_ZONE_COUNT);
  let previousMin = -Infinity;
  const finiteMax = [];
  for (const zone of normalized) {
    const minBpm = safeNumber(zone?.minBpm);
    const maxBpm = safeNumber(zone?.maxBpm);
    if (!Number.isFinite(minBpm)) {
      return false;
    }
    if (minBpm < previousMin) {
      return false;
    }
    previousMin = minBpm;
    if (Number.isFinite(maxBpm)) {
      finiteMax.push(maxBpm);
      if (maxBpm < minBpm) {
        return false;
      }
    }
  }
  if (finiteMax.length < HR_ZONE_COUNT - 1) {
    return false;
  }
  const firstBoundary = finiteMax[0];
  const topBoundary = finiteMax[finiteMax.length - 1];
  return firstBoundary >= 80 && topBoundary >= 130 && topBoundary <= 240;
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
    payload.running?.lthr
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
        (lowered.includes("lthr") || (lowered.includes("threshold") && lowered.includes("hr")) || lowered.includes("heart_rate_threshold")) &&
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

function convertPercentEdgesToBpmZones(percentEdges, thresholdHrBpm) {
  if (!Number.isFinite(thresholdHrBpm) || thresholdHrBpm < 120 || thresholdHrBpm > 240) {
    return [];
  }
  const bpmEdges = percentEdges
    .map((value) => safeNumber(value))
    .filter((value) => value !== null && value > 0 && value <= 100)
    .map((pct) => Number(((pct / 100) * thresholdHrBpm).toFixed(1)));
  const zones = zoneEdgeListToZones(bpmEdges);
  return isValidHrZones(zones) ? zones : [];
}

function buildFiveZonesFromThresholdHr(thresholdHrBpm) {
  if (!Number.isFinite(thresholdHrBpm) || thresholdHrBpm < 120 || thresholdHrBpm > 240) {
    return [];
  }
  return convertPercentEdgesToBpmZones(DEFAULT_LTHR_ZONE_EDGE_PCTS, thresholdHrBpm);
}

function hrZoneIndexForBpm(zones, bpm) {
  if (!Array.isArray(zones) || !zones.length || !Number.isFinite(bpm)) {
    return -1;
  }
  for (let i = 0; i < zones.length; i += 1) {
    const zone = zones[i];
    const minBpm = safeNumber(zone?.minBpm);
    const maxBpm = safeNumber(zone?.maxBpm);
    const minOk = Number.isFinite(minBpm) ? bpm >= minBpm : true;
    const maxOk = Number.isFinite(maxBpm) ? bpm < maxBpm : true;
    if (minOk && maxOk) {
      return i;
    }
  }
  return zones.length - 1;
}

function computeRunHrZoneDurations(activity, zones) {
  if (!Array.isArray(zones) || !zones.length) {
    return [];
  }
  const zoneSeconds = Array.from({ length: zones.length }, () => 0);

  const streamPoints = Array.isArray(activity?.detailStreamPoints) ? activity.detailStreamPoints : [];
  if (streamPoints.length >= 2) {
    for (let i = 1; i < streamPoints.length; i += 1) {
      const prevSec = Number(streamPoints[i - 1]?.elapsedSec);
      const curSec = Number(streamPoints[i]?.elapsedSec);
      const dt = curSec - prevSec;
      if (!Number.isFinite(dt) || dt <= 0 || dt > 180) {
        continue;
      }
      const hrBpm = Number(streamPoints[i]?.hrBpm);
      const zoneIndex = hrZoneIndexForBpm(zones, hrBpm);
      if (zoneIndex >= 0) {
        zoneSeconds[zoneIndex] += dt;
      }
    }
  }

  if (zoneSeconds.some((value) => value > 0)) {
    return zoneSeconds.map((value) => Math.max(0, Math.round(value)));
  }

  const intervalPoints = Array.isArray(activity?.intervalPoints) ? activity.intervalPoints : [];
  if (intervalPoints.length) {
    for (const interval of intervalPoints) {
      const seconds = Number(interval?.movingTimeSec);
      const hrBpm = Number(interval?.avgHrBpm);
      if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(hrBpm)) {
        continue;
      }
      const zoneIndex = hrZoneIndexForBpm(zones, hrBpm);
      if (zoneIndex >= 0) {
        zoneSeconds[zoneIndex] += seconds;
      }
    }
  }

  if (zoneSeconds.some((value) => value > 0)) {
    return zoneSeconds.map((value) => Math.max(0, Math.round(value)));
  }

  const movingTimeSec = Number(activity?.movingTimeSec);
  const avgHrBpm = Number(activity?.avgHrBpm);
  if (Number.isFinite(movingTimeSec) && movingTimeSec > 0 && Number.isFinite(avgHrBpm)) {
    const zoneIndex = hrZoneIndexForBpm(zones, avgHrBpm);
    if (zoneIndex >= 0) {
      zoneSeconds[zoneIndex] = Math.round(movingTimeSec);
    }
  }
  return zoneSeconds.map((value) => Math.max(0, Math.round(value)));
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
        maxHrBpm: activity.maxHrBpm,
        load: activity.load,
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
          activity.maxHrBpm = normalizeMaxHrBpm(detailPayload, normalizeMaxHrBpm(activity, null));
          activity.load = normalizeLoad(detailPayload, normalizeLoad(activity, null));
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
    const maxHrBpm = normalizeMaxHrBpm(item, normalizeMaxHrBpm(existingByRawId, null));
    const load = normalizeLoad(item, normalizeLoad(existingByRawId, null));
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
    const cachedDetailStreams =
      cached?.detailStreamSourceVersion === DETAIL_STREAM_SOURCE_VERSION && Array.isArray(cached?.detailStreamPoints)
        ? cached.detailStreamPoints
        : [];
    const resolvedName = normalizeActivityName(item, normalizeActivityName(cached, null));
    const resolvedStartDateTime = normalizeActivityStartDateTime(item, normalizeActivityStartDateTime(cached, startDateTime));
    const resolvedMovingTimeSec = normalizeMovingTimeSec(item, normalizeMovingTimeSec(cached, movingTimeSec));
    const resolvedElevationGainM = normalizeElevationGainM(item, normalizeElevationGainM(cached, elevationGainM));
    const resolvedAvgTempC = normalizeAvgTempC(item, normalizeAvgTempC(cached, avgTempC));
    const resolvedMaxHrBpm = normalizeMaxHrBpm(item, normalizeMaxHrBpm(cached, maxHrBpm));
    const resolvedLoad = normalizeLoad(item, normalizeLoad(cached, load));
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
      maxHrBpm: resolvedMaxHrBpm,
      load: resolvedLoad,
      metaSourceVersion: resolvedMetaVersion,
      type: item.type,
      distanceKm: Number(km.toFixed(3)),
      avgHrBpm,
      paceMinKm,
      paceSourceVersion: PACE_SOURCE_VERSION,
      intervalSourceVersion: cached?.intervalSourceVersion ?? 0,
      intervalPoints: cachedIntervals,
      splitSourceVersion: cached?.splitSourceVersion ?? 0,
      splitKmPoints: cachedSplits,
      detailStreamSourceVersion: cached?.detailStreamSourceVersion ?? 0,
      detailStreamPoints: cachedDetailStreams
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

function deriveUpdateOldestDate(previousActivities, newestDate) {
  const latestExistingDate = latestActivityDateKey(previousActivities);
  const minRecentDate = formatDateUTC(addDaysUTC(parseDateKey(newestDate), -30));
  if (latestExistingDate && isDateKey(latestExistingDate)) {
    return latestExistingDate < minRecentDate ? latestExistingDate : minRecentDate;
  }
  return minRecentDate;
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
    const settings = normalizeSettings(await readJson(SETTINGS_FILE, defaultSettings()));
    const hasApiKey = typeof settings.apiKey === "string" && settings.apiKey.length > 0;
    return jsonResponse(res, 200, {
      hasApiKey,
      runningThresholdHrOverride: settings.runningThresholdHrOverride,
      hrZonesRunningOverride: settings.hrZonesRunningOverride
    });
  }

  if (url.pathname === "/api/settings" && req.method === "PUT") {
    try {
      const body = await parseJsonBody(req);
      const currentSettings = normalizeSettings(await readJson(SETTINGS_FILE, defaultSettings()));
      const nextSettings = {
        ...currentSettings
      };
      if (Object.prototype.hasOwnProperty.call(body, "apiKey")) {
        nextSettings.apiKey = String(body.apiKey || "").trim();
      }
      if (Object.prototype.hasOwnProperty.call(body, "runningThresholdHrOverride")) {
        nextSettings.runningThresholdHrOverride = normalizeThresholdOverride(body.runningThresholdHrOverride);
      }
      if (Object.prototype.hasOwnProperty.call(body, "hrZonesRunningOverride")) {
        nextSettings.hrZonesRunningOverride = normalizeHrZoneOverrideRows(body.hrZonesRunningOverride);
      }

      const activityData = await readJson(ACTIVITIES_FILE, {
        syncedAt: null,
        lookbackMode: "days",
        lookbackDays: 365,
        runningThresholdHr: null,
        activities: []
      });
      const resolved = resolveRunningHrZoneConfiguration(activityData?.runningThresholdHr, nextSettings);
      const hasOverrides =
        resolved.runningThresholdHrOverride !== null || hasAnyHrZoneOverrides(resolved.hrZonesRunningOverride);
      if (hasOverrides && !resolved.hrZonesRunning.length) {
        return jsonResponse(res, 400, {
          error:
            "Overrides do not produce a valid 5-zone setup. Provide a threshold override or a complete set of zone overrides."
        });
      }

      await writeJson(SETTINGS_FILE, nextSettings);
      return jsonResponse(res, 200, {
        ok: true,
        hasApiKey: nextSettings.apiKey.length > 0,
        runningThresholdHrOverride: nextSettings.runningThresholdHrOverride,
        hrZonesRunningOverride: nextSettings.hrZonesRunningOverride
      });
    } catch (error) {
      return jsonResponse(res, 400, { error: error.message || "Invalid settings payload." });
    }
  }

  if (url.pathname === "/api/local-data/reset" && req.method === "POST") {
    let body = {};
    try {
      body = await parseJsonBody(req);
    } catch {
      return jsonResponse(res, 400, { error: "Invalid JSON body." });
    }

    const mode = String(body.mode || "").toLowerCase();
    if (mode !== "clear-activities" && mode !== "delete-all") {
      return jsonResponse(res, 400, { error: "Invalid reset mode." });
    }

    const emptyActivities = {
      syncedAt: null,
      lookbackMode: "days",
      lookbackDays: 365,
      runningThresholdHr: null,
      hrZonesRunning: [],
      activities: []
    };
    if (mode === "delete-all") {
      await writeJson(SETTINGS_FILE, defaultSettings());
    }
    await writeJson(ACTIVITIES_FILE, emptyActivities);

    const settings = normalizeSettings(await readJson(SETTINGS_FILE, defaultSettings()));
    const hasApiKey = typeof settings.apiKey === "string" && settings.apiKey.length > 0;
    return jsonResponse(res, 200, {
      ok: true,
      mode,
      hasApiKey
    });
  }

  if (url.pathname === "/api/sync" && req.method === "POST") {
    const settings = normalizeSettings(await readJson(SETTINGS_FILE, defaultSettings()));
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
    const syncMode =
      requestedMode === "fetch-all" || requestedMode === "reload-all" || requestedMode === "all" || requestedMode === "range"
        ? "fetch-all"
        : "update";

    try {
      const currentData = await readJson(ACTIVITIES_FILE, {
        syncedAt: null,
        lookbackMode: "days",
        lookbackDays: 365,
        runningThresholdHr: null,
        activities: []
      });
      const previousActivities = Array.isArray(currentData.activities) ? currentData.activities : [];
      const previousById = new Map(previousActivities.map((activity) => [String(activity.id || ""), activity]));

      const newestDate = formatDateUTC(new Date());
      let activities = [];
      let fetchedActivities = [];
      let lookbackMode = currentData?.lookbackMode === "all" ? "all" : "days";
      let lookbackDays = normalizeLookbackDaysValue(currentData?.lookbackDays, 365);
      let syncOldestDate = "1970-01-01";
      let syncNewestDate = newestDate;

      if (syncMode === "update") {
        syncOldestDate = deriveUpdateOldestDate(previousActivities, newestDate);
        fetchedActivities = await fetchIntervalsActivitiesInRange(apiKey, syncOldestDate, syncNewestDate, previousById);
        activities = mergeActivitiesById(previousActivities, fetchedActivities);
      } else {
        syncOldestDate = "1970-01-01";
        fetchedActivities = await fetchIntervalsActivitiesInRange(apiKey, syncOldestDate, syncNewestDate, previousById);
        activities = fetchedActivities;
        lookbackMode = "all";
        lookbackDays = null;
      }

      const splitStats = await enrichActivitiesWithPaceHrPoints(apiKey, activities);
      let runningThresholdHr = safeNumber(currentData?.runningThresholdHr);
      let hrZonesRunning = buildFiveZonesFromThresholdHr(runningThresholdHr);
      try {
        const { unsupported: athleteUnsupported, payload: athletePayload } = await fetchAthleteProfile(apiKey);
        if (!athleteUnsupported) {
          const fetchedThresholdHr = extractRunningThresholdHrBpm(athletePayload);
          if (Number.isFinite(fetchedThresholdHr)) {
            runningThresholdHr = fetchedThresholdHr;
          }
          const fetchedZones = buildFiveZonesFromThresholdHr(runningThresholdHr);
          if (fetchedZones.length) {
            hrZonesRunning = fetchedZones;
            console.log(
              `[fitboard] athlete HR zones rebuilt from running LTHR ${runningThresholdHr}: ${fetchedZones
                .map((zone) => `${zone.label}:${zone.minBpm}-${zone.maxBpm ?? "+"}`)
                .join(", ")}`
            );
          } else {
            console.error(
              `[fitboard] athlete profile fetched but running threshold HR was unavailable or invalid.` +
                ` runningThresholdHr=${runningThresholdHr ?? "n/a"}`
            );
          }
        } else {
          console.error("[fitboard] athlete profile endpoint unsupported (404). Running HR zones not updated.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[fitboard] athlete profile fetch failed. Running HR zones not updated: ${message}`);
        // Keep previous zones when athlete profile fetch fails.
      }
      const payload = {
        syncedAt: new Date().toISOString(),
        lookbackMode,
        lookbackDays,
        runningThresholdHr: Number.isFinite(runningThresholdHr) ? Number(runningThresholdHr.toFixed(1)) : null,
        activities,
        hrZonesRunning
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
    const data = await readJson(ACTIVITIES_FILE, {
      syncedAt: null,
      lookbackMode: "days",
      lookbackDays: 365,
      runningThresholdHr: null,
      activities: []
    });
    const settings = normalizeSettings(await readJson(SETTINGS_FILE, defaultSettings()));
    const activities = Array.isArray(data.activities) ? data.activities : [];
    const zoneConfig = resolveRunningHrZoneConfiguration(data?.runningThresholdHr, settings);
    const runningThresholdHr = zoneConfig.runningThresholdHr;
    const hrZonesRunning = zoneConfig.hrZonesRunning;
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
    const staleMetaCount = activities.reduce((count, activity) => {
      const metaVersion = Number(activity?.metaSourceVersion);
      return count + (Number.isFinite(metaVersion) && Math.round(metaVersion) === ACTIVITY_META_SOURCE_VERSION ? 0 : 1);
    }, 0);
    const hrZonesMissing = activities.length > 0 && !hrZonesRunning.length;
    const resyncNeeded = staleMetaCount > 0 || hrZonesMissing;

    return jsonResponse(res, 200, {
      syncedAt: data.syncedAt || null,
      activityCount: activities.length,
      lookbackDays: lookbackMode === "all" ? "all" : lookbackDays,
      activityMetaSourceVersion: ACTIVITY_META_SOURCE_VERSION,
      staleActivityMetaCount: staleMetaCount,
      hrZonesMissing,
      resyncNeeded,
      defaultRunningThresholdHr: zoneConfig.defaultRunningThresholdHr,
      runningThresholdHrOverride: zoneConfig.runningThresholdHrOverride,
      runningThresholdHr,
      defaultHrZonesRunning: zoneConfig.defaultHrZonesRunning,
      hrZonesRunningOverride: zoneConfig.hrZonesRunningOverride,
      hrZonesRunning,
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
        maxHrBpm: Number.isFinite(Number(activity.maxHrBpm)) ? Number(activity.maxHrBpm) : null,
        load: Number.isFinite(Number(activity.load)) ? Number(activity.load) : null,
        hrZoneDurationsSec: computeRunHrZoneDurations(activity, hrZonesRunning),
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
    const activityIndex = activities.findIndex((item) => String(item?.id || "") === activityId);
    const activity = activityIndex >= 0 ? activities[activityIndex] : null;
    if (!activity) {
      return jsonResponse(res, 404, { error: "Activity not found." });
    }

    let detailStreamPoints =
      activity.detailStreamSourceVersion === DETAIL_STREAM_SOURCE_VERSION && Array.isArray(activity.detailStreamPoints)
        ? activity.detailStreamPoints
        : [];
    if (!detailStreamPoints.length || activity.detailStreamSourceVersion !== DETAIL_STREAM_SOURCE_VERSION) {
      const settings = await readJson(SETTINGS_FILE, { apiKey: "" });
      const apiKey = String(settings.apiKey || "").trim();
      if (apiKey) {
        try {
          const { unsupported, payload } = await fetchActivityStreams(apiKey, activity.id);
          if (unsupported) {
            detailStreamPoints = [];
            activity.detailStreamSourceVersion = DETAIL_STREAM_SOURCE_VERSION;
            activity.detailStreamPoints = [];
          } else {
            detailStreamPoints = buildActivityDetailStreamPoints(activity, payload);
            activity.detailStreamSourceVersion = DETAIL_STREAM_SOURCE_VERSION;
            activity.detailStreamPoints = detailStreamPoints;
          }
          activities[activityIndex] = activity;
          await writeJson(ACTIVITIES_FILE, data);
        } catch {
          detailStreamPoints = Array.isArray(activity.detailStreamPoints) ? activity.detailStreamPoints : [];
        }
      }
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
        maxHrBpm: Number.isFinite(Number(activity.maxHrBpm)) ? Number(activity.maxHrBpm) : null,
        elevationGainM: Number.isFinite(Number(activity.elevationGainM)) ? Number(activity.elevationGainM) : null,
        avgTempC: Number.isFinite(Number(activity.avgTempC)) ? Number(activity.avgTempC) : null,
        load: Number.isFinite(Number(activity.load)) ? Number(activity.load) : null
      },
      intervalPoints: Array.isArray(activity.intervalPoints) ? activity.intervalPoints : [],
      splitKmPoints: Array.isArray(activity.splitKmPoints) ? activity.splitKmPoints : [],
      detailStreamPoints: Array.isArray(detailStreamPoints) ? detailStreamPoints : [],
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
