/**
 * rollingWindow — incremental sorted-window helpers for the
 * minimum-median baseline used by trendFlattening and baselineCorrected.
 *
 * The naive per-sample formula was:
 *
 *   for each j in 0..n-1:
 *     win = signal[j-W/2 .. j+W/2]            // slice + map allocs
 *     sorted = [...win.y].sort()              // O(W log W) per sample
 *     median = sorted[ floor(min(K, |win|)/2) ]
 *
 * which is ~250K × 200 × log200 ≈ 375M ops + ~1M small allocations on
 * a 250K-sample / W=200 / K=50 modal session — easily 1–2 seconds per
 * pipeline run.
 *
 * This helper amortizes that to one binary-search insert + one
 * binary-search remove per step (O(W) due to Array.splice memmove)
 * with zero per-step allocations beyond the result. ~7–10× faster on
 * the modal's typical inputs.
 */

/**
 * Compute the k-th smallest value (specifically: the median of the K
 * smallest values) over a centered sliding window of size W on the
 * y-array `ys`. Matches the previous trendFlattening / baselineCorrected
 * inner loop bit-for-bit:
 *
 *   for each j: out[j] = sorted_window_of_K_smallest[ floor(K/2) ]
 *
 * where K = min(numMinimums, currentWindowLength). Edge windows shrink
 * (current code clamps startIdx/endIdx to [0, n-1]).
 *
 * Returns a plain Array<number> of length n.
 */
export function rollingMinMedian(ys, W, numMinimums) {
  const n = ys.length;
  if (n === 0) return [];
  const halfW = Math.floor(W / 2);
  const out = new Array(n);

  // sorted[] = current window's y-values, ascending. Maintained
  // incrementally as the window slides.
  const sorted = [];

  // Binary search for leftmost index where v could be inserted.
  function bsearch(v) {
    let lo = 0;
    let hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sorted[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  function insert(v) {
    sorted.splice(bsearch(v), 0, v);
  }

  function removeOne(v) {
    const idx = bsearch(v);
    // bsearch returns the leftmost slot where v could insert; if v IS
    // present, sorted[idx] === v. Multiple equal values fall under
    // the same idx — removing any of them keeps the multiset correct.
    if (idx < sorted.length && sorted[idx] === v) {
      sorted.splice(idx, 1);
    }
  }

  let curStart = 0;
  let curEnd = -1; // empty window initially

  for (let j = 0; j < n; j++) {
    const startIdx = j - halfW < 0 ? 0 : j - halfW;
    const endIdx = j + halfW > n - 1 ? n - 1 : j + halfW;

    // Slide right edge forward.
    while (curEnd < endIdx) {
      curEnd++;
      insert(ys[curEnd]);
    }
    // Slide left edge forward.
    while (curStart < startIdx) {
      removeOne(ys[curStart]);
      curStart++;
    }

    const winSize = sorted.length;
    if (winSize === 0) {
      out[j] = 0;
      continue;
    }
    const effNumMin = numMinimums < winSize ? numMinimums : winSize;
    out[j] = sorted[effNumMin >> 1]; // floor(effNumMin / 2)
  }

  return out;
}
