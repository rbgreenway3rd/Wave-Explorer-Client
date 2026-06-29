// Tests for neural ΔF/F₀ normalization math.
//
// Each test isolates one behavior with explicit, hand-computable values:
//   - F₀ comes from the RAW signal (median over a baseline window)
//   - the detrended ΔF is the numerator
//   - normalized = (ΔF / F₀) × (rescale ? medianFo : 1)
//   - invalid F₀ (empty/dead well) is skipped, never divided by

const {
  isValidFo,
  medianOverWindow,
  computeFo,
  computePlateMedianFo,
  applyDeltaFOverFo,
  normalizeWell,
  UNIT_MODE,
} = require("../neuralNormalization");

describe("medianOverWindow", () => {
  test("odd-length whole array → middle value", () => {
    expect(medianOverWindow([1, 2, 3, 4, 5])).toBe(3);
  });

  test("even-length whole array → mean of the two middle values", () => {
    expect(medianOverWindow([1, 2, 3, 4])).toBe(2.5);
  });

  test("window [start,end) restricts to a sub-range", () => {
    // indices 1..4 → [20, 30, 40] → median 30
    expect(medianOverWindow([10, 20, 30, 40, 50], 1, 4)).toBe(30);
  });

  test("non-finite samples are ignored", () => {
    expect(medianOverWindow([1, NaN, 3, Infinity, 5])).toBe(3);
  });

  test("empty range / empty array → null", () => {
    expect(medianOverWindow([])).toBeNull();
    expect(medianOverWindow([1, 2, 3], 2, 2)).toBeNull();
  });
});

describe("isValidFo", () => {
  test("only finite positive numbers are valid", () => {
    expect(isValidFo(100)).toBe(true);
    expect(isValidFo(0)).toBe(false);
    expect(isValidFo(-5)).toBe(false);
    expect(isValidFo(NaN)).toBe(false);
    expect(isValidFo(Infinity)).toBe(false);
    expect(isValidFo(null)).toBe(false);
  });
});

describe("computeFo (resting fluorescence from raw)", () => {
  test("median over the baseline window of the raw signal", () => {
    // quiet baseline near 100, then activity — window isolates the rest
    const raw = [100, 102, 98, 101, 99, 400, 500, 300];
    expect(computeFo(raw, { start: 0, end: 5 })).toBe(100);
  });

  test("non-positive baseline median → null (skip the well)", () => {
    expect(computeFo([0, -1, 0, -2])).toBeNull();
  });

  test("empty raw → null", () => {
    expect(computeFo([])).toBeNull();
  });
});

describe("computePlateMedianFo", () => {
  test("median of valid F₀; null/≤0 wells skipped and counted", () => {
    const res = computePlateMedianFo([100, 120, null, 0, 80]);
    expect(res.medianFo).toBe(100); // median of [80, 100, 120]
    expect(res.validCount).toBe(3);
    expect(res.skippedCount).toBe(2);
  });

  test("even count → mean of two middle valid values", () => {
    expect(computePlateMedianFo([100, 200]).medianFo).toBe(150);
  });

  test("all wells invalid → medianFo null", () => {
    const res = computePlateMedianFo([null, 0, -5]);
    expect(res.medianFo).toBeNull();
    expect(res.validCount).toBe(0);
    expect(res.skippedCount).toBe(3);
  });
});

describe("applyDeltaFOverFo", () => {
  test("divides ΔF by F₀ → dimensionless fold-change", () => {
    const out = applyDeltaFOverFo([0, 50, 100], 100);
    expect(out.ys).toEqual([0, 0.5, 1]);
    expect(out.applied).toBe(true);
    expect(out.unitMode).toBe(UNIT_MODE.DFF0);
  });

  test("× plate-median F₀ restores magnitude (dFF0_x_medianFo)", () => {
    const out = applyDeltaFOverFo([0, 50, 100], 100, { medianFo: 1000 });
    // factor = 1000 / 100 = 10
    expect(out.ys).toEqual([0, 500, 1000]);
    expect(out.unitMode).toBe(UNIT_MODE.DFF0_X_MEDIAN_FO);
  });

  test("invalid F₀ → input returned unchanged, applied:false (native)", () => {
    const out = applyDeltaFOverFo([0, 50, 100], 0);
    expect(out.ys).toEqual([0, 50, 100]);
    expect(out.applied).toBe(false);
    expect(out.unitMode).toBe(UNIT_MODE.NATIVE);
  });

  test("does not mutate the input array", () => {
    const input = [0, 50, 100];
    applyDeltaFOverFo(input, 100);
    expect(input).toEqual([0, 50, 100]);
  });
});

describe("normalizeWell (end-to-end)", () => {
  test("ΔF/F₀ using raw baseline for F₀", () => {
    const res = normalizeWell({
      rawYs: [200, 200, 200, 200],
      detrendedYs: [0, 100, 200],
    });
    expect(res.metadata.thisWellFo).toBe(200);
    expect(res.metadata.applied).toBe(true);
    expect(res.metadata.skipped).toBe(false);
    expect(res.metadata.unitMode).toBe(UNIT_MODE.DFF0);
    expect(res.ys).toEqual([0, 0.5, 1]);
  });

  test("rescale by plate-median F₀ scales by medianFo/F₀", () => {
    const res = normalizeWell({
      rawYs: [200, 200, 200, 200], // F₀ = 200
      detrendedYs: [0, 100, 200],
      rescaleByMedianFo: true,
      plateMedianFo: 180, // factor = 180/200 = 0.9
    });
    expect(res.metadata.unitMode).toBe(UNIT_MODE.DFF0_X_MEDIAN_FO);
    expect(res.ys[0]).toBeCloseTo(0, 10);
    expect(res.ys[1]).toBeCloseTo(90, 10);
    expect(res.ys[2]).toBeCloseTo(180, 10);
  });

  test("dead well (no valid F₀) is skipped, signal left native", () => {
    const res = normalizeWell({
      rawYs: [0, 0, 0],
      detrendedYs: [0, 10, 20],
    });
    expect(res.metadata.thisWellFo).toBeNull();
    expect(res.metadata.skipped).toBe(true);
    expect(res.metadata.unitMode).toBe(UNIT_MODE.NATIVE);
    expect(res.ys).toEqual([0, 10, 20]);
  });
});
