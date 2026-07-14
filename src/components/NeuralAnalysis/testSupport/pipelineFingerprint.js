/**
 * pipelineFingerprint — compact, comparison-stable digest of a full
 * runNeuralAnalysisPipeline() result, plus a tolerance-aware comparator.
 *
 * The efficiency refactor (docs plan: neural pipeline typed-array rewrite)
 * must not change what the pipeline outputs. Snapshotting every 250K-sample
 * processedSignal across a param matrix would be gigabytes, so instead we
 * capture:
 *   - `exact`  — discrete, user-visible fields that must match to the bit:
 *                spike indices/bases, counts, unit modes, diagnostic tallies.
 *   - `floats` — continuous fields compared within a tight tolerance:
 *                processedSignal min/max/sum + 256 evenly-spaced samples,
 *                every per-spike measurement, metrics, F₀.
 *
 * Acceptance bar (see plan): identical spikes + metrics after rounding,
 * processedSignal equal within ~1e-9. The refactor preserves arithmetic
 * order, so in practice results are bit-identical; the tolerance is a margin.
 */

// Number of evenly-spaced processedSignal samples captured as exact-value
// checkpoints. Catches any localized change the min/max/sum aggregate misses.
const SIGNAL_SAMPLE_COUNT = 256;

// Read a numeric y-series from whatever shape the pipeline returns for its
// processed signal — {x,y}[] today, possibly {xs,ys}/ys typed arrays after
// the refactor. Keeps the fingerprint stable across representations.
export function signalYs(sig) {
  if (!sig) return [];
  if (ArrayBuffer.isView(sig)) return sig; // ys typed array
  if (sig.ys && ArrayBuffer.isView(sig.ys)) return sig.ys; // {xs, ys}
  if (Array.isArray(sig)) {
    if (sig.length === 0) return [];
    if (typeof sig[0] === "number") return sig;
    return sig.map((p) => (p ? p.y : NaN)); // {x,y}[]
  }
  return [];
}

function signalDigest(sig) {
  const ys = signalYs(sig);
  const n = ys.length;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i];
    if (y < min) min = y;
    if (y > max) max = y;
    sum += y;
  }
  const samples = [];
  if (n > 0) {
    for (let s = 0; s < SIGNAL_SAMPLE_COUNT; s++) {
      const idx = Math.min(n - 1, Math.floor((s * n) / SIGNAL_SAMPLE_COUNT));
      samples.push(ys[idx]);
    }
  }
  return { n, min, max, sum, samples };
}

/**
 * Build the fingerprint of a pipeline result.
 * @returns {{exact: object, floats: object}}
 */
