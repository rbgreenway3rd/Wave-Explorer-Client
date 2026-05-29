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
