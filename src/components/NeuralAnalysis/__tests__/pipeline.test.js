/**
 * runNeuralAnalysisPipeline — integration smoke tests.
 *
 * These verify the pipeline's external contract (output shape, that
 * stages compose correctly, that gating flags actually skip work) so
 * the per-stage caching (Tier E) and downstream algorithmic rewrites
 * (G6c, G6d) can't quietly break the pipeline as a whole.
 */

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { makePipelineCache } from "../utilities/pipelineCache";
import { makeSyntheticSignal, makeBurstingSignal } from "./_fixtures";

// `spikeWindow: 20` (not 60) deliberately keeps wlen/2 = 10 BELOW the
// bursting fixture's `interSpikeInterval = 30`, so in-burst spikes
// aren't collapsed together by the window-grouping pass in
// detectSpikes. The previous value of 60 produced wlen/2 = 30 exactly
// at the inter-spike interval boundary, causing every other spike to
// be coalesced (5-per-burst → ~3 → after k-means → ~1-2 → fails
// burst minSpikesPerBurst=3). That's a real algorithm/fixture
// mismatch, not a per-pipeline regression. Option 3 (remove the
// window-grouping + k-means combo and rely on explicit thresholds)
// would let the larger values work too.
const baseParams = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  baselineCorrection: false,
  smoothingEnabled: false,
  smoothingWindow: 5,
  handleOutliers: true,
  outlierPercentile: 95,
  outlierMultiplier: 2.0,
  spikeProminence: 3,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

describe("runNeuralAnalysisPipeline", () => {
  test("returns the expected result shape on a synthetic signal", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.2,
      spikes: [
        { center: 200, amplitude: 8, sigma: 3 },
        { center: 600, amplitude: 8, sigma: 3 },
      ],
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: baseParams,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: true,
    });
    expect(Array.isArray(result.processedSignal)).toBe(true);
    expect(result.processedSignal.length).toBe(signal.length);
    expect(Array.isArray(result.spikeResults)).toBe(true);
    expect(Array.isArray(result.burstResults)).toBe(true);
    expect(result.metrics).toBeDefined();
    expect(result.metrics.spikeFrequency).toBeDefined();
    expect(result.metrics.spikeAmplitude).toBeDefined();
    // Burst detection was disabled.
    expect(result.burstResults.length).toBe(0);
  });

  test("returns empty/zero shape for an empty input signal", () => {
    const result = runNeuralAnalysisPipeline({
      rawSignal: [],
      controlSignal: [],
      params: baseParams,
      analysis: { runSpikeDetection: true, runBurstDetection: true },
      noiseSuppressionActive: true,
    });
    // suppressNoise on [] returns []; downstream stages all bail.
    expect(result.processedSignal.length).toBe(0);
    expect(result.spikeResults.length).toBe(0);
    expect(result.burstResults.length).toBe(0);
  });

  test("burst detection produces bursts when bursting input + flag enabled", () => {
    const { signal, expectedBursts } = makeBurstingSignal({
      burstCount: 3,
      spikesPerBurst: 5,
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: { ...baseParams, maxInterSpikeInterval: 50, minSpikesPerBurst: 3 },
      analysis: { runSpikeDetection: true, runBurstDetection: true },
      noiseSuppressionActive: true,
    });
    expect(result.spikeResults.length).toBeGreaterThan(0);
    expect(result.burstResults.length).toBe(expectedBursts);
  });

  test("noiseSuppressionActive=false skips trend flattening + outlier removal", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0.1,
      spikes: [{ center: 200, amplitude: 8, sigma: 3 }],
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: baseParams,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    // With suppression off, processed should equal raw shape and content.
    expect(result.processedSignal.length).toBe(signal.length);
    for (let i = 0; i < signal.length; i++) {
      expect(result.processedSignal[i].x).toBe(signal[i].x);
      // y may be untouched (no subtractControl, no trend flat) — exact match
      expect(result.processedSignal[i].y).toBe(signal[i].y);
    }
  });

  test("per-stage cache: identical inputs return same processedSignal reference", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0.1,
      spikes: [{ center: 200, amplitude: 8, sigma: 3 }],
    });
    const ctl = []; // Hoisted so both runs share the same array reference.
    const cache = makePipelineCache();
    const inputs = {
      rawSignal: signal,
      controlSignal: ctl,
      params: baseParams,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: true,
      cache,
    };
    const r1 = runNeuralAnalysisPipeline(inputs);
    const r2 = runNeuralAnalysisPipeline(inputs);
    // With identical params + identical input refs, the cache should
    // return the same cached processedSignal array reference for both
    // runs.
    expect(r2.processedSignal).toBe(r1.processedSignal);
    expect(r2.spikeResults).toBe(r1.spikeResults);
  });

  test("per-stage cache: changing only a downstream param keeps upstream stages cached", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0.1,
      spikes: [
        { center: 100, amplitude: 8, sigma: 3 },
        { center: 300, amplitude: 8, sigma: 3 },
      ],
    });
    const ctl = []; // Same reference across both calls.
    const cache = makePipelineCache();
    const r1 = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: ctl,
      params: baseParams,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: true,
      cache,
    });
    const r2 = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: ctl,
      params: { ...baseParams, spikeProminence: baseParams.spikeProminence + 1 },
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: true,
      cache,
    });
    // Spike prominence changed → spike-detection result differs in
    // identity (cache miss). But upstream processedSignal should remain
    // the same reference because no upstream-relevant param changed.
    expect(r2.processedSignal).toBe(r1.processedSignal);
    expect(r2.spikeResults).not.toBe(r1.spikeResults);
  });
});
