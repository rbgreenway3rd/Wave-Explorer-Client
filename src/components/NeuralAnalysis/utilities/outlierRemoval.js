/**
 * outlierRemoval.js
 *
 * Removes "tall outliers" from a neural trace BEFORE spike detection: points
 * (short blips) that sit FAR ABOVE the rest of the data — well above even the
 * real signal events — and therefore skew the y-scale and every amplitude-
 * derived parameter.
 *
 * Detection is GLOBAL and robust:
 *   1. Baseline = median of the trace; spread = MAD (median absolute
 *      deviation, ×1.4826 ≈ σ). Both are robust — a handful of tall outliers
 *      cannot inflate them, so the reference always reflects the REAL signal,
 *      not the outliers. (A high-percentile "ceiling" fails here: enough
 *      outlier samples drag the percentile up toward the outliers, leaving the
 *      cutoff partway up the blip so it only gets shortened.)
 *   2. Cutoff = baseline + sensitivity × spread. `sensitivity` is how many
 *      robust-σ above baseline a point must rise to count as an outlier. Real
 *      events sit a few σ up; outliers sit many σ up, so the cutoff drops
 *      cleanly between them.
 *   3. For every sample above the cutoff, remove its WHOLE excursion — walk
 *      down both flanks to where the signal returns to baseline — and bridge
 *      the gap with a straight line at baseline level. This deletes the entire
 *      blip, not just the tip above the cutoff.
 *
 * If nothing rises above the cutoff, the original array is returned unchanged
 * (a safe no-op that also preserves downstream memo identity).
 *
 * Reliable in the regime this targets — outliers many σ above the bulk of the
 * data. It intentionally does not try to preserve a genuinely tall, broad
 * feature (there is none in oscillation/spiking data); raise the sensitivity
 * or turn the feature off for assays dominated by one large real transient.
 */

function median(sortedAsc) {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = n >> 1;
  return n % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

/**
 * @param {Array<{x: number, y: number}>} signal
 * @param {Object} [options]
 * @param {number} [options.sensitivity=5] - robust-σ multiplier. Cutoff is
 *   `median + sensitivity × (1.4826·MAD)`. Lower removes more; higher keeps
 *   all but the most extreme.
 * @returns {{
 *   cleanedSignal: Array<{x,y}>,
 *   removedIndices: number[],
 *   regions: Array<{startIdx,endIdx,startX,endX}>,
 *   outlierPoints: Array<{x,y}>,   // per-region apex at ORIGINAL height
 *   cutoff: number | null
 * }}
 *   When nothing is removed, `cleanedSignal` is the original array reference.
 */
export function removeOutliers(signal, options = {}) {
  const sensitivity = options.sensitivity ?? 5;
  const empty = {
    cleanedSignal: signal,
    removedIndices: [],
    regions: [],
    outlierPoints: [],
    cutoff: null,
  };
  const n = Array.isArray(signal) ? signal.length : 0;
  if (n < 3) return empty;

  const ys = new Array(n);
  for (let i = 0; i < n; i++) ys[i] = signal[i].y;

  const baseline = median([...ys].sort((a, b) => a - b));
  const absDev = ys.map((y) => Math.abs(y - baseline)).sort((a, b) => a - b);
  let scale = 1.4826 * median(absDev);
  // Fallback for degenerate MAD (e.g. >50% identical samples): use stddev.
  if (!(scale > 0)) {
    let mean = 0;
    for (let i = 0; i < n; i++) mean += ys[i];
    mean /= n;
    let variance = 0;
    for (let i = 0; i < n; i++) variance += (ys[i] - mean) ** 2;
    scale = Math.sqrt(variance / n);
  }
  if (!(scale > 0)) return empty; // truly flat signal → nothing to remove

  const cutoff = baseline + sensitivity * scale;

  // Any sample above the cutoff seeds an outlier; extend each to its full
  // excursion (down to baseline on both sides) and merge overlaps.
  const regions = [];
  let i = 0;
  while (i < n) {
    if (ys[i] > cutoff) {
      let lo = i;
      while (lo > 0 && ys[lo - 1] > baseline) lo--;
      let hi = i;
      while (hi < n - 1 && ys[hi + 1] > cutoff) hi++; // to end of above-cutoff run
      while (hi < n - 1 && ys[hi + 1] > baseline) hi++; // then down the far flank
      const last = regions[regions.length - 1];
      if (last && lo <= last.endIdx + 1) {
        last.endIdx = Math.max(last.endIdx, hi); // merge with previous excursion
      } else {
        regions.push({ startIdx: lo, endIdx: hi });
      }
      i = hi + 1;
    } else {
      i++;
    }
  }
  if (regions.length === 0) return empty;

  const cleanedSignal = signal.slice();
  const removedIndices = [];
  const outlierPoints = [];
  for (const r of regions) {
    const a = r.startIdx;
    const b = r.endIdx;
    const aL = a - 1;
    const aR = b + 1;
    const yL = aL >= 0 ? ys[aL] : ys[aR]; // anchors sit at/near baseline
    const yR = aR < n ? ys[aR] : ys[aL];
    const span = aR - aL;
    let peakIdx = a;
    for (let k = a; k <= b; k++) {
      if (ys[k] > ys[peakIdx]) peakIdx = k;
      removedIndices.push(k);
      const t = span > 0 ? (k - aL) / span : 0;
      cleanedSignal[k] = { x: signal[k].x, y: yL + t * (yR - yL) };
    }
    r.startX = signal[a].x;
    r.endX = signal[b].x;
    outlierPoints.push({ x: signal[peakIdx].x, y: ys[peakIdx] });
  }

  return { cleanedSignal, removedIndices, regions, outlierPoints, cutoff };
}
