// Phase D: verifies applyDynamicRatio's fast/slow paths preserve the
// numerator-denominator aliasing contract (both indicators end up sharing
// the same xs/ys references) and produce numerically correct output. Also
// pins the pad-then-scan correctness for shorter denominators.

const { applyDynamicRatio } = require("../filterCore.js");

function makeWell(numXs, numYs, denXs, denYs) {
  return {
    id: "w0",
    row: 0,
    col: 0,
    indicators: [
      { xs: Float64Array.from(numXs), ys: Float64Array.from(numYs) }, // numerator @ index 0
      { xs: Float64Array.from(denXs), ys: Float64Array.from(denYs) }, // denominator @ index 1
    ],
  };
}

describe("Phase D: applyDynamicRatio fast path + aliasing", () => {
  test("fast path (no zero denominators): output xs aliased to numerator's xs", () => {
    const well = makeWell([0, 1, 2, 3], [10, 20, 30, 40], [0, 1, 2, 3], [2, 4, 5, 8]);
    const numXsRefBefore = well.indicators[0].xs;
    applyDynamicRatio([well], { numerator: 0, denominator: 1 });

    const num = well.indicators[0];
    const den = well.indicators[1];
    expect(num.xs).toBe(den.xs);
    expect(num.ys).toBe(den.ys);
    // Fast path reuses numerator's xs reference.
    expect(num.xs).toBe(numXsRefBefore);
    expect(Array.from(num.ys)).toEqual([5, 5, 6, 5]);
    expect(num.ys.length).toBe(4);
  });

  test("slow path (with zero denominator): output xs/ys are independent buffers, still aliased", () => {
    const well = makeWell([0, 1, 2, 3], [10, 20, 30, 40], [0, 1, 2, 3], [2, 0, 5, 8]);
    const numXsBefore = well.indicators[0].xs;
    applyDynamicRatio([well], { numerator: 0, denominator: 1 });

    const num = well.indicators[0];
    const den = well.indicators[1];
    expect(num.xs).toBe(den.xs);
    expect(num.ys).toBe(den.ys);
    // Slow path replaces with a fresh slice.
    expect(num.xs).not.toBe(numXsBefore);
    // Output skips the zero-denominator point at j=1.
    expect(Array.from(num.xs)).toEqual([0, 2, 3]);
    expect(Array.from(num.ys)).toEqual([5, 6, 5]);
  });

  test("padding edge case: shorter denominator, repeated-last value is zero", () => {
    // Denominator is length 3, last value is 0 → padTo extends to length 4
    // by repeating the 0. The fast-path zero scan must run on the PADDED
    // denominator, not raw den.ys, so the synthesized zero is detected.
    const well = makeWell([0, 1, 2, 3], [10, 20, 30, 40], [0, 1, 2], [2, 4, 0]);
    applyDynamicRatio([well], { numerator: 0, denominator: 1 });

    const num = well.indicators[0];
    const den = well.indicators[1];
    expect(num.xs).toBe(den.xs);
    expect(num.ys).toBe(den.ys);
    // j=2 and j=3 are both zero (j=3 from pad), both skipped.
    expect(Array.from(num.xs)).toEqual([0, 1]);
    expect(Array.from(num.ys)).toEqual([5, 5]);
  });

  test("padding edge case: shorter denominator, repeated-last value is nonzero (fast path applies)", () => {
    // Denominator length 3, last value 4 → padTo extends to length 4 by
    // repeating 4. No zeros, fast path should produce a length-4 result.
    const well = makeWell([0, 1, 2, 3], [10, 20, 30, 40], [0, 1, 2], [2, 4, 4]);
    applyDynamicRatio([well], { numerator: 0, denominator: 1 });

    const num = well.indicators[0];
    const den = well.indicators[1];
    expect(num.xs).toBe(den.xs);
    expect(num.ys).toBe(den.ys);
    expect(num.ys.length).toBe(4);
    expect(Array.from(num.ys)).toEqual([5, 5, 7.5, 10]); // 40 / 4 (last value padded)
  });

  test("multiple wells in single call: pooled tmps don't leak across wells", () => {
    // Mix of fast-path and slow-path wells in one call. The pooled tmpXs/
    // tmpYs (allocated lazily on first slow-path well) are reused on
    // subsequent slow-path wells; the .slice(0, out) per well must produce
    // independent buffers.
    const w0 = makeWell([0, 1, 2], [10, 20, 30], [0, 1, 2], [2, 4, 5]); // fast
    const w1 = makeWell([0, 1, 2], [10, 20, 30], [0, 1, 2], [2, 0, 5]); // slow, skip 1
    const w2 = makeWell([0, 1, 2, 3], [4, 8, 12, 16], [0, 1, 2, 3], [2, 4, 0, 0]); // slow, skip 2
    applyDynamicRatio([w0, w1, w2], { numerator: 0, denominator: 1 });

    expect(Array.from(w0.indicators[0].ys)).toEqual([5, 5, 6]);
    expect(Array.from(w1.indicators[0].ys)).toEqual([5, 6]);
    expect(Array.from(w2.indicators[0].ys)).toEqual([2, 2]);

    // Each well's output buffer is a unique reference (no leakage from the
    // pooled tmps).
    expect(w0.indicators[0].ys).not.toBe(w1.indicators[0].ys);
    expect(w1.indicators[0].ys).not.toBe(w2.indicators[0].ys);
    expect(w0.indicators[0].ys).not.toBe(w2.indicators[0].ys);

    // Aliasing preserved within each well.
    expect(w0.indicators[0].xs).toBe(w0.indicators[1].xs);
    expect(w1.indicators[0].xs).toBe(w1.indicators[1].xs);
    expect(w2.indicators[0].xs).toBe(w2.indicators[1].xs);
  });

  test("undefined denominator entry (sparse) skips like zero", () => {
    // Build directly (not via makeWell) so we can put undefined into a
    // plain array element. After Float64Array conversion, undefined → NaN,
    // which the original code matched via `dy === undefined`. With typed
    // arrays the "undefined" path is unreachable, so this just confirms
    // NaN denominator is handled like a regular non-zero (NaN/anything is
    // NaN, but the zero check uses `=== 0 || === undefined`, so NaN passes
    // through and produces NaN output — matching the pre-Phase-D behavior).
    const well = {
      id: "w0",
      row: 0,
      col: 0,
      indicators: [
        { xs: Float64Array.from([0, 1, 2]), ys: Float64Array.from([10, 20, 30]) },
        { xs: Float64Array.from([0, 1, 2]), ys: Float64Array.from([2, NaN, 5]) },
      ],
    };
    applyDynamicRatio([well], { numerator: 0, denominator: 1 });
    const ys = well.indicators[0].ys;
    expect(ys[0]).toBe(5);
    expect(Number.isNaN(ys[1])).toBe(true);
    expect(ys[2]).toBe(6);
  });
});
