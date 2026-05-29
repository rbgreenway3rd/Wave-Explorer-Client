// Centralized auto-suggest helpers for spike-detection parameters.
// Both the live modal and the report paths funnel through this single
// source so the modal and the reports can't drift apart.
//
// The new (Step F/G) suggester produces:
//   - prominence via guarded Otsu on the log topographic-prominence
//     histogram, in the SAME units the detection gate now uses (Step D
//     switched the gate to detection prominence). Falls back to
//     2.5 × σ_robust under any of the guard conditions.
//   - window from the median topographic half-width of post-gate,
//     post-NMS events. spikeWindow now means "half-width radius" so
//     this is the natural value to drop into the slider.
//
// Both legacy `suggestProminence(signal, factor)` and `suggestWindow
// (signal, prominence, num)` exports are retained as thin wrappers
// over `suggestSpikeParameters` so callers that haven't migrated yet
// still see consistent values.

import {
  computeSignalStats,
  localMaxima,
  topographicProminence,
  kMeans,
  findBases,
} from "./peakGeometry.js";

// O(n log n) median. Mutates a copy, not the input. n > 0.
function median(arr) {
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 === 1
    ? sorted[(n - 1) >> 1]
    : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

// Generic percentile (0 ≤ p ≤ 1) on a numeric array. Mutates a copy.
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(p * (sorted.length - 1)))
  );
  return sorted[idx];
}

/**
 * Noise σ estimated from MAD on first differences.
 *
 * For Gaussian noise on top of an arbitrary slow trend / baseline,
 * `y[i+1] − y[i]` ≈ √2 × σ_noise (noise dominates because the trend
 * changes slowly per sample). MAD of the differences is robust to
 * outlier spikes (the diff series has its own outliers at spike
 * onsets / offsets, but they're a small minority of samples), so
 * `MAD(diff) / 0.6745 / √2` ≈ σ_noise.
 *
 * The `computeSignalStats` σ_robust uses MAD on the raw y values
 * relative to the median — which inflates dramatically when the
 * signal has a wide DC range (slow trend, long plateaus, bimodal y
 * distribution from baseline + spike-top samples). On real Ca²⁺
 * recordings with y values in the thousands, that inflation produced
 * suggested prominences larger than any peak in the data.
 */
function noiseSigmaFromDiffs(signal) {
  const n = signal.length;
  if (n < 3) return 0;
  const diffs = new Array(n - 1);
  for (let i = 1; i < n; i++) diffs[i - 1] = signal[i].y - signal[i - 1].y;
  const medianDiff = median(diffs);
  const absDevs = new Array(diffs.length);
  for (let i = 0; i < diffs.length; i++) {
    absDevs[i] = Math.abs(diffs[i] - medianDiff);
  }
  const mad = median(absDevs);
  return mad / 0.6745 / Math.SQRT2;
}

// ---- Coarse-pass cache --------------------------------------------------
// The prominence and window suggesters both want the same candidate set
// (local maxima with topographic prominences). Cache against the input
// array reference so repeat suggestion reads during a slider drag share
// one pass. WeakMap auto-clears when the signal is GC'd.
const coarsePassCache = new WeakMap();

function coarsePass(signal, searchRange) {
  const cached = coarsePassCache.get(signal);
  if (cached && cached.searchRange === searchRange) return cached;
  const maxima = localMaxima(signal);
  const candidates = new Array(maxima.length);
  for (let i = 0; i < maxima.length; i++) {
    const idx = maxima[i];
    const det = topographicProminence(signal, idx, searchRange);
    candidates[i] = {
      idx,
      prominence: det.prominence,
      leftProminence: det.leftProminence,
      rightProminence: det.rightProminence,
      leftBaseIdx: det.leftBaseIdx,
      rightBaseIdx: det.rightBaseIdx,
    };
  }
  const entry = { searchRange, candidates };
  coarsePassCache.set(signal, entry);
  return entry;
}

