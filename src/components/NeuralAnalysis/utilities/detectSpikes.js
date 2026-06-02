import { detectBursts } from "./burstDetection.js";
import { perf } from "./perfLogger.js";
import {
  computeSignalStats,
  findBases,
  kMeans,
  localMaxima,
  classifyMargin,
  worstTier,
  GATE_KEPT,
  GATE_PROMINENCE,
  GATE_ZONE,
  GATE_NOISE_FLOOR,
  GATE_KMEANS,
  GATE_WIDTH,
  GATE_SYMMETRY,
  GATE_NMS,
  GATE_MIN_DISTANCE,
  TIER_CLEAR_FAIL,
  TIER_MARGINAL_FAIL,
} from "./peakGeometry.js";

// Pushes a gate-result entry into the candidate's diagnostic record
// when a `diagnostics` Map has been supplied. Records accumulate as a
// candidate survives gates; for rejected candidates, this is the final
// entry. Each entry carries enough info for the Peak Inspector UI:
// metric value, gate threshold, and a discrete tier classification.
// `clear-fail` entries are skipped at the rejection site to keep the
// payload bounded on noisy wells where most local maxima fail Gate 1
// by a wide margin — far-failures aren't visually useful in the
// overlay and would otherwise blow past the 1500-record cap.
function recordGateResult(diagnostics, idx, gateEntry, signalPoint) {
  if (!diagnostics) return;
  let record = diagnostics.get(idx);
  if (!record) {
    record = {
      index: idx,
      peakX: signalPoint ? signalPoint.x : 0,
      peakY: signalPoint ? signalPoint.y : 0,
      rejectedBy: GATE_KEPT,
      tier: 0,
      gates: [],
      nmsSuppressor: null,
      detectionProminence: null,
    };
    diagnostics.set(idx, record);
  }
  record.gates.push(gateEntry);
}

// Public accessor for code outside detectSpikes that needs the signal
// median — e.g. the Baseline Threshold control seeds itself at the
// noise median when first enabled. Reuses the WeakMap cache inside
// computeSignalStats so repeat calls during slider drags collapse to
// a lookup.
export function getSignalMedianY(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return computeSignalStats(data).medianY;
}

// ---- Local windowed robust σ -------------------------------------------
// Block-wise MAD-derived σ for non-stationary noise. The signal is split
// into non-overlapping blocks of `windowSize` samples; per-block σ is
// computed on the residual (data − reference), or the data itself if no
// reference is supplied. Each sample inherits its block's σ.
//
// Why block-wise rather than truly rolling: a rolling sorted-window MAD
// requires double-rolling-sort (one for median, one for |x − median|),
// which is fiddly and only marginally more accurate. Block-wise is O(n)
// with `windowSize`-dominated constants and is enough to capture local
// noise variation across long recordings.
export function computeLocalRobustStd(data, reference, windowSize) {
  const n = data.length;
  if (n === 0 || !windowSize || windowSize < 2) return new Float64Array(0);
  const refValid =
    reference &&
    Array.isArray(reference) &&
    reference.length === n;
  const numBlocks = Math.max(1, Math.ceil(n / windowSize));
  const blockStds = new Float64Array(numBlocks);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * windowSize;
    const end = Math.min(start + windowSize, n);
    const w = end - start;
    if (w < 2) {
      blockStds[b] = 0;
      continue;
    }
    const block = new Array(w);
    for (let i = 0; i < w; i++) {
      const refY = refValid ? reference[start + i].y : 0;
      block[i] = data[start + i].y - refY;
    }
    const sorted = block.slice().sort((a, b) => a - b);
    const med = sorted[Math.floor(w / 2)];
    const absDevs = block.map((v) => Math.abs(v - med));
    absDevs.sort((a, b) => a - b);
    const mad = absDevs[Math.floor(w / 2)];
    blockStds[b] = mad / 0.6745;
  }

  // Expand to per-sample.
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const b = Math.min(numBlocks - 1, Math.floor(i / windowSize));
    out[i] = blockStds[b];
  }
  return out;
}

// ---- Residual-based robust σ -------------------------------------------
// MAD-derived σ on (data − reference). The residual IS the noise, so its
// σ is the right denominator for a "× σ" noise-floor threshold. Without
// this, σ comes from the smoothed `data` directly — which shrinks as
// smoothing strengthens, making the slider's units increasingly detached
// from the actual noise prominence.
//
// Returns the data-only robustStd when `reference` is null/undefined or
// length-mismatched.
export function computeResidualRobustStd(data, reference) {
  if (
    !reference ||
    !Array.isArray(reference) ||
    reference.length !== data.length
  ) {
    return computeSignalStats(data).robustStd;
  }
  const n = data.length;
  if (n === 0) return 0;
  const residuals = new Array(n);
  for (let i = 0; i < n; i++) {
    residuals[i] = data[i].y - reference[i].y;
  }
  const medianRes = residuals.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  const absDevs = residuals.map((r) => Math.abs(r - medianRes));
  const medianAbsDev = absDevs.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  return medianAbsDev / 0.6745;
}

// Class to encapsulate a detected neural spike (like Cardiac Peak)
export class NeuralPeak {
  constructor(
    peakCoords,
    leftBaseCoords,
    rightBaseCoords,
    prominences,
    data,
    idx,
    leftBaseIdx,
    rightBaseIdx
  ) {
    this.peakCoords = peakCoords; // {x, y}
    this.leftBaseCoords = leftBaseCoords; // {x, y}
    this.rightBaseCoords = rightBaseCoords; // {x, y}
    this.prominences = prominences; // {leftProminence, rightProminence}
    this.data = data; // full signal
    this.index = idx; // index in data
    this.leftBaseIdx = leftBaseIdx;
    this.rightBaseIdx = rightBaseIdx;

    // Calculate additional properties
    this.time = peakCoords.x;
    this.amplitude = Math.max(
      prominences.leftProminence,
      prominences.rightProminence
    );
    this.width = rightBaseIdx - leftBaseIdx; // Width in samples

    // Calculate AUC (Area Under Curve) using trapezoidal integration
    this.auc = this.calculateAUC();

    // Default: a regular detected peak. Outliers re-injected by
    // `readdOutliersAsSpikes` (outlierRemoval.js) explicitly overwrite
    // this to `true`. Without an explicit default, regular peaks had
    // `isOutlier === undefined` and the chart's `!pk.isOutlier` /
    // `pk.isOutlier` filter pair relied on the truthy-vs-undefined
    // cascade. Making the field explicitly false keeps the data shape
    // honest and is a guardrail against future refactors that might
    // tighten the filter to `=== true` / `=== false`.
    this.isOutlier = false;
  }

  calculateAUC() {
    const leftIdx = this.leftBaseIdx;
    const rightIdx = this.rightBaseIdx;
    const peakIdx = this.index;

    let auc = 0;
    // Integrate from left base to peak
    for (let i = leftIdx; i < peakIdx; i++) {
      const h1 = this.data[i].y - this.leftBaseCoords.y;
      const h2 = this.data[i + 1].y - this.leftBaseCoords.y;
      auc += (h1 + h2) / 2; // Trapezoidal rule
    }
    // Integrate from peak to right base
    for (let i = peakIdx; i < rightIdx; i++) {
      const h1 = this.data[i].y - this.rightBaseCoords.y;
      const h2 = this.data[i + 1].y - this.rightBaseCoords.y;
      auc += (h1 + h2) / 2; // Trapezoidal rule
    }
    return Math.abs(auc); // Ensure positive area
  }
}

