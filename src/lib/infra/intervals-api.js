import { normalizeActivities } from "$lib/domain/activity-normalization.js";

const ACTIVITY_FETCH_MAX_RETRIES = 3;
const ACTIVITY_FETCH_RETRY_BASE_MS = 300;
const ACTIVITY_FETCH_RETRY_MAX_MS = 3_000;
const ACTIVITY_FETCH_THROTTLE_MS = 450;
const ACTIVITY_FETCH_THROTTLE_JITTER_MS = 150;

let intervalsRequestChain = Promise.resolve();
let nextIntervalsRequestAtMs = 0;

function encodeBasicAuth(apiKey) {
  return btoa(`API_KEY:${apiKey}`);
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

function createAbortError(message = "Sync cancelled.") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function sleepWithSignal(ms, signal) {
  if (!signal) {
    return sleep(ms);
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
      reject(createAbortError());
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function throttleIntervalsRequest(signal) {
  const reservation = intervalsRequestChain.then(async () => {
    throwIfAborted(signal);
    const now = Date.now();
    const waitMs = Math.max(0, nextIntervalsRequestAtMs - now);
    if (waitMs > 0) {
      await sleepWithSignal(waitMs, signal);
    }
    throwIfAborted(signal);
    const jitterMs = Math.floor(
      Math.random() * (ACTIVITY_FETCH_THROTTLE_JITTER_MS + 1),
    );
    nextIntervalsRequestAtMs =
      Date.now() + ACTIVITY_FETCH_THROTTLE_MS + jitterMs;
  });

  intervalsRequestChain = reservation.catch(() => {});
  return reservation;
}

function isBrowserBlockedNetworkError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /NetworkError when attempting to fetch resource/i.test(message) ||
    /Failed to fetch/i.test(message) ||
    /Load failed/i.test(message)
  );
}

async function fetchActivityJsonWithRetry(
  apiKey,
  url,
  activityId,
  label,
  options = {},
) {
  const auth = encodeBasicAuth(apiKey);
  const signal = options?.signal;
  let lastError = null;
  const endpoint = `${label} ${url.toString()}`;

  for (let attempt = 0; attempt <= ACTIVITY_FETCH_MAX_RETRIES; attempt += 1) {
    try {
      throwIfAborted(signal);
      await throttleIntervalsRequest(signal);
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
        signal,
      });

      if (response.status === 404) {
        return { unsupported: true, payload: null };
      }

      if (!response.ok) {
        const body = await response.text();
        const shortBody = body.length > 200 ? `${body.slice(0, 200)}...` : body;
        const retryable = isRetryableStatus(response.status);
        console.error(
          `[endupro] ${endpoint} failed (attempt ${attempt + 1}/${ACTIVITY_FETCH_MAX_RETRIES + 1})` +
            ` status=${response.status} retryable=${retryable} target=${activityId} body=${shortBody || response.statusText}`,
        );
        lastError = new Error(
          `${label} API ${response.status} for activity ${activityId}: ${shortBody || response.statusText}`,
        );

        if (!retryable || attempt >= ACTIVITY_FETCH_MAX_RETRIES) {
          throw lastError;
        }

        const retryAfterMs = parseRetryAfterMs(
          response.headers.get("retry-after"),
        );
        const exponentialMs = Math.min(
          ACTIVITY_FETCH_RETRY_BASE_MS * 2 ** attempt,
          ACTIVITY_FETCH_RETRY_MAX_MS,
        );
        const waitMs = retryAfterMs !== null ? retryAfterMs : exponentialMs;
        await sleepWithSignal(waitMs, signal);
        continue;
      }

      return { unsupported: false, payload: await response.json() };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === "AbortError") {
        throw lastError;
      }
      if (isBrowserBlockedNetworkError(lastError)) {
        console.warn(
          `[endupro] ${endpoint} blocked in browser for target=${activityId}. Treating this endpoint as unsupported from this origin.`,
        );
        return {
          unsupported: true,
          unsupportedReason: "browser_blocked",
          payload: null,
        };
      }
      console.error(
        `[endupro] ${endpoint} request error (attempt ${attempt + 1}/${ACTIVITY_FETCH_MAX_RETRIES + 1})` +
          ` target=${activityId}: ${lastError.message}`,
      );
      if (attempt >= ACTIVITY_FETCH_MAX_RETRIES) {
        throw lastError;
      }
      const waitMs = Math.min(
        ACTIVITY_FETCH_RETRY_BASE_MS * 2 ** attempt,
        ACTIVITY_FETCH_RETRY_MAX_MS,
      );
      await sleepWithSignal(waitMs, signal);
    }
  }

  throw (
    lastError || new Error(`${label} API failed for activity ${activityId}`)
  );
}

async function fetchActivityWithIntervals(apiKey, activityId, options = {}) {
  const url = new URL(
    `https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}`,
  );
  url.searchParams.set("intervals", "true");
  return fetchActivityJsonWithRetry(
    apiKey,
    url,
    activityId,
    "Activity",
    options,
  );
}

async function fetchAthleteProfile(apiKey, options = {}) {
  const url = new URL("https://intervals.icu/api/v1/athlete/0");
  return fetchActivityJsonWithRetry(apiKey, url, "athlete", "Athlete", options);
}

async function fetchActivityStreams(apiKey, activityId, options = {}) {
  const url = new URL(
    `https://intervals.icu/api/v1/activity/${encodeURIComponent(activityId)}/streams.json`,
  );
  url.searchParams.set("types", "distance,time,heartrate,cadence,altitude");
  return fetchActivityJsonWithRetry(
    apiKey,
    url,
    activityId,
    "Streams",
    options,
  );
}

async function fetchIntervalsActivitiesInRange(
  apiKey,
  oldestDate,
  newestDate,
  existingById = new Map(),
  options = {},
) {
  const url = new URL("https://intervals.icu/api/v1/athlete/0/activities");
  url.searchParams.set("oldest", oldestDate);
  url.searchParams.set("newest", newestDate);

  const auth = encodeBasicAuth(apiKey);
  const signal = options?.signal;
  throwIfAborted(signal);
  await throttleIntervalsRequest(signal);

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    const shortBody = body.length > 400 ? `${body.slice(0, 400)}...` : body;
    throw new Error(
      `Intervals.icu API ${response.status}: ${shortBody || response.statusText}`,
    );
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("Unexpected Intervals.icu response format.");
  }

  return normalizeActivities(payload, existingById);
}

export {
  createAbortError,
  fetchActivityStreams,
  fetchActivityWithIntervals,
  fetchAthleteProfile,
  fetchIntervalsActivitiesInRange,
};
