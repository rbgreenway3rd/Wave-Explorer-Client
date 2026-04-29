// End-to-end load-path smoke. Drives DatParser (the worker's pure parser)
// + the strided-copy logic that distributeData uses + the Indicator typed-
// array methods. Verifies that for a known fixture, each well's rawYs
// matches the row-major analysisData layout, miniRawPoints is built, and
// Indicator class methods (setDisplayed / materializeRawData / etc.) are
// preserved on the resulting model objects.

const { parseDatString } = require("../../workers/extractDatParser.js");
const { Indicator, Well } = require("../../components/Models.js");
const { lttbTyped } = require("../lttbTyped.js");
const {
  packWellsToTypedArrays,
  mergeFilteredBack,
} = require("../filterPack.js");
const filterCore = require("../../workers/filterCore.js");
const {
  Smoothing_Filter,
} = require("../../components/Graphing/FilteredData/FilterModels.js");

const FIXTURE = [
  "<HEADER>",
  "NumRows\t2",
  "NumCols\t2",
  "Operator\tOp\tAlice",
  "Project\tTestProject",
  "Date\t2025-01-01",
  "Time\t12:00:00",
  "Instrument\tTestInstr",
  "ProtocolName\tTestProto",
  "AssayPlateBarcode\tBC1",
  "AddPlateBarcode\tBC2",
  "Binning\t1",
  "Indicator1\tBlue\tExcit\t500\tEmit\t600\tExp\t100\tGain\t2",
  "</HEADER>",
  "<INDICATOR_DATA\tBlue\t>",
  "Time\tA1\tA2\tB1\tB2",
  "0.0\t1\t2\t3\t4",
  "0.1\t5\t6\t7\t8",
  "0.2\t9\t10\t11\t12",
  "</INDICATOR_DATA>",
  "",
].join("\n");

// Build wells via the same flow distributeData uses.
function buildWellsFromResult(result) {
  const numRows = result.extractedRows;
  const numCols = result.extractedColumns;
  const wellCount = numRows * numCols;
  const indicatorNames = Object.keys(result.analysisData);
  const wells = [];
  let wellId = 1;
  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    for (let colIndex = 1; colIndex <= numCols; colIndex++) {
      const w = new Well(
        wellId++,
        `${result.rowLabels[rowIndex]}${colIndex}`,
        `${result.rowLabels[rowIndex]}${String(colIndex).padStart(2, "0")}`,
        colIndex - 1,
        rowIndex
      );
      const wellIdx = rowIndex * numCols + (colIndex - 1);
      for (let i = 0; i < indicatorNames.length; i++) {
        const name = indicatorNames[i];
        const flat = result.analysisData[name];
        const xs = result.extractedIndicatorTimes[name];
        const rowCount = Math.floor(flat.length / wellCount);
        const wellYs = new Float64Array(rowCount);
        for (let r = 0; r < rowCount; r++) {
          wellYs[r] = flat[r * wellCount + wellIdx];
        }
        const ind = new Indicator(i, name, [], [], xs, true);
        ind.setRawTypedArrays(xs, wellYs);
        // Match distributeData: alias filtered to raw at load so Heatmap
        // and FilteredGraph render real data before any filter runs.
        ind.filteredXs = xs;
        ind.filteredYs = wellYs;
        ind.miniRawPoints = lttbTyped(xs, wellYs, 80);
        w.indicators.push(ind);
      }
      wells.push(w);
    }
  }
  return wells;
}

