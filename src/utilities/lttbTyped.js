// Synchronous Largest-Triangle-Three-Buckets decimation operating on parallel
// typed-array inputs. Adapted from the {x,y}[] version in
// frontend/src/workers/decimateWorker.js. Output is the small {x,y}[] form
// that Chart.js expects for mini-grid rendering.
//
// Pure module — no DOM, no React, no `import.meta.url`. Importable from main
// thread, workers, and Jest.

function lttbTyped(xs, ys, threshold) {
  const n = xs && ys ? xs.length : 0;
  if (!n || threshold >= n || threshold < 3) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = { x: xs[i], y: ys[i] };
    return out;
  }

  const sampled = new Array(threshold);
  const every = (n - 2) / (threshold - 2);

  let a = 0;
  sampled[0] = { x: xs[0], y: ys[0] };
  let sampledIdx = 1;

  for (let i = 0; i < threshold - 2; i++) {
    const rangeStart = Math.floor((i + 1) * every) + 1;
    let rangeEnd = Math.floor((i + 2) * every) + 1;
    if (rangeEnd > n) rangeEnd = n;

    let avgX = 0;
    let avgY = 0;
    const rangeLen = rangeEnd - rangeStart;
    for (let j = rangeStart; j < rangeEnd; j++) {
      avgX += xs[j];
      avgY += ys[j];
    }
    if (rangeLen > 0) {
      avgX /= rangeLen;
      avgY /= rangeLen;
    }

    const pointAx = xs[a];
    const pointAy = ys[a];

    let maxArea = -1;
    let maxAreaIdx = rangeStart;
    const bucketStart = Math.floor(i * every) + 1;
    let bucketEnd = Math.floor((i + 1) * every) + 1;
    if (bucketEnd > n) bucketEnd = n;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const area = Math.abs(
        (pointAx - xs[j]) * (avgY - pointAy) -
          (pointAx - avgX) * (ys[j] - pointAy)
      );
      if (area > maxArea) {
        maxArea = area;
        maxAreaIdx = j;
      }
    }
    sampled[sampledIdx++] = { x: xs[maxAreaIdx], y: ys[maxAreaIdx] };
    a = maxAreaIdx;
  }

  sampled[sampledIdx++] = { x: xs[n - 1], y: ys[n - 1] };
  // Trim if any iterations were skipped (shouldn't happen but defensive).
  if (sampledIdx < threshold) sampled.length = sampledIdx;
  return sampled;
}

const _exports = { lttbTyped };

if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
