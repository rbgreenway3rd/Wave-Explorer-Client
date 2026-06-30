// Neural ΔF/F₀ normalization — the math for "detrend → F/Fo".
//
// WHY this shape: the neural pipeline detrends with trendFlattening, which
// subtracts a linear fit AND a rolling-min-median baseline, leaving the
// signal centered near zero. So the detrended signal already represents
// ΔF (deviation from rest), and you CANNOT compute Fo from it (you'd be
// dividing by ~0). Therefore:
//   • numerator ΔF  = the detrended signal (passed in)
//   • denominator F₀ = robust resting fluorescence from the RAW signal
//   • normalized     = ΔF / F₀   (optionally × plate-median F₀)
//
// This is standard calcium-imaging ΔF/F₀. The exact estimator choice
// (this module) and the ΔF/F₀-vs-baseline-preserving-F/Fo decision are
// D1 in docs/neural-fofo-normalization-plan.md, pending domain-expert
// sign-off. This module encodes the locked default so it can serve as
// the concrete artifact for that review. Detection is meant to run on
// the normalized signal; nothing here touches spike detection.

export const UNIT_MODE = {
  NATIVE: "native",
  DFF0: "dFF0",
  DFF0_X_MEDIAN_FO: "dFF0_x_medianFo",
};

// True for a usable F₀: finite and strictly positive. Non-positive or
// non-finite F₀ means the well has no measurable resting brightness
// (empty/dead well) and must be skipped, not divided by.
export function isValidFo(fo) {
  return typeof fo === "number" && Number.isFinite(fo) && fo > 0;
}

// Median of the finite values in `values` over the half-open index range
// [start, end). Omitted/!=number bounds → whole array. Non-finite samples
// (NaN/±Infinity) are ignored. Returns null when no finite sample remains.
export function medianOverWindow(values, start, end) {
  if (!Array.isArray(values) && !ArrayBuffer.isView(values)) return null;
  const n = values.length;
  if (n === 0) return null;

  let lo = Number.isInteger(start) ? start : 0;
  let hi = Number.isInteger(end) ? end : n;
  if (lo < 0) lo = 0;
  if (hi > n) hi = n;
  if (hi <= lo) return null;

  const slice = [];
  for (let i = lo; i < hi; i++) {
    const v = values[i];
    if (typeof v === "number" && Number.isFinite(v)) slice.push(v);
  }
  if (slice.length === 0) return null;

  slice.sort((a, b) => a - b);
  const mid = slice.length >> 1;
  return slice.length % 2 === 0
    ? (slice[mid - 1] + slice[mid]) / 2
    : slice[mid];
}

/**
 * F₀ for one well: robust resting fluorescence from the RAW signal.
 *
 * Estimator (D1, domain-expert approved): the median over a user-defined
 * baseline window of the raw samples — a quiet, pre-activity stretch so F₀
 * reflects true rest. With no window the median of the whole raw trace is
 * used as a fallback (which over-estimates F₀ on active wells; the window
 * is the point). The window is chosen on the chart as a draggable band and
 * stored plate-wide as start/end RATIOS (0–1 of the trace), converted to
 * per-well sample indices via `foWindowIndices` (each well has its own N).
 *
 * Alternative estimators considered (documented for a future redesign —
 * the math layer can swap to any of these without touching call sites):
 *   - "First N seconds" window: a fixed leading duration instead of a
 *     draggable band. Simpler control; assumes recordings start at rest.
 *   - Auto low-percentile (e.g. 20th pct of raw): no control, self-
 *     calibrating; robust to where activity sits in the trace.
 *   - Auto-detect quietest window (lowest rolling variance) with optional
 *     manual override. Most flexible, most logic.
 * Chosen: user-defined draggable window (explicit, matches the assay's
 * "baseline then addition" structure).
 *
 * @param {number[]|Float32Array} rawYs raw (pre-detrend) samples
 * @param {{start?:number, end?:number}} [window] baseline index range
 * @returns {number|null} positive F₀, or null when it can't be computed
 */
export function computeFo(rawYs, window = {}) {
  const { start, end } = window || {};
  const fo = medianOverWindow(rawYs, start, end);
  return isValidFo(fo) ? fo : null;
}

/**
 * Convert a plate-wide F₀ window expressed as start/end RATIOS (0–1 of the
 * trace) into half-open sample indices [start, end) for a well of length n.
 * Ratios are clamped to [0,1] and reordered if inverted; the result always
 * spans at least one sample. Omitted/non-finite ratios default to the whole
 * trace (0→1), preserving the legacy whole-trace-median behavior.
 *
 * @param {number} n number of raw samples in the well
 * @param {number} [startRatio]
 * @param {number} [endRatio]
 * @returns {{start:number, end:number}|{}} index window, or {} when n invalid
 */
export function foWindowIndices(n, startRatio, endRatio) {
  if (!Number.isFinite(n) || n <= 0) return {};
  let s = Number.isFinite(startRatio) ? startRatio : 0;
  let e = Number.isFinite(endRatio) ? endRatio : 1;
  s = Math.min(Math.max(s, 0), 1);
  e = Math.min(Math.max(e, 0), 1);
  if (e < s) [s, e] = [e, s];
  let start = Math.floor(s * n);
  let end = Math.ceil(e * n);
  if (start >= n) start = n - 1;
  if (end <= start) end = Math.min(n, start + 1);
  return { start, end };
}

