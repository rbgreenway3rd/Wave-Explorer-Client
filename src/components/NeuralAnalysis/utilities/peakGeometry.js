// Shared peak-geometry primitives. Both `detectSpikes` and the auto-
// suggest helpers in `parameterSuggestions` derive prominences and
// bases from these functions, so the two stay in lockstep — previously
// each maintained its own copy of `findBases`-equivalent walks and the
// drift produced incompatible prominence values across the gate and
// the suggester.

// ---- Signal statistics cache --------------------------------------------
// Per-detection on the same `data` array, the median, MAD, baseline
// percentile, and global min/max are constant — they depend only on the
// signal, not on spike-detection params. Caching via a WeakMap keyed on
// the data array lets repeat detections (e.g. a slider drag of
// prominence/window after Tier E warms upstream stages) skip the three
// O(n log n) sorts and the y-extraction pass.
const signalStatsCache = new WeakMap();

export function computeSignalStats(data) {
  const cached = signalStatsCache.get(data);
  if (cached) return cached;

  const n = data.length;
  const allYValues = new Array(n);
  let globalMin = Infinity;
  let globalMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = data[i].y;
    allYValues[i] = y;
    if (y < globalMin) globalMin = y;
    if (y > globalMax) globalMax = y;
  }
  const signalRange = globalMax - globalMin;

  // One sort, three statistics: median (n/2 index), 2nd-percentile
  // baseline (n*0.02 index), and an absolute-deviation array we reuse
  // to compute the MAD via a second sort.
  const sortedY = allYValues.slice().sort((a, b) => a - b);
  const medianY = sortedY[Math.floor(n / 2)];
  const percentileIndex = Math.floor(n * 0.02);
  const baselineThreshold = sortedY[Math.max(0, percentileIndex)];

  // MAD-based robust std.
  const absDevs = new Array(n);
  for (let i = 0; i < n; i++) {
    absDevs[i] = Math.abs(allYValues[i] - medianY);
  }
  absDevs.sort((a, b) => a - b);
  const medianAbsDev = absDevs[Math.floor(n / 2)];
  const robustStd = medianAbsDev / 0.6745;

  const alternativeThreshold = globalMin + signalRange * 0.05;
  const finalBaselineThreshold = Math.min(
    baselineThreshold,
    alternativeThreshold
  );
  const fallbackThreshold = globalMin + signalRange * 0.02;

  const stats = {
    globalMin,
    globalMax,
    signalRange,
    robustStd,
    finalBaselineThreshold,
    fallbackThreshold,
    medianY,
  };
  signalStatsCache.set(data, stats);
  return stats;
}

/**
 * Find left and right bases for a peak using horizontal-line-extension
 * (scipy.peak_prominences style). Extends a horizontal line from the
 * peak until it intersects the signal again, then finds the lowest
 * point in that intersection region (respecting `baselineThreshold` as
 * a per-sample cap).
 */
export function findBases(data, peakIdx, searchRange, baselineThreshold) {
  const peakY = data[peakIdx].y;
  let leftBaseIdx = peakIdx;
  let rightBaseIdx = peakIdx;

  let leftIntersectionIdx = peakIdx;
  for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
    if (data[j].y >= peakY) {
      leftIntersectionIdx = j;
      break;
    }
    leftIntersectionIdx = j;
  }
  for (let j = peakIdx - 1; j >= leftIntersectionIdx; j--) {
    if (data[j].y <= baselineThreshold && data[j].y < data[leftBaseIdx].y) {
      leftBaseIdx = j;
    }
  }

  let rightIntersectionIdx = peakIdx;
  for (
    let j = peakIdx + 1;
    j <= Math.min(data.length - 1, peakIdx + searchRange);
    j++
  ) {
    if (data[j].y >= peakY) {
      rightIntersectionIdx = j;
      break;
    }
    rightIntersectionIdx = j;
  }
  for (let j = peakIdx + 1; j <= rightIntersectionIdx; j++) {
    if (data[j].y <= baselineThreshold && data[j].y < data[rightBaseIdx].y) {
      rightBaseIdx = j;
    }
  }

  return { leftBaseIdx, rightBaseIdx };
}

/**
 * Scan the signal for local maxima with plateau handling. Returns an
 * array of indices into `data`.
 *
 * "Local max" = `y[i] > y[i-1] && y[i] >= y[i+1]`. Plateau handling
 * picks the midpoint of any run of equal values that's strictly
 * higher than both ends.
 */
export function localMaxima(data) {
  const n = data.length;
  if (n < 3) return [];
  const out = [];
  for (let i = 1; i < n - 1; i++) {
    if (data[i].y > data[i - 1].y && data[i].y >= data[i + 1].y) {
      out.push(i);
    } else if (data[i].y === data[i + 1].y && data[i].y > data[i - 1].y) {
      let plateauStart = i;
      let plateauEnd = i;
      while (
        plateauEnd + 1 < n &&
        data[plateauEnd].y === data[plateauEnd + 1].y
      ) {
        plateauEnd++;
      }
      if (data[plateauStart].y > data[plateauEnd + 1]?.y) {
        out.push(Math.floor((plateauStart + plateauEnd) / 2));
      }
      i = plateauEnd;
    }
  }
  return out;
}

/**
 * Convenience wrapper: run `findBases` with a globalMax cap (no per-
 * sample filtering), return the bases plus the left/right/min
 * prominences.
 */
