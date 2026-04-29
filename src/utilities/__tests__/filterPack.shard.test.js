// Verifies sharded execution produces the same output as a single-pass run
// for filters that are eligible to be sharded (everything except
// ControlSubtraction). Catches regressions in:
//   - makeShards slice boundaries
//   - sliceFilterSpecForShard handling of per-well array params
//   - per-well filter independence assumptions

const fs = require("fs");
const path = require("path");
const filterCore = require("../../workers/filterCore.js");
const {
  makeShards,
  sliceFilterSpecForShard,
  packWellsToTypedArrays,
  seedFilteredDataFromRaw,
} = require("../filterPack.js");
const {
  Indicator,
  Well,
} = require("../../components/Models.js");
const {
  Smoothing_Filter,
  FlatFieldCorrection_Filter,
  DynamicRatio_Filter,
} = require("../../components/Graphing/FilteredData/FilterModels.js");
const {
  makeWellInput,
  flatFieldMatrix,
} = require("../../workers/__tests__/_filterTestFixture.js");

const FIXTURES_DIR = path.join(
  __dirname,
  "..",
  "..",
  "workers",
  "__tests__",
  "fixtures"
);

function buildPackedFromInput() {
  const wellArrays = makeWellInput().map((w, i) => {
    const well = new Well(`well_${i}`, `key_${i}`, `L_${i}`, w.col, w.row);
    for (let k = 0; k < w.indicators.length; k++) {
      const ind = new Indicator(
        `${well.id}_${k}`,
        `ind_${k}`,
        w.indicators[k].rawData.map((p) => ({ x: p.x, y: p.y })),
        [],
        w.indicators[k].rawData.map((p) => p.x),
        true
      );
      well.indicators.push(ind);
    }
    return well;
  });
  seedFilteredDataFromRaw(wellArrays);
  return packWellsToTypedArrays(wellArrays);
}

function deepClonePacked(packed) {
  return packed.map((w) => ({
    id: w.id,
    row: w.row,
    col: w.col,
    indicators: w.indicators.map((ind) => ({
      xs: new Float64Array(ind.xs),
      ys: new Float64Array(ind.ys),
    })),
  }));
}

function runSharded(packed, filterSpecs, nShards) {
  const shards = makeShards(packed, nShards);
  // Independent buffers per shard: deep-clone within each shard so we don't
  // accidentally mutate the input under test.
  const shardCopies = shards.map((s) => ({
    start: s.start,
    end: s.end,
    wells: deepClonePacked(s.wells),
  }));
  for (const shard of shardCopies) {
    const shardFilters = filterSpecs.map((spec) =>
      sliceFilterSpecForShard(spec, shard.start, shard.end)
    );
    filterCore.runSegment({ wells: shard.wells, filters: shardFilters });
  }
  const merged = [];
  for (const shard of shardCopies) {
    for (const w of shard.wells) merged.push(w);
  }
  return merged;
}

function runUnsharded(packed, filterSpecs) {
  const copy = deepClonePacked(packed);
  filterCore.runSegment({ wells: copy, filters: filterSpecs });
  return copy;
}

function expectPackedEqual(a, b) {
  expect(a.length).toBe(b.length);
  for (let w = 0; w < a.length; w++) {
    const aIs = a[w].indicators;
    const bIs = b[w].indicators;
    expect(aIs.length).toBe(bIs.length);
    for (let i = 0; i < aIs.length; i++) {
      expect(aIs[i].ys.length).toBe(bIs[i].ys.length);
      for (let j = 0; j < aIs[i].ys.length; j++) {
        expect(aIs[i].xs[j]).toBe(bIs[i].xs[j]);
        expect(aIs[i].ys[j]).toBe(bIs[i].ys[j]);
      }
    }
  }
}

describe("sharded execution equivalence", () => {
  test("Smoothing across 2/3/4 shards == unsharded", () => {
    const packed = buildPackedFromInput();
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    const specs = [sm.serialize()];
    const baseline = runUnsharded(packed, specs);
    for (const n of [2, 3, 4]) {
      const sharded = runSharded(packed, specs, n);
      expectPackedEqual(sharded, baseline);
    }
  });

  test("FlatFieldCorrection sharded matrix slicing matches unsharded", () => {
    const packed = buildPackedFromInput();
    const ff = new FlatFieldCorrection_Filter(0, null);
    ff.setParams(flatFieldMatrix());
    ff.isEnabled = true;
    const specs = [ff.serialize()];
    const baseline = runUnsharded(packed, specs);
    for (const n of [2, 4]) {
      const sharded = runSharded(packed, specs, n);
      expectPackedEqual(sharded, baseline);
    }
  });

  test("Smoothing -> FlatField stack sharded == unsharded", () => {
    const packed = buildPackedFromInput();
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    const ff = new FlatFieldCorrection_Filter(1, null);
    ff.setParams(flatFieldMatrix());
    ff.isEnabled = true;
    const specs = [sm.serialize(), ff.serialize()];
    const baseline = runUnsharded(packed, specs);
    const sharded = runSharded(packed, specs, 4);
    expectPackedEqual(sharded, baseline);
  });

  test("DynamicRatio aliasing preserved within each shard", () => {
    const packed = buildPackedFromInput();
    const dr = new DynamicRatio_Filter(0, null);
    dr.setParams(0, 1);
    const specs = [dr.serialize()];
    const sharded = runSharded(packed, specs, 4);
    for (let w = 0; w < sharded.length; w++) {
      expect(sharded[w].indicators[0].ys === sharded[w].indicators[1].ys).toBe(
        true
      );
    }
  });

  test("Sharded Smoothing matches FilterModels.js baseline (1e-9)", () => {
    const packed = buildPackedFromInput();
    const sm = new Smoothing_Filter(0, null);
    sm.setParams(5, false);
    const sharded = runSharded(packed, [sm.serialize()], 4);
    const expected = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, "smoothingMean.json"), "utf8")
    ).snapshot;
    for (let w = 0; w < sharded.length; w++) {
      for (let i = 0; i < sharded[w].indicators.length; i++) {
        const xs = sharded[w].indicators[i].xs;
        const ys = sharded[w].indicators[i].ys;
        const exp = expected[w].indicators[i].filteredData;
        expect(ys.length).toBe(exp.length);
        for (let j = 0; j < exp.length; j++) {
          expect(xs[j]).toBe(exp[j][0]);
          expect(Math.abs(ys[j] - exp[j][1])).toBeLessThanOrEqual(1e-9);
        }
      }
    }
  });

  test("makeShards produces contiguous near-equal slices", () => {
    const packed = buildPackedFromInput();
    const shards = makeShards(packed, 3);
    expect(shards.length).toBe(3);
    let total = 0;
    let cursor = 0;
    for (const s of shards) {
      expect(s.start).toBe(cursor);
      expect(s.wells.length).toBe(s.end - s.start);
      total += s.wells.length;
      cursor = s.end;
    }
    expect(total).toBe(packed.length);
  });
});
