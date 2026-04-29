// End-to-end orchestrator path test (sans Web Worker). Exercises filterPack
// + filterCore.runSegment together to validate:
//   - Indicator class identity / methods preserved through pack -> merge
//   - DynamicRatio alias preserved across the merge boundary
//   - Phase splitting + per-phase avg-curve recompute matches the canonical
//     "apply filters one by one with calculate_average_curve in between"
//     behavior (i.e. matches the FilterModels.js baseline output)

const fs = require("fs");
const path = require("path");
const {
  Indicator,
  Well,
} = require("../../components/Models.js");
const {
  Smoothing_Filter,
  ControlSubtraction_Filter,
  DynamicRatio_Filter,
} = require("../../components/Graphing/FilteredData/FilterModels.js");
const {
  packWellsToTypedArrays,
  mergeFilteredBack,
  splitPhasesByControlSubtraction,
  serializeFilter,
  computeControlAveragesFromPacked,
  isControlSubFilter,
} = require("../filterPack.js");
const filterCore = require("../../workers/filterCore.js");
const {
  NUM_COLS,
  NUM_ROWS,
  makeWellInput,
  controlWells,
  applyWells,
} = require("../../workers/__tests__/_filterTestFixture.js");

const FIXTURES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "workers",
  "__tests__",
  "fixtures"
);

function buildWellArray() {
  const input = makeWellInput();
  return input.map((w, i) => {
    const well = new Well(
      `well_${i}`,
      `key_${i}`,
      `L_${i}`,
      w.col,
      w.row
    );
    for (let k = 0; k < w.indicators.length; k++) {
      const src = w.indicators[k];
      const ind = new Indicator(
        `${well.id}_${k}`,
        `ind_${k}`,
        src.rawData.map((p) => ({ x: p.x, y: p.y })),
        [],
        src.rawData.map((p) => p.x),
        true
      );
      well.indicators.push(ind);
    }
    return well;
  });
}

function runOrchestrator(wellArrays, filterInstances) {
  const phases = splitPhasesByControlSubtraction(filterInstances);
  let packed = packWellsToTypedArrays(wellArrays);
  for (const phase of phases) {
    if (phase.kind === "segment") {
      filterCore.runSegment({
        wells: packed,
        filters: phase.filters.map(serializeFilter),
      });
    } else {
      const avgCurves = computeControlAveragesFromPacked(packed, phase.filter);
      filterCore.runSegment({
        wells: packed,
        filters: [serializeFilter(phase.filter)],
        avgCurves,
      });
    }
  }
  mergeFilteredBack(wellArrays, packed);
}