export function topographicProminence(data, peakIdx, searchRange) {
  const { globalMax } = computeSignalStats(data);
  const { leftBaseIdx, rightBaseIdx } = findBases(
    data,
    peakIdx,
    searchRange,
    globalMax
  );
  const peakY = data[peakIdx].y;
  const leftProminence = peakY - data[leftBaseIdx].y;
  const rightProminence = peakY - data[rightBaseIdx].y;
  return {
    leftBaseIdx,
    rightBaseIdx,
    leftProminence,
    rightProminence,
    prominence: Math.min(leftProminence, rightProminence),
  };
}

/**
 * 1-D k-means with k=2. Returns `{ centroids, assignments }`. The
 * `k` argument is accepted for API symmetry but the implementation
 * is fixed to two clusters (used only by the detection bail-out and
 * the auto-suggest signal-class identification).
 *
 * Initialization is min/max of the input — explicit loops because
 * `Math.min(...arr)` blows the JS engine's argument-count limit on
 * the ~10K-65K-element prominence arrays detection routinely produces.
 */
export function kMeans(data, _k = 2) {
  if (!Array.isArray(data) || data.length < 2) {
    return { centroids: [0, 0], assignments: data.map(() => 0) };
  }
  let initMin = Infinity;
  let initMax = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < initMin) initMin = v;
    if (v > initMax) initMax = v;
  }
  const centroids = [initMin, initMax];
  const assignments = new Array(data.length).fill(0);
  let changed = true;
  let maxIterations = 1000;
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;
    for (let i = 0; i < data.length; i++) {
      const dist0 = Math.abs(data[i] - centroids[0]);
      const dist1 = Math.abs(data[i] - centroids[1]);
      const newAssignment = dist0 < dist1 ? 0 : 1;
      if (newAssignment !== assignments[i]) {
        assignments[i] = newAssignment;
        changed = true;
      }
    }
    let sum0 = 0;
    let count0 = 0;
    let sum1 = 0;
    let count1 = 0;
    for (let i = 0; i < data.length; i++) {
      if (assignments[i] === 0) {
        sum0 += data[i];
        count0++;
      } else {
        sum1 += data[i];
        count1++;
      }
    }
    centroids[0] = count0 > 0 ? sum0 / count0 : centroids[0];
    centroids[1] = count1 > 0 ? sum1 / count1 : centroids[1];
  }

  return { centroids, assignments };
}

// ---- Detection diagnostics primitives ------------------------------------
//
// Stable IDs for every gate in the detection cascade. The Decision
// Explanation Layer ships these through the worker as a Uint8 enum so
// the UI knows which gate rejected each candidate. `GATE_KEPT` is the
// sentinel for candidates that survived every gate.
export const GATE_KEPT = 0;
export const GATE_PROMINENCE = 1;
export const GATE_ZONE = 2;
export const GATE_NOISE_FLOOR = 3;
export const GATE_KMEANS = 4;
export const GATE_WIDTH = 5;
export const GATE_SYMMETRY = 6;
export const GATE_NMS = 7;
export const GATE_MIN_DISTANCE = 8;
export const GATE_ACTIVITY = 9;

export const GATE_NAMES = {
  [GATE_KEPT]: "kept",
  [GATE_PROMINENCE]: "prominence",
  [GATE_ZONE]: "zone",
  [GATE_NOISE_FLOOR]: "noiseFloor",
  [GATE_KMEANS]: "kmeans",
  [GATE_WIDTH]: "width",
  [GATE_SYMMETRY]: "symmetry",
  [GATE_NMS]: "nms",
  [GATE_MIN_DISTANCE]: "minDistance",
  [GATE_ACTIVITY]: "activity",
};

// Four-tier classification for "how far from the threshold" a gate
// result is. Used to drive the candidate-overlay color tier and the
// Peak Inspector's pass/fail margin display. Two passes (clear, marginal)
// and two fails (marginal, clear); the threshold for "marginal" is
// fixed at ±10% of the gate's natural scale, and "clear-pass" needs
// > 50% margin on top.
export const TIER_CLEAR_PASS = 0;
export const TIER_MARGINAL_PASS = 1;
export const TIER_MARGINAL_FAIL = 2;
export const TIER_CLEAR_FAIL = 3;

/**
 * classifyMargin — classify a (metric, threshold) pair into one of the
 * four tiers using a gate-natural scale.
 *
 * @param {number} metric    - the candidate's measured value
 * @param {number} threshold - the gate's threshold (pass when metric ≥ threshold)
 * @param {number} scale     - gate's natural scale for "what counts as close";
 *                             usually = threshold, but callers should pass
 *                             an alternative when threshold == 0 (e.g.
 *                             minDistance = 0 disables the gate; nothing is
 *                             close, so scale just controls the visual band).
 * @returns {0|1|2|3} tier id (TIER_*)
 */
export function classifyMargin(metric, threshold, scale) {
  const margin = metric - threshold;
  if (
    !Number.isFinite(margin) ||
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    return margin >= 0 ? TIER_CLEAR_PASS : TIER_CLEAR_FAIL;
  }
  const relative = margin / scale;
  if (relative >= 0.5) return TIER_CLEAR_PASS;
  if (relative >= 0) return TIER_MARGINAL_PASS;
  if (relative >= -0.1) return TIER_MARGINAL_FAIL;
  return TIER_CLEAR_FAIL;
}

/**
 * worstTier — combine multiple per-gate tiers into a single overall
 * tier for a kept candidate. The user-facing tier is the worst of all
 * gates evaluated, since a kept peak's vulnerability comes from its
 * tightest gate, not the loosest.
 *
 * @param {number[]} tiers
 * @returns {0|1|2|3}
 */
export function worstTier(tiers) {
  let worst = TIER_CLEAR_PASS;
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i] > worst) worst = tiers[i];
  }
  return worst;
}

