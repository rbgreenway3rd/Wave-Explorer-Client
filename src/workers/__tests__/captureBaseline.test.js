// Pre-refactor baseline capture: runs the existing FilterModels.js classes
// (which mutate {x,y}[] in place) against the deterministic fixture and writes
// JSON snapshots that the new typed-array filterCore.js will be checked against.
//
// Run only on demand:
//   CAPTURE_BASELINE=1 npx react-scripts test --watchAll=false \
//       --testPathPattern=captureBaseline
//
// FilterModels.js itself imports nothing — pulling it in does not transitively
// load DataProvider (which uses import.meta.url and breaks Jest).

const fs = require("fs");
const path = require("path");
const {
  StaticRatio_Filter,
  Smoothing_Filter,
  ControlSubtraction_Filter,
  Derivative_Filter,
  OutlierRemoval_Filter,
  FlatFieldCorrection_Filter,
  DynamicRatio_Filter,
} = require("../../components/Graphing/FilteredData/FilterModels.js");
const {
  NUM_COLS,
  NUM_ROWS,
  makeWellInput,
  cloneWellsDeep,
  controlWells,
  applyWells,
  flatFieldMatrix,
  summarizeWells,
} = require("./_filterTestFixture.js");

const FIXTURES_DIR = path.join(__dirname, "fixtures");

const shouldRun = process.env.CAPTURE_BASELINE === "1";
const describeIf = shouldRun ? describe : describe.skip;

function writeFixture(name, wells, extra = {}) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  const out = { snapshot: summarizeWells(wells), ...extra };
  fs.writeFileSync(
    path.join(FIXTURES_DIR, `${name}.json`),
    JSON.stringify(out, null, 2)
  );
}

function makeControlSubFilter() {
  const f = new ControlSubtraction_Filter(0, null, NUM_COLS, NUM_ROWS);
  f.setParams(controlWells(), applyWells());
  return f;
}

describeIf("baseline capture", () => {
  test("StaticRatio", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new StaticRatio_Filter(0, null);
    f.setParams(0, 5);
    f.execute(wells);
    writeFixture("staticRatio", wells);
  });

  test("Smoothing mean", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new Smoothing_Filter(0, null);
    f.setParams(5, false);
    f.execute(wells);
    writeFixture("smoothingMean", wells);
  });

  test("Smoothing median", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new Smoothing_Filter(0, null);
    f.setParams(5, true);
    f.execute(wells);
    writeFixture("smoothingMedian", wells);
  });

  test("ControlSubtraction (raw input)", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = makeControlSubFilter();
    f.calculate_average_curve(wells);
    f.execute(wells);
    writeFixture("controlSub", wells, {
      averageCurve: f.average_curve.map((arr) => arr.map((p) => [p.x, p.y])),
    });
  });

  test("Derivative", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new Derivative_Filter(0, null);
    f.execute(wells);
    writeFixture("derivative", wells);
  });

  test("OutlierRemoval", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new OutlierRemoval_Filter(0, null);
    f.setParams(2, 3);
    f.execute(wells);
    writeFixture("outlierRemoval", wells);
  });

  test("FlatFieldCorrection", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new FlatFieldCorrection_Filter(0, null);
    f.setParams(flatFieldMatrix());
    f.isEnabled = true;
    f.execute(wells);
    writeFixture("flatField", wells);
  });

  test("DynamicRatio", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const f = new DynamicRatio_Filter(0, null);
    f.setParams(0, 1);
    f.execute(wells);
    writeFixture("dynamicRatio", wells, {
      // Capture aliasing: numerator and denominator filteredData are the same ref.
      aliased: wells.map((w) =>
        w.indicators[0].filteredData === w.indicators[1].filteredData
      ),
    });
  });

  test("Stack: StaticRatio -> Smoothing -> ControlSubtraction", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const sr = new StaticRatio_Filter(0, null);
    sr.setParams(0, 5);
    const sm = new Smoothing_Filter(1, null);
    sm.setParams(5, false);
    const cs = makeControlSubFilter();
    sr.execute(wells);
    sm.execute(wells);
    cs.calculate_average_curve(wells);
    cs.execute(wells);
    writeFixture("stack_SR_SM_CS", wells);
  });

  test("Stack: Smoothing -> DynamicRatio -> Derivative", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    const dr = new DynamicRatio_Filter(1, null);
    dr.setParams(0, 1);
    const d = new Derivative_Filter(2, null);
    sm.execute(wells);
    dr.execute(wells);
    d.execute(wells);
    writeFixture("stack_SM_DR_D", wells);
  });

  test("Phase boundary: Smoothing -> ControlSubtraction -> Smoothing", () => {
    const wells = cloneWellsDeep(makeWellInput());
    const sm1 = new Smoothing_Filter(0, null);
    sm1.setParams(5, false);
    const cs = makeControlSubFilter();
    const sm2 = new Smoothing_Filter(2, null);
    sm2.setParams(5, false);
    sm1.execute(wells);
    cs.calculate_average_curve(wells); // computed AFTER sm1 mutates filteredData
    cs.execute(wells);
    sm2.execute(wells);
    writeFixture("phase_SM_CS_SM", wells, {
      averageCurveAfterSm1: cs.average_curve.map((arr) =>
        arr.map((p) => [p.x, p.y])
      ),
    });
  });
});

if (!shouldRun) {
  test("baseline capture skipped (set CAPTURE_BASELINE=1 to run)", () => {
    expect(true).toBe(true);
  });
}
