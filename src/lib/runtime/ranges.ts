import type { NumericRange } from "$lib/types/app";

export function resolveNumericRange(
  range: NumericRange,
  bounds: NumericRange,
  minSpan = 0,
): NumericRange {
  if (
    !Number.isFinite(Number(bounds.min)) ||
    !Number.isFinite(Number(bounds.max)) ||
    Number(bounds.max) <= Number(bounds.min)
  ) {
    return { min: null, max: null };
  }

  let min = Number.isFinite(Number(range.min))
    ? Number(range.min)
    : Number(bounds.min);
  let max = Number.isFinite(Number(range.max))
    ? Number(range.max)
    : Number(bounds.max);
  min = Math.max(Number(bounds.min), Math.min(Number(bounds.max), min));
  max = Math.max(Number(bounds.min), Math.min(Number(bounds.max), max));

  if (max - min < minSpan) {
    const center = (min + max) / 2;
    min = center - minSpan / 2;
    max = center + minSpan / 2;
  }

  if (min < Number(bounds.min)) {
    min = Number(bounds.min);
    max = Math.max(min + minSpan, max);
  }
  if (max > Number(bounds.max)) {
    max = Number(bounds.max);
    min = Math.min(max - minSpan, min);
  }
  if (max - min < minSpan) {
    min = Number(bounds.min);
    max = Number(bounds.max);
  }

  return { min, max };
}

export function valueToSliderStep(
  value: number,
  boundMin: number,
  boundMax: number,
  steps: number,
  invert = false,
) {
  const denominator = Math.max(0.001, boundMax - boundMin);
  const t = invert
    ? (boundMax - value) / denominator
    : (value - boundMin) / denominator;
  return Math.round(Math.max(0, Math.min(1, t)) * steps);
}

export function sliderStepToValue(
  step: number,
  boundMin: number,
  boundMax: number,
  steps: number,
  invert = false,
) {
  const t = Math.max(0, Math.min(steps, Math.round(step))) / steps;
  return invert
    ? boundMax - t * (boundMax - boundMin)
    : boundMin + t * (boundMax - boundMin);
}

export function normalizeStoredNumericRange(
  rawRange: NumericRange,
): NumericRange {
  const min = Number(rawRange?.min);
  const max = Number(rawRange?.max);
  return {
    min: Number.isFinite(min) && min > 0 ? min : null,
    max: Number.isFinite(max) && max > 0 ? max : null,
  };
}

export function computeFiniteBounds(
  values: Array<number | null | undefined>,
  singleValuePadding = 0,
): NumericRange {
  const finiteValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (!finiteValues.length) {
    return { min: null, max: null };
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (singleValuePadding > 0 && min === max) {
    return {
      min: min - singleValuePadding,
      max: max + singleValuePadding,
    };
  }

  return { min, max };
}
