// Phase D: verifies the pooled-scratch + in-place-winBuf-sort version of
// applyOutlierRemoval is bit-identical to a fresh-allocation reference
// implementation. Catches regressions in:
//   - the multiset-equivalence claim for in-place winBuf sort
//   - scratch isolation across (well × indicator × call) boundaries
//   - edge cases (MAD === 0 windows, smallest valid window, repeated values)

const { applyOutlierRemoval } = require("../filterCore.js");

const HAMPEL_L = 1.4826;

function medianSortedRef(view, count) {
  view.sort();
  const mid = count >> 1;
  return count % 2 !== 0 ? view[mid] : (view[mid - 1] + view[mid]) / 2;
}

// Pre-Phase-D reference implementation (with sortBuf copy + per-well
// allocations). Used as the equivalence oracle.
function applyOutlierRemovalReference(wells, params) {
  const { halfWindow, threshold } = params;
  const winSize = halfWindow * 2 + 1;
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const ys = inds[i].ys;
      const n = ys.length;
      if (n < winSize) continue;
      const snapshot = new Float64Array(ys);
      const winBuf = new Float64Array(winSize);
      const devBuf = new Float64Array(winSize);
      for (let idx = halfWindow; idx < n - halfWindow; idx++) {
        for (let k = 0; k < winSize; k++) {
          winBuf[k] = snapshot[idx - halfWindow + k];
        }
        const sortBuf = new Float64Array(winBuf);
        const med = medianSortedRef(sortBuf, winSize);
        for (let k = 0; k < winSize; k++) {
          devBuf[k] = Math.abs(winBuf[k] - med);
        }
        const MAD = HAMPEL_L * medianSortedRef(devBuf, winSize);
        if (Math.abs(snapshot[idx] - med) / MAD > threshold) {
          ys[idx] = med;
        }
      }
    }
  }
}

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandomWells(seed, numWells, numInds, n) {
  const rng = mulberry32(seed);
  const wells = [];
  for (let w = 0; w < numWells; w++) {
    const indicators = [];
    for (let i = 0; i < numInds; i++) {
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      for (let j = 0; j < n; j++) {
        xs[j] = j * 0.1;
        ys[j] = Math.sin(j * 0.05 + w + i) + (rng() - 0.5) * 0.3;
        // Occasional spikes to actually trigger the outlier path.
        if (rng() < 0.02) ys[j] += rng() < 0.5 ? -5 : 5;
      }
      indicators.push({ xs, ys });
    }
    wells.push({ id: `w${w}`, row: 0, col: w, indicators });
  }
  return wells;
}

function cloneWells(wells) {
  return wells.map((w) => ({
    id: w.id,
    row: w.row,
    col: w.col,
    indicators: w.indicators.map((ind) => ({
      xs: new Float64Array(ind.xs),
      ys: new Float64Array(ind.ys),
    })),
  }));
}

function assertEqualWells(actual, expected, msg) {
  expect(actual.length).toBe(expected.length);
  for (let w = 0; w < actual.length; w++) {
    const aInds = actual[w].indicators;
    const eInds = expected[w].indicators;
    expect(aInds.length).toBe(eInds.length);
    for (let i = 0; i < aInds.length; i++) {
      const aYs = aInds[i].ys;
      const eYs = eInds[i].ys;
      expect(aYs.length).toBe(eYs.length);
      for (let j = 0; j < aYs.length; j++) {
        if (aYs[j] !== eYs[j]) {
          throw new Error(
            `${msg || "wells diverge"} at w=${w} ind=${i} j=${j}: ` +
              `actual=${aYs[j]} expected=${eYs[j]}`
          );
        }
      }
    }
  }
}

