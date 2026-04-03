import { safeNumber } from "$lib/domain/shared.js";
import { sanitizePaceMinKm } from "$lib/domain/activity-normalization.js";

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
  const values = distanceRaw
    .map((value) => safeNumber(value))
    .map((value) => (value === null ? null : Math.max(0, value)));
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

  return values.map((value) =>
    value !== null && value >= 30 && value <= 240 ? value : null,
  );
}

function normalizeScalarStream(
  raw,
  targetLength,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {},
) {
  const values = raw.map((value) => safeNumber(value));
  if (values.length !== targetLength) {
    return Array.from({ length: targetLength }, () => null);
  }

  return values.map((value) =>
    value !== null && value >= min && value <= max ? value : null,
  );
}

function normalizeCadenceStream(cadenceRaw, targetLength) {
  const values = normalizeScalarStream(cadenceRaw, targetLength, {
    min: 20,
    max: 160,
  });
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) {
    return values;
  }

  const maxValue = Math.max(...finite);
  const multiplier = maxValue <= 130 ? 2 : 1;
  return values.map((value) =>
    Number.isFinite(value) ? Number((value * multiplier).toFixed(1)) : null,
  );
}

function normalizeAltitudeStream(altitudeRaw, targetLength) {
  return normalizeScalarStream(altitudeRaw, targetLength, {
    min: -1000,
    max: 10000,
  }).map((value) => (Number.isFinite(value) ? Number(value.toFixed(1)) : null));
}

function buildActivityDetailStreamPoints(activity, streamPayload) {
  const distanceRaw = extractStreamArray(streamPayload, ["distance", "dist"]);
  const timeRaw = extractStreamArray(streamPayload, [
    "time",
    "seconds",
    "moving_time",
  ]);
  const hrRaw = extractStreamArray(streamPayload, [
    "heartrate",
    "heart_rate",
    "hr",
  ]);
  const cadenceRaw = extractStreamArray(streamPayload, [
    "cadence",
    "run_cadence",
    "steps_per_minute",
  ]);
  const altitudeRaw = extractStreamArray(streamPayload, [
    "altitude",
    "elevation",
    "alt",
    "ele",
  ]);
  const targetLength = Math.max(
    distanceRaw.length,
    timeRaw.length,
    hrRaw.length,
    cadenceRaw.length,
    altitudeRaw.length,
  );
  if (targetLength < 2 || !timeRaw.length || !distanceRaw.length) {
    return [];
  }

  const distanceM = normalizeDistanceStreamMeters(
    distanceRaw,
    activity.distanceKm,
  );
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
    rawPace[i] = sanitizePaceMinKm(dt / 60 / (dd / 1000));
  }

  const smoothedPace = rawPace.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (
      let j = Math.max(0, i - 2);
      j <= Math.min(targetLength - 1, i + 2);
      j += 1
    ) {
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
      cadenceSpm: Number.isFinite(cadence[i])
        ? Number(cadence[i].toFixed(1))
        : null,
      altitudeM: Number.isFinite(altitude[i])
        ? Number(altitude[i].toFixed(1))
        : null,
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

  const distanceM = normalizeDistanceStreamMeters(
    distanceRaw,
    activity.distanceKm,
  );
  if (distanceM.length < 2) {
    return [];
  }

  const timeS = normalizeTimeStreamSeconds(
    extractStreamArray(streamPayload, ["time", "seconds", "moving_time"]),
    distanceM.length,
  );
  const hr = normalizeHrStream(
    extractStreamArray(streamPayload, ["heartrate", "heart_rate", "hr"]),
    distanceM.length,
  );

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

    if (
      !Number.isFinite(prevDist) ||
      !Number.isFinite(curDist) ||
      curDist <= prevDist
    ) {
      continue;
    }

    const distanceDelta = curDist - prevDist;
    const rawTimeDelta =
      Number.isFinite(curTime) && Number.isFinite(prevTime)
        ? curTime - prevTime
        : 1;
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
    const isFinalPartialBucket =
      kmIndex === lastBucketIndex &&
      Number.isFinite(bucket.distM) &&
      bucket.distM >= 200;
    if (
      !Number.isFinite(bucket.distM) ||
      (!isFinalPartialBucket && bucket.distM < 990) ||
      !Number.isFinite(bucket.timeS) ||
      bucket.timeS <= 0
    ) {
      continue;
    }

    const paceMinKm = sanitizePaceMinKm(
      bucket.timeS / 60 / (bucket.distM / 1000),
    );
    if (paceMinKm === null) {
      continue;
    }

    const avgHrBpm =
      bucket.hrWeight > 0
        ? Number((bucket.hrWeightedSum / bucket.hrWeight).toFixed(1))
        : null;
    points.push({
      activityId: activity.id,
      date: activity.date,
      splitKm: kmIndex + 1,
      splitDistanceKm: Number((bucket.distM / 1000).toFixed(3)),
      paceMinKm,
      avgHrBpm,
    });
  }

  return points;
}