export function fingerprint(result) {
  const spikes = result.spikeResults || [];
  const bursts = result.burstResults || [];
  const m = result.metrics || {};
  const norm = result.normalization || {};
  const outl = result.outlierRemoval || {};
  const diag = result.candidateDiagnostics || {};
  const distProm =
    (result.candidateDistributions && result.candidateDistributions.prominence) ||
    {};

  const sig = signalDigest(result.processedSignal);

  const exact = {
    signalLen: sig.n,
    spikeCount: spikes.length,
    spikeIndices: spikes.map((s) => s.index),
    spikeLeftBaseIdx: spikes.map((s) => s.leftBaseIdx),
    spikeRightBaseIdx: spikes.map((s) => s.rightBaseIdx),
    spikeWidth: spikes.map((s) => s.width),
    spikeIsOutlier: spikes.map((s) => !!s.isOutlier),
    burstCount: bursts.length,
    burstSpikeCounts: bursts.map((b) => b.spikeCount ?? null),
    outlierCount: outl.count ?? 0,
    outlierRegionCount: Array.isArray(outl.regions) ? outl.regions.length : 0,
    outlierPointCount: Array.isArray(outl.outlierPoints)
      ? outl.outlierPoints.length
      : 0,
    normApplied: !!norm.applied,
    normSkipped: !!norm.skipped,
    normUnit: norm.unitMode ?? null,
    diagTotalCandidates: diag.totalCandidates ?? 0,
    diagTruncatedCount: diag.truncatedCount ?? 0,
    diagRecordCount: Array.isArray(diag.records) ? diag.records.length : 0,
    distEdgesLen: distProm.edges ? distProm.edges.length : 0,
    distCountsSum: distProm.counts
      ? Array.from(distProm.counts).reduce((a, b) => a + b, 0)
      : 0,
  };

  const floats = {
    signalMin: sig.min,
    signalMax: sig.max,
    signalSum: sig.sum,
    signalSamples: sig.samples,
    spikeTime: spikes.map((s) => s.time),
    spikeAmplitude: spikes.map((s) => s.amplitude),
    spikeAuc: spikes.map((s) => s.auc),
    spikePeakY: spikes.map((s) => (s.peakCoords ? s.peakCoords.y : NaN)),
    spikeLeftProm: spikes.map((s) =>
      s.prominences ? s.prominences.leftProminence : NaN
    ),
    spikeRightProm: spikes.map((s) =>
      s.prominences ? s.prominences.rightProminence : NaN
    ),
    spikeDetProm: spikes.map((s) =>
      typeof s.detectionProminence === "number" ? s.detectionProminence : NaN
    ),
    burstDuration: bursts.map((b) => b.duration ?? NaN),
    mRobustStd: m.robustStd ?? NaN,
    mSignalRange: m.signalRange ?? NaN,
    mSignalYMin: m.signalYMin ?? NaN,
    mSignalYMax: m.signalYMax ?? NaN,
    mSpikeFrequency: m.spikeFrequency ?? NaN,
    mSpikeAmplitude: m.spikeAmplitude ?? NaN,
    mSpikeWidth: m.spikeWidth ?? NaN,
    mSpikeAUC: m.spikeAUC ?? NaN,
    mBurstAvgDuration: m.burstMetrics ? m.burstMetrics.avgDuration : NaN,
    mBurstAvgSpikeCount: m.burstMetrics ? m.burstMetrics.avgSpikeCount : NaN,
    normThisWellFo: norm.thisWellFo ?? NaN,
    normPlateMedianFo: norm.plateMedianFo ?? NaN,
    distProminenceMax: distProm.max ?? NaN,
  };

  return { exact, floats };
}

function numClose(a, b, tol) {
  if (a === b) return true; // handles ±Infinity and exact equality
  const an = a == null ? NaN : a;
  const bn = b == null ? NaN : b;
  if (Number.isNaN(an) && Number.isNaN(bn)) return true; // both NaN → match
  if (!Number.isFinite(an) || !Number.isFinite(bn)) return an === bn;
  return Math.abs(an - bn) <= tol * (1 + Math.abs(bn));
}

/**
 * Compare two fingerprints. Returns an array of human-readable diff strings
 * (empty ⇒ identical within tolerance). `label` prefixes each diff.
 */
export function diffFingerprints(actual, golden, label = "", tol = 1e-9) {
  const diffs = [];

  // exact — strict deep-equal via JSON (arrays of ints/strings/bools).
  for (const key of Object.keys(golden.exact)) {
    const a = JSON.stringify(actual.exact[key]);
    const g = JSON.stringify(golden.exact[key]);
    if (a !== g) {
      diffs.push(
        `${label} exact.${key}: got ${trunc(a)} expected ${trunc(g)}`
      );
    }
  }

  // floats — scalar or number[] within tolerance.
  for (const key of Object.keys(golden.floats)) {
    const gv = golden.floats[key];
    const av = actual.floats[key];
    if (Array.isArray(gv)) {
      if (!Array.isArray(av) || av.length !== gv.length) {
        diffs.push(
          `${label} floats.${key}: length ${av ? av.length : "n/a"} vs ${gv.length}`
        );
        continue;
      }
      for (let i = 0; i < gv.length; i++) {
        if (!numClose(av[i], gv[i], tol)) {
          diffs.push(
            `${label} floats.${key}[${i}]: got ${av[i]} expected ${gv[i]}`
          );
          break; // one representative diff per field keeps output readable
        }
      }
    } else if (!numClose(av, gv, tol)) {
      diffs.push(`${label} floats.${key}: got ${av} expected ${gv}`);
    }
  }

  return diffs;
}

function trunc(s) {
  return s && s.length > 80 ? `${s.slice(0, 77)}...` : s;
}
