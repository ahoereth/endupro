import { HR_ZONE_COUNT, safeNumber } from "$lib/domain/shared.js";

const DEFAULT_LTHR_ZONE_EDGE_PCTS = [85, 90, 95, 100];

function blankHrZoneOverrideRows() {
  return Array.from({ length: HR_ZONE_COUNT }, (_, idx) => ({
    label: `Z${idx + 1}`,
    minBpm: null,
    maxBpm: null,
  }));
}

function defaultSettings() {
  return {
    apiKey: "",
    runningThresholdHrOverride: null,
    hrZonesRunningOverride: blankHrZoneOverrideRows(),
  };
}

function normalizeThresholdOverride(value) {
  const numeric = safeNumber(value);
  if (numeric === null) {
    return null;
  }
  if (numeric < 80 || numeric > 240) {
    throw new Error(
      "Running threshold HR override must be between 80 and 240 bpm.",
    );
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
    const minValue = safeNumber(
      entry.minBpm ?? entry.min ?? entry.lower ?? entry.from ?? null,
    );
    const maxValue = safeNumber(
      entry.maxBpm ?? entry.max ?? entry.upper ?? entry.to ?? null,
    );
    if (minValue !== null && (minValue < 0 || minValue > 260)) {
      throw new Error(
        `Zone ${i + 1} min override must be between 0 and 260 bpm.`,
      );
    }
    if (maxValue !== null && (maxValue < 0 || maxValue > 260)) {
      throw new Error(
        `Zone ${i + 1} max override must be between 0 and 260 bpm.`,
      );
    }
    rows[i] = {
      label: `Z${i + 1}`,
      minBpm: minValue === null ? null : Number(minValue.toFixed(1)),
      maxBpm: maxValue === null ? null : Number(maxValue.toFixed(1)),
    };
  }
  return rows;
}

function hasAnyHrZoneOverrides(rows) {
  return (
    Array.isArray(rows) &&
    rows.some(
      (row) =>
        safeNumber(row?.minBpm) !== null || safeNumber(row?.maxBpm) !== null,
    )
  );
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

function buildZonesFromOverrideRows(rows) {
  if (!Array.isArray(rows) || rows.length < HR_ZONE_COUNT) {
    return [];
  }
  const zones = rows.slice(0, HR_ZONE_COUNT).map((row, idx) => {
    const minValue = safeNumber(row?.minBpm);
    const maxValue = safeNumber(row?.maxBpm);
    return {
      label: `Z${idx + 1}`,
      minBpm:
        minValue !== null ? Number(minValue.toFixed(1)) : idx === 0 ? 0 : null,
      maxBpm:
        maxValue !== null
          ? Number(maxValue.toFixed(1))
          : idx === HR_ZONE_COUNT - 1
            ? null
            : null,
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
    minBpm:
      safeNumber(normalizedRows[idx]?.minBpm) !== null
        ? Number(normalizedRows[idx].minBpm)
        : Number(zone.minBpm),
    maxBpm:
      safeNumber(normalizedRows[idx]?.maxBpm) !== null
        ? Number(normalizedRows[idx].maxBpm)
        : zone.maxBpm,
  }));
  return isValidHrZones(merged) ? merged : [];
}

function normalizeSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    apiKey: typeof source.apiKey === "string" ? source.apiKey.trim() : "",
    runningThresholdHrOverride: normalizeThresholdOverride(
      source.runningThresholdHrOverride,
    ),
    hrZonesRunningOverride: normalizeHrZoneOverrideRows(
      source.hrZonesRunningOverride,
    ),
  };
}

function zoneEdgeListToZones(edges) {
  const thresholds = Array.from(
    new Set(
      edges
        .map((value) => safeNumber(value))
        .filter((value) => value !== null && value > 0 && value < 260)
        .map((value) => Number(value.toFixed(1))),
    ),
  ).sort((a, b) => a - b);
  if (thresholds.length < HR_ZONE_COUNT - 1) {
    return [];
  }

  const chosen = thresholds.slice(0, HR_ZONE_COUNT - 1);
  const zones = [];
  let min = 0;
  for (let i = 0; i < HR_ZONE_COUNT; i += 1) {
    const max = i < chosen.length ? chosen[i] : null;
    zones.push({
      label: `Z${i + 1}`,
      minBpm: Number(min.toFixed(1)),
      maxBpm: Number.isFinite(max) ? Number(max.toFixed(1)) : null,
    });
    if (Number.isFinite(max)) {
      min = max;
    }
  }
  return zones;
}

function convertPercentEdgesToBpmZones(percentEdges, thresholdHrBpm) {
  if (
    !Number.isFinite(thresholdHrBpm) ||
    thresholdHrBpm < 120 ||
    thresholdHrBpm > 240
  ) {
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
  if (
    !Number.isFinite(thresholdHrBpm) ||
    thresholdHrBpm < 120 ||
    thresholdHrBpm > 240
  ) {
    return [];
  }
  return convertPercentEdgesToBpmZones(
    DEFAULT_LTHR_ZONE_EDGE_PCTS,
    thresholdHrBpm,
  );
}

function resolveRunningHrZoneConfiguration(defaultThresholdHr, settings) {
  const normalizedSettings = normalizeSettings(settings);
  const defaultThreshold = safeNumber(defaultThresholdHr);
  const thresholdOverride = safeNumber(
    normalizedSettings.runningThresholdHrOverride,
  );
  const effectiveThreshold =
    thresholdOverride !== null ? Number(thresholdOverride) : defaultThreshold;
  const defaultZones = buildFiveZonesFromThresholdHr(defaultThreshold);
  const thresholdZones = buildFiveZonesFromThresholdHr(effectiveThreshold);
  const zoneOverrides = normalizeHrZoneOverrideRows(
    normalizedSettings.hrZonesRunningOverride,
  );
  let effectiveZones = [];
  if (thresholdZones.length) {
    effectiveZones = hasAnyHrZoneOverrides(zoneOverrides)
      ? applyHrZoneOverrides(thresholdZones, zoneOverrides)
      : thresholdZones;
  } else if (hasAnyHrZoneOverrides(zoneOverrides)) {
    effectiveZones = buildZonesFromOverrideRows(zoneOverrides);
  }
  return {
    defaultRunningThresholdHr:
      defaultThreshold === null ? null : Number(defaultThreshold.toFixed(1)),
    runningThresholdHrOverride:
      thresholdOverride === null ? null : Number(thresholdOverride.toFixed(1)),
    runningThresholdHr:
      effectiveThreshold === null
        ? null
        : Number(effectiveThreshold.toFixed(1)),
    defaultHrZonesRunning: defaultZones,
    hrZonesRunningOverride: zoneOverrides,
    hrZonesRunning: effectiveZones,
  };
}

export {
  DEFAULT_LTHR_ZONE_EDGE_PCTS,
  applyHrZoneOverrides,
  blankHrZoneOverrideRows,
  buildFiveZonesFromThresholdHr,
  defaultSettings,
  isValidHrZones,
  normalizeHrZoneOverrideRows,
  normalizeSettings,
  normalizeThresholdOverride,
  resolveRunningHrZoneConfiguration,
};