function buildIntervalPoints(activity, detailPayload) {
  const intervals = Array.isArray(detailPayload?.icu_intervals)
    ? detailPayload.icu_intervals
    : [];
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
    const movingTimeS = safeNumber(
      interval.moving_time ?? interval.elapsed_time,
    );
    const avgHr = safeNumber(
      interval.average_heartrate ?? interval.average_hr ?? interval.heartrate,
    );
    const maxHr = safeNumber(
      interval.max_heartrate ?? interval.maximum_heartrate ?? interval.max_hr,
    );
    const distanceKm =
      Number.isFinite(distanceM) && distanceM >= 0
        ? Number((Math.max(0, distanceM) / 1000).toFixed(3))
        : null;
    const paceMinKm =
      Number.isFinite(movingTimeS) &&
      movingTimeS > 0 &&
      Number.isFinite(distanceKm) &&
      distanceKm > 0
        ? sanitizePaceMinKm(movingTimeS / 60 / distanceKm)
        : null;
    const avgHrBpm =
      Number.isFinite(avgHr) && avgHr >= 30 && avgHr <= 240
        ? Number(avgHr.toFixed(1))
        : null;
    const maxHrBpm =
      Number.isFinite(maxHr) && maxHr >= 30 && maxHr <= 260
        ? Number(maxHr.toFixed(1))
        : null;

    points.push({
      activityId: activity.id,
      date: activity.date,
      intervalIndex: i + 1,
      intervalType: String(interval.type || ""),
      distanceKm,
      movingTimeSec:
        Number.isFinite(movingTimeS) && movingTimeS > 0
          ? Number(movingTimeS)
          : null,
      paceMinKm,
      avgHrBpm,
      maxHrBpm,
      chartEligible:
        Number.isFinite(paceMinKm) &&
        paceMinKm > 0 &&
        Number.isFinite(avgHrBpm) &&
        avgHrBpm > 0,
    });
  }

  return points;
}

function shouldDerivePerKmSplitsFromStreams(activity, intervalPoints) {
  const usableIntervals = Array.isArray(intervalPoints)
    ? intervalPoints.filter(
        (point) =>
          point &&
          Number.isFinite(Number(point.distanceKm)) &&
          Number(point.distanceKm) > 0,
      )
    : [];
  return usableIntervals.length <= 2;
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

  const streamPoints = Array.isArray(activity?.detailStreamPoints)
    ? activity.detailStreamPoints
    : [];
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

  const intervalPoints = Array.isArray(activity?.intervalPoints)
    ? activity.intervalPoints
    : [];
  if (intervalPoints.length) {
    for (const interval of intervalPoints) {
      const seconds = Number(interval?.movingTimeSec);
      const hrBpm = Number(interval?.avgHrBpm);
      if (
        !Number.isFinite(seconds) ||
        seconds <= 0 ||
        !Number.isFinite(hrBpm)
      ) {
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
  if (
    Number.isFinite(movingTimeSec) &&
    movingTimeSec > 0 &&
    Number.isFinite(avgHrBpm)
  ) {
    const zoneIndex = hrZoneIndexForBpm(zones, avgHrBpm);
    if (zoneIndex >= 0) {
      zoneSeconds[zoneIndex] = Math.round(movingTimeSec);
    }
  }
  return zoneSeconds.map((value) => Math.max(0, Math.round(value)));
}

export {
  buildActivityDetailStreamPoints,
  buildIntervalPoints,
  buildPerKmSplitPoints,
  computeRunHrZoneDurations,
  shouldDerivePerKmSplitsFromStreams,
};