/**
 * Simple k-means clustering for 1D data with k=2.
 * @param {number[]} data - Array of numbers to cluster
 * @param {number} k - Number of clusters (fixed to 2)
 * @returns {Object} {centroids: [number, number], assignments: number[]}
 */
// kMeans now lives in peakGeometry.js so the auto-suggest module can
// share the same implementation. Imported at the top of this file.

// `findBases` now lives in peakGeometry.js so the auto-suggest module
// can share the same topographic walk. Imported at the top of this
// file. `findBasesAtBaseline` below is detection-specific (baseline-
// crossing semantics for AUC/width reporting) and stays here.

/**
 * Find left and right bases by intersecting the signal with a fixed
 * horizontal baseline Y value. Used by the user-controlled Baseline
 * Threshold line: when enabled, peak bases are the first sample on
 * either side of the peak where the signal *crosses* the baseline,
 * rather than the lowest local minimum (default findBases behavior).
 * This is what the client wants for measuring peak width + AUC.
 *
 * If the peak apex is at or below the baseline, the baseline misses
 * the peak entirely — in that case fall back to the peak index for
 * both bases so the peak still records (width 0, AUC 0) instead of
 * silently dropping out of the result set.
 *
 * @param {{x: number, y: number}[]} data - The signal data
 * @param {number} peakIdx - Index of the peak
 * @param {number} searchRange - Maximum range to search for crossings
 * @param {number} baselineY - Absolute Y value of the baseline line
 * @returns {{leftBaseIdx: number, rightBaseIdx: number}}
 */
function findBasesAtBaseline(data, peakIdx, searchRange, baselineY) {
  let leftBaseIdx = peakIdx;
  let rightBaseIdx = peakIdx;

  const peakY = data[peakIdx].y;
  if (!(peakY > baselineY)) {
    // Peak doesn't rise above the baseline; degenerate width 0.
    return { leftBaseIdx, rightBaseIdx };
  }

  // Walk left: first sample at or below baseline becomes the left base.
  const leftLimit = Math.max(0, peakIdx - searchRange);
  for (let j = peakIdx - 1; j >= leftLimit; j--) {
    if (data[j].y <= baselineY) {
      leftBaseIdx = j;
      break;
    }
  }

  // Walk right: first sample at or below baseline becomes the right base.
  const rightLimit = Math.min(data.length - 1, peakIdx + searchRange);
  for (let j = peakIdx + 1; j <= rightLimit; j++) {
    if (data[j].y <= baselineY) {
      rightBaseIdx = j;
      break;
    }
  }

  return { leftBaseIdx, rightBaseIdx };
}

/**
 * Filter true spikes using k-means clustering on prominence.
 *
 * Parameters are passed down from detectSpikes() for consistent configuration.
 *
 * @param {NeuralPeak[]} peaks - Detected peaks
 * @param {number} minWidth - Minimum width in samples to consider a true spike
 * @param {number} minDistance - Minimum distance in samples between spikes
 * @param {number} minProminenceRatio - Minimum ratio of min to max prominence for symmetry
 * @returns {NeuralPeak[]} Filtered true spikes
 */