/**
 * Plate-wide median F₀ from per-well F₀ values. Skips invalid (null/≤0)
 * wells — they'd otherwise drag the median toward zero. Median (not mean)
 * is used so a handful of empty wells barely move the result.
 *
 * @param {Array<number|null>} perWellFo
 * @returns {{medianFo:number|null, validCount:number, skippedCount:number}}
 */
export function computePlateMedianFo(perWellFo) {
  const valid = [];
  let skippedCount = 0;
  for (const fo of perWellFo || []) {
    if (isValidFo(fo)) valid.push(fo);
    else skippedCount += 1;
  }
  if (valid.length === 0) {
    return { medianFo: null, validCount: 0, skippedCount };
  }
  valid.sort((a, b) => a - b);
  const mid = valid.length >> 1;
  const medianFo =
    valid.length % 2 === 0
      ? (valid[mid - 1] + valid[mid]) / 2
      : valid[mid];
  return { medianFo, validCount: valid.length, skippedCount };
}

/**
 * Plate-wide median F₀ computed straight from well objects — the single
 * definition of the client's "median Fo across the whole plate", shared
 * by the live modal (NeuralResultsContext) and the full-plate report so
 * the two paths can never drift. Reads each well's raw typed array
 * (`indicators[0].rawYs`) directly and NEVER calls materializeRawData(),
 * which would cache an {x,y}[] per well and recreate the full-plate OOM
 * pattern. An already-materialized `rawData` array is used if present,
 * but never triggered.
 *
 * The F₀ window is plate-wide start/end RATIOS, converted to per-well
 * sample indices here (each well has its own sample count).
 *
 * @param {Array} wells well objects shaped { indicators: [{ rawYs }] }
 * @param {{startRatio?:number, endRatio?:number}} [foWindow] plate-wide
 *   baseline window as ratios (0–1 of the trace). Omitted → whole trace.
 * @returns {{medianFo:number|null, validCount:number, skippedCount:number}}
 */
export function plateMedianFoFromWells(wells, foWindow = {}) {
  const { startRatio, endRatio } = foWindow || {};
  const perWellFo = (wells || []).map((w) => {
    const ind = w?.indicators?.[0];
    if (ind?.rawYs && ind.rawYs.length) {
      return computeFo(
        ind.rawYs,
        foWindowIndices(ind.rawYs.length, startRatio, endRatio)
      );
    }
    if (Array.isArray(ind?.rawData) && ind.rawData.length) {
      const ys = ind.rawData.map((p) => p.y);
      return computeFo(ys, foWindowIndices(ys.length, startRatio, endRatio));
    }
    return null;
  });
  return computePlateMedianFo(perWellFo);
}

/**
 * Normalize a detrended (ΔF) signal by F₀, optionally rescaling by the
 * plate-wide median F₀ so values land in a readable magnitude.
 *
 * normalized = (ΔF / F₀) × (rescale ? medianFo : 1)
 *
 * When F₀ is invalid (skipped well), returns a copy of the input
 * unchanged with applied:false — the caller decides how to surface the
 * skip (the well's signal stays in native units rather than producing a
 * divide-by-zero/garbage value).
 *
 * @param {number[]|Float32Array} detrendedYs ΔF samples (numerator)
 * @param {number|null} fo this well's F₀
 * @param {{medianFo?:number|null}} [opts] pass medianFo to rescale
 * @returns {{ys:number[], applied:boolean, unitMode:string}}
 */
export function applyDeltaFOverFo(detrendedYs, fo, opts = {}) {
  const src = detrendedYs || [];
  if (!isValidFo(fo)) {
    return {
      ys: Array.from(src),
      applied: false,
      unitMode: UNIT_MODE.NATIVE,
    };
  }
  const { medianFo = null } = opts;
  const rescale = isValidFo(medianFo);
  const factor = (rescale ? medianFo : 1) / fo;

  const n = src.length;
  const ys = new Array(n);
  for (let i = 0; i < n; i++) ys[i] = src[i] * factor;

  return {
    ys,
    applied: true,
    unitMode: rescale ? UNIT_MODE.DFF0_X_MEDIAN_FO : UNIT_MODE.DFF0,
  };
}

/**
 * One-well end-to-end normalization + metadata. Computes F₀ from raw,
 * normalizes the detrended signal, and reports what happened (for the
 * panel readout and CSV: this-well F₀, the unit mode, and whether it
 * was applied or the well was skipped).
 *
 * @param {object} args
 * @param {number[]|Float32Array} args.rawYs raw samples (for F₀)
 * @param {number[]|Float32Array} args.detrendedYs ΔF samples (numerator)
 * @param {{start?:number,end?:number}} [args.foWindow]
 * @param {boolean} [args.rescaleByMedianFo]
 * @param {number|null} [args.plateMedianFo] required when rescaling
 * @returns {{ys:number[], metadata:{thisWellFo:number|null, applied:boolean, skipped:boolean, unitMode:string}}}
 */
export function normalizeWell({
  rawYs,
  detrendedYs,
  foWindow = {},
  rescaleByMedianFo = false,
  plateMedianFo = null,
}) {
  const thisWellFo = computeFo(rawYs, foWindow);
  const { ys, applied, unitMode } = applyDeltaFOverFo(detrendedYs, thisWellFo, {
    medianFo: rescaleByMedianFo ? plateMedianFo : null,
  });
  return {
    ys,
    metadata: {
      thisWellFo,
      applied,
      skipped: !applied,
      unitMode,
    },
  };
}
