// Tests for the orchestration plumbing of the StaticRatio "rescale by
// plate-median Fo" option: phase splitting, serialization round-trip, the
// instance/spec predicate, and the packed median wrapper.

const {
  splitPhasesByControlSubtraction,
  serializeFilter,
  isStaticRatioRescaleFilter,
  computeMedianFoByIndicatorFromPacked,
} = require("../filterPack.js");
const {
  StaticRatio_Filter,
  Smoothing_Filter,
} = require("../../components/Graphing/FilteredData/FilterModels.js");

function makeStaticRatio(start, end, rescale) {
  const f = new StaticRatio_Filter(0);
  f.setParams(start, end, rescale);
  return f;
}

describe("StaticRatio rescale — serialization", () => {
  test("serialize() carries rescaleByMedianFo (round-trips both states)", () => {
    expect(serializeFilter(makeStaticRatio(0, 5, true))).toEqual({
      type: "staticRatio",
      params: { start: 0, end: 5, rescaleByMedianFo: true },
    });
    expect(serializeFilter(makeStaticRatio(1, 4, false))).toEqual({
      type: "staticRatio",
      params: { start: 1, end: 4, rescaleByMedianFo: false },
    });
  });

  test("setParams defaults rescale to false when omitted", () => {
    const f = new StaticRatio_Filter(0);
    f.setParams(0, 5);
    expect(f.rescaleByMedianFo).toBe(false);
  });
});

describe("isStaticRatioRescaleFilter", () => {
  test("true only for a rescale-enabled StaticRatio instance", () => {
    expect(isStaticRatioRescaleFilter(makeStaticRatio(0, 5, true))).toBe(true);
    expect(isStaticRatioRescaleFilter(makeStaticRatio(0, 5, false))).toBe(false);
    expect(isStaticRatioRescaleFilter(new Smoothing_Filter(0))).toBe(false);
    expect(isStaticRatioRescaleFilter(null)).toBe(false);
  });

  test("also recognizes serialized specs", () => {
    expect(
      isStaticRatioRescaleFilter({
        type: "staticRatio",
        params: { start: 0, end: 5, rescaleByMedianFo: true },
      })
    ).toBe(true);
    expect(
      isStaticRatioRescaleFilter({
        type: "staticRatio",
        params: { start: 0, end: 5, rescaleByMedianFo: false },
      })
    ).toBe(false);
  });
});

describe("splitPhasesByControlSubtraction — StaticRatio rescale phases", () => {
  test("ordinary StaticRatio stays in the fast segment path", () => {
    const sr = makeStaticRatio(0, 5, false);
    const sm = new Smoothing_Filter(1);
    const phases = splitPhasesByControlSubtraction([sr, sm]);
    expect(phases).toHaveLength(1);
    expect(phases[0].kind).toBe("segment");
    expect(phases[0].filters).toEqual([sr, sm]);
  });

  test("rescale-enabled StaticRatio becomes its own phase", () => {
    const sm1 = new Smoothing_Filter(0);
    const sr = makeStaticRatio(0, 5, true);
    const sm2 = new Smoothing_Filter(2);
    const phases = splitPhasesByControlSubtraction([sm1, sr, sm2]);
    expect(phases.map((p) => p.kind)).toEqual([
      "segment",
      "staticRatioRescale",
      "segment",
    ]);
    expect(phases[0].filters).toEqual([sm1]);
    expect(phases[1].filter).toBe(sr);
    expect(phases[2].filters).toEqual([sm2]);
  });

  test("rescale StaticRatio as the first filter yields a leading phase", () => {
    const sr = makeStaticRatio(0, 1, true);
    const phases = splitPhasesByControlSubtraction([sr]);
    expect(phases).toHaveLength(1);
    expect(phases[0].kind).toBe("staticRatioRescale");
    expect(phases[0].filter).toBe(sr);
  });
});

describe("computeMedianFoByIndicatorFromPacked", () => {
  test("delegates to filterCore with the filter's start/end params", () => {
    const packed = [
      { id: "a", row: 0, col: 0, indicators: [{ xs: Float64Array.from([0, 1, 2]), ys: Float64Array.from([10, 10, 20]) }] },
      { id: "b", row: 0, col: 1, indicators: [{ xs: Float64Array.from([0, 1, 2]), ys: Float64Array.from([30, 30, 60]) }] },
    ];
    const sr = makeStaticRatio(0, 1, true);
    const medians = computeMedianFoByIndicatorFromPacked(packed, sr);
    expect(medians).toEqual([20]); // median(10, 30)
  });
});