function findTrueSpikes(
  peaks,
  minWidth = 5,
  minDistance = 10,
  minProminenceRatio = 0.01,
  robustStd = 0, // robust noise estimate (global)
  stdMultiplier = 1.5, // gates whole-detection k-means cutoff
  noiseFloorMultiplier = 0, // per-peak floor; 0 = disabled
  localStds = null, // optional Float64Array — when present, per-peak σ is localStds[peak.index]
  apexSet = null, // Set<number> of outlier apex `index` values; peaks at these indices bypass the k-means cluster filter
  spikeWindow = 0, // NMS footprint radius in samples (0 disables NMS)
  diagnostics = null, // optional Map<index, record> for Decision Explanation Layer
  data = null // underlying signal — needed for diagnostic peakX/peakY when first emitting a record here
) {
  if (!Array.isArray(peaks) || peaks.length < 2) {
    const filtered = peaks.filter((p) => p.width >= minWidth);
    return filtered;
  }

  perf.count(`spikeFilter.input=${peaks.length}`);

  // Partition into outliers vs. normal peaks. Outliers BYPASS the
  // k-means cluster filter (huge outlier prominences would otherwise
  // dominate the cluster split and force every smaller real peak into
  // the "noise" cluster, which is then dropped). Outliers still go
  // through minWidth / symmetry / distance / noise-floor filters
  // along with the normal peaks below, so a 1-sample-wide artifact
  // can't sneak in unfiltered.
  let outlierPeaks = [];
  let normalPeaks = peaks;
  if (apexSet && apexSet.size > 0) {
    outlierPeaks = peaks.filter((p) => apexSet.has(p.index));
    normalPeaks = peaks.filter((p) => !apexSet.has(p.index));
  }

  // Prefer the detection prominence (topographic, unbounded-search
  // bases) over the measurement prominence (which can use wide
  // baseline-crossing bases). Without this, a slope sample on a tall
  // spike inherits the same wide footprint as the apex and gets an
  // apex-equivalent measurement prominence — k-means then can't
  // separate it from real signal. Falls back to the measurement
  // prominence when detection metadata is absent (re-injected outliers
  // from `readdOutliersAsSpikes` don't carry it).
  const detProm = (p) =>
    typeof p.detectionProminence === "number"
      ? p.detectionProminence
      : Math.min(p.prominences.leftProminence, p.prominences.rightProminence);
  let prominences = normalPeaks.map(detProm);
  // Reassigned below so the post-k-means filter chain uses the right
  // `peaks` variable name. Names kept compatible with the existing
  // code below the k-means block.
  peaks = normalPeaks;

  // Per-peak noise-floor pre-filter (normals only). σ is local-windowed
  // when `localStds` is provided, otherwise the global robustStd.
  // Outliers bypass this — they're by definition prominence outliers and
  // shouldn't be rejected by a noise floor. When the multiplier is 0
  // (default), this is a no-op.
  if (noiseFloorMultiplier > 0) {
    const keptPeaks = [];
    const keptProms = [];
    for (let i = 0; i < peaks.length; i++) {
      const pk = peaks[i];
      const sigma =
        localStds && localStds.length > 0
          ? localStds[pk.index]
          : robustStd;
      const floor = noiseFloorMultiplier * sigma;
      const passed = prominences[i] >= floor;
      // Emit unconditionally past Gate 1 — once a candidate reaches
      // here it's already in the trimmed "diagnostically interesting"
      // set (Gate 1 dropped the 10K-50K clear-fail noise wiggles),
      // so per-gate filtering is no longer needed for payload control.
      if (diagnostics) {
        const tier = classifyMargin(prominences[i], floor, Math.max(floor, 1e-9));
        recordGateResult(
          diagnostics,
          pk.index,
          {
            id: GATE_NOISE_FLOOR,
            value: prominences[i],
            threshold: floor,
            tier,
            status: passed ? "pass" : "fail",
            noiseSigma: sigma,
          },
          data ? data[pk.index] : pk.peakCoords
        );
        if (!passed) {
          const rec = diagnostics.get(pk.index);
          if (rec) rec.rejectedBy = GATE_NOISE_FLOOR;
        }
      }
      if (passed) {
        keptPeaks.push(pk);
        keptProms.push(prominences[i]);
      }
    }
    peaks = keptPeaks;
    prominences = keptProms;
  }
  perf.count(`spikeFilter.afterNoiseFloor=${peaks.length}`);

  // K-means circuit-breaker (normals only). The previous logic kept
  // ONLY the top cluster, which silently dropped every smaller-but-
  // real event when the well had a wide amplitude spread (e.g. Ca²⁺
  // events from 0.05 to 0.18 → k-means clusters ~0.10, drops the
  // smaller half). That cluster-keep behavior didn't match what
  // `stdMultiplier` is named after, and it ran before NMS could
  // dedup slope candidates. Now k-means is purely a noise-only bail-
  // out: when both clusters look like noise (higher centroid below
  // the σ-derived noise threshold AND clusters poorly separated)
  // we drop everything. Otherwise we keep every normal peak — slope
  // / duplicate dedup happens in NMS below.
  let afterKMeans = peaks;
  if (peaks.length >= 2) {
    const { centroids } = kMeans(prominences, 2);
    const higherCentroid = Math.max(...centroids);
    const lowerCentroid = Math.min(...centroids);
    const clusterSeparation = higherCentroid - lowerCentroid;
    const noiseThreshold = stdMultiplier * robustStd;

    if (
      higherCentroid < noiseThreshold &&
      clusterSeparation < noiseThreshold * 0.5
    ) {
      // K-means bailout: the whole well looks like noise. Every peak
      // gets dropped here. Diagnostically mark each one with kmeans
      // rejection + the cluster-distance metric so the Inspector can
      // show "your top cluster sits at X, noise threshold is Y".
      if (diagnostics) {
        for (const pk of peaks) {
          const tier = classifyMargin(
            higherCentroid,
            noiseThreshold,
            Math.max(noiseThreshold, 1e-9)
          );
          if (tier <= TIER_MARGINAL_FAIL) {
            recordGateResult(
              diagnostics,
              pk.index,
              {
                id: GATE_KMEANS,
                value: higherCentroid,
                threshold: noiseThreshold,
                tier,
                status: "fail",
                clusterSeparation,
              },
              data ? data[pk.index] : pk.peakCoords
            );
          }
          const rec = diagnostics.get(pk.index);
          if (rec) rec.rejectedBy = GATE_KMEANS;
        }
      }
      afterKMeans = [];
    }
    // else: keep every peak. Lower-cluster real events survive at
    // this stage; NMS picks the apex within each event's footprint.
  }
  perf.count(`spikeFilter.afterKMeans=${afterKMeans.length}`);

  // Merge outliers back in. Outliers bypassed noise-floor + k-means but
  // still go through width / symmetry / distance below alongside the
  // surviving normals.
  let filteredPeaks = outlierPeaks.length > 0
    ? [...outlierPeaks, ...afterKMeans]
    : afterKMeans;

  // Width gate. Emit a per-candidate record unconditionally — past
  // Gate 1, the candidate set is already trimmed to "diagnostically
  // interesting" peaks. Inspector wants the full per-gate breakdown.
  if (diagnostics) {
    for (const p of filteredPeaks) {
      const passed = p.width >= minWidth;
      const tier = classifyMargin(p.width, minWidth, Math.max(minWidth, 1));
      recordGateResult(
        diagnostics,
        p.index,
        {
          id: GATE_WIDTH,
          value: p.width,
          threshold: minWidth,
          tier,
          status: passed ? "pass" : "fail",
        },
        data ? data[p.index] : p.peakCoords
      );
      if (!passed) {
        const rec = diagnostics.get(p.index);
        if (rec) rec.rejectedBy = GATE_WIDTH;
      }
    }
  }
  filteredPeaks = filteredPeaks.filter((p) => p.width >= minWidth);
  perf.count(`spikeFilter.afterWidth=${filteredPeaks.length}`);

  // Apply prominence ratio filter for symmetry. Uses detection
  // prominences (topographic) when available so a slope sample with a
  // wide measurement footprint can't satisfy the symmetry test by
  // virtue of sharing the apex's left/right baseline crossings.
  if (minProminenceRatio > 0) {
    const next = [];
    for (const p of filteredPeaks) {
      const proms = p.detectionProminences || p.prominences;
      const left = proms.leftProminence;
      const right = proms.rightProminence;
      const denom = Math.max(left, right);
      const ratio = denom > 0 ? Math.min(left, right) / denom : 0;
      const passed = ratio >= minProminenceRatio;
      if (diagnostics) {
        const tier = classifyMargin(
          ratio,
          minProminenceRatio,
          Math.max(minProminenceRatio, 1e-9)
        );
        recordGateResult(
          diagnostics,
          p.index,
          {
            id: GATE_SYMMETRY,
            value: ratio,
            threshold: minProminenceRatio,
            tier,
            status: passed ? "pass" : "fail",
          },
          data ? data[p.index] : p.peakCoords
        );
        if (!passed) {
          const rec = diagnostics.get(p.index);
          if (rec) rec.rejectedBy = GATE_SYMMETRY;
        }
      }
      if (passed) next.push(p);
    }
    filteredPeaks = next;
  }
  perf.count(`spikeFilter.afterSymmetry=${filteredPeaks.length}`);

  // Prominence-aware NMS (Layer 3). Replaces the old chronological-
  // first-wins distance filter, which kept whichever peak happened to
  // come first in time even when a taller / more prominent peak sat
  // right next to it. The new rule: sort all surviving candidates by
  // detection prominence DESC (outlier apexes win ties; apex Y is the
  // final tie-breaker) and greedily accept the next-best candidate
  // only when it falls outside every already-accepted candidate's
  // footprint. Footprint radius is `spikeWindow` (the existing
  // "Window Width" knob), so the slider still controls how aggressive
  // the dedup is — narrow window keeps adjacent peaks separate, wide
  // window collapses them.
  //
  // Skipped when spikeWindow is 0 or there are <2 peaks: nothing to
  // suppress.
  if (spikeWindow > 0 && filteredPeaks.length > 1) {
    const apexHas = (idx) => apexSet && apexSet.has(idx);
    const detP = (p) =>
      typeof p.detectionProminence === "number"
        ? p.detectionProminence
        : Math.min(p.prominences.leftProminence, p.prominences.rightProminence);
    const sortedByPriority = [...filteredPeaks].sort((a, b) => {
      // Outlier apex wins (ensures `readdOutliersAsSpikes` flagged peaks
      // and structurally-identified outlier apexes are always preferred
      // when they fall inside a footprint containing a non-outlier).
      const aOutlier = apexHas(a.index);
      const bOutlier = apexHas(b.index);
      if (aOutlier !== bOutlier) return aOutlier ? -1 : 1;
      const dp = detP(b) - detP(a);
      if (dp !== 0) return dp;
      return b.peakCoords.y - a.peakCoords.y;
    });
    // Accepted footprints stored as sorted-by-index intervals for an
    // O(n log n) overlap check via binary search. For typical detected-
    // spike counts (≤ a few thousand) a linear scan over accepted peaks
    // would also be fine; the binary search keeps it well-behaved on
    // pathological-density inputs.
    const accepted = []; // { peak, start, end }
    // Find the suppressing peak (first accepted footprint that
    // contains idx) so we can attribute NMS rejections to a specific
    // suppressor for the Inspector's "suppressed by peak at t=X" line.
    const suppressorFor = (idx) => {
      for (let i = 0; i < accepted.length; i++) {
        const f = accepted[i];
        if (idx >= f.start && idx <= f.end) return f.peak;
      }
      return null;
    };
    for (const p of sortedByPriority) {
      const suppressor = suppressorFor(p.index);
      if (suppressor !== null) {
        if (diagnostics) {
          const overlap = spikeWindow - Math.abs(p.index - suppressor.index);
          const promRatio =
            suppressor.detectionProminence != null && p.detectionProminence
              ? suppressor.detectionProminence / p.detectionProminence
              : null;
          // NMS doesn't have a numeric margin — represent the rejection
          // as marginal-fail (it was a near-miss in the suppressor's
          // footprint). The Inspector renders this as text rather than
          // a percentage.
          recordGateResult(
            diagnostics,
            p.index,
            {
              id: GATE_NMS,
              value: p.index,
              threshold: suppressor.index,
              tier: TIER_MARGINAL_FAIL,
              status: "fail",
              suppressorIndex: suppressor.index,
              suppressorPromRatio: promRatio,
              overlapSamples: Math.max(0, overlap),
            },
            data ? data[p.index] : p.peakCoords
          );
          const rec = diagnostics.get(p.index);
          if (rec) {
            rec.rejectedBy = GATE_NMS;
            rec.nmsSuppressor = {
              index: suppressor.index,
              promRatio,
              overlapSamples: Math.max(0, overlap),
            };
          }
        }
        continue;
      }
      accepted.push({
        peak: p,
        start: p.index - spikeWindow,
        end: p.index + spikeWindow,
      });
    }
    filteredPeaks = accepted.map((a) => a.peak);
  }
  perf.count(`spikeFilter.afterNMS=${filteredPeaks.length}`);

  // `spikeMinDistance` survives as an additional hard minimum-gap floor
  // applied to the NMS survivors. Operates in chronological order now
  // (NMS already chose the best peak per footprint, so chronological
  // walk is unambiguous), keeping the lower-index peak when two land
  // closer than `minDistance` apart. Setting `minDistance` ≤ 0 disables
  // this floor; the slider sits at 0 by default.
  if (minDistance > 0 && filteredPeaks.length > 1) {
    filteredPeaks.sort((a, b) => a.index - b.index);
    const result = [filteredPeaks[0]];
    for (let i = 1; i < filteredPeaks.length; i++) {
      const gap = filteredPeaks[i].index - result[result.length - 1].index;
      const passed = gap >= minDistance;
      if (diagnostics) {
        const tier = classifyMargin(gap, minDistance, Math.max(minDistance, 1));
        recordGateResult(
          diagnostics,
          filteredPeaks[i].index,
          {
            id: GATE_MIN_DISTANCE,
            value: gap,
            threshold: minDistance,
            tier,
            status: passed ? "pass" : "fail",
          },
          data ? data[filteredPeaks[i].index] : filteredPeaks[i].peakCoords
        );
        if (!passed) {
          const rec = diagnostics.get(filteredPeaks[i].index);
          if (rec) rec.rejectedBy = GATE_MIN_DISTANCE;
        }
      }
      if (passed) result.push(filteredPeaks[i]);
    }
    filteredPeaks = result;
  }
  perf.count(`spikeFilter.afterDistance=${filteredPeaks.length}`);

  return filteredPeaks;
}