// ---- Histogram + Otsu utilities ----------------------------------------

// Freedman-Diaconis bin count for a 1D numeric sample. Robust to
// non-Gaussian distributions (relies on IQR, not stdev).
function fdBinCount(values) {
  if (values.length < 4) return 4;
  const sorted = Array.from(values).sort((a, b) => a - b);
  const q1 = sorted[Math.floor(0.25 * (sorted.length - 1))];
  const q3 = sorted[Math.floor(0.75 * (sorted.length - 1))];
  const iqr = Math.max(q3 - q1, Number.EPSILON);
  const h = (2 * iqr) / Math.cbrt(values.length);
  const range = sorted[sorted.length - 1] - sorted[0];
  const raw = Math.ceil(range / Math.max(h, Number.EPSILON));
  return Math.min(128, Math.max(16, raw));
}

function buildLogHistogram(values) {
  const n = values.length;
  const logs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Add a tiny ε before log so candidates with prominence exactly 0
    // don't blow up. ε = 1e-12 is well below any realistic prominence.
    logs[i] = Math.log10(values[i] + 1e-12);
  }
  const nBins = fdBinCount(logs);
  let pMin = Infinity;
  let pMax = -Infinity;
  for (let i = 0; i < n; i++) {
    if (logs[i] < pMin) pMin = logs[i];
    if (logs[i] > pMax) pMax = logs[i];
  }
  if (!isFinite(pMin) || pMin === pMax) {
    return { counts: new Float64Array(1), h: 1, pMin };
  }
  const h = (pMax - pMin) / nBins;
  const counts = new Float64Array(nBins);
  for (let i = 0; i < n; i++) {
    let b = Math.floor((logs[i] - pMin) / h);
    if (b >= nBins) b = nBins - 1;
    counts[b]++;
  }
  return { counts, h, pMin };
}

// 1-D Gaussian KDE smoothing of a histogram, kernel truncated at ±3σ.
// σ in "bin units"; for a histogram built from log values use Scott's
// rule on the underlying logs to pick σ in log-units, then divide by h.
function gaussianSmoothHistogram(counts, sigmaBins) {
  const k = Math.max(1, Math.ceil(3 * sigmaBins));
  const kernel = new Float64Array(2 * k + 1);
  let kSum = 0;
  for (let i = -k; i <= k; i++) {
    const w = Math.exp(-(i * i) / (2 * sigmaBins * sigmaBins));
    kernel[i + k] = w;
    kSum += w;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kSum;
  const out = new Float64Array(counts.length);
  for (let i = 0; i < counts.length; i++) {
    let acc = 0;
    for (let j = -k; j <= k; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < counts.length) {
        acc += counts[idx] * kernel[j + k];
      }
    }
    out[i] = acc;
  }
  return out;
}

// Otsu's threshold over a 1D histogram. Returns the bin index that
// maximizes between-class variance, plus the variance values needed
// for the valley-depth guards downstream.
function otsuThreshold(counts) {
  const n = counts.length;
  let total = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    total += counts[i];
    sum += i * counts[i];
  }
  if (total === 0) {
    return { binIndex: 0, sigmaB: 0, total };
  }
  let w0 = 0;
  let cumSum = 0;
  let maxVar = -1;
  let argMax = 0;
  for (let t = 0; t < n - 1; t++) {
    w0 += counts[t];
    cumSum += t * counts[t];
    if (w0 === 0) continue;
    const w1 = total - w0;
    if (w1 === 0) break;
    const mu0 = cumSum / w0;
    const mu1 = (sum - cumSum) / w1;
    const v = w0 * w1 * (mu0 - mu1) * (mu0 - mu1);
    if (v > maxVar) {
      maxVar = v;
      argMax = t;
    }
  }
  return { binIndex: argMax, sigmaB: maxVar, total };
}

