// Pure numeric implementations of WaveExplorer's filters operating on parallel
// typed-array buffers. Imports nothing — usable from a Web Worker or directly
// from a Jest test running in jsdom.
//
// Well shape used here:
//   { id, row, col, indicators: [{ xs: Float64Array, ys: Float64Array }, ...] }
//
// All filters mutate `wells` in place (replacing typed arrays where needed).
// Behavior must match the FilterModels.js classes bit-for-bit on the
// deterministic filters; see captureBaseline.test.js for the snapshot regimen.

// ---------- StaticRatio --------------------------------------------------

// The original FilterModels.js StaticRatio had an outer-j loop iterating
// over every point in rawData, but iterations j>=1 divide by ~1.0 (sum of
// already-divided values, divided by range, equals 1) so they are
// mathematically no-ops aside from ULP-level FP drift. On a 23,000-point
// dataset that quirk multiplied the work by ~23,000x, dominating the entire
// pipeline. We do a single pass here; output matches the original to within
// ~few × 1e-12 relative error (covered by 1e-9 tolerance in the golden).
function applyStaticRatio(wells, params) {
  const { start, end } = params;
  const range = end - start + 1;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const ys = inds[i].ys;
      const n = ys.length;
      let sum = 0;
      for (let s = start; s <= end; s++) {
        if (s < n && typeof ys[s] === "number" && !Number.isNaN(ys[s])) {
          sum += ys[s];
        } else {
          // Original returned from the entire execute() on bad data — leave
          // subsequent wells/indicators untouched.
          return;
        }
      }
      const NV = sum / range;
      for (let k = 0; k < n; k++) ys[k] = ys[k] / NV;
    }
  }
}

// ---------- Smoothing ----------------------------------------------------

// Preserves the read-from-output-buffer "running smooth" semantic. The
// original loop reads `filteredData[k].y` while the same array is being
// overwritten in place, so values at k<j reflect prior smoothing and values
// at k>=j are still original. We replicate by smoothing in place on a single
// buffer (no separate input/output buffer).
function applySmoothing(wells, params) {
  const { windowWidth, useMedian } = params;
  const half = windowWidth / 2;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const ys = inds[i].ys;
      const n = ys.length;
      if (n < windowWidth) continue;
      // windowWidth is small; reuse one scratch array sized to the maximum
      // possible window. The original Math doesn't floor the right edge, so
      // the effective window can be windowWidth+1 elements wide near interior
      // points.
      const scratch = new Float64Array(windowWidth + 2);
      for (let j = 0; j < n; j++) {
        const wsRaw = Math.floor(j - half);
        const ws = wsRaw < 0 ? 0 : wsRaw;
        const weReal = j + half;
        const weCap = n - 1;
        const we = weReal < weCap ? weReal : weCap;
        let count = 0;
        for (let k = ws; k <= we; k++) scratch[count++] = ys[k];
        let smoothed;
        if (useMedian) {
          // Subarray sort: TimSort with default numeric comparator on
          // Float64Array — same total order Array.prototype.sort with
          // (a,b)=>a-b produces.
          const view = scratch.subarray(0, count);
          view.sort();
          const mid = count >> 1;
          smoothed =
            count % 2 !== 0
              ? view[mid]
              : (view[mid - 1] + view[mid]) / 2;
        } else {
          let sum = 0;
          for (let k = 0; k < count; k++) sum += scratch[k];
          smoothed = sum / count;
        }
        ys[j] = smoothed;
      }
    }
  }
}

// ---------- ControlSubtraction ------------------------------------------

// Computes the per-indicator average curve from the wells the orchestrator
// passed in (which reflect the post-prior-filter state). The orchestrator
// invokes this between worker segments, mirroring the original inline
// `calculate_average_curve` call right before `execute`.
function computeAverageCurves(wells, params) {
  const { controlWellArray, numberOfColumns } = params;
  if (!controlWellArray || !controlWellArray.length || !wells.length) return [];
  const numIndicators = wells[0].indicators.length;
  const n = wells[0].indicators[0].ys.length;
  const avgCurves = [];
  for (let k = 0; k < numIndicators; k++) {
    const curve = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let validCount = 0;
      for (let c = 0; c < controlWellArray.length; c++) {
        const ndx =
          controlWellArray[c].row * numberOfColumns + controlWellArray[c].col;
        const w = wells[ndx];
        if (w && w.indicators[k] && w.indicators[k].ys.length > i) {
          sum += w.indicators[k].ys[i];
          validCount++;
        }
      }
      curve[i] = validCount > 0 ? sum / validCount : 0;
    }
    avgCurves.push(curve);
  }
  return avgCurves;
}

