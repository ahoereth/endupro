import {
  blankHrZoneOverrideRows,
  defaultSettings,
  normalizeHrZoneOverrideRows,
  normalizeSettings,
  normalizeThresholdOverride,
  resolveRunningHrZoneConfiguration,
} from "$lib/domain/edupro-core.js";

const SETTINGS_STORAGE_KEY = "edupro_runtime_settings";

export type RuntimeSettings = {
  apiKey: string;
  runningThresholdHrOverride: number | null;
  hrZonesRunningOverride: Array<{
    label: string;
    minBpm: number | null;
    maxBpm: number | null;
  }>;
};

export function loadRuntimeSettings(): RuntimeSettings {
  if (
    typeof localStorage === "undefined" ||
    typeof localStorage.getItem !== "function"
  ) {
    return defaultSettings();
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return defaultSettings();
    }
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export function saveRuntimeSettings(
  nextSettings: Partial<RuntimeSettings>,
): RuntimeSettings {
  const current = loadRuntimeSettings();
  const next = normalizeSettings({ ...current, ...nextSettings });
  if (
    typeof localStorage !== "undefined" &&
    typeof localStorage.setItem === "function"
  ) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearRuntimeSettings() {
  if (
    typeof localStorage !== "undefined" &&
    typeof localStorage.removeItem === "function"
  ) {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
  return defaultSettings();
}

export function buildSettingsSummary(settings: RuntimeSettings) {
  return {
    hasApiKey:
      typeof settings.apiKey === "string" && settings.apiKey.length > 0,
    runningThresholdHrOverride:
      normalizeThresholdOverride(settings.runningThresholdHrOverride) ?? null,
    hrZonesRunningOverride: normalizeHrZoneOverrideRows(
      settings.hrZonesRunningOverride,
    ),
  };
}

export function validateRuntimeSettings(
  settings: Partial<RuntimeSettings>,
  defaultThresholdHr: number | null,
) {
  const current = loadRuntimeSettings();
  const next = normalizeSettings({ ...current, ...settings });
  const resolved = resolveRunningHrZoneConfiguration(defaultThresholdHr, next);
  const hasOverrides =
    resolved.runningThresholdHrOverride !== null ||
    normalizeHrZoneOverrideRows(resolved.hrZonesRunningOverride).some(
      (row) =>
        Number.isFinite(Number(row.minBpm)) ||
        Number.isFinite(Number(row.maxBpm)),
    );

  if (hasOverrides && !resolved.hrZonesRunning.length) {
    throw new Error(
      "Overrides do not produce a valid 5-zone setup. Provide a threshold override or a complete set of zone overrides.",
    );
  }

  return next;
}

export function blankOverrideRows() {
  return blankHrZoneOverrideRows();
}
