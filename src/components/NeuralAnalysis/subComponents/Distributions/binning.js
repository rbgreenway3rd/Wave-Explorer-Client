// Client-side histogram binning helpers for the Distributions panel.
//
// The prominence histogram is binned in the worker (unbiased over every
// local maximum; see binLinearProminences in NeuralPipeline.js). The
// other three histograms (ISI, amplitude, width) are sourced from the
// already-on-thread spike array and binned here.

// Smallest absolute distance that we treat as a "real" range — protects
// the Freedman-Diaconis quotient from blowing up on uniform inputs.
const RANGE_EPS = 1e-12;

/**
 * Quartile via linear interpolation on a sorted array.
 */
function quantile(sorted, q) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/**
 * Bin a 1-D numeric array using Freedman-Diaconis bin width:
 *   binWidth = 2 * IQR / N^(1/3)
 *
 * Bin count is clamped to [clampMin, clampMax]. For N < smallNFallback,
 * fall back to a fixed-bin scheme (default 8 bins) — IQR loses meaning
 * on tiny samples and FD often degenerates to a single bin.
 *
 * Caller-supplied options.logScale=true transforms values to log10 first,
 * bins those, and exposes the resulting log-edges through edges. The
 * caller is responsible for re-labelling the displayed x-axis with the
 * geometric mean of each bin (the binning math here doesn't care).
 *
 * Returns { edges: number[], counts: number[] }. Edges length is
 * counts.length + 1. If `values` is empty the empty-bin shape is
 * returned so callers can render an empty state without special-casing.
 */
export function binWithFreedmanDiaconis(values, options = {}) {
  const {
    logScale = false,
    clampMin = 5,
    clampMax = 25,
    smallNFallback = 30,
    smallNBins = 8,
  } = options;

  if (!Array.isArray(values) || values.length === 0) {
    return { edges: [0, 1], counts: [0] };
  }

  // Transform to log space when requested; drop non-positives (log
  // undefined). For ISI inputs this is rare — only zero gaps would be
  // dropped — but it's correct to guard.
  let v;
  if (logScale) {
    v = [];
    for (let i = 0; i < values.length; i++) {
      const x = values[i];
      if (Number.isFinite(x) && x > 0) v.push(Math.log10(x));
    }
  } else {
    v = [];
    for (let i = 0; i < values.length; i++) {
      const x = values[i];
      if (Number.isFinite(x)) v.push(x);
    }
  }
  if (v.length === 0) return { edges: [0, 1], counts: [0] };

  const sorted = [...v].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  // Pick bin count.
  let nBins;
  if (v.length < smallNFallback || range < RANGE_EPS) {
    nBins = smallNBins;
  } else {
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = Math.max(q3 - q1, RANGE_EPS);
    const binWidth = (2 * iqr) / Math.cbrt(v.length);
    nBins = Math.max(
      clampMin,
      Math.min(clampMax, Math.ceil(range / binWidth))
    );
  }

  // Build edges. For a single-value or zero-range input, pad the upper
  // edge slightly so the bin contains the value (rather than landing
  // on a boundary).
  const lo = min;
  const hi = range < RANGE_EPS ? min + 1 : max;
  const step = (hi - lo) / nBins;
  const edges = new Array(nBins + 1);
  for (let i = 0; i <= nBins; i++) edges[i] = lo + i * step;

  const counts = new Array(nBins).fill(0);
  for (let i = 0; i < v.length; i++) {
    let bin = Math.floor((v[i] - lo) / step);
    if (bin >= nBins) bin = nBins - 1;
    if (bin < 0) bin = 0;
    counts[bin]++;
  }
  return { edges, counts };
}

/**
 * Inter-spike interval (ISI) derivation from a kept-spike array. Mirrors
 * the one-pass loop already used in NeuralResults.js so we keep the
 * exact same definition of "ISI" the metrics panel uses.
 */
export function deriveISIs(spikeResults) {
  if (!Array.isArray(spikeResults) || spikeResults.length < 2) return [];
  const times = new Array(spikeResults.length);
  for (let i = 0; i < spikeResults.length; i++) {
    const pk = spikeResults[i];
    times[i] = pk && pk.peakCoords ? pk.peakCoords.x : NaN;
  }
  times.sort((a, b) => a - b);
  const isis = new Array(times.length - 1);
  for (let i = 1; i < times.length; i++) isis[i - 1] = times[i] - times[i - 1];
  return isis;
}