export function detectSpikes(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  if (
    typeof data[0] !== "object" ||
    data[0] === null ||
    !("x" in data[0]) ||
    !("y" in data[0])
  ) {
    console.error("[detectSpikes] ❌ Invalid data format:", data[0]);
    throw new Error("detectSpikes expects array of {x, y} objects");
  }

  // Extracted options with adjusted defaults
  let prominence = options.prominence ?? 0;
  const wlen = options.window ?? null; // Disable grouping by default
  const minWidth = options.minWidth ?? 5;
  const minDistance = options.minDistance ?? 10;
  const minProminenceRatio = options.minProminenceRatio ?? 10;
  const stdMultiplier = options.stdMultiplier ?? 3; // Used for cluster separation check (not individual peak filtering)
  const noiseFloorMultiplier = options.noiseFloorMultiplier ?? 0; // Per-peak noise floor; 0 = disabled
  const noiseReference = options.noiseReference ?? null; // Pre-smoothing signal for residual-based σ
  const localStds = options.localStds ?? null; // Optional per-sample Float64Array of σ — adapts to non-stationary noise
  // Baseline override: when the user enables the Baseline Threshold
  // line on the chart, `baselineY` is the absolute Y value of that
  // line and `useBaselineForBases` is true. Bases become the signal's
  // crossings with that line rather than the lowest local minima.
  const useBaselineForBases = options.useBaselineForBases === true;
  const baselineY = options.baselineY;
  // Outlier spike structures (Array of { startIdx, peakIdx, endIdx, ... })
  // identified up-pipeline. Two derived index sets are used downstream:
  //
  //   apexSet  — just the `peakIdx` values. Used to give outliers
  //              priority in window-grouping and to bypass the k-means
  //              cluster filter in `findTrueSpikes`.
  //   zoneSet  — every sample index covered by any outlier's spike
  //              region (start → end inclusive). Used to *drop* normal
  //              detectSpikes peaks whose index falls inside an outlier's
  //              spike structure. These are not separate events; they're
  //              noise wiggles on the outlier's own plateau. Suppressing
  //              them by the spike's own start/end range (rather than by
  //              `wlen/2` from the outlier apex) means the suppression
  //              radius adapts to each spike's actual width, so it works
  //              across varying spike shapes / sample rates / signal types
  //              without parameter tuning.
  const outlierSpikes = Array.isArray(options.outlierSpikes)
    ? options.outlierSpikes
    : null;
  let apexSet = null;
  let zoneSet = null;
  if (outlierSpikes && outlierSpikes.length > 0) {
    apexSet = new Set();
    zoneSet = new Set();
    for (const s of outlierSpikes) {
      if (typeof s.peakIdx === "number") apexSet.add(s.peakIdx);
      const a = typeof s.startIdx === "number" ? s.startIdx : null;
      const b = typeof s.endIdx === "number" ? s.endIdx : null;
      if (a !== null && b !== null) {
        for (let k = a; k <= b; k++) zoneSet.add(k);
      }
    }
  }

  // Signal-derived statistics (cached per data-array identity — see
  // computeSignalStats above).
  const {
    globalMax,
    finalBaselineThreshold,
    fallbackThreshold,
  } = computeSignalStats(data);

  // Pick the σ used by the noise-floor check. When a `noiseReference` is
  // supplied (the pre-smoothing signal), σ is computed from the residual
  // (data − reference) — i.e. the actual noise. Otherwise fall back to σ
  // of the data itself. Both are MAD-derived (robust to spikes).
  const robustStd = noiseReference
    ? computeResidualRobustStd(data, noiseReference)
    : computeSignalStats(data).robustStd;

  // Auto-set prominence if 'auto'
  if (prominence === "auto") {
    prominence = 2 * robustStd;
  }

  // Local-maxima scan (with plateau handling) now lives in
  // peakGeometry.js. Both detection and the auto-suggest helpers use
  // it so the candidate set is identical across both.
  let peakIndices = localMaxima(data);

  // Compute bases ONCE per peak (was previously computed twice — first
  // for prominence filtering, then again to build the NeuralPeak in the
  // second pass). Cache here is per-detection, keyed on peakIdx.
  //
  // Two modes:
  //   1) `useBaselineForBases` true: bases are the signal's crossings
  //      with the user-controlled Baseline Threshold line. No fallback
  //      ladder — the user picked the Y, we honor it.
  //   2) Default: bases are the lowest local minimum near the peak,
  //      respecting one of three baseline-cap fallbacks
  //      (finalBaselineThreshold → fallbackThreshold → globalMax).
  const baseCache = new Map();
  const baselineMode =
    useBaselineForBases && typeof baselineY === "number" && isFinite(baselineY);
  function basesFor(peakIdx) {
    let cached = baseCache.get(peakIdx);
    if (cached !== undefined) return cached;
    // Step B: `spikeWindow` (= wlen) now means "half-width radius of a
    // typical event." Detection-base search range uses the full wlen
    // (previously wlen/2). NMS also uses wlen as the suppression
    // radius, so the two are consistent.
    const searchRange = wlen ? wlen : data.length;
    let leftBaseIdx, rightBaseIdx;
    if (baselineMode) {
      // Search the full signal, not just ±wlen/2 around the peak.
      // Ca2+ spikes routinely span many tens of samples — far wider
      // than the spike-window param — so the baseline crossings live
      // well outside the local search window. Without unbounded
      // search, `findBasesAtBaseline` returns degenerate
      // peakIdx/peakIdx bases for every peak, which collapses peak
      // width and AUC to 0 (regression introduced when
      // baselineThresholdEnabled became default-on). The walks stop
      // at the *nearest* crossing on each side, so widening the
      // range doesn't risk crossing into a neighboring peak's
      // territory — it just lets the search find the answer.
      ({ leftBaseIdx, rightBaseIdx } = findBasesAtBaseline(
        data,
        peakIdx,
        data.length,
        baselineY
      ));
      // Safety net: if baseline mode still can't place sensible
      // bases (peak below the baseline line, or the signal never
      // returns to baseline within the signal's reach), fall back
      // to local-minima bases through the same three-step ladder
      // used in non-baseline mode. Without this, the user can drag
      // the baseline above the peaks and silently zero out every
      // AUC reading.
      if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
        ({ leftBaseIdx, rightBaseIdx } = findBases(
          data,
          peakIdx,
          searchRange,
          finalBaselineThreshold
        ));
        if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
          ({ leftBaseIdx, rightBaseIdx } = findBases(
            data,
            peakIdx,
            searchRange,
            fallbackThreshold
          ));
        }
        if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
          ({ leftBaseIdx, rightBaseIdx } = findBases(
            data,
            peakIdx,
            searchRange,
            globalMax
          ));
        }
      }
    } else {
      ({ leftBaseIdx, rightBaseIdx } = findBases(
        data,
        peakIdx,
        searchRange,
        finalBaselineThreshold
      ));
      if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
        ({ leftBaseIdx, rightBaseIdx } = findBases(
          data,
          peakIdx,
          searchRange,
          fallbackThreshold
        ));
      }
      if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
        ({ leftBaseIdx, rightBaseIdx } = findBases(
          data,
          peakIdx,
          searchRange,
          globalMax
        ));
      }
    }
    cached = { leftBaseIdx, rightBaseIdx };
    baseCache.set(peakIdx, cached);
    return cached;
  }

  // Detection bases are ALWAYS topographic — they use `findBases`
  // regardless of `baselineMode`. That keeps event-selection decoupled
  // from the user-facing baseline-crossing measurement: the prominence
  // gate sees a true scipy-style prominence, while `basesFor()`
  // continues to feed the reported width / AUC / left/right base
  // coordinates on the NeuralPeak.
  //
  // Without this split, baselineMode's wide bases gave a slope sample
  // on the upslope of a tall spike the same baseline-cross footprint
  // as the apex — the gate then accepted the slope sample because it
  // saw apex-level prominence. With topographic findBases (which
  // anchors each side at the nearest "the signal climbs back above the
  // candidate" point), a slope sample on a steep rise has its right
  // base pinned at the very next sample (still on the upslope, above
  // the candidate's y) — rightProminence collapses to 0 and the gate
  // rejects it.
  //
  // Step B: detection-base search uses the full wlen (same as the
  // non-baseline branch of `basesFor`). spikeWindow now means
  // "half-width radius of a typical event"; both base-search and NMS
  // suppression use the same value, so the prominences fed to the
  // gate are in the same units as the NMS footprint that follows.
  const detectionBaseCache = new Map();
  function detectionBasesFor(peakIdx) {
    let cached = detectionBaseCache.get(peakIdx);
    if (cached !== undefined) return cached;
    const searchRange = wlen ? wlen : data.length;
    const { leftBaseIdx, rightBaseIdx } = findBases(
      data,
      peakIdx,
      searchRange,
      globalMax
    );
    const leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    const rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    cached = {
      leftBaseIdx,
      rightBaseIdx,
      prominences: { leftProminence, rightProminence },
      prominence: Math.min(leftProminence, rightProminence),
    };
    detectionBaseCache.set(peakIdx, cached);
    return cached;
  }

  // First-pass gate uses the existing measurement prominence so users'
  // saved `spikeProminence` slider values stay valid — switching the
  // gate to detection prominence (smaller, `wlen/2`-bounded) would
  // silently reject every peak unless they recalibrated. The actual
  // slope-vs-apex discrimination happens in Layer 3 (prominence-aware
  // NMS over detection footprints): slope samples accumulate at the
  // gate, then NMS keeps only the apex of each footprint. Detection
  // metadata still flows downstream — k-means/symmetry use it via
  // `detectionBasesFor` / the metadata attached to each NeuralPeak.
  // Step D: prominence gate uses TOPOGRAPHIC (detection) bases, not
  // baseline-crossing measurement bases. A slope sample on the upslope
  // of a tall spike inherits the same baseline-crossing footprint as
  // the apex — under measurement-prominence the gate gave the slope
  // sample apex-level prominence and let it through. Under topographic
  // bases the slope sample's right base is pinned at the very next
  // sample (still on the upslope, above the candidate's y) →
  // rightProminence collapses to 0, fails the gate. The apex is
  // strictly higher than both neighbors → positive prominence →
  // passes. The reported `prominences` field on each NeuralPeak still
  // uses `basesFor` (Step D leaves that untouched), so CSV / UI
  // measurements are unchanged.
  const diagnostics = options.diagnostics instanceof Map ? options.diagnostics : null;
  // Optional raw-prominence collector — when provided, every local
  // maximum's detection prominence gets pushed for the caller to bin
  // into a histogram. This is the unbiased input for the candidate
  // prominence distribution (separate from the 1500-record diagnostics
  // cap, which would otherwise skew the histogram toward high-prominence
  // survivors). Released immediately after binning at the pipeline level.
  const candidateProminencesOut = Array.isArray(
    options.candidateProminencesOut
  )
    ? options.candidateProminencesOut
    : null;
  let filteredPeakIndices = [];
  for (let peakIdx of peakIndices) {
    const det = detectionBasesFor(peakIdx);
    if (candidateProminencesOut) {
      candidateProminencesOut.push(det.prominence);
    }
    const passed = det.prominence >= prominence;
    if (diagnostics) {
      const tier = classifyMargin(
        det.prominence,
        prominence,
        Math.max(prominence, 1e-9)
      );
      // Emit a record for every candidate that's not a clear-fail at
      // Gate 1. On noisy wells this gate sees 10K–50K candidates;
      // dropping clear-fails here keeps the diagnostic array bounded
      // to the visually-relevant near-misses (and all survivors).
      if (tier <= TIER_MARGINAL_FAIL || passed) {
        recordGateResult(
          diagnostics,
          peakIdx,
          {
            id: GATE_PROMINENCE,
            value: det.prominence,
            threshold: prominence,
            tier,
            status: passed ? "pass" : "fail",
          },
          data[peakIdx]
        );
        // Cache the detection prominence on the record — used later
        // for the 1500-cap sort and surfaced in the Inspector header.
        const rec = diagnostics.get(peakIdx);
        if (rec) rec.detectionProminence = det.prominence;
        if (!passed) {
          if (rec) rec.rejectedBy = GATE_PROMINENCE;
        }
      }
    }
    if (passed) filteredPeakIndices.push(peakIdx);
  }

  // Outlier-zone pre-filter (runs before window-grouping). Drop any
  // normal peak whose index falls inside an identified outlier's spike
  // structure — those are noise wiggles on the same event's plateau,
  // not separate events. The outlier apex itself is preserved (it's in
  // both apexSet and zoneSet; the apex check keeps it). This uses each
  // outlier's actual start/end range from `detectSpikeStructure`, so
  // the suppression radius is set by the spike's true width and
  // doesn't depend on the `wlen` param — works across signal types and
  // sample rates without tuning.
  let zoneFilteredPeakIndices = filteredPeakIndices;
  if (zoneSet) {
    zoneFilteredPeakIndices = [];
    for (const idx of filteredPeakIndices) {
      const passed = !zoneSet.has(idx) || apexSet.has(idx);
      if (passed) {
        zoneFilteredPeakIndices.push(idx);
      } else if (diagnostics) {
        // Zone is a hard membership gate — there's no numeric margin.
        // Surface as marginal-fail so it's visible in the overlay but
        // tier-1 (worst case) so it doesn't drown out signal gates.
        recordGateResult(
          diagnostics,
          idx,
          {
            id: GATE_ZONE,
            value: 1,
            threshold: 0,
            tier: TIER_MARGINAL_FAIL,
            status: "fail",
          },
          data[idx]
        );
        const rec = diagnostics.get(idx);
        if (rec) rec.rejectedBy = GATE_ZONE;
      }
    }
  }

  // Window-grouping is now done by Layer 3's prominence-aware NMS in
  // `findTrueSpikes` — it operates on NeuralPeak instances (so it can
  // sort by detection prominence and use detection footprints) and
  // supersedes the old chain-of-first-peak heuristic that lived here.
  // We pass every gate-survivor through unchanged so NMS has the full
  // candidate set to choose from.
  const finalFilteredPeakIndices = zoneFilteredPeakIndices;

  let peaks = [];
  for (let peakIdx of finalFilteredPeakIndices) {
    const { leftBaseIdx, rightBaseIdx } = basesFor(peakIdx);
    let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    let prominences = { leftProminence, rightProminence };
    let leftBaseCoords = data[leftBaseIdx];
    let peakCoords = data[peakIdx];
    let rightBaseCoords = data[rightBaseIdx];
    const peak = new NeuralPeak(
      peakCoords,
      leftBaseCoords,
      rightBaseCoords,
      prominences,
      data,
      peakIdx,
      leftBaseIdx,
      rightBaseIdx
    );
    // Attach detection metadata for downstream gates / NMS without
    // disturbing the NeuralPeak public surface used by CSV reports and
    // the UI. `prominences` above stays as the user-facing measurement
    // (from baseline-crossing bases when baselineMode is on).
    const det = detectionBasesFor(peakIdx);
    peak.detectionLeftBaseIdx = det.leftBaseIdx;
    peak.detectionRightBaseIdx = det.rightBaseIdx;
    peak.detectionProminences = det.prominences;
    peak.detectionProminence = det.prominence;
    peak.noiseSigma =
      localStds && localStds.length > 0 ? localStds[peakIdx] : robustStd;
    peaks.push(peak);
  }

  const finalSpikes = findTrueSpikes(
    peaks,
    minWidth,
    minDistance,
    minProminenceRatio,
    robustStd,
    stdMultiplier,
    noiseFloorMultiplier,
    localStds,
    apexSet,
    wlen, // Layer 3 NMS footprint radius
    diagnostics,
    data
  );

  // Finalize kept-peak records: any candidate whose record made it to
  // the end without a non-zero `rejectedBy` is a kept peak. Its overall
  // tier is the worst across all gates it was evaluated against — that
  // tier drives the marginal-pass ring in the candidate overlay (peaks
  // with a tier ≥ 1 are visibly "close to a rejection" and the user
  // can tell at a glance which ones are about to flip on a slider drag).
  if (diagnostics) {
    const survivingIndices = new Set();
    for (const sp of finalSpikes) survivingIndices.add(sp.index);
    for (const rec of diagnostics.values()) {
      if (survivingIndices.has(rec.index)) {
        rec.rejectedBy = GATE_KEPT;
        rec.tier = worstTier(rec.gates.map((g) => g.tier));
      } else if (rec.rejectedBy === GATE_KEPT) {
        // Sanity: a record without an explicit rejectedBy that isn't
        // in the survivor set must have been silently dropped (e.g.
        // K-means bailout already marked it, but we also catch any
        // hole here). The last gate it has is the failing one.
        if (rec.gates.length > 0) {
          const last = rec.gates[rec.gates.length - 1];
          if (last.status === "fail") rec.rejectedBy = last.id;
        }
      } else {
        // Record's rejectedBy was set during a gate's reject branch;
        // the tier is the tier of the gate at which it failed.
        const failing = rec.gates.find((g) => g.id === rec.rejectedBy);
        if (failing) rec.tier = failing.tier;
      }
    }
  }

  return finalSpikes;
}

