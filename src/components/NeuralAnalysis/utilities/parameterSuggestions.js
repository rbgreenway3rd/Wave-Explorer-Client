// Centralized auto-suggest helpers for spike-detection parameters.
// Previously each entry point (live pipeline, full-plate report,
// neural report worker) carried its own copy of these helpers, and
// the copies had drifted in both the floor logic (Math.floor zeroing
// out prominence for normalized signals) and the multiplier (factor=3
// in the live pipeline vs. factor=0.5 in the report paths). Funnel
// every caller through this single source so the modal and the
// reports can't diverge in the future.

// Compute the sample median in O(n log n). Mutates a copy, not the
// input. n must be > 0; caller guarantees that.
function median(arr) {
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 === 1
    ? sorted[(n - 1) >> 1]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * Suggest a prominence floor for spike detection.
 *
 * Uses median absolute deviation (MAD) as a robust noise-scale
 * estimate — MAD is not inflated by the spikes we want to detect, so
 * it gives a much truer "noise σ" than the sample standard deviation
 * does on a peaky signal. The returned value is `factor × 1.4826 ×
 * MAD` (1.4826 is the consistency factor that makes MAD a σ-equivalent
 * for normal noise), with a signal-scale floor so the answer is
 * never literally zero — the previous `Math.floor(...)` collapsed to
 * 0 for normalized signals like y ∈ [-0.02, 0.17] and let every slope
 * wiggle through the downstream prominence gate.
 */
export function suggestProminence(signal, factor = 3) {
  if (!Array.isArray(signal) || signal.length === 0) return 1;
  const n = signal.length;

  let sum = 0;
  let yMin = Infinity;
  let yMax = -Infinity;
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const y = signal[i].y;
    ys[i] = y;
    sum += y;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  const mean = sum / n;

  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    const d = ys[i] - mean;
    sqSum += d * d;
  }
  const stdev = Math.sqrt(sqSum / n);

  const med = median(ys);
  const absDevs = new Float64Array(n);
  for (let i = 0; i < n; i++) absDevs[i] = Math.abs(ys[i] - med);
  const mad = median(absDevs);
  const madStd = 1.4826 * mad;

  // Multi-tier floor: prefer the MAD-based estimate, fall back to
  // sample σ when MAD collapses (flat-line signal with a few spikes),
  // and finally a signal-scale floor (range × 1e-6) so the answer is
  // strictly positive for any non-constant signal.
  const robust = factor * madStd;
  const stdevFallback = factor * stdev;
  const range = yMax - yMin;
  const rangeFloor = range > 0 ? range * 1e-6 : 0;
  return Math.max(robust, stdevFallback || 0, rangeFloor, Number.EPSILON);
}

/**
 * Suggest a spike-window (sample-count radius) from the prominence.
 * Centralized version of the helper that was duplicated in the live
 * pipeline, the full-plate report, and the report worker.
 */
export function suggestWindow(signal, prominence, num = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return 20;

  const samplingRate =
    signal.length > 1
      ? (signal[signal.length - 1].x - signal[0].x) / signal.length
      : 1;

  const baseWindow = Math.max(10, Math.floor(prominence * num * samplingRate));

  const maxWindow = Math.min(
    Math.floor(signal.length / 50),
    Math.floor(signal.length / 10)
  );
  const minWindow = 10;

  return Math.max(minWindow, Math.min(baseWindow, maxWindow));
}