// Mutates only the apply wells. Preserves the `(diff || 0)` operator: if the
// subtraction yields exactly 0 or NaN, output is 0.
function applyControlSubtraction(wells, params, avgCurves) {
  const { applyWellArray, controlWellArray, numberOfColumns } = params;
  if (
    !controlWellArray ||
    !controlWellArray.length ||
    !applyWellArray ||
    !applyWellArray.length
  ) {
    return;
  }
  for (let i = 0; i < applyWellArray.length; i++) {
    const ndx =
      applyWellArray[i].row * numberOfColumns + applyWellArray[i].col;
    const well = wells[ndx];
    if (!well) continue;
    for (let m = 0; m < well.indicators.length; m++) {
      const ys = well.indicators[m].ys;
      const curve = avgCurves[m];
      const len = ys.length;
      for (let j = 0; j < len; j++) {
        const avgY = curve && j < curve.length ? curve[j] : undefined;
        // Match the original `(dataY - avgY) || 0` operator: NaN || 0 === 0.
        const diff = ys[j] - avgY;
        ys[j] = diff || 0;
      }
    }
  }
}

// ---------- Derivative --------------------------------------------------

// Reads adjacent original values, writes slope. Last point copies the
// previously-written slope (the original code reads `filteredData[j-1].y`
// at j==n-1, which has just been overwritten with slope_{n-2,n-1}).
function applyDerivative(wells) {
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const xs = inds[i].xs;
      const ys = inds[i].ys;
      const n = ys.length;
      if (n === 0) continue;
      // RHS evaluates before the assignment, so ys[j] and ys[j+1] are read
      // as their original values: ys[j+1] hasn't been visited yet, and the
      // previous iteration wrote ys[j-1], not ys[j].
      for (let j = 0; j < n - 1; j++) {
        ys[j] = (ys[j + 1] - ys[j]) / (xs[j + 1] - xs[j]);
      }
      // Last point copies the previously-written slope (matches the
      // original `filteredData[j-1].y` read at j == n-1).
      ys[n - 1] = ys[n - 2];
    }
  }
}

// ---------- OutlierRemoval (Hampel) -------------------------------------

const HAMPEL_L = 1.4826;

function medianSorted(view, count) {
  view.sort();
  const mid = count >> 1;
  return count % 2 !== 0
    ? view[mid]
    : (view[mid - 1] + view[mid]) / 2;
}

function applyOutlierRemoval(wells, params) {
  const { halfWindow, threshold } = params;
  const winSize = halfWindow * 2 + 1;

  // Phase D: pool scratch buffers across all (well × indicator × window)
  // iterations in a single filter call. Pre-Phase-D, snapshot/winBuf/devBuf
  // were allocated per (well × indicator) and a fresh sortBuf was allocated
  // per window — for a 96-well × 2-indicator × 250K-row payload that's ~12M
  // sortBuf allocations, dominating GC time. With pooling, the per-call
  // total drops to one snapshot (sized to the largest ys) plus winBuf and
  // devBuf (winSize floats each).
  let maxN = 0;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const n = inds[i].ys.length;
      if (n > maxN) maxN = n;
    }
  }
  if (maxN < winSize) return;
  const snapshot = new Float64Array(maxN);
  const winBuf = new Float64Array(winSize);
  const devBuf = new Float64Array(winSize);

  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const ys = inds[i].ys;
      const n = ys.length;
      if (n < winSize) continue;
      // The original Hampel reads from the input array `data` (snapshot of
      // pre-filter ys) and writes to dataCopy. We replicate by copying ys
      // into a snapshot, mutating ys (which is what the rest of the
      // pipeline will see), and using the snapshot for window reads.
      // Pooled snapshot: only the prefix [0, n) is used; the tail of the
      // pooled buffer is dead state from a previous larger indicator and
      // never read.
      snapshot.set(ys.subarray(0, n));
      for (let idx = halfWindow; idx < n - halfWindow; idx++) {
        for (let k = 0; k < winSize; k++) {
          winBuf[k] = snapshot[idx - halfWindow + k];
        }
        // Sort winBuf in place for the median. The original code preserved
        // winBuf's order for the deviation step by sorting a separate copy,
        // but |winBuf[k] - med| is permutation-invariant — sorting
        // winBuf in place produces the same multiset of deviations and
        // therefore the same MAD. Saves one Float64Array allocation per
        // window iteration (was the dominant churn in this filter).
        const med = medianSorted(winBuf, winSize);
        for (let k = 0; k < winSize; k++) {
          devBuf[k] = Math.abs(winBuf[k] - med);
        }
        const MAD = HAMPEL_L * medianSorted(devBuf, winSize);
        if (Math.abs(snapshot[idx] - med) / MAD > threshold) {
          ys[idx] = med;
        }
      }
    }
  }
}

// ---------- FlatFieldCorrection ----------------------------------------

function applyFlatFieldCorrection(wells, params) {
  const { correctionMatrix } = params;
  if (!correctionMatrix || correctionMatrix.length !== wells.length) return;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    const factor = correctionMatrix[w];
    for (let i = 0; i < inds.length; i++) {
      const ys = inds[i].ys;
      const n = ys.length;
      for (let j = 0; j < n; j++) ys[j] = ys[j] * factor;
    }
  }
}

// ---------- DynamicRatio -----------------------------------------------

