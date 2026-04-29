// Verifies filterCore.js produces output equal to the FilterModels.js baseline
// snapshots captured by captureBaseline.test.js. This is the safety net for
// the filter pipeline refactor: any divergence here means a behavioral
// regression and must be fixed before merging.

const fs = require("fs");
const path = require("path");
const {
  applyStaticRatio,
  applySmoothing,
  applyControlSubtraction,
  applyDerivative,
  applyOutlierRemoval,
  applyFlatFieldCorrection,
  applyDynamicRatio,
  computeAverageCurves,
} = require("../filterCore.js");
const {
  NUM_COLS,
  makeWellInput,
  controlWells,
  applyWells,
  flatFieldMatrix,
} = require("./_filterTestFixture.js");

const FIXTURES_DIR = path.join(__dirname, "fixtures");

function loadFixture(name) {
  return JSON.parse(
    fs.readFileSync(path.join(FIXTURES_DIR, `${name}.json`), "utf8")
  );
}

function packWells(input) {
  return input.map((w) => ({
    id: w.id,
    row: w.row,
    col: w.col,
    indicators: w.indicators.map((ind) => ({
      xs: Float64Array.from(ind.rawData.map((p) => p.x)),
      ys: Float64Array.from(ind.rawData.map((p) => p.y)),
    })),
  }));
}

function summarizePacked(wells) {
  return wells.map((w) => ({
    id: w.id,
    indicators: w.indicators.map((ind) => ({
      filteredData: Array.from(ind.ys, (y, i) => [ind.xs[i], y]),
      length: ind.ys.length,
    })),
  }));
}

function expectExact(actual, expected) {
  expect(actual.length).toBe(expected.length);
  for (let w = 0; w < actual.length; w++) {
    const aIs = actual[w].indicators;
    const eIs = expected[w].indicators;
    expect(aIs.length).toBe(eIs.length);
    for (let i = 0; i < aIs.length; i++) {
      expect(aIs[i].length).toBe(eIs[i].length);
      const a = aIs[i].filteredData;
      const e = eIs[i].filteredData;
      for (let j = 0; j < e.length; j++) {
        expect(a[j][0]).toBe(e[j][0]);
        // Bit-exact on y for deterministic filters.
        expect(a[j][1]).toBe(e[j][1]);
      }
    }
  }
}

function expectClose(actual, expected, tol) {
  expect(actual.length).toBe(expected.length);
  for (let w = 0; w < actual.length; w++) {
    const aIs = actual[w].indicators;
    const eIs = expected[w].indicators;
    expect(aIs.length).toBe(eIs.length);
    for (let i = 0; i < aIs.length; i++) {
      expect(aIs[i].length).toBe(eIs[i].length);
      const a = aIs[i].filteredData;
      const e = eIs[i].filteredData;
      for (let j = 0; j < e.length; j++) {
        expect(a[j][0]).toBe(e[j][0]);
        expect(Math.abs(a[j][1] - e[j][1])).toBeLessThanOrEqual(tol);
      }
    }
  }
}

const csParams = () => ({
  controlWellArray: controlWells(),
  applyWellArray: applyWells(),
  numberOfColumns: NUM_COLS,
});

describe("filterCore golden — exact equality", () => {
  test("Derivative", () => {
    const wells = packWells(makeWellInput());
    applyDerivative(wells);
    expectExact(summarizePacked(wells), loadFixture("derivative").snapshot);
  });

  test("FlatFieldCorrection", () => {
    const wells = packWells(makeWellInput());
    applyFlatFieldCorrection(wells, { correctionMatrix: flatFieldMatrix() });
    expectExact(summarizePacked(wells), loadFixture("flatField").snapshot);
  });

  test("OutlierRemoval", () => {
    const wells = packWells(makeWellInput());
    applyOutlierRemoval(wells, { halfWindow: 2, threshold: 3 });
    expectExact(summarizePacked(wells), loadFixture("outlierRemoval").snapshot);
  });

  test("ControlSubtraction (raw input)", () => {
    const wells = packWells(makeWellInput());
    const params = csParams();
    const avgCurves = computeAverageCurves(wells, params);
    applyControlSubtraction(wells, params, avgCurves);
    expectExact(summarizePacked(wells), loadFixture("controlSub").snapshot);
  });

  test("DynamicRatio", () => {
    const wells = packWells(makeWellInput());
    applyDynamicRatio(wells, { numerator: 0, denominator: 1 });
    const expected = loadFixture("dynamicRatio");
    expectExact(summarizePacked(wells), expected.snapshot);
    // Aliasing: numerator and denominator must share the same Float64Array.
    for (let w = 0; w < wells.length; w++) {
      expect(wells[w].indicators[0].ys === wells[w].indicators[1].ys).toBe(
        expected.aliased[w]
      );
    }
  });
});

