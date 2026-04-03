const HR_ZONE_COUNT = 5;
const INCREMENTAL_ROLLING_BACKFILL_DAYS = 14;
const UPDATE_RECENT_RELOAD_DAYS = 30;

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
  const weekday = date.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return formatDateUTC(addDaysUTC(date, -daysSinceMonday));
}

function isDateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
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

export {
  HR_ZONE_COUNT,
  INCREMENTAL_ROLLING_BACKFILL_DAYS,
  UPDATE_RECENT_RELOAD_DAYS,
  addDaysUTC,
  formatDateUTC,
  isDateKey,
  isoWeekStartKey,
  parseDateKey,
  safeNumber,
};