/**
 * Detect spikes and bursts in a 1D signal array, robust to plateaus and noise.
 * Emulates logic from Cardiac PeakFinder.js with global baseline threshold for accurate base detection.
 *
 * All parameters are defined at the top of the function and passed down to helper functions
 * for better organization and maintainability.
 *
 * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
 * @param {Object} [options] - Configuration object
 * @param {number} [options.prominence] - Minimum prominence (height above neighbors)
 * @param {number} [options.window] - Optional window width for grouping peaks (samples)
 * @param {number} [options.minWidth] - Minimum width in samples for true spikes
 * @param {number} [options.minDistance] - Minimum distance in samples between spikes
 * @param {number} [options.minProminenceRatio] - Minimum ratio of min to max prominence for symmetry
 * @param {number} [options.maxInterSpikeInterval] - Maximum time between spikes for burst detection
 * @param {number} [options.minSpikesPerBurst] - Minimum spikes per burst
 * @returns {Object} {peaks: NeuralPeak[], bursts: NeuralBurst[]}
 */
export function detectSpikesAndBursts(data, options = {}) {
  const spikeResults = detectSpikes(data, options);
  const burstResults = detectBursts(spikeResults, options);

  return { peaks: spikeResults, bursts: burstResults };
}

// Simplified spike detection based on CardiacAnalysis PeakFinder.js
// with added Savitzky-Golay filtering for noise reduction

