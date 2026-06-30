/**
 * Pipeline integration: ΔF/F₀ normalization ("detrend → F/Fo").
 *
 * Proves the in-pipeline step wired into runNeuralAnalysisPipeline:
 *   - off by default (native units, no behavior change)
 *   - when on, divides the DETRENDED signal by F₀ taken from the RAW
 *     baseline (so it's ΔF/F₀, not a divide-by-near-zero)
 *   - requires trend flattening (the ΔF source)
 *   - skips dead wells with no valid F₀
 */

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { makeSyntheticSignal } from "./_fixtures";

const baseParams = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  baselineCorrection: false,
  smoothingEnabled: false,
  handleOutliers: false, // keep processedSignal == detrended for exact compare
  spikeProminence: 3,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

function run(signal, extra) {
  return runNeuralAnalysisPipeline({
    rawSignal: signal,
    controlSignal: [],
    params: { ...baseParams, ...extra },
    analysis: { runSpikeDetection: true, runBurstDetection: false },
    noiseSuppressionActive: true,
  });
}

describe("pipeline ΔF/F₀ normalization integration", () => {
  // baseline:100 → resting brightness, so F₀ ≈ 100 (median is robust to
  // the two sparse spikes). Reused across runs so the detrended signal is
  // identical between the off/on comparison.
  const signal = makeSyntheticSignal({
    n: 800,
    baseline: 100,
    noiseAmp: 0.2,
    spikes: [
      { center: 200, amplitude: 8, sigma: 3 },
      { center: 600, amplitude: 8, sigma: 3 },
    ],
  });

  test("off by default → native units, not applied", () => {
    const r = run(signal, { neuralNormalizationEnabled: false });
    expect(r.normalization.applied).toBe(false);
    expect(r.normalization.unitMode).toBe("native");
  });

  test("on → detrended signal divided by F₀ from the raw baseline", () => {
    const off = run(signal, { neuralNormalizationEnabled: false });
    const on = run(signal, { neuralNormalizationEnabled: true });

    expect(on.normalization.applied).toBe(true);
    expect(on.normalization.unitMode).toBe("dFF0");
    // F₀ ≈ raw baseline of 100 (median ignores the two sparse spikes)
    expect(on.normalization.thisWellFo).toBeGreaterThan(95);
    expect(on.normalization.thisWellFo).toBeLessThan(105);

    // Pointwise: normalized = detrended ÷ F₀.
    const fo = on.normalization.thisWellFo;
    for (let i = 0; i < off.processedSignal.length; i += 50) {
      expect(on.processedSignal[i].y * fo).toBeCloseTo(
        off.processedSignal[i].y,
        6
      );
    }
  });

  test("requires trend flattening (the ΔF source)", () => {
    const r = run(signal, {
      trendFlatteningEnabled: false,
      neuralNormalizationEnabled: true,
    });
    expect(r.normalization.applied).toBe(false);
  });

  test("dead well (flat zero → no valid F₀) is skipped", () => {
    const flat = makeSyntheticSignal({
      n: 400,
      baseline: 0,
      noiseAmp: 0,
      spikes: [],
    });
    const r = run(flat, { neuralNormalizationEnabled: true });
    expect(r.normalization.skipped).toBe(true);
    expect(r.normalization.applied).toBe(false);
  });
});

describe("pipeline ΔF/F₀ × median F₀ rescale (well-to-well, client step 3)", () => {
  // Prominence is RELATIVE (a fraction of the signal range), matching the
  // live pipeline — so a uniform magnitude rescale is detection-invariant.
  const relParams = { spikeProminence: 0.1, spikeProminenceRelative: true };
  const signal = makeSyntheticSignal({
    n: 800,
    baseline: 100,
    noiseAmp: 0.2,
    spikes: [
      { center: 200, amplitude: 8, sigma: 3 },
      { center: 600, amplitude: 8, sigma: 3 },
    ],
  });

  test("rescale off (or no plate median) → bare dFF0, plateMedianFo null", () => {
    const r = run(signal, {
      ...relParams,
      neuralNormalizationEnabled: true,
      rescaleByMedianFo: false,
      plateMedianFo: 250,
    });
    expect(r.normalization.unitMode).toBe("dFF0");
    expect(r.normalization.plateMedianFo).toBeNull();
  });

  test("rescale flag on but plate median invalid → stays dFF0", () => {
    const r = run(signal, {
      ...relParams,
      neuralNormalizationEnabled: true,
      rescaleByMedianFo: true,
      plateMedianFo: 0, // not a valid F₀
    });
    expect(r.normalization.unitMode).toBe("dFF0");
    expect(r.normalization.plateMedianFo).toBeNull();
  });

  test("rescale on → dFF0 × plateMedianFo, magnitude restored, detection unchanged", () => {
    const medianFo = 250;
    const bare = run(signal, {
      ...relParams,
      neuralNormalizationEnabled: true,
      rescaleByMedianFo: false,
    });
    const rescaled = run(signal, {
      ...relParams,
      neuralNormalizationEnabled: true,
      rescaleByMedianFo: true,
      plateMedianFo: medianFo,
    });

    expect(rescaled.normalization.unitMode).toBe("dFF0_x_medianFo");
    expect(rescaled.normalization.plateMedianFo).toBe(medianFo);

    // Every sample is the bare fold-change scaled by the plate median —
    // a uniform multiply that lifts the "little-bitty" ratio into range.
    for (let i = 0; i < bare.processedSignal.length; i += 50) {
      expect(rescaled.processedSignal[i].y).toBeCloseTo(
        bare.processedSignal[i].y * medianFo,
        6
      );
    }

    // A uniform magnitude scale with relative prominence must not move the
    // peak set — the rescale is a reporting transform, not a detection one.
    expect(rescaled.spikeResults.length).toBe(bare.spikeResults.length);
    expect(rescaled.spikeResults.length).toBeGreaterThan(0);
  });
});
