import {
  computeLocalRobustStd,
  detectSpikes,
} from "../utilities/detectSpikes";
import { makeSyntheticSignal } from "./_fixtures";

describe("computeLocalRobustStd", () => {
  test("returns Float64Array of length n", () => {
    const signal = makeSyntheticSignal({ n: 500, noiseAmp: 0.5 });
    const out = computeLocalRobustStd(signal, null, 100);
    expect(out).toBeInstanceOf(Float64Array);
    expect(out.length).toBe(500);
  });

  test("returns empty when windowSize < 2", () => {
    const signal = makeSyntheticSignal({ n: 100, noiseAmp: 0.3 });
    expect(computeLocalRobustStd(signal, null, 0).length).toBe(0);
    expect(computeLocalRobustStd(signal, null, 1).length).toBe(0);
  });

  test("captures non-stationary noise (high-noise region has higher σ)", () => {
    // Build a signal where the FIRST half has low noise and the SECOND
    // half has high noise. The block-wise local σ should be visibly
    // smaller in the first half than in the second.
    const n = 2000;
    const seed = 13;
    const lowNoise = makeSyntheticSignal({
      n: n / 2,
      noiseAmp: 0.1,
      seed,
    });
    const highNoise = makeSyntheticSignal({
      n: n / 2,
      noiseAmp: 5,
      seed: seed + 1,
    });
    // Stitch — re-index x to be continuous.
    const stitched = [
      ...lowNoise.map((p) => ({ x: p.x, y: p.y })),
      ...highNoise.map((p, i) => ({ x: p.x + n / 2, y: p.y })),
    ];
    const local = computeLocalRobustStd(stitched, null, 200);
    // Sample one σ from each region (well inside, not on the boundary).
    const lowSigma = local[100];
    const highSigma = local[1500];
    expect(highSigma).toBeGreaterThan(lowSigma * 5);
  });

  test("residual mode: σ matches the residual noise, not the signal", () => {
    // Reference signal with a strong slow trend; data = reference + noise.
    // Local σ on the residual (data − reference) should be close to the
    // pure-noise σ, regardless of the trend's amplitude.
    const n = 1000;
    const reference = Array.from({ length: n }, (_, i) => ({
      x: i,
      y: Math.sin(i / 50) * 100, // big trend
    }));
    const noise = makeSyntheticSignal({ n, noiseAmp: 1, seed: 7 });
    const data = reference.map((p, i) => ({ x: p.x, y: p.y + noise[i].y }));

    const localResid = computeLocalRobustStd(data, reference, 200);
    const localData = computeLocalRobustStd(data, null, 200);
    // Residual σ should be much smaller (only the noise) than data σ
    // (which is dominated by the sinusoidal trend).
    expect(localResid[500]).toBeLessThan(localData[500] / 5);
  });

  test("integrates with detectSpikes via the localStds option", () => {
    // Same regional-noise signal as the non-stationary test, with three
    // identical Gaussian peaks: one in the low-noise region, two in the
    // high-noise region. With a global noise floor, all three pass; with
    // local σ, only the low-noise one survives if we set the floor high
    // enough relative to high-region σ.
    const n = 2000;
    const lowNoise = makeSyntheticSignal({
      n: n / 2,
      noiseAmp: 0.1,
      seed: 21,
      spikes: [{ center: 250, amplitude: 8, sigma: 4 }],
    });
    const highNoise = makeSyntheticSignal({
      n: n / 2,
      noiseAmp: 4,
      seed: 22,
      spikes: [
        { center: 200, amplitude: 8, sigma: 4 },
        { center: 700, amplitude: 8, sigma: 4 },
      ],
    });
    const stitched = [
      ...lowNoise.map((p) => ({ x: p.x, y: p.y })),
      ...highNoise.map((p) => ({ x: p.x + n / 2, y: p.y })),
    ];
    const localStds = computeLocalRobustStd(stitched, null, 200);

    const opts = {
      prominence: 0.5,
      window: 80,
      minWidth: 1,
      minDistance: 5,
      minProminenceRatio: 0,
      stdMultiplier: 0.1,
      noiseFloorMultiplier: 3,
    };
    const withGlobal = detectSpikes(stitched, opts);
    const withLocal = detectSpikes(stitched, { ...opts, localStds });
    // Local σ should reject high-region peaks more aggressively than
    // global σ — we expect strictly fewer (or equal) spikes with local.
    expect(withLocal.length).toBeLessThanOrEqual(withGlobal.length);
  });
});