/**
 * NeuralPeak class - similar to Cardiac Peak class
 */
// export class NeuralPeak {
//   constructor(peakCoords, leftBaseCoords, rightBaseCoords, prominences, data) {
//     this.peakCoords = peakCoords; // {x, y}
//     this.leftBaseCoords = leftBaseCoords; // {x, y}
//     this.rightBaseCoords = rightBaseCoords; // {x, y}
//     this.prominences = prominences; // {leftProminence, rightProminence}
//     this.data = data; // full signal

//     // Calculate index from x coordinate
//     this.index = data.findIndex((pt) => pt.x === peakCoords.x);
//     this.leftBaseIdx = data.findIndex((pt) => pt.x === leftBaseCoords.x);
//     this.rightBaseIdx = data.findIndex((pt) => pt.x === rightBaseCoords.x);

//     // Calculate additional properties
//     this.time = peakCoords.x;
//     this.amplitude = Math.max(
//       prominences.leftProminence,
//       prominences.rightProminence
//     );
//     this.width = this.rightBaseIdx - this.leftBaseIdx; // Width in samples

//     // Calculate AUC (Area Under Curve) using trapezoidal integration
//     this.auc = this.calculateAUC();
//   }

//   calculateAUC() {
//     const leftIdx = this.leftBaseIdx;
//     const rightIdx = this.rightBaseIdx;
//     const peakIdx = this.index;