describe("Phase C load-path integration", () => {
  test("strided copy: each well's rawYs[r] equals analysisData[r*wellCount+wellIdx]", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);

    expect(wells.length).toBe(4); // 2 rows × 2 cols
    const flat = result.analysisData.Blue;
    const wellCount = result.extractedRows * result.extractedColumns;
    const rowCount = Math.floor(flat.length / wellCount);

    for (let w = 0; w < wells.length; w++) {
      const ind = wells[w].indicators[0];
      expect(ind.rawYs).toBeInstanceOf(Float64Array);
      expect(ind.rawYs.length).toBe(rowCount);
      for (let r = 0; r < rowCount; r++) {
        expect(ind.rawYs[r]).toBe(flat[r * wellCount + w]);
      }
    }
  });

  test("Indicator class methods are preserved through distribute flow", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    for (const w of wells) {
      for (const ind of w.indicators) {
        expect(typeof ind.setDisplayed).toBe("function");
        expect(typeof ind.materializeRawData).toBe("function");
        expect(typeof ind.setFilteredTypedArrays).toBe("function");
        expect(typeof ind.materializeFilteredData).toBe("function");
      }
    }
  });

  test("materializeRawData builds {x,y}[] lazily and caches", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    const ind = wells[0].indicators[0];
    expect(ind.rawData.length).toBe(0); // empty until materialized
    const points = ind.materializeRawData();
    expect(points.length).toBe(ind.rawYs.length);
    expect(points[0]).toEqual({ x: ind.rawXs[0], y: ind.rawYs[0] });
    // Cached on this.rawData:
    expect(ind.materializeRawData()).toBe(points);
    expect(ind.rawData).toBe(points);
  });

  test("setRawTypedArrays clears cached {x,y}[] and miniRawPoints", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    const ind = wells[0].indicators[0];
    ind.materializeRawData(); // cache populated
    expect(ind.rawData.length).toBeGreaterThan(0);

    const newXs = new Float64Array([0, 1, 2]);
    const newYs = new Float64Array([10, 20, 30]);
    ind.setRawTypedArrays(newXs, newYs);
    expect(ind.rawData.length).toBe(0);
    expect(ind.miniRawPoints).toBeNull();
    expect(ind.rawXs).toBe(newXs);
    expect(ind.rawYs).toBe(newYs);
  });

  test("miniRawPoints is populated for the mini-grid", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    for (const w of wells) {
      for (const ind of w.indicators) {
        expect(Array.isArray(ind.miniRawPoints)).toBe(true);
        expect(ind.miniRawPoints.length).toBeGreaterThan(0);
        expect(ind.miniRawPoints.length).toBeLessThanOrEqual(80);
        // Endpoints preserved.
        expect(ind.miniRawPoints[0]).toEqual({
          x: ind.rawXs[0],
          y: ind.rawYs[0],
        });
        const last = ind.miniRawPoints[ind.miniRawPoints.length - 1];
        expect(last).toEqual({
          x: ind.rawXs[ind.rawXs.length - 1],
          y: ind.rawYs[ind.rawYs.length - 1],
        });
      }
    }
  });

  test("filtered typed arrays alias raw at load (Heatmap/FilteredGraph readiness)", () => {
    // Pre-filter the FilteredGraph and Heatmap should render the same
    // data as the raw side. We achieve this by aliasing the typed-array
    // refs — same buffer, no extra memory.
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    for (const w of wells) {
      for (const ind of w.indicators) {
        expect(ind.filteredXs).toBe(ind.rawXs);
        expect(ind.filteredYs).toBe(ind.rawYs);
        // materializeFilteredData should produce values matching raw.
        const fp = ind.materializeFilteredData();
        expect(fp.length).toBe(ind.rawYs.length);
        for (let j = 0; j < fp.length; j++) {
          expect(fp[j].x).toBe(ind.rawXs[j]);
          expect(fp[j].y).toBe(ind.rawYs[j]);
        }
      }
    }
  });

  test("packWellsToTypedArrays reads from rawXs/rawYs after Phase C distribute", () => {
    // After Phase C, indicator.rawData stays empty until materialize. The
    // pack step must read the typed-array form, otherwise the filter
    // pipeline gets length-0 inputs.
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    // Confirm rawData is empty (Phase C invariant).
    for (const w of wells) {
      for (const ind of w.indicators) {
        expect(ind.rawData.length).toBe(0);
        expect(ind.rawYs.length).toBeGreaterThan(0);
      }
    }
    const packed = packWellsToTypedArrays(wells);
    expect(packed.length).toBe(wells.length);
    for (let w = 0; w < wells.length; w++) {
      for (let i = 0; i < wells[w].indicators.length; i++) {
        const src = wells[w].indicators[i];
        const out = packed[w].indicators[i];
        expect(out.xs.length).toBe(src.rawXs.length);
        expect(out.ys.length).toBe(src.rawYs.length);
        // Independent buffers (we copied for transfer safety).
        expect(out.xs.buffer).not.toBe(src.rawXs.buffer);
        expect(out.ys.buffer).not.toBe(src.rawYs.buffer);
        // Values match.
        for (let j = 0; j < src.rawYs.length; j++) {
          expect(out.xs[j]).toBe(src.rawXs[j]);
          expect(out.ys[j]).toBe(src.rawYs[j]);
        }
      }
    }
  });

  test("running a filter replaces filtered alias without disturbing raw", () => {
    const result = parseDatString(FIXTURE);
    const wells = buildWellsFromResult(result);
    // Capture original raw refs.
    const originalRawXs = wells.map((w) => w.indicators.map((i) => i.rawXs));
    const originalRawYs = wells.map((w) => w.indicators.map((i) => i.rawYs));

    // Run the orchestrator path against the wells (no worker).
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    let packed = packWellsToTypedArrays(wells);
    filterCore.runSegment({ wells: packed, filters: [sm.serialize()] });
    mergeFilteredBack(wells, packed);

    for (let w = 0; w < wells.length; w++) {
      for (let i = 0; i < wells[w].indicators.length; i++) {
        const ind = wells[w].indicators[i];
        // Raw refs untouched.
        expect(ind.rawXs).toBe(originalRawXs[w][i]);
        expect(ind.rawYs).toBe(originalRawYs[w][i]);
        // Filtered refs are NEW — the alias was overwritten.
        expect(ind.filteredXs).not.toBe(originalRawXs[w][i]);
        expect(ind.filteredYs).not.toBe(originalRawYs[w][i]);
        expect(ind.filteredYs).toBeInstanceOf(Float64Array);
      }
    }
  });
});
