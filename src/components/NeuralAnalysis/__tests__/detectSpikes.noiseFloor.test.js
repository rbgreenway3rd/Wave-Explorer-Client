import { detectSpikes } from "../utilities/detectSpikes";
import { makeSyntheticSignal } from "./_fixtures";

// A signal with two distinct prominence regimes:
//   - tall spikes (amplitude 12) at center 200, 600
//   - shallow "noise-like" spikes (amplitude 1.5) at center 100, 400, 700
// On top of low Gaussian noise (noiseAmp 0.3 → robustStd ~0.3-0.4).
function makeMixedSignal() {
  return makeSyntheticSignal({
    n: 1000,
    noiseAmp: 0.3,
    seed: 31,
    spikes: [
      { center: 100, amplitude: 1.5, sigma: 4 },
      { center: 200, amplitude: 12, sigma: 4 },
      { center: 400, amplitude: 1.5, sigma: 4 },
      { center: 600, amplitude: 12, sigma: 4 },
      { center: 700, amplitude: 1.5, sigma: 4 },
    ],
  });
}

describe("detectSpikes noiseFloorMultiplier", () => {
  test("multiplier=0 leaves baseline behavior unchanged", () => {
    const signal = makeMixedSignal();
    const baseOpts = {
      prominence: 0.5,
      window: 50,
      minWidth: 1,
      minDistance: 5,
      minProminenceRatio: 0,
      stdMultiplier: 1,
    };
    const a = detectSpikes(signal, baseOpts);
    const b = detectSpikes(signal, { ...baseOpts, noiseFloorMultiplier: 0 });
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) {
      expect(b[i].index).toBe(a[i].index);
    }
  });

  test("high multiplier rejects shallow peaks but keeps tall ones", () => {
    const signal = makeMixedSignal();
    const opts = {
      prominence: 0.5, // permissive — let everything through to the noise-floor check
      window: 50,
      minWidth: 1,
      minDistance: 5,
      minProminenceRatio: 0,
      stdMultiplier: 0.1, // ~no cluster gate
      // Threshold sized for the unified spikeWindow geometry: detection
      // bases now use the full window radius, so noise-peak prominences
      // are larger than they were under the old wlen/2 search. Floor of
      // 15 × σ ≈ 4.5 sits above the noise-peak prominence ceiling (~3-4)
      // and well below the tall spikes (amplitude 12).
      noiseFloorMultiplier: 15,
    };
    const result = detectSpikes(signal, opts);
    // Only the tall spikes (~12) should remain. Shallow ones (1.5) are
    // far below 15 × robustStd (~ 15 × 0.3 = 4.5 ≫ 1.5).
    for (const p of result) {
      const closest = [200, 600].reduce(
        (best, c) =>
          Math.abs(p.index - c) < Math.abs(p.index - best) ? c : best,
        200
      );
      expect(Math.abs(p.index - closest)).toBeLessThan(15);
    }
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test("monotone in multiplier: stricter floors return ≤ peaks", () => {
    const signal = makeMixedSignal();
    const opts = {
      prominence: 0.5,
      window: 50,
      minWidth: 1,
      minDistance: 5,
      minProminenceRatio: 0,
      stdMultiplier: 0.1,
    };
    const r0 = detectSpikes(signal, { ...opts, noiseFloorMultiplier: 0 });
    const r2 = detectSpikes(signal, { ...opts, noiseFloorMultiplier: 2 });
    const r5 = detectSpikes(signal, { ...opts, noiseFloorMultiplier: 5 });
    expect(r2.length).toBeLessThanOrEqual(r0.length);
    expect(r5.length).toBeLessThanOrEqual(r2.length);
  });
});
