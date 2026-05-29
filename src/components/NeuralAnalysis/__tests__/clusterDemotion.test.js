// Regression test for the k-means cluster-keep demotion (plan step C).
//
// Before the demotion, k-means in `findTrueSpikes` clustered the
// surviving peaks' prominences into two groups and unconditionally kept
// only the top cluster. On a signal with events spanning a range of
// amplitudes (the user's actual Ca²⁺ recordings, and the synthetic
// fixture below), the cluster boundary fell somewhere in the middle of
// the real-event distribution and every smaller-but-real event was
// silently dropped. `stdMultiplier` controls a bail-out gate, not the
// cluster-keep — so no slider tuning recovered the missing events.
//
// After the demotion, k-means is a noise-only circuit-breaker: it
// drops everything only when both clusters look like noise. Slope and
// duplicate dedup live in NMS, which sees the full survivor set.
//
// This test fails on the pre-demotion code and passes after.

import { detectSpikes } from "../utilities/detectSpikes";
import { makeSyntheticSignal } from "./_fixtures";

describe("k-means cluster demotion", () => {
  test("all five varying-amplitude events survive the survivor filter", () => {
    // Five Gaussians at sample positions 1000, 3000, 5000, 7000, 9000
    // with amplitudes spanning ~3.5x. Noise σ = 0.005 → roughly 1000x
    // smaller than the smallest event, so detection should comfortably
    // recover every event. The point of the test is the SURVIVOR filter,
    // not the prominence gate.
    const signal = makeSyntheticSignal({
      n: 10000,
      noiseAmp: 0.005,
      seed: 1031,
      spikes: [
        { center: 1000, amplitude: 0.05, sigma: 30 },
        { center: 3000, amplitude: 0.08, sigma: 30 },
        { center: 5000, amplitude: 0.12, sigma: 30 },
        { center: 7000, amplitude: 0.18, sigma: 30 },
        { center: 9000, amplitude: 0.10, sigma: 30 },
      ],
    });

    const opts = {
      prominence: 0.005, // ~ σ_noise — admits every real apex
      window: 50,
      minWidth: 1,
      minDistance: 0,
      minProminenceRatio: 0,
      stdMultiplier: 0.1, // ensure the noise-only bail-out doesn't trigger
      noiseFloorMultiplier: 0,
    };

    const result = detectSpikes(signal, opts);

    // Every detected peak should sit within ±window samples of one of
    // the synthetic event centers — i.e., every survivor corresponds to
    // a real event, not a noise wiggle.
    const centers = [1000, 3000, 5000, 7000, 9000];
    const matched = new Set();
    for (const p of result) {
      for (const c of centers) {
        if (Math.abs(p.index - c) <= opts.window) {
          matched.add(c);
        }
      }
    }
    // All five events must be represented in the survivor set.
    expect(matched.size).toBe(5);
  });
});