//     let auc = 0;
//     // Integrate from left base to peak
//     for (let i = leftIdx; i < peakIdx; i++) {
//       const h1 = this.data[i].y - this.leftBaseCoords.y;
//       const h2 = this.data[i + 1].y - this.leftBaseCoords.y;
//       auc += (h1 + h2) / 2; // Trapezoidal rule
//     }
//     // Integrate from peak to right base
//     for (let i = peakIdx; i < rightIdx; i++) {
//       const h1 = this.data[i].y - this.rightBaseCoords.y;
//       const h2 = this.data[i + 1].y - this.rightBaseCoords.y;
//       auc += (h1 + h2) / 2; // Trapezoidal rule
//     }
//     return Math.abs(auc); // Ensure positive area
//   }
// }

// /**
//  * Savitzky-Golay filter coefficients for window size 5, polynomial order 2
//  * Pre-computed for efficiency
//  */
// const SG_COEFFICIENTS = {
//   5: [-3, 12, 17, 12, -3], // window=5, order=2, normalized by 35
//   7: [-2, 3, 6, 7, 6, 3, -2], // window=7, order=2, normalized by 21
//   9: [-21, 14, 39, 54, 59, 54, 39, 14, -21], // window=9, order=2, normalized by 231
// };

// /**
//  * Apply Savitzky-Golay smoothing filter to signal
//  * Preserves peak shapes better than simple moving average
//  *
//  * @param {{x: number, y: number}[]} data - Input signal
//  * @param {number} windowSize - Must be odd (5, 7, or 9)
//  * @returns {{x: number, y: number}[]} Smoothed signal
//  */
// function savitzkyGolayFilter(data, windowSize = 5) {
//   if (!Array.isArray(data) || data.length === 0) return data;

//   // Validate window size
//   if (![5, 7, 9].includes(windowSize)) {
//     console.warn(
//       `[savitzkyGolayFilter] Invalid window size ${windowSize}, using 5`
//     );
//     windowSize = 5;
//   }

//   const coeffs = SG_COEFFICIENTS[windowSize];
//   const halfWindow = Math.floor(windowSize / 2);
//   const normalizer = coeffs.reduce((sum, c) => sum + Math.abs(c), 0);

//   const smoothed = [];

//   for (let i = 0; i < data.length; i++) {
//     let sum = 0;
//     let count = 0;

//     for (let j = -halfWindow; j <= halfWindow; j++) {
//       const idx = i + j;
//       if (idx >= 0 && idx < data.length) {
//         sum += data[idx].y * coeffs[j + halfWindow];
//         count++;
//       }
//     }

//     // Normalize
//     const smoothedY = count === windowSize ? sum / normalizer : data[i].y;
//     smoothed.push({ x: data[i].x, y: smoothedY });
//   }

//   return smoothed;
// }

// /**
//  * Detect spikes in neural data using PeakFinder.js logic
//  *
//  * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
//  * @param {Object} options - Configuration object
//  * @param {number} [options.prominence=0] - Minimum prominence (height above neighbors)
//  * @param {number} [options.window=null] - Window width for grouping peaks (samples)
//  * @param {number} [options.minWidth=5] - Minimum width in samples for valid spikes
//  * @param {number} [options.minDistance=10] - Minimum distance in samples between spikes
//  * @param {boolean} [options.applySGFilter=true] - Apply Savitzky-Golay smoothing
//  * @param {number} [options.sgWindowSize=5] - Savitzky-Golay window size (5, 7, or 9)
//  * @returns {NeuralPeak[]} Array of detected neural spikes
//  */
// export function detectSpikes(data, options = {}) {
//   console.log("=== [detectSpikes] SIMPLIFIED APPROACH (PeakFinder Logic) ===");
//   console.log("[detectSpikes] Input data length:", data?.length);
//   console.log("[detectSpikes] Options:", options);

//   if (!Array.isArray(data) || data.length === 0) {
//     console.log("[detectSpikes] ❌ Empty or invalid data, returning []");
//     return [];
//   }

//   // Extract options
//   const prominence = options.prominence ?? 0;
//   const wlen = options.window ?? null;
//   const minWidth = options.minWidth ?? 25;
//   const minDistance = options.minDistance ?? 1;
//   const applySGFilter = options.applySGFilter ?? true;
//   const sgWindowSize = options.sgWindowSize ?? 5;

//   console.log("[detectSpikes] Parameters:");
//   console.log("  - prominence:", prominence);
//   console.log("  - window (wlen):", wlen);
//   console.log("  - minWidth:", minWidth);
//   console.log("  - minDistance:", minDistance);
//   console.log("  - applySGFilter:", applySGFilter);
//   console.log("  - sgWindowSize:", sgWindowSize);