describe("filterPack + filterCore orchestrator integration", () => {
  test("preserves Indicator class identity and methods", () => {
    const wells = buildWellArray();
    const originalIndicators = wells.map((w) => w.indicators.slice());

    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    runOrchestrator(wells, [sm]);

    for (let w = 0; w < wells.length; w++) {
      for (let i = 0; i < wells[w].indicators.length; i++) {
        // Same Indicator instance reference.
        expect(wells[w].indicators[i]).toBe(originalIndicators[w][i]);
        // Class methods still attached.
        expect(typeof wells[w].indicators[i].setDisplayed).toBe("function");
        // setDisplayed still works.
        wells[w].indicators[i].setDisplayed(false);
        expect(wells[w].indicators[i].isDisplayed).toBe(false);
        wells[w].indicators[i].setDisplayed(true);
      }
    }
  });

  test("preserves DynamicRatio alias across pack/merge", () => {
    const wells = buildWellArray();
    const dr = new DynamicRatio_Filter(0, null);
    dr.setParams(0, 1);
    runOrchestrator(wells, [dr]);

    // After typed-array refactor, aliasing is on filteredXs/filteredYs.
    for (let w = 0; w < wells.length; w++) {
      const a = wells[w].indicators[0];
      const b = wells[w].indicators[1];
      expect(a.filteredXs).toBe(b.filteredXs);
      expect(a.filteredYs).toBe(b.filteredYs);
      // Materialized point arrays alias the same cached {x,y}[] too if
      // both indicators are materialized in this order.
      const ap = a.materializeFilteredData();
      // Indicator b's cache is independent unless we materialize via b's
      // own method, which builds from b's typed arrays — same data.
      const bp = b.materializeFilteredData();
      expect(ap.length).toBe(bp.length);
      for (let j = 0; j < ap.length; j++) expect(ap[j].y).toBe(bp[j].y);
    }
  });

  test("phase split: SM -> CS -> SM matches FilterModels.js baseline", () => {
    const wells = buildWellArray();
    const sm1 = new Smoothing_Filter(0, null);
    sm1.setParams(5, false);
    const cs = new ControlSubtraction_Filter(1, null, NUM_COLS, NUM_ROWS);
    cs.setParams(controlWells(), applyWells());
    const sm2 = new Smoothing_Filter(2, null);
    sm2.setParams(5, false);

    const phases = splitPhasesByControlSubtraction([sm1, cs, sm2]);
    expect(phases.length).toBe(3);
    expect(phases[0].kind).toBe("segment");
    expect(phases[0].filters.length).toBe(1);
    expect(phases[1].kind).toBe("controlSub");
    expect(phases[2].kind).toBe("segment");
    expect(phases[2].filters.length).toBe(1);

    runOrchestrator(wells, [sm1, cs, sm2]);

    const expected = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, "phase_SM_CS_SM.json"), "utf8")
    ).snapshot;

    for (let w = 0; w < wells.length; w++) {
      for (let i = 0; i < wells[w].indicators.length; i++) {
        const ind = wells[w].indicators[i];
        const xs = ind.filteredXs;
        const ys = ind.filteredYs;
        const exp = expected[w].indicators[i].filteredData;
        expect(ys.length).toBe(exp.length);
        for (let j = 0; j < exp.length; j++) {
          expect(xs[j]).toBe(exp[j][0]);
          expect(Math.abs(ys[j] - exp[j][1])).toBeLessThanOrEqual(1e-9);
        }
      }
    }
  });

  test("isControlSubFilter detects ControlSubtraction by name", () => {
    const cs = new ControlSubtraction_Filter(0, null, NUM_COLS, NUM_ROWS);
    expect(isControlSubFilter(cs)).toBe(true);
    const sm = new Smoothing_Filter(0, null);
    expect(isControlSubFilter(sm)).toBe(false);
  });

  test("serializeFilter uses the class's serialize() method", () => {
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(7, true);
    expect(serializeFilter(sm)).toEqual({
      type: "smoothing",
      params: { windowWidth: 7, useMedian: true },
    });
  });

  test("mergeFilteredBack stores typed arrays and does NOT allocate {x,y}[]", () => {
    // The OOM-critical invariant: after merge, filteredData stays empty
    // and filtered storage lives only in typed arrays. Materialization is
    // strictly opt-in via materializeFilteredData() so consumers that
    // iterate every well never trigger bulk {x,y}[] allocation.
    const wells = buildWellArray();
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    runOrchestrator(wells, [sm]);

    for (let w = 0; w < wells.length; w++) {
      for (let i = 0; i < wells[w].indicators.length; i++) {
        const ind = wells[w].indicators[i];
        expect(ind.filteredXs).toBeInstanceOf(Float64Array);
        expect(ind.filteredYs).toBeInstanceOf(Float64Array);
        // filteredData is left empty — consumers must opt into materialize.
        expect(Array.isArray(ind.filteredData)).toBe(true);
        expect(ind.filteredData.length).toBe(0);
      }
    }

    // After explicitly materializing, filteredData becomes a {x,y}[] view.
    const ind0 = wells[0].indicators[0];
    const points = ind0.materializeFilteredData();
    expect(points.length).toBe(ind0.filteredYs.length);
    expect(typeof points[0].x).toBe("number");
    expect(typeof points[0].y).toBe("number");
    // Cached on the Indicator: subsequent calls return the same array.
    expect(ind0.materializeFilteredData()).toBe(points);
  });

  test("DynamicRatio shrink yields a shorter typed-array view", () => {
    // Force a divide-by-zero on well 0, indicator 1, point 10.
    const wells = buildWellArray();
    wells[0].indicators[1].rawData[10].y = 0;
    const baselineLen = wells[0].indicators[0].rawData.length;
    const dr = new DynamicRatio_Filter(1, null);
    dr.setParams(0, 1);
    runOrchestrator(wells, [dr]);

    // Well 0 has one point dropped; numerator and denominator share xs/ys.
    expect(wells[0].indicators[0].filteredYs.length).toBe(baselineLen - 1);
    expect(wells[0].indicators[1].filteredYs).toBe(
      wells[0].indicators[0].filteredYs
    );
    // Other wells unaffected.
    expect(wells[1].indicators[0].filteredYs.length).toBe(baselineLen);
  });

  test("subsequent applies overwrite typed arrays without allocating {x,y}[]", () => {
    const wells = buildWellArray();
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);

    runOrchestrator(wells, [sm]);
    // Materialize for one indicator so it has a {x,y}[] cached.
    const ind0 = wells[0].indicators[0];
    ind0.materializeFilteredData();
    expect(ind0.filteredData.length).toBeGreaterThan(0);

    runOrchestrator(wells, [sm]);
    // setFilteredTypedArrays clears the {x,y}[] cache on second run.
    expect(ind0.filteredData.length).toBe(0);
    expect(ind0.filteredXs).toBeInstanceOf(Float64Array);
    expect(ind0.filteredYs).toBeInstanceOf(Float64Array);
  });
});
