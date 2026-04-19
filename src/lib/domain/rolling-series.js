import {
  addDaysUTC,
  formatDateUTC,
  isoWeekStartKey,
  parseDateKey,
} from "$lib/domain/shared.js";

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
  const chartStart = hasFiniteWindow
    ? addDaysUTC(today, -Math.round(daysToShow) + 1)
    : firstDate;
  const fullStart = firstDate < chartStart ? firstDate : chartStart;

  const dates = [];
  const totals = [];

  for (
    let current = new Date(fullStart);
    current <= today;
    current = addDaysUTC(current, 1)
  ) {
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

  const chartIndex = hasFiniteWindow
    ? Math.max(
        0,
        dates.findIndex((d) => d >= formatDateUTC(chartStart)),
      )
    : 0;

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
      weekly: 0,
      sum7ma30: rollingAverageFromSeries(sum7Series, localIdx, 30),
      sum7ma90: rollingAverageFromSeries(sum7Series, localIdx, 90),
      toleranceKmModel: null,
      sum14: rollingSum(i, 14),
      sum28: rollingSum(i, 28),
      sum30: rollingSum(i, 30),
      sum90: rollingSum(i, 90),
      sum180: rollingSum(i, 180),
    });
  }

  const weekBuckets = new Map();
  for (let i = 0; i < series.length; i += 1) {
    const point = series[i];
    const weekStart = isoWeekStartKey(point.date);
    if (!weekBuckets.has(weekStart)) {
      weekBuckets.set(weekStart, {
        start: weekStart,
        km: 0,
        indices: [],
      });
    }
    const bucket = weekBuckets.get(weekStart);
    bucket.km += point.dayKm;
    bucket.indices.push(i);
  }

  const orderedWeeks = Array.from(weekBuckets.values()).sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  for (const bucket of orderedWeeks) {
    const weeklyTotal = Number(bucket.km.toFixed(3));
    for (const index of bucket.indices) {
      series[index].weekly = weeklyTotal;
    }
  }
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
      const recent = orderedWeeks
        .slice(Math.max(0, i - RECENT_WINDOW_WEEKS), i)
        .map((entry) => entry.km);
      const long = orderedWeeks
        .slice(Math.max(0, i - LONG_WINDOW_WEEKS), i)
        .map((entry) => entry.km);

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
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(baseline) ||
    baseline <= 0
  ) {
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

export { baselineStatusFromValues, computeRollingSeries };
