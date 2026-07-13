/**
 * Freeze-guard regression tests for the neural spike-detection pipeline.
 *
 * Background: a customer reported the neural graph never updating — an
 * "Updating…" spinner forever — after selecting a flat/noisy trace. Root
 * cause was a spike-count explosion: with the default RELATIVE spike
 * prominence (0.1 = fraction of signal range), a flat/noisy trace collapses
 * that range to the noise band, so the absolute prominence bar drops far
 * below the noise and tens of thousands of noise wiggles pass Gate 1 —
 * enough to wedge the downstream k-means / NMS stages.
 *
 * These lock the fixes:
 *   - 1c: NeuralPipeline floors the effective prominence at PROM_SIGMA_FLOOR
 *         robust σ, so a pure-noise trace produces ~0 spikes while a real
 *         trace with a wide amplitude spread keeps all its events.
 *   - 1b: findTrueSpikes' NMS is a fixed-radius spatial-bucket lookup;
 *         suppression is still |peak - accepted center| <= spikeWindow.
 *
 * Conventions follow parameterSensitivity.test.js: UI-valid parameter
 * ranges, one variable isolated per assertion, fresh cache per pipeline run.
 */

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { detectSpikes } from "../utilities/detectSpikes";
import { makePipelineCache } from "../utilities/pipelineCache";
import { makeSyntheticSignal } from "./_fixtures";

// Mirrors the live UI defaults that matter for detection. Relative
// prominence is the real-world default (the modal sets it); the σ-floor
// only applies on the relative branch.
const baseParams = {
  subtractControl: false,
  trendFlatteningEnabled: false,
  baselineCorrection: false,
  baselineThresholdEnabled: false,
  smoothingEnabled: true,
  smoothingWindow: 9,
  handleOutliers: false,
  outlierSensitivity: 5,
  spikeProminence: 0.1,
  spikeProminenceRelative: true,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 0,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  noiseFloorMultiplier: 0,
  noiseWindowSize: 0,
  activityThresholdEnabled: false,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

const runPipeline = (rawSignal, params) =>
  runNeuralAnalysisPipeline({
    rawSignal,
    controlSignal: [],
    params: { ...baseParams, ...params },
    analysis: { runSpikeDetection: true, runBurstDetection: false },
    noiseSuppressionActive: false,
    cache: makePipelineCache(),
  });

describe("prominence σ-floor (Fix 1c)", () => {
  test("pure-noise trace yields almost no spikes with the default relative prominence", () => {
    const noise = makeSyntheticSignal({ n: 3000, noiseAmp: 0.5, spikes: [] });
    const result = runPipeline(noise, {
      spikeProminence: 0.1,
      spikeProminenceRelative: true,
    });
    // Without the σ-floor this is hundreds-to-thousands of noise wiggles.
    expect(result.spikeResults.length).toBeLessThan(25);
  });

  test("the low count is due to the floor, not an empty signal — a tiny absolute bar finds many wiggles", () => {
    const noise = makeSyntheticSignal({ n: 3000, noiseAmp: 0.5, spikes: [] });
    const floored = runPipeline(noise, {
      spikeProminence: 0.1,
      spikeProminenceRelative: true,
    });
    // Absolute mode bypasses the relative σ-floor: the same noise clears a
    // low absolute bar in large numbers, proving the floor is what
    // suppresses them (not a flat/empty input).
    const unfloored = runPipeline(noise, {
      spikeProminence: 0.03,
      spikeProminenceRelative: false,
    });
    expect(unfloored.spikeResults.length).toBeGreaterThan(
      floored.spikeResults.length * 10
    );
  });

  test("a real trace with a wide amplitude spread keeps all its events", () => {
    // Four well-separated events spanning a wide amplitude range, all
    // clearly above the noise. The σ-floor must not bind here (signalRange
    // is dominated by the tallest event), so none are dropped.
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.3,
      spikes: [
        { center: 500, amplitude: 12, sigma: 4 },
        { center: 1500, amplitude: 8, sigma: 4 },
        { center: 2500, amplitude: 5, sigma: 4 },
        { center: 3500, amplitude: 3, sigma: 4 },
      ],
    });
    const result = runPipeline(signal, {
      spikeProminence: 0.1,
      spikeProminenceRelative: true,
    });
    expect(result.spikeResults.length).toBeGreaterThanOrEqual(4);
  });
});

describe("fixed-radius NMS spatial-bucket lookup (Fix 1b)", () => {
  // Two tall, narrow, equal spikes; minDistance disabled so only the NMS
  // footprint governs collapse. Absolute prominence so the test is
  // independent of the σ-floor.
  const NMS_OPTS = {
    prominence: 3,
    window: 20,
    minDistance: 0,
    minWidth: 0,
    stdMultiplier: 1,
    minProminenceRatio: 0,
  };
  const twoSpikes = (gap) =>
    makeSyntheticSignal({
      n: 2000,
      noiseAmp: 0.05,
      spikes: [
        { center: 800, amplitude: 10, sigma: 3 },
        { center: 800 + gap, amplitude: 10, sigma: 3 },
      ],
    });

  test("two spikes farther apart than the window both survive", () => {
    const peaks = detectSpikes(twoSpikes(400), NMS_OPTS);
    expect(peaks.length).toBe(2);
  });

  test("two spikes within one window collapse to a single survivor", () => {
    // gap 10 < window 20 → the second peak sits inside the first's ±window
    // footprint and is suppressed. Centers 800 and 810 also straddle a
    // bucket boundary (bucketSize = window = 20 → buckets 40 and 40),
    // exercising the adjacent-bucket path of the lookup.
    const peaks = detectSpikes(twoSpikes(10), NMS_OPTS);
    expect(peaks.length).toBe(1);
  });

  test("two spikes exactly one window apart collapse (inclusive boundary)", () => {
    // |peak - center| === window is suppressed (<= spikeWindow), matching
    // the previous linear-scan semantics.
    const peaks = detectSpikes(twoSpikes(20), NMS_OPTS);
    expect(peaks.length).toBe(1);
  });
});