describe("filterCore golden — within tolerance", () => {
  // StaticRatio diverges from the FilterModels.js baseline at ~ULP scale
  // because the outer-j no-op loop has been removed (the original
  // accumulated tiny FP drift over n iterations).
  // Smoothing's sub-operations are arithmetically identical, but we leave
  // the same tolerance in case sort tie-breaks differ between
  // Array<number> and Float64Array sort.
  const SMOOTH_TOL = 1e-9;

  test("StaticRatio (single-pass output ≈ original to 1e-9)", () => {
    const wells = packWells(makeWellInput());
    applyStaticRatio(wells, { start: 0, end: 5 });
    expectClose(
      summarizePacked(wells),
      loadFixture("staticRatio").snapshot,
      SMOOTH_TOL
    );
  });

  test("Smoothing mean", () => {
    const wells = packWells(makeWellInput());
    applySmoothing(wells, { windowWidth: 5, useMedian: false });
    expectClose(
      summarizePacked(wells),
      loadFixture("smoothingMean").snapshot,
      SMOOTH_TOL
    );
  });

  test("Smoothing median", () => {
    const wells = packWells(makeWellInput());
    applySmoothing(wells, { windowWidth: 5, useMedian: true });
    expectClose(
      summarizePacked(wells),
      loadFixture("smoothingMedian").snapshot,
      SMOOTH_TOL
    );
  });
});

describe("filterCore golden — stacks", () => {
  test("StaticRatio -> Smoothing -> ControlSubtraction", () => {
    const wells = packWells(makeWellInput());
    applyStaticRatio(wells, { start: 0, end: 5 });
    applySmoothing(wells, { windowWidth: 5, useMedian: false });
    const params = csParams();
    const avgCurves = computeAverageCurves(wells, params);
    applyControlSubtraction(wells, params, avgCurves);
    expectClose(
      summarizePacked(wells),
      loadFixture("stack_SR_SM_CS").snapshot,
      1e-9
    );
  });

  test("Smoothing -> DynamicRatio -> Derivative", () => {
    const wells = packWells(makeWellInput());
    applySmoothing(wells, { windowWidth: 5, useMedian: false });
    applyDynamicRatio(wells, { numerator: 0, denominator: 1 });
    applyDerivative(wells);
    expectClose(
      summarizePacked(wells),
      loadFixture("stack_SM_DR_D").snapshot,
      1e-9
    );
  });

  test("Phase boundary: Smoothing -> ControlSubtraction -> Smoothing", () => {
    // This test pins down the phasing fix: the average curve must be
    // computed from the *post-first-Smoothing* state, not from raw, and
    // the final Smoothing must operate on post-subtraction data.
    const wells = packWells(makeWellInput());
    applySmoothing(wells, { windowWidth: 5, useMedian: false });
    const params = csParams();
    const avgCurves = computeAverageCurves(wells, params);
    applyControlSubtraction(wells, params, avgCurves);
    applySmoothing(wells, { windowWidth: 5, useMedian: false });
    expectClose(
      summarizePacked(wells),
      loadFixture("phase_SM_CS_SM").snapshot,
      1e-9
    );
  });
});

describe("filterCore golden — operator semantics", () => {
  test("ControlSubtraction yields 0 where avg curve is missing/NaN", () => {
    // Build a 2-well, 1-indicator input where the lone control well has NaN
    // at half its points; expect the apply well's output to be 0 there.
    const n = 8;
    const xs = Float64Array.from({ length: n }, (_, i) => i);
    const ctrlYs = Float64Array.from({ length: n }, (_, i) =>
      i < n / 2 ? 2.5 : NaN
    );
    const applyYs = Float64Array.from({ length: n }, () => 5);
    const wells = [
      {
        id: "ctrl",
        row: 0,
        col: 0,
        indicators: [{ xs: xs.slice(), ys: ctrlYs }],
      },
      {
        id: "apply",
        row: 0,
        col: 1,
        indicators: [{ xs: xs.slice(), ys: applyYs }],
      },
    ];
    const params = {
      controlWellArray: [{ row: 0, col: 0 }],
      applyWellArray: [{ row: 0, col: 1 }],
      numberOfColumns: 2,
    };
    const avg = computeAverageCurves(wells, params);
    applyControlSubtraction(wells, params, avg);
    const out = wells[1].indicators[0].ys;
    for (let i = 0; i < n / 2; i++) expect(out[i]).toBe(2.5);
    for (let i = n / 2; i < n; i++) expect(out[i]).toBe(0);
  });
});
