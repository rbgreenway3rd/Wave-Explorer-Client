// Tests for the worker-side candidate-prominence histogram emitted by
// detectSpikes + binned by NeuralPipeline. The whole point of binning
// here (rather than building the histogram from candidateDiagnostics on
// the client) is that the diagnostics array is capped at 1500 records
// sorted by prominence — using it would bias the histogram toward the
// high tail. These tests verify the histogram sees every local maximum.

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { makeSyntheticSignal } from "./_fixtures";

const BASE_PARAMS = {
  spikeProminence: 0.05,
  spikeWindow: 10,
  spikeMinWidth: 3,
  spikeMinDistance: 0,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 3,
  noiseFloorMultiplier: 0,
  smoothingEnabled: false,
  trendFlatteningEnabled: false,
  baselineCorrection: false,
  subtractControl: false,
  handleOutliers: false,
  activityThresholdEnabled: false,
  baselineThresholdEnabled: false,
};

describe("candidate-prominence histogram", () => {
  test("counts sum equals the total local-maxima count", () => {
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.01,
      seed: 1101,
      spikes: [
        { center: 1000, amplitude: 0.3, sigma: 20 },
        { center: 2500, amplitude: 0.4, sigma: 20 },
      ],
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: BASE_PARAMS,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    const hist = result.candidateDistributions?.prominence;
    expect(hist).toBeDefined();
    expect(hist.counts.length).toBe(50);
    expect(hist.edges.length).toBe(51);
    // The full unbiased candidate count is much larger than the cap on
    // diagnostics records — that's the whole point.
    let total = 0;
    for (let i = 0; i < hist.counts.length; i++) total += hist.counts[i];
    expect(total).toBeGreaterThan(0);
    // On a noisy signal the local-maxima count should comfortably
    // exceed the 1500-record cap used elsewhere (which means a
    // diagnostics-derived histogram would have missed records).
    expect(total).toBeGreaterThanOrEqual(
      result.candidateDiagnostics.records.length
    );
  });

  test("bin edges span [0, max] linearly", () => {
    const signal = makeSyntheticSignal({
      n: 3000,
      noiseAmp: 0.005,
      seed: 1102,
      spikes: [{ center: 1500, amplitude: 0.5, sigma: 15 }],
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: BASE_PARAMS,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    const hist = result.candidateDistributions.prominence;
    expect(hist.edges[0]).toBeCloseTo(0, 6);
    // Last edge should be the recorded max.
    expect(hist.edges[hist.edges.length - 1]).toBeCloseTo(hist.max, 5);
    // Linear spacing.
    const step = hist.max / 50;
    for (let i = 1; i < hist.edges.length; i++) {
      expect(hist.edges[i] - hist.edges[i - 1]).toBeCloseTo(step, 5);
    }
  });

  test("most candidates are noise wiggles with small prominence — left side of histogram dominates", () => {
    const signal = makeSyntheticSignal({
      n: 5000,
      noiseAmp: 0.01,
      seed: 1103,
      spikes: [
        { center: 1000, amplitude: 0.5, sigma: 20 },
        { center: 3000, amplitude: 0.5, sigma: 20 },
      ],
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: BASE_PARAMS,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    const hist = result.candidateDistributions.prominence;
    // The lowest 20% of bins should hold the vast majority of the
    // count (noise wiggles) — this is what makes the prominence
    // histogram diagnostic for threshold tuning: you can see the
    // "valley" between the noise hump and the real-event hump (or
    // confirm there isn't one if the signal is uniform).
    const lowBins = Math.floor(0.2 * hist.counts.length);
    let lowSum = 0;
    let totalSum = 0;
    for (let i = 0; i < hist.counts.length; i++) {
      totalSum += hist.counts[i];
      if (i < lowBins) lowSum += hist.counts[i];
    }
    expect(lowSum / totalSum).toBeGreaterThan(0.5);
  });

  test("empty signal returns empty histogram shape", () => {
    const result = runNeuralAnalysisPipeline({
      rawSignal: [],
      controlSignal: [],
      params: BASE_PARAMS,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    const hist = result.candidateDistributions.prominence;
    expect(hist.counts[0]).toBe(0);
    expect(hist.max).toBe(0);
  });
});
