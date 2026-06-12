// Tests for the StaticRatio "rescale by plate-median Fo" option:
//   - computeMedianFoByIndicator: per-indicator median of per-well baseline
//     Fo, robust to empty/NaN wells.
//   - applyStaticRatio: when a medianFoByIndicator array is supplied, output
//     is (F / Fo_well) * medianFo[indicator]; without it, plain F/Fo
//     (covered bit-for-bit by the golden suite).

const {
  applyStaticRatio,
  computeMedianFoByIndicator,
} = require("../filterCore.js");

// Build packed wells from a [wellsByIndicator] spec: each well is an array of
// indicator y-arrays. xs are 0..n-1.
function packWells(spec) {
  return spec.map((indicatorYs, w) => ({
    id: `w${w}`,
    row: 0,
    col: w,
    indicators: indicatorYs.map((ys) => ({
      xs: Float64Array.from(ys.map((_, i) => i)),
      ys: Float64Array.from(ys),
    })),
  }));
}

describe("computeMedianFoByIndicator", () => {
  test("median across wells of the baseline-window mean, per indicator", () => {
    // baseline window [0,1]: NV = mean(first two). Wells: 10, 20, 30.
    const wells = packWells([
      [[10, 10, 20, 10]],
      [[20, 20, 40, 20]],
      [[30, 30, 60, 30]],
    ]);
    const medians = computeMedianFoByIndicator(wells, { start: 0, end: 1 });
    expect(medians).toEqual([20]); // median(10,20,30)
  });

  test("each indicator gets its own median (no single-scalar mis-scaling)", () => {
    // Two indicators on different scales: ind0 NVs 10/20/30 -> 20,
    // ind1 NVs 100/200/300 -> 200.
    const wells = packWells([
      [
        [10, 10, 20],
        [100, 100, 200],
      ],
      [
        [20, 20, 40],
        [200, 200, 400],
      ],
      [
        [30, 30, 60],
        [300, 300, 600],
      ],
    ]);
    const medians = computeMedianFoByIndicator(wells, { start: 0, end: 1 });
    expect(medians).toEqual([20, 200]);
  });

  test("wells with a NaN baseline are excluded (robust to empty wells)", () => {
    // Three valid wells (10,20,30) plus a dead well whose baseline is NaN.
    // The dead well must not perturb the median (stays 20).
    const wells = packWells([
      [[10, 10, 20]],
      [[20, 20, 40]],
      [[30, 30, 60]],
      [[NaN, NaN, NaN]],
    ]);
    const medians = computeMedianFoByIndicator(wells, { start: 0, end: 1 });
    expect(medians).toEqual([20]);
  });

  test("even well count averages the two middle Fo values", () => {
    const wells = packWells([[[10, 10]], [[20, 20]], [[30, 30]], [[50, 50]]]);
    const medians = computeMedianFoByIndicator(wells, { start: 0, end: 1 });
    expect(medians).toEqual([25]); // (20 + 30) / 2
  });
});

describe("applyStaticRatio with plate-median Fo rescale", () => {
  test("output is (F / Fo_well) * medianFo per indicator", () => {
    const wells = packWells([
      [[10, 10, 20, 10]], // NV 10
      [[20, 20, 40, 20]], // NV 20
      [[30, 30, 60, 30]], // NV 30
    ]);
    const medianFoByIndicator = computeMedianFoByIndicator(wells, {
      start: 0,
      end: 1,
    });
    expect(medianFoByIndicator).toEqual([20]);

    applyStaticRatio(wells, { start: 0, end: 1, medianFoByIndicator });

    // Each well rescaled by medianFo(20)/NV: all three collapse onto the
    // same comparable magnitude (baseline 20, peak 40) — the whole point of
    // the option: peak heights are now comparable well-to-well.
    for (const w of wells) {
      const ys = Array.from(w.indicators[0].ys);
      expect(ys).toEqual([20, 20, 40, 20]);
    }
  });

  test("rescale factor differs per indicator within a well", () => {
    const wells = packWells([
      [
        [10, 10, 20],
        [100, 100, 300],
      ],
      [
        [20, 20, 40],
        [200, 200, 600],
      ],
    ]);
    // ind0 NVs 10/20 -> median 15; ind1 NVs 100/200 -> median 150.
    const medianFoByIndicator = computeMedianFoByIndicator(wells, {
      start: 0,
      end: 1,
    });
    expect(medianFoByIndicator).toEqual([15, 150]);

    applyStaticRatio(wells, { start: 0, end: 1, medianFoByIndicator });

    // Well 0 ind0: /10*15 -> [15,15,30]; ind1: /100*150 -> [150,150,450].
    expect(Array.from(wells[0].indicators[0].ys)).toEqual([15, 15, 30]);
    expect(Array.from(wells[0].indicators[1].ys)).toEqual([150, 150, 450]);
    // Well 1 ind0: /20*15 -> [15,15,30]; ind1: /200*150 -> [150,150,450].
    expect(Array.from(wells[1].indicators[0].ys)).toEqual([15, 15, 30]);
    expect(Array.from(wells[1].indicators[1].ys)).toEqual([150, 150, 450]);
  });

  test("falls back to plain F/Fo when no/NaN median for an indicator", () => {
    const wells = packWells([[[10, 10, 20, 5]]]);
    // No medianFoByIndicator supplied -> plain F/Fo (divide by NV=10).
    applyStaticRatio(wells, { start: 0, end: 1 });
    expect(Array.from(wells[0].indicators[0].ys)).toEqual([1, 1, 2, 0.5]);

    // A null entry in the array also falls back to plain F/Fo.
    const wells2 = packWells([[[10, 10, 20, 5]]]);
    applyStaticRatio(wells2, {
      start: 0,
      end: 1,
      medianFoByIndicator: [null],
    });
    expect(Array.from(wells2[0].indicators[0].ys)).toEqual([1, 1, 2, 0.5]);
  });
});
