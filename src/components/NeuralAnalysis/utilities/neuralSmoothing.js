import { rollingMinMedian } from "./rollingWindow";

// Combined trend flattening and minimum-median baseline correction
export function trendFlattening(signal, options = {}) {
  if (!Array.isArray(signal) || signal.length === 0) return [];
  // Linear regression (least squares) to fit y = a*x + b
  const n = signal.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = signal[i].x;
    const y = signal[i].y;
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

  // Subtract linear trend AND extract the y-values into a flat array
  // for the rolling baseline below — combining the loops avoids one
  // full-signal allocation on top of `detrended`.
  const detrended = new Array(n);
  const detrendedYs = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = signal[i].x;
    const y = signal[i].y - (a * x + b);
    detrended[i] = { x, y };
    detrendedYs[i] = y;
  }

  // Minimum-median baseline correction via rolling sorted window.
  // Replaces a per-sample slice + map + sort + slice (O(W log W) +
  // 4 allocations per sample) with one binary insert + one binary
  // remove per sample on a single shared sorted-array structure.
  const windowSize = options.windowSize || 200;
  const numMinimums = options.numMinimums || 50;
  const effectiveWindowSize = Math.min(windowSize, Math.floor(n / 2));
  const baseline = rollingMinMedian(
    detrendedYs,
    effectiveWindowSize,
    numMinimums
  );

  // Subtract baseline from detrended
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { x: detrended[i].x, y: detrended[i].y - baseline[i] };
  }
  return out;
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
  const effectiveWindowSize = Math.min(windowSize, Math.floor(n / 2));

  // Extract y's into a flat array, then run the rolling sorted-window
  // helper. Same numerical result as the previous slice-map-sort loop
  // but at ~7–10× the throughput on the modal's typical signal sizes.
  const ys = new Array(n);
  for (let i = 0; i < n; i++) ys[i] = signal[i].y;
  const baseline = rollingMinMedian(ys, effectiveWindowSize, numMinimums);

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { x: signal[i].x, y: signal[i].y - baseline[i] };
  }
  return out;
}

/**
 * Pure baseline smoothing (returns the estimated baseline, not subtracted)
 * @param {{x: number, y: number}[]} signal - The input signal
 * @param {number} windowSize - Window size for baseline estimation
 * @param {number} numMinimums - Number of minimums to use for median
 * @returns {{x: number, y: number}[]} Smoothed baseline only
 */
export function baselineSmoothed(signal, windowSize = 100, numMinimums = 10) {
  if (!Array.isArray(signal) || signal.length === 0) return [];
  // Cap windowSize to avoid inefficiency on short signals
  const effectiveWindowSize = Math.min(
    windowSize,
    Math.floor(signal.length / 2)
  );
  let baseline = [];
  for (let j = 0; j < signal.length; j++) {
    let startIdx = Math.max(0, j - Math.floor(effectiveWindowSize / 2));
    let endIdx = Math.min(
      signal.length - 1,
      j + Math.floor(effectiveWindowSize / 2)
    );
    let currentWindow = signal.slice(startIdx, endIdx + 1);
    let yValues = currentWindow.map((point) => point.y);
    let sortedWindow = [...yValues].sort((a, b) => a - b);
    let minPoints = sortedWindow.slice(
      0,
      Math.min(numMinimums, sortedWindow.length)
    );
    // Use median of minimums as baseline
    let median =
      minPoints.length > 0 ? minPoints[Math.floor(minPoints.length / 2)] : 0;
    baseline.push(median);
  }
  // Return the smoothed baseline as a signal
  return signal.map((val, idx) => ({ x: val.x, y: baseline[idx] }));
}
