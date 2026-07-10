// Tests for F/Fo well exclusion — the set operations behind "exclude wells
// from the plate F₀ calculation". Two concerns:
//   1. excludeWellsById drops exactly the right wells (and keeps identity
//      when there's nothing to drop), which is what actually changes the
//      plate-wide median F₀.
//   2. computeEdgeWells picks the outer ring for the "select edge wells"
//      one-click helper.
// The end-to-end payoff (excluding flat edge wells moves the median) is
// exercised against the real plateMedianFoFromWells so the feature's whole
// point is verified, not just the plumbing.

const {
  excludeWellsById,
  computeEdgeWells,
} = require("../neuralWellExclusion");
const { plateMedianFoFromWells } = require("../neuralNormalization");

// A well as plateMedianFoFromWells consumes it: id + one indicator whose
// rawYs typed array carries F₀ (median of the baseline window).
const makeWell = (id, row, column, rawBaseline) => ({
  id,
  key: `${String.fromCharCode(65 + row)}${column + 1}`,
  row,
  column,
  indicators: [{ rawYs: Float32Array.from(rawBaseline) }],
});

describe("excludeWellsById", () => {
  const wells = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
  ];

  test("removes wells whose id is in the set", () => {
    const out = excludeWellsById(wells, new Set(["b"]));
    expect(out.map((w) => w.id)).toEqual(["a", "c"]);
  });

  test("removes several", () => {
    const out = excludeWellsById(wells, new Set(["a", "c"]));
    expect(out.map((w) => w.id)).toEqual(["b"]);
  });

  test("empty / null exclusion set returns the SAME array reference", () => {
    // Identity preservation matters: the live modal memoizes on this, so a
    // no-op exclusion must not mint a new list and force a recompute.
    expect(excludeWellsById(wells, new Set())).toBe(wells);
    expect(excludeWellsById(wells, null)).toBe(wells);
    expect(excludeWellsById(wells, undefined)).toBe(wells);
  });

  test("ids not present are simply ignored", () => {
    const out = excludeWellsById(wells, new Set(["zzz"]));
    expect(out.map((w) => w.id)).toEqual(["a", "b", "c"]);
  });
});

describe("computeEdgeWells", () => {
  // Build a full R×C plate of wells in row-major order.
  const makePlate = (rows, cols) => {
    const wells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        wells.push({ id: `${r}-${c}`, row: r, column: c });
      }
    }
    return wells;
  };

  test("3×4 plate → the 10 perimeter wells, not the 2 interior", () => {
    const plate = makePlate(3, 4); // 12 wells, interior = (1,1) and (1,2)
    const edge = computeEdgeWells(plate);
    const interior = plate.filter((w) => !edge.includes(w));
    expect(edge).toHaveLength(10);
    expect(interior.map((w) => w.id).sort()).toEqual(["1-1", "1-2"]);
  });

  test("works with 1-based indexing (min/max derived, not assumed 0)", () => {
    const plate = [
      { id: "a", row: 1, column: 1 },
      { id: "b", row: 1, column: 2 },
      { id: "c", row: 2, column: 1 },
      { id: "d", row: 2, column: 2 },
      { id: "mid", row: 2, column: 3 }, // still an edge (max column)
    ];
    // 2 rows (min1/max2) × columns 1..3 → every well touches an edge here.
    expect(computeEdgeWells(plate)).toHaveLength(5);
  });

  test("a single interior column is excluded", () => {
    // 3 columns, 3 rows; only (1,1) is interior.
    const plate = makePlate(3, 3);
    const edge = computeEdgeWells(plate);
    expect(edge.map((w) => w.id)).not.toContain("1-1");
    expect(edge).toHaveLength(8);
  });

  test("empty / malformed input → []", () => {
    expect(computeEdgeWells([])).toEqual([]);
    expect(computeEdgeWells(null)).toEqual([]);
    expect(computeEdgeWells([{ id: "x" }])).toEqual([]); // no row/column
  });
});

describe("exclusion changes the plate median F₀ (the feature's point)", () => {
  // Interior wells rest at F₀≈100; two flat/dim edge wells rest at F₀≈10.
  // Including the dim edges drags the plate median down; excluding them
  // restores it to the interior population — exactly the skew the feature
  // removes.
  const wells = [
    makeWell("edge1", 0, 0, [10, 10, 10]), // dim edge
    makeWell("edge2", 0, 1, [12, 12, 12]), // dim edge
    makeWell("mid1", 1, 1, [100, 100, 100]),
    makeWell("mid2", 1, 2, [104, 104, 104]),
    makeWell("mid3", 1, 3, [96, 96, 96]),
  ];

  test("median with the dim edges included is pulled below the interior", () => {
    const { medianFo } = plateMedianFoFromWells(wells);
    // Sorted F₀: [10,12,96,100,104] → median 96, dragged toward the dim end.
    expect(medianFo).toBe(96);
  });

  test("excluding the dim edge wells restores the interior median", () => {
    const kept = excludeWellsById(wells, new Set(["edge1", "edge2"]));
    const { medianFo, validCount } = plateMedianFoFromWells(kept);
    // Sorted F₀: [96,100,104] → median 100.
    expect(medianFo).toBe(100);
    expect(validCount).toBe(3);
  });

  test("excluding every valid well → null median (rescale falls back)", () => {
    const kept = excludeWellsById(
      wells,
      new Set(["edge1", "edge2", "mid1", "mid2", "mid3"])
    );
    const { medianFo } = plateMedianFoFromWells(kept);
    expect(medianFo).toBeNull();
  });
});
