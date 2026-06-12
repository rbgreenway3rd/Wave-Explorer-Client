// Tests the legacy class path (StaticRatio_Filter.execute), still used by the
// report / batch code, for the "rescale by plate-median Fo" option. Must match
// the worker path: output is (F / Fo_well) * medianFo[indicator], computed
// per indicator. With rescale off, plain F/Fo (unchanged behavior).

const {
  StaticRatio_Filter,
} = require("../FilterModels.js");

// Build a wells array in the shape execute() consumes: each indicator has
// rawData and filteredData as {x,y}[]. filteredData starts equal to raw.
function makeData(wellsByIndicatorYs) {
  return wellsByIndicatorYs.map((indicatorYs, w) => ({
    id: `w${w}`,
    indicators: indicatorYs.map((ys) => ({
      rawData: ys.map((y, i) => ({ x: i, y })),
      filteredData: ys.map((y, i) => ({ x: i, y })),
    })),
  }));
}

function yOf(data, w, i) {
  return data[w].indicators[i].filteredData.map((p) => p.y);
}

describe("StaticRatio_Filter.execute — plate-median Fo rescale", () => {
  test("rescale off: plain F/Fo (each well divided by its own baseline)", () => {
    const f = new StaticRatio_Filter(0);
    f.setParams(0, 1, false);
    const data = makeData([[[10, 10, 20, 10]], [[30, 30, 60, 30]]]);
    f.execute(data);
    expect(yOf(data, 0, 0)).toEqual([1, 1, 2, 1]);
    expect(yOf(data, 1, 0)).toEqual([1, 1, 2, 1]);
  });

  test("rescale on: (F/Fo) * plate-median Fo, per indicator", () => {
    const f = new StaticRatio_Filter(0);
    f.setParams(0, 1, true);
    // NVs 10 and 30 -> median 20. Both wells collapse to a comparable scale.
    const data = makeData([[[10, 10, 20, 10]], [[30, 30, 60, 30]]]);
    f.execute(data);
    expect(yOf(data, 0, 0)).toEqual([20, 20, 40, 20]);
    expect(yOf(data, 1, 0)).toEqual([20, 20, 40, 20]);
  });

  test("rescale on: each indicator scaled by its own median (multi-indicator)", () => {
    const f = new StaticRatio_Filter(0);
    f.setParams(0, 1, true);
    // ind0 NVs 10/20 -> median 15; ind1 NVs 100/200 -> median 150.
    const data = makeData([
      [
        [10, 10, 20],
        [100, 100, 300],
      ],
      [
        [20, 20, 40],
        [200, 200, 600],
      ],
    ]);
    f.execute(data);
    expect(yOf(data, 0, 0)).toEqual([15, 15, 30]);
    expect(yOf(data, 0, 1)).toEqual([150, 150, 450]);
    expect(yOf(data, 1, 0)).toEqual([15, 15, 30]);
    expect(yOf(data, 1, 1)).toEqual([150, 150, 450]);
  });
});
