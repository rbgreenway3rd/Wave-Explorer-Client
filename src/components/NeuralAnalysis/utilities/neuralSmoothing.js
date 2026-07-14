import { rollingMinMedian } from "./rollingWindow";

// Combined trend flattening + minimum-median baseline correction.
//
// Typed core: operates on parallel Float64Arrays (xs, ys) and returns a new
// Float64Array of processed y-values. The neural pipeline threads typed arrays
// stage-to-stage (one shared `xs`, a fresh `ys` per stage) so it never
// allocates a full {x,y}[] object array between stages — a large GC/memory
// reduction on 250K-sample traces. The {x,y}[] wrapper below preserves the
// original signature for callers outside the pipeline (e.g. the report worker).

export function trendFlatteningYs(xs, ys, options = {}) {
  const n = ys.length;
  if (n === 0) return new Float64Array(0);

  // Linear regression (least squares) to fit y = a*x + b.
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denominator = n * sumXX - sumX * sumX;
  let a = 0,
    b = 0;
  if (denominator !== 0) {
    a = (n * sumXY - sumX * sumY) / denominator;
    b = (sumY * sumXX - sumX * sumXY) / denominator;
  }

  // Subtract the linear trend.
  const detrendedYs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    detrendedYs[i] = ys[i] - (a * xs[i] + b);
  }

  // Minimum-median baseline correction via the rolling sorted-window helper.
  const windowSize = options.windowSize || 200;
  const numMinimums = options.numMinimums || 50;
  const effectiveWindowSize = Math.min(windowSize, Math.floor(n / 2));
  const baseline = rollingMinMedian(detrendedYs, effectiveWindowSize, numMinimums);

  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = detrendedYs[i] - baseline[i];
  return out;
}

export function baselineCorrectedYs(ys, windowSize = 200, numMinimums = 50) {
  const n = ys.length;
  if (n === 0) return new Float64Array(0);
  const effectiveWindowSize = Math.min(windowSize, Math.floor(n / 2));
  const baseline = rollingMinMedian(ys, effectiveWindowSize, numMinimums);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = ys[i] - baseline[i];
  return out;
}

// ---- {x,y}[] wrappers (unchanged public API) ---------------------------

export function trendFlattening(signal, options = {}) {
  if (!Array.isArray(signal) || signal.length === 0) return [];
  const n = signal.length;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = signal[i].x;
    ys[i] = signal[i].y;
  }
  const out = trendFlatteningYs(xs, ys, options);
  const result = new Array(n);
  for (let i = 0; i < n; i++) result[i] = { x: signal[i].x, y: out[i] };
  return result;
}

/**
 * Minimum-median baseline estimation and correction (like CardiacAnalysis)
 * @param {{x: number, y: number}[]} signal - The input signal
 * @param {number} windowSize - Window size for baseline estimation
 * @param {number} numMinimums - Number of minimums to use for median
 * @returns {{x: number, y: number}[]} Baseline-corrected signal
 */
export function baselineCorrected(signal, windowSize = 200, numMinimums = 50) {
  if (!Array.isArray(signal) || signal.length === 0) return [];
  const n = signal.length;
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) ys[i] = signal[i].y;
  const out = baselineCorrectedYs(ys, windowSize, numMinimums);
  const result = new Array(n);
  for (let i = 0; i < n; i++) result[i] = { x: signal[i].x, y: out[i] };
  return result;
}

// The former `baselineSmoothed` helper (a per-sample slice-map-sort
// baseline estimator) was removed in 2026-05 — it was exported but
// had zero callers anywhere in the codebase. If a future feature
// needs a non-subtracted baseline, build it on top of the
// `rollingMinMedian` helper in `./rollingWindow` the same way
// `baselineCorrected` does above.