//   // Step 1: Apply Savitzky-Golay filter if enabled
//   let processedData = data;
//   if (applySGFilter) {
//     console.log("[detectSpikes] Step 1: Applying Savitzky-Golay filter...");
//     processedData = savitzkyGolayFilter(data, sgWindowSize);
//     console.log("  - Smoothed data length:", processedData.length);
//   } else {
//     console.log("[detectSpikes] Step 1: Skipping SG filter (disabled)");
//   }

//   // Step 2: Find local maxima
//   console.log("[detectSpikes] Step 2: Finding local maxima...");
//   let peakIndices = [];
//   for (let i = 1; i < processedData.length - 1; i++) {
//     if (
//       processedData[i].y > processedData[i - 1].y &&
//       processedData[i].y > processedData[i + 1].y
//     ) {
//       peakIndices.push(i);
//     }
//   }
//   console.log("  - Found", peakIndices.length, "local maxima");

//   // Step 3: Calculate prominence and filter by threshold
//   console.log("[detectSpikes] Step 3: Calculating prominence and filtering...");
//   let filteredPeakIndices = [];
//   const searchRange = wlen ? Math.floor(wlen / 2) : processedData.length;

//   for (let peakIdx of peakIndices) {
//     let leftBaseIdx = peakIdx;
//     let rightBaseIdx = peakIdx;

//     // Find left base (lowest point in search range)
//     for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
//       if (processedData[j].y < processedData[leftBaseIdx].y) {
//         leftBaseIdx = j;
//       }
//     }

//     // Find right base (lowest point in search range)
//     for (
//       let j = peakIdx + 1;
//       j <= Math.min(processedData.length - 1, peakIdx + searchRange);
//       j++
//     ) {
//       if (processedData[j].y < processedData[rightBaseIdx].y) {
//         rightBaseIdx = j;
//       }
//     }

//     let leftProminence =
//       processedData[peakIdx].y - processedData[leftBaseIdx].y;
//     let rightProminence =
//       processedData[peakIdx].y - processedData[rightBaseIdx].y;
//     let prominenceValue = Math.min(leftProminence, rightProminence);

//     if (prominenceValue >= prominence) {
//       filteredPeakIndices.push(peakIdx);
//     }
//   }
//   console.log(
//     "  - Filtered to",
//     filteredPeakIndices.length,
//     "peaks with prominence >=",
//     prominence
//   );

//   // Step 4: Group nearby peaks within window and keep highest
//   if (wlen) {
//     console.log(
//       "[detectSpikes] Step 4: Grouping nearby peaks (window:",
//       wlen,
//       ")..."
//     );
//     let finalFilteredPeakIndices = [];
//     let i = 0;
//     while (i < filteredPeakIndices.length) {
//       let group = [];
//       let currentPeakIdx = filteredPeakIndices[i];
//       group.push(currentPeakIdx);

//       // Find all peaks within the window width
//       for (let j = i + 1; j < filteredPeakIndices.length; j++) {
//         if (filteredPeakIndices[j] <= currentPeakIdx + wlen / 2) {
//           group.push(filteredPeakIndices[j]);
//         } else {
//           break;
//         }
//       }

//       // Find the peak with the highest y value in the group
//       let highestPeakIdx = group.reduce(
//         (maxIdx, idx) =>
//           processedData[idx].y > processedData[maxIdx].y ? idx : maxIdx,
//         group[0]
//       );
//       finalFilteredPeakIndices.push(highestPeakIdx);

//       // Move to the next group
//       i += group.length;
//     }
//     filteredPeakIndices = finalFilteredPeakIndices;
//     console.log("  - After grouping:", filteredPeakIndices.length, "peaks");
//   } else {
//     console.log("[detectSpikes] Step 4: Skipping grouping (window disabled)");
//   }

//   // Step 5: Create NeuralPeak instances
//   console.log("[detectSpikes] Step 5: Creating NeuralPeak objects...");
//   console.log(
//     "  - Using",
//     applySGFilter ? "ORIGINAL" : "processed",
//     "data for peak coordinates"
//   );
//   let peaks = [];

//   // CRITICAL: Use original data for peak values to preserve true peak positions
//   // Detection happens on processedData (smoothed), but coordinates come from original
//   const dataForCoordinates = data; // Always use original unsmoothed data

//   for (let peakIdx of filteredPeakIndices) {
//     let leftBaseIdx = peakIdx;
//     let rightBaseIdx = peakIdx;
//     const searchRange = wlen ? Math.floor(wlen / 2) : dataForCoordinates.length;

//     // Recalculate bases on ORIGINAL data
//     for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
//       if (dataForCoordinates[j].y < dataForCoordinates[leftBaseIdx].y) {
//         leftBaseIdx = j;
//       }
//     }

//     for (
//       let j = peakIdx + 1;
//       j <= Math.min(dataForCoordinates.length - 1, peakIdx + searchRange);
//       j++
//     ) {
//       if (dataForCoordinates[j].y < dataForCoordinates[rightBaseIdx].y) {
//         rightBaseIdx = j;
//       }
//     }

//     let leftProminence =
//       dataForCoordinates[peakIdx].y - dataForCoordinates[leftBaseIdx].y;
//     let rightProminence =
//       dataForCoordinates[peakIdx].y - dataForCoordinates[rightBaseIdx].y;
//     let prominences = {
//       leftProminence: leftProminence,
//       rightProminence: rightProminence,
//     };

//     let leftBaseCoords = dataForCoordinates[leftBaseIdx];
//     let peakCoords = dataForCoordinates[peakIdx];
//     let rightBaseCoords = dataForCoordinates[rightBaseIdx];

//     peaks.push(
//       new NeuralPeak(
//         peakCoords,
//         leftBaseCoords,
//         rightBaseCoords,
//         prominences,
//         dataForCoordinates // Use original data for AUC calculation too
//       )
//     );
//   }
//   console.log("  - Created", peaks.length, "NeuralPeak objects");

//   // Step 6: Apply width filter
//   console.log(
//     "[detectSpikes] Step 6: Filtering by width (min:",
//     minWidth,
//     ")..."
//   );
//   const widthFilteredPeaks = peaks.filter((p) => p.width >= minWidth);
//   console.log("  - After width filter:", widthFilteredPeaks.length, "peaks");

//   // Step 7: Apply distance filter
//   if (minDistance > 0 && widthFilteredPeaks.length > 1) {
//     console.log(
//       "[detectSpikes] Step 7: Filtering by distance (min:",
//       minDistance,
//       ")..."
//     );
//     widthFilteredPeaks.sort((a, b) => a.index - b.index);
//     let result = [widthFilteredPeaks[0]];
//     for (let i = 1; i < widthFilteredPeaks.length; i++) {
//       if (
//         widthFilteredPeaks[i].index - result[result.length - 1].index >=
//         minDistance
//       ) {
//         result.push(widthFilteredPeaks[i]);
//       }
//     }
//     console.log("  - After distance filter:", result.length, "peaks");
//     console.log("=== [detectSpikes] COMPLETE ===");
//     return result;
//   }

//   console.log("=== [detectSpikes] COMPLETE ===");
//   return widthFilteredPeaks;
// }

// /**
//  * Detect spikes and bursts (kept for compatibility)
//  */
// export function detectSpikesAndBursts(data, options = {}) {
//   const spikes = detectSpikes(data, options);
//   return { spikes, bursts: [] }; // Burst detection can be handled separately
// }