// Numerator / denominator. Skips points where denominator === 0 or
// undefined, producing a (potentially) shorter shared output. Both
// indicators end up with the same xs and ys references — preserve that
// aliasing across the worker boundary.
function applyDynamicRatio(wells, params) {
  const { numerator, denominator } = params;

  // Phase D: pre-size pooled tmp buffers to the largest n we'll see across
  // all wells in this call, so the slow path doesn't allocate fresh buffers
  // per well.
  let maxN = 0;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    const num = inds[numerator];
    const den = inds[denominator];
    if (!num || !den) continue;
    const n = Math.max(num.ys.length, den.ys.length);
    if (n > maxN) maxN = n;
  }
  let tmpXs = null;
  let tmpYs = null;

  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    const num = inds[numerator];
    const den = inds[denominator];
    if (!num || !den) continue;
    // Pad both to the same length by repeating the last entry. (Both arrays
    // are normally equal length post-pack, but match the original behavior.)
    const n = Math.max(num.ys.length, den.ys.length);
    const numXs = padTo(num.xs, n);
    const numYs = padTo(num.ys, n);
    const denYs = padTo(den.ys, n);

    // Phase D fast path: scan the padded denominator (post-padTo, since
    // padding can extend a shorter denominator with repeated values that
    // happen to be zero). If no zeros, write the ratio into a single fresh
    // outYs and reuse numXs as the shared xs ref — saves one full
    // Float64Array allocation per well.
    let hasZero = false;
    for (let j = 0; j < n; j++) {
      const dy = denYs[j];
      if (dy === 0 || dy === undefined) {
        hasZero = true;
        break;
      }
    }
    if (!hasZero) {
      const outYs = new Float64Array(n);
      for (let j = 0; j < n; j++) outYs[j] = numYs[j] / denYs[j];
      const finalXs = numXs;
      inds[numerator].xs = finalXs;
      inds[numerator].ys = outYs;
      inds[denominator].xs = finalXs;
      inds[denominator].ys = outYs;
      continue;
    }

    // Slow path: allocate pooled tmps once per filter call, reuse per well.
    if (tmpXs === null) {
      tmpXs = new Float64Array(maxN);
      tmpYs = new Float64Array(maxN);
    }
    let out = 0;
    for (let j = 0; j < n; j++) {
      const dy = denYs[j];
      if (dy === 0 || dy === undefined) continue;
      tmpXs[out] = numXs[j];
      tmpYs[out] = numYs[j] / dy;
      out++;
    }
    // The final shared output length varies per well (some wells may have
    // skipped zero-denominator points), so we still need an exact-sized
    // copy per well. .slice(0, out) preserves the buffer-uniqueness
    // invariant the worker boundary needs for transfer.
    const finalXs = tmpXs.slice(0, out);
    const finalYs = tmpYs.slice(0, out);
    inds[numerator].xs = finalXs;
    inds[numerator].ys = finalYs;
    inds[denominator].xs = finalXs;
    inds[denominator].ys = finalYs;
  }
}

function padTo(arr, n) {
  if (arr.length >= n) return arr;
  const out = new Float64Array(n);
  out.set(arr);
  if (arr.length > 0) {
    const last = arr[arr.length - 1];
    for (let i = arr.length; i < n; i++) out[i] = last;
  }
  return out;
}

// ---------- Dispatcher --------------------------------------------------

const FILTER_FNS = {
  staticRatio: (wells, spec) => applyStaticRatio(wells, spec.params),
  smoothing: (wells, spec) => applySmoothing(wells, spec.params),
  controlSubtraction: (wells, spec, avgCurves) =>
    applyControlSubtraction(wells, spec.params, avgCurves),
  derivative: (wells) => applyDerivative(wells),
  outlierRemoval: (wells, spec) => applyOutlierRemoval(wells, spec.params),
  flatFieldCorrection: (wells, spec) =>
    applyFlatFieldCorrection(wells, spec.params),
  dynamicRatio: (wells, spec) => applyDynamicRatio(wells, spec.params),
};

// Applies a sequence of filter specs over `wells`, mutating in place.
// `avgCurves` is the precomputed control-subtraction average curve (one
// Float64Array per indicator) for the single ControlSubtraction filter that
// may appear in the segment. Segments are constructed by the orchestrator
// to contain at most one ControlSubtraction (always at the tail).
function runSegment({ wells, filters, avgCurves, onProgress }) {
  for (let f = 0; f < filters.length; f++) {
    const spec = filters[f];
    const fn = FILTER_FNS[spec.type];
    if (!fn) {
      throw new Error(`Unknown filter type: ${spec.type}`);
    }
    fn(wells, spec, avgCurves);
    if (onProgress) onProgress({ filterIndex: f, totalFilters: filters.length });
  }
  return wells;
}

const _exports = {
  applyStaticRatio,
  applySmoothing,
  applyControlSubtraction,
  applyDerivative,
  applyOutlierRemoval,
  applyFlatFieldCorrection,
  applyDynamicRatio,
  computeAverageCurves,
  runSegment,
  FILTER_FNS,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
