// Tests for the guarded Otsu prominence + topographic-width window
// suggester. Each scenario exercises a specific decision branch.

import { suggestSpikeParameters } from "../utilities/parameterSuggestions";
import { makeSyntheticSignal } from "./_fixtures";

describe("suggestSpikeParameters", () => {
  test("five varying-amplitude events: Otsu lands below the smallest event", () => {
    const signal = makeSyntheticSignal({
      n: 10000,
      noiseAmp: 0.005,
      seed: 4001,
      spikes: [
        { center: 1000, amplitude: 0.05, sigma: 30 },
        { center: 3000, amplitude: 0.08, sigma: 30 },
        { center: 5000, amplitude: 0.12, sigma: 30 },
        { center: 7000, amplitude: 0.18, sigma: 30 },
        { center: 9000, amplitude: 0.10, sigma: 30 },
      ],
    });
    const { prominence, window } = suggestSpikeParameters(signal);
    // Threshold must sit above the 2σ noise floor and below the
    // smallest event amplitude (0.05). 0.7 × 0.05 = 0.035 is the
    // hard cap; the conservative cap pulls it down further.
    expect(prominence.value).toBeGreaterThan(2 * prominence.sigmaRobust);
    expect(prominence.value).toBeLessThan(0.05);
    // Window in samples; events are sigma=30 → FWHM ≈ 70 → half-width
    // radius near 35.
    expect(window.value).toBeGreaterThan(15);
    expect(window.value).toBeLessThan(80);
  });

  test("noise-only signal: falls back gracefully without inflating threshold", () => {
    const signal = makeSyntheticSignal({
      n: 5000,
      noiseAmp: 0.005,
      seed: 4002,
      spikes: [],
    });
    const { prominence } = suggestSpikeParameters(signal);
    // Without real events any of the fallback paths can legitimately
    // fire. The unimodal fallback returns 2.5 × σ; the sanity cap fires
    // when that exceeds the max noise wiggle's prominence — which it
    // typically does for clean low-noise signals. The low-sample
    // fallback fires if too few candidates clear the pre-filter. The
    // key invariant is that the threshold stays small (well below any
    // synthetic event amplitude) and strictly positive.
    expect([
      "low-sample-fallback",
      "unimodal-fallback",
      "sanity-capped",
    ]).toContain(prominence.method);
    expect(prominence.value).toBeGreaterThan(0);
    expect(prominence.value).toBeLessThan(0.05);
  });

  test("identical events with noise: Otsu finds a clean valley", () => {
    const signal = makeSyntheticSignal({
      n: 8000,
      noiseAmp: 0.005,
      seed: 4003,
      spikes: Array.from({ length: 10 }, (_, i) => ({
        center: 500 + i * 700,
        amplitude: 0.10,
        sigma: 25,
      })),
    });
    const { prominence, window } = suggestSpikeParameters(signal);
    // With 10 events identical at 0.10, the noise/signal histogram
    // separates cleanly. Threshold above noise, well below event amp.
    expect(prominence.value).toBeGreaterThan(2 * prominence.sigmaRobust);
    expect(prominence.value).toBeLessThan(0.10);
    expect(window.value).toBeGreaterThan(8);
    expect(window.value).toBeLessThan(80);
  });

  test("one huge + several small events: conservative cap pulls threshold below smalls", () => {
    const signal = makeSyntheticSignal({
      n: 10000,
      noiseAmp: 0.005,
      seed: 4004,
      spikes: [
        { center: 2000, amplitude: 0.50, sigma: 30 },
        { center: 4000, amplitude: 0.04, sigma: 30 },
        { center: 5500, amplitude: 0.04, sigma: 30 },
        { center: 7000, amplitude: 0.04, sigma: 30 },
        { center: 8500, amplitude: 0.04, sigma: 30 },
      ],
    });
    const { prominence } = suggestSpikeParameters(signal);
    // The cap from inferred signal class must keep the threshold
    // below 0.04 so the small events still survive the gate.
    expect(prominence.value).toBeLessThan(0.04);
    // And above the σ floor.
    expect(prominence.value).toBeGreaterThanOrEqual(
      2 * prominence.sigmaRobust
    );
  });

  test("real-data scale: suggestion stays below the tallest peak even with wide DC range", () => {
    // Reproduces the live-data bug where the suggester returned
    // prominence = 6865 on a signal whose tallest peak was y = 2022.
    // Raw-y MAD on a wide-DC-range signal inflated σ; the σ-derived
    // fallback then produced an impossible threshold. Diff-σ + the
    // sanity cap together must clamp the suggestion below the tallest
    // candidate so something can actually pass the gate.
    const n = 12000;
    const noiseAmp = 80; // raw-counts scale
    const signal = makeSyntheticSignal({
      n,
      noiseAmp,
      seed: 4007,
      // A slow ramp baseline + a handful of spikes on top, with peak
      // amplitudes from a few hundred up to ~1400. Equivalent to a
      // Ca²⁺ recording with a baseline drift.
      spikes: [
        { center: 1500, amplitude: 600, sigma: 80 },
        { center: 4000, amplitude: 1000, sigma: 80 },
        { center: 6500, amplitude: 1400, sigma: 80 },
        { center: 9000, amplitude: 800, sigma: 80 },
        { center: 11000, amplitude: 1200, sigma: 80 },
      ],
    });
    // Inject a slow baseline drift so the raw-MAD σ inflates the way
    // it does on real recordings.
    for (let i = 0; i < n; i++) {
      signal[i].y += 400 + 200 * Math.sin((2 * Math.PI * i) / n);
    }
    const { prominence } = suggestSpikeParameters(signal);

    let yMax = -Infinity;
    for (const p of signal) if (p.y > yMax) yMax = p.y;

    // The suggestion must be less than the tallest peak — otherwise no
    // peak can pass the gate. This is the live-data invariant.
    expect(prominence.value).toBeLessThan(yMax);
    // And less than ~600 (the smallest event amplitude) so the
    // smallest real event still passes.
    expect(prominence.value).toBeLessThan(600);
  });

  test("window tracks event width, not amplitude", () => {
    const narrow = makeSyntheticSignal({
      n: 6000,
      noiseAmp: 0.005,
      seed: 4005,
      spikes: Array.from({ length: 8 }, (_, i) => ({
        center: 400 + i * 700,
        amplitude: 0.15,
        sigma: 8, // narrow
      })),
    });
    const wide = makeSyntheticSignal({
      n: 6000,
      noiseAmp: 0.005,
      seed: 4006,
      spikes: Array.from({ length: 8 }, (_, i) => ({
        center: 400 + i * 700,
        amplitude: 0.15,
        sigma: 40, // wide
      })),
    });
    const narrowOut = suggestSpikeParameters(narrow);
    const wideOut = suggestSpikeParameters(wide);
    expect(wideOut.window.value).toBeGreaterThan(narrowOut.window.value);
  });
});
