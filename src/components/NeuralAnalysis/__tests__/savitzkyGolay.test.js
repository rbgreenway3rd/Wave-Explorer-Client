import { savitzkyGolay } from "../utilities/savitzkyGolay";
import { makeSyntheticSignal } from "./_fixtures";

function stdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

describe("savitzkyGolay", () => {
  test("output length matches input and preserves x coordinates", () => {
    const signal = makeSyntheticSignal({ n: 400, noiseAmp: 0.5 });
    const out = savitzkyGolay(signal, 5);
    expect(out.length).toBe(signal.length);
    for (let i = 0; i < signal.length; i++) {
      expect(out[i].x).toBe(signal[i].x);
      expect(Number.isFinite(out[i].y)).toBe(true);
    }
  });

  test("reduces noise std-dev in flat baseline region (window 5)", () => {
    // Pure noise around baseline 0, no spikes.
    const signal = makeSyntheticSignal({ n: 1000, noiseAmp: 1, seed: 99 });
    const out = savitzkyGolay(signal, 5);
    const stdIn = stdDev(signal.map((p) => p.y));
    const stdOut = stdDev(out.map((p) => p.y));
    // Window 5 SG (order 2) reduces white-noise variance by ~0.486; stddev ratio ~0.7.
    expect(stdOut / stdIn).toBeLessThan(0.8);
  });

  test("preserves Gaussian peak amplitude (< 10% loss at window 5)", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0,
      spikes: [{ center: 200, amplitude: 10, sigma: 6 }],
    });
    const out = savitzkyGolay(signal, 5);
    const inMax = Math.max(...signal.map((p) => p.y));
    const outMax = Math.max(...out.map((p) => p.y));
    expect(outMax).toBeGreaterThan(inMax * 0.9);
  });

  test("larger windows reduce noise more than smaller ones", () => {
    const signal = makeSyntheticSignal({ n: 1000, noiseAmp: 1, seed: 99 });
    const out5 = savitzkyGolay(signal, 5);
    const out7 = savitzkyGolay(signal, 7);
    const out9 = savitzkyGolay(signal, 9);
    const std5 = stdDev(out5.map((p) => p.y));
    const std7 = stdDev(out7.map((p) => p.y));
    const std9 = stdDev(out9.map((p) => p.y));
    expect(std7).toBeLessThan(std5);
    expect(std9).toBeLessThan(std7);
  });

  test("edge samples are finite (mirror padding)", () => {
    const signal = makeSyntheticSignal({ n: 50, noiseAmp: 0.3 });
    const out = savitzkyGolay(signal, 9);
    for (let i = 0; i < 5; i++) {
      expect(Number.isFinite(out[i].y)).toBe(true);
      expect(Number.isFinite(out[out.length - 1 - i].y)).toBe(true);
    }
  });

  test("falls back to window 5 with warning on invalid window", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const signal = makeSyntheticSignal({ n: 100, noiseAmp: 0.3 });
    const out = savitzkyGolay(signal, 6);
    const ref = savitzkyGolay(signal, 5);
    for (let i = 0; i < signal.length; i++) {
      expect(out[i].y).toBeCloseTo(ref[i].y, 12);
    }
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("preserves DC level (constant signal stays constant)", () => {
    const n = 100;
    const signal = Array.from({ length: n }, (_, i) => ({ x: i, y: 7.5 }));
    for (const w of [5, 7, 9]) {
      const out = savitzkyGolay(signal, w);
      for (const pt of out) {
        expect(pt.y).toBeCloseTo(7.5, 9);
      }
    }
  });

  test("handles empty signal", () => {
    expect(savitzkyGolay([], 5)).toEqual([]);
  });
});