describe("Phase D: applyOutlierRemoval pooled-scratch equivalence", () => {
  test("randomized: 8 wells × 2 indicators × 500 points, halfWindow=5", () => {
    const seed = 0xc0ffee;
    const params = { halfWindow: 5, threshold: 3 };
    const wA = makeRandomWells(seed, 8, 2, 500);
    const wB = cloneWells(wA);
    applyOutlierRemoval(wA, params);
    applyOutlierRemovalReference(wB, params);
    assertEqualWells(wA, wB, "phase D vs reference diverge");
  });

  test("randomized fuzz: 100 trials over varying (halfWindow, threshold, n)", () => {
    const rng = mulberry32(0xdeadbeef);
    for (let trial = 0; trial < 100; trial++) {
      const halfWindow = 1 + Math.floor(rng() * 8); // 1..8
      const threshold = 0.5 + rng() * 5; // 0.5..5.5
      const numWells = 1 + Math.floor(rng() * 4); // 1..4
      const numInds = 1 + Math.floor(rng() * 2); // 1..2
      const n = 50 + Math.floor(rng() * 300); // 50..350
      const wA = makeRandomWells(trial, numWells, numInds, n);
      const wB = cloneWells(wA);
      applyOutlierRemoval(wA, { halfWindow, threshold });
      applyOutlierRemovalReference(wB, { halfWindow, threshold });
      assertEqualWells(
        wA,
        wB,
        `trial ${trial} (hw=${halfWindow} thr=${threshold} n=${n})`
      );
    }
  });

  test("smallest valid window: halfWindow=1 (winSize=3)", () => {
    const wA = makeRandomWells(42, 2, 1, 50);
    const wB = cloneWells(wA);
    applyOutlierRemoval(wA, { halfWindow: 1, threshold: 2 });
    applyOutlierRemovalReference(wB, { halfWindow: 1, threshold: 2 });
    assertEqualWells(wA, wB, "halfWindow=1");
  });

  test("MAD === 0 (all-equal window) — division by zero produces NaN, no replacement", () => {
    const xs = Float64Array.from([0, 1, 2, 3, 4, 5, 6]);
    const ys = Float64Array.from([5, 5, 5, 5, 5, 5, 5]);
    const wells = [{ id: "w0", row: 0, col: 0, indicators: [{ xs, ys }] }];
    const refWells = cloneWells(wells);
    applyOutlierRemoval(wells, { halfWindow: 2, threshold: 3 });
    applyOutlierRemovalReference(refWells, { halfWindow: 2, threshold: 3 });
    assertEqualWells(wells, refWells, "MAD=0 case");
    // Sanity: nothing should have changed (Math.abs(snapshot[idx] - med) / 0
    // is NaN, NaN > threshold is false).
    expect(Array.from(wells[0].indicators[0].ys)).toEqual([5, 5, 5, 5, 5, 5, 5]);
  });

  test("repeated values matching threshold edge", () => {
    const ys = Float64Array.from([1, 1, 1, 1, 5, 1, 1, 1, 1]);
    const xs = Float64Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const wells = [{ id: "w0", row: 0, col: 0, indicators: [{ xs, ys }] }];
    const refWells = cloneWells(wells);
    applyOutlierRemoval(wells, { halfWindow: 2, threshold: 3 });
    applyOutlierRemovalReference(refWells, { halfWindow: 2, threshold: 3 });
    assertEqualWells(wells, refWells, "single-spike window");
  });

  test("scratch isolation: two consecutive calls produce same output as fresh-allocation single call", () => {
    // Pre-warm the implementation with a different-sized payload, then
    // re-run on the target payload. With pooled scratch, the second call
    // reuses buffers — the dead tail of `snapshot` from the first call
    // must NOT leak into the second call's window reads.
    const params = { halfWindow: 3, threshold: 2.5 };
    const warmup = makeRandomWells(1, 4, 2, 700); // larger
    const target = makeRandomWells(2, 3, 2, 200); // smaller
    applyOutlierRemoval(warmup, params);
    applyOutlierRemoval(target, params);

    const reference = makeRandomWells(2, 3, 2, 200);
    applyOutlierRemovalReference(reference, params);

    assertEqualWells(target, reference, "pooled-scratch second call");
  });

  test("scratch isolation across indicators with different lengths in same call", () => {
    // Build wells where indicators within a single call have varying ys
    // lengths. Pooled snapshot is sized to the max; smaller indicators
    // must not read stale tail values from the snapshot.
    const wells = [];
    for (let w = 0; w < 3; w++) {
      const indicators = [];
      for (let i = 0; i < 2; i++) {
        const n = i === 0 ? 300 : 100;
        const xs = new Float64Array(n);
        const ys = new Float64Array(n);
        for (let j = 0; j < n; j++) {
          xs[j] = j * 0.1;
          ys[j] = Math.sin(j * 0.1 + w + i);
          if (j === 50) ys[j] += 5; // outlier
        }
        indicators.push({ xs, ys });
      }
      wells.push({ id: `w${w}`, row: 0, col: w, indicators });
    }
    const reference = cloneWells(wells);

    const params = { halfWindow: 4, threshold: 2 };
    applyOutlierRemoval(wells, params);
    applyOutlierRemovalReference(reference, params);
    assertEqualWells(wells, reference, "mixed-length indicators in one call");
  });

  test("no-op when n < winSize", () => {
    const xs = Float64Array.from([0, 1, 2]);
    const ys = Float64Array.from([1, 2, 3]);
    const wells = [{ id: "w0", row: 0, col: 0, indicators: [{ xs, ys }] }];
    const before = Array.from(ys);
    applyOutlierRemoval(wells, { halfWindow: 5, threshold: 3 }); // winSize=11 > n=3
    expect(Array.from(wells[0].indicators[0].ys)).toEqual(before);
  });
});