// Count distinct modes (local maxima of the smoothed histogram).
// Returns the modes' bin indices and counts in descending-density
// order.
function findHistogramModes(smoothed) {
  const modes = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (smoothed[i] > smoothed[i - 1] && smoothed[i] > smoothed[i + 1]) {
      modes.push({ bin: i, density: smoothed[i] });
    }
  }
  // Edges that strictly dominate one neighbor count as modes too.
  if (smoothed.length >= 2) {
    if (smoothed[0] > smoothed[1]) {
      modes.push({ bin: 0, density: smoothed[0] });
    }
    if (smoothed[smoothed.length - 1] > smoothed[smoothed.length - 2]) {
      modes.push({
        bin: smoothed.length - 1,
        density: smoothed[smoothed.length - 1],
      });
    }
  }
  modes.sort((a, b) => b.density - a.density);
  return modes;
}

// ---- Public API: full suggester ----------------------------------------

/**
 * Suggest spike-detection parameters for a single signal.
 *
 * Returns
 *   {
 *     prominence: { value, method, sigmaRobust, eventCount, ... }
 *     window:     { value, medianWidth, eventCount }
 *     sigmaRobust
 *   }
 *
 * Where `method` is one of:
 *   'otsu'                    — confident bimodal histogram, valley
 *                               found; Otsu threshold returned.
 *   'unimodal-fallback'       — histogram had < 2 distinct modes OR
 *                               the valley between the top modes is
 *                               not deep enough. Returns 2.5 × σ.
 *   'low-sample-fallback'     — fewer than 30 candidates survive the
 *                               1.5 × σ pre-filter. Returns 2.5 × σ.
 *   'sigma-floor-capped'      — Otsu's candidate sat below σ-floor;
 *                               the σ-floor was returned instead.
 *   'sanity-capped'           — any path produced a value above the
 *                               90th-percentile candidate prominence
 *                               in the signal (real peaks couldn't
 *                               clear it). Capped to 0.5 × p90.
 */
export function suggestSpikeParameters(signal) {
  if (!Array.isArray(signal) || signal.length < 4) {
    return {
      prominence: {
        value: 1,
        method: "low-sample-fallback",
        sigmaRobust: 0,
        eventCount: 0,
      },
      window: { value: 20, medianWidth: 0, eventCount: 0 },
      sigmaRobust: 0,
    };
  }

  const stats = computeSignalStats(signal);
  // The auto-suggest's σ uses MAD on first differences, NOT on raw y
  // values. MAD on raw y is inflated by slow baseline drift and by
  // signals with bimodal y distributions (lots of samples near
  // baseline + lots near a high plateau). On real Ca²⁺ recordings
  // with y ∈ [200, 2022], the raw-y MAD produced σ ≈ 2700, which
  // pushed the prominence threshold above every peak in the data.
  // Diff-based MAD captures the high-frequency noise instead and
  // gives σ that reflects the actual noise floor.
  const sigmaRobust = noiseSigmaFromDiffs(signal);
  // The coarse pass uses a moderately-wide topographic search so the
  // bases reflect real event extents on signals where the slider hasn't
  // been touched yet. n/40 is bounded for performance and large enough
  // to span typical Ca²⁺-style events at sampling rates ≤ a few kHz.
  const coarseSearchRange = Math.max(10, Math.floor(signal.length / 40));
  const { candidates } = coarsePass(signal, coarseSearchRange);

  // Pre-filter: keep candidates whose topographic prominence is above
  // a moderate σ threshold. The full coarse set is dominated by noise
  // local maxima (~n/3); even at 3σ a noticeable fraction of noise
  // peaks survive (topographic noise prominence has a tail above 2-3σ
  // for Gaussian noise). 3σ is the sweet spot: tight enough that the
  // signal mode dominates the histogram (so Otsu finds a clean valley),
  // loose enough that the smallest real events still survive even
  // before we know what the cutoff is.
  const preFiltered = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].prominence > 3 * sigmaRobust) {
      preFiltered.push(candidates[i]);
    }
  }

  if (preFiltered.length < 30) {
    return {
      prominence: {
        value: Math.max(2.5 * sigmaRobust, Number.EPSILON),
        method: "low-sample-fallback",
        sigmaRobust,
        eventCount: preFiltered.length,
      },
      window: {
        value: 20,
        medianWidth: 0,
        eventCount: preFiltered.length,
      },
      sigmaRobust,
    };
  }

  // Build the log-prominence histogram, KDE-smooth, run Otsu.
  const proms = preFiltered.map((c) => c.prominence);
  const { counts, h, pMin } = buildLogHistogram(proms);
  // Scott's rule on the log values to pick the KDE bandwidth.
  let logSum = 0;
  for (let i = 0; i < proms.length; i++) logSum += Math.log10(proms[i] + 1e-12);
  const logMean = logSum / proms.length;
  let logSqSum = 0;
  for (let i = 0; i < proms.length; i++) {
    const d = Math.log10(proms[i] + 1e-12) - logMean;
    logSqSum += d * d;
  }
  const logStd = Math.sqrt(logSqSum / proms.length);
  const sigmaKde = 1.06 * Math.max(logStd, 1e-9) * Math.pow(proms.length, -0.2);
  const sigmaBins = Math.max(1e-3, sigmaKde / Math.max(h, 1e-12));
  const smoothed = gaussianSmoothHistogram(counts, sigmaBins);
  const { binIndex } = otsuThreshold(smoothed);

  // Mode + valley-depth guard.
  const modes = findHistogramModes(smoothed);
  const sigmaFloor = Math.max(2 * sigmaRobust, Number.EPSILON);
  let method = "otsu";
  let otsuProm = Math.pow(10, pMin + binIndex * h);

  const bimodalOk = modes.length >= 2;
  const densityAtT = smoothed[binIndex];
  // True valley depth: smoothed density at the threshold must be a
  // small fraction of the density at the two highest modes. Falls back
  // to unimodal if the "valley" isn't deeper than 0.5× the lesser mode.
  const valleyOk =
    bimodalOk &&
    densityAtT <= 0.5 * Math.min(modes[0].density, modes[1].density);

  if (!bimodalOk || !valleyOk) {
    method = "unimodal-fallback";
    otsuProm = 2.5 * sigmaRobust;
  } else {
    // σ-floor: never below 2σ.
    if (otsuProm < sigmaFloor) {
      otsuProm = sigmaFloor;
      method = "sigma-floor-capped";
    }
    // Conservative cap from inferred signal class — candidates above
    // the tentative Otsu threshold. Take their 10th percentile and
    // require the final threshold ≤ 0.7 × p10_signal so the suggester
    // never sits ABOVE the smallest real event. If the cap would push
    // below the σ-floor, accept the σ-floor and mark capped.
    const signalClass = preFiltered
      .filter((c) => c.prominence >= otsuProm)
      .map((c) => c.prominence);
    if (signalClass.length >= 5) {
      const p10 = percentile(signalClass, 0.1);
      const cap = 0.7 * p10;
      if (cap < otsuProm) {
        if (cap < sigmaFloor) {
          otsuProm = sigmaFloor;
          method = "sigma-floor-capped";
        } else {
          otsuProm = cap;
        }
      }
    }
  }

  // ---- Final sanity cap against max candidate prominence -------------
  // The suggestion is a threshold a real peak must clear. By
  // construction it cannot exceed the largest topographic prominence
  // in the signal (no peak can clear a value taller than the tallest
  // peak). When a σ-derived fallback produces a value above the
  // signal's actual maximum prominence — most often when raw-MAD σ
  // is inflated by wide DC range / slow trends — clamp it down so a
  // real event has a chance to pass the gate.
  //
  // Using max (not a percentile) keeps the cap from firing on healthy
  // synthetic test signals: there, max corresponds to the tallest
  // event and a 70% factor leaves the suggestion above noise but
  // below the cap. The cap only bites when the suggestion is
  // pathologically high. Floored against 2σ so noise still gets
  // rejected.
  let maxCandidateProm = 0;
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].prominence > maxCandidateProm) {
      maxCandidateProm = candidates[i].prominence;
    }
  }
  if (maxCandidateProm > 0 && otsuProm > 0.7 * maxCandidateProm) {
    const cappedToMax = Math.max(0.7 * maxCandidateProm, sigmaFloor);
    if (cappedToMax < otsuProm) {
      otsuProm = cappedToMax;
      method = "sanity-capped";
    }
  }

  // ---- Window from half-height crossings of surviving events ---------
  // FWHM is the right scale for the NMS footprint: it captures the
  // event's actual extent, not the full topographic distance to the
  // next neighbor. Using `findBases` directly would measure inter-event
  // valley span (often 10x too wide for evenly-spaced events).
  const above = preFiltered.filter((c) => c.prominence >= otsuProm);
  let medianWidth = 0;
  let suggestedWindow = 20;
  if (above.length > 0) {
    const wideRange = Math.max(20, Math.floor(signal.length / 20));
    const widths = [];
    for (const c of above) {
      const peakY = signal[c.idx].y;
      // Lower of left/right topographic base ys = the "shoulder" below
      // which the apex truly rises. Anchors the half-height threshold.
      const { leftBaseIdx, rightBaseIdx } = findBases(
        signal,
        c.idx,
        wideRange,
        stats.globalMax
      );
      const baseY = Math.min(signal[leftBaseIdx].y, signal[rightBaseIdx].y);
      const midY = baseY + (peakY - baseY) * 0.5;
      // Walk left until signal drops to midY.
      let leftHalf = c.idx;
      for (let j = c.idx - 1; j >= Math.max(0, c.idx - wideRange); j--) {
        if (signal[j].y <= midY) {
          leftHalf = j;
          break;
        }
        leftHalf = j;
      }
      // Walk right until signal drops to midY.
      let rightHalf = c.idx;
      for (
        let j = c.idx + 1;
        j <= Math.min(signal.length - 1, c.idx + wideRange);
        j++
      ) {
        if (signal[j].y <= midY) {
          rightHalf = j;
          break;
        }
        rightHalf = j;
      }
      widths.push(rightHalf - leftHalf);
    }
    medianWidth = median(widths);
    // spikeWindow = half-width radius = FWHM / 2.
    suggestedWindow = Math.max(
      8,
      Math.min(Math.floor(signal.length / 50), Math.round(medianWidth * 0.5))
    );
  }

  return {
    prominence: {
      value: otsuProm,
      method,
      sigmaRobust,
      eventCount: above.length,
      candidateCount: preFiltered.length,
    },
    window: {
      value: suggestedWindow,
      medianWidth,
      eventCount: above.length,
    },
    sigmaRobust,
  };
}

// ---- Legacy thin wrappers ------------------------------------------------

/**
 * @deprecated Use `suggestSpikeParameters(signal).prominence.value`.
 * Retained so callers that haven't migrated yet still see the new
 * (consistent) value. `factor` is intentionally ignored; the value
 * comes from the guarded Otsu / fallback pipeline above.
 */
export function suggestProminence(signal /* , factor */) {
  if (!Array.isArray(signal) || signal.length === 0) return 1;
  return suggestSpikeParameters(signal).prominence.value;
}

/**
 * @deprecated Use `suggestSpikeParameters(signal).window.value`.
 * `prominence` and `num` are intentionally ignored — the new
 * implementation derives window from topographic widths, not from a
 * (broken) prominence × samplingRate formula.
 */
export function suggestWindow(signal /* , prominence, num */) {
  if (!Array.isArray(signal) || signal.length === 0) return 20;
  return suggestSpikeParameters(signal).window.value;
}
