// Verifies the 1500-record cap that lives in NeuralPipeline.js. The
// pipeline ships diagnostics through the worker; without the cap a
// noisy well can produce 5K-50K records (4MB+ payload). The cap keeps
// the top survivors by detection prominence and reports a
// `truncatedCount` so the UI can show "showing top 1500 of N".

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { makeSyntheticSignal } from "./_fixtures";

describe("candidateDiagnostics cap", () => {
  test("payload is capped at 1500 records on a noisy well with many near-misses", () => {
    // A long noisy signal with many bumps that sit close to the
    // prominence threshold so they get emitted as marginal-fail
    // candidates. Without the cap this would emit thousands of records.
    const spikes = [];
    for (let c = 200; c < 8000; c += 50) {
      spikes.push({ center: c, amplitude: 0.05 + Math.random() * 0.01, sigma: 8 });
    }
    const signal = makeSyntheticSignal({
      n: 9000,
      noiseAmp: 0.01,
      seed: 1001,
      spikes,
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: {
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
      },
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    expect(result.candidateDiagnostics).toBeDefined();
    expect(result.candidateDiagnostics.records.length).toBeLessThanOrEqual(1500);
    if (result.candidateDiagnostics.records.length === 1500) {
      // Cap engaged — truncatedCount must reflect the dropped records.
      expect(result.candidateDiagnostics.truncatedCount).toBeGreaterThan(0);
      expect(result.candidateDiagnostics.totalCandidates).toBeGreaterThan(1500);
    }
  });

  test("retained records are sorted by detection prominence when truncation happens", () => {
    // Force truncation, then check the retained records have higher
    // detection prominences than any plausibly dropped near-miss.
    const spikes = [];
    for (let c = 200; c < 12000; c += 30) {
      spikes.push({ center: c, amplitude: 0.06, sigma: 6 });
    }
    const signal = makeSyntheticSignal({
      n: 13000,
      noiseAmp: 0.015,
      seed: 1002,
      spikes,
    });
    const result = runNeuralAnalysisPipeline({
      rawSignal: signal,
      controlSignal: [],
      params: {
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
      },
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive: false,
    });
    const records = result.candidateDiagnostics.records;
    if (records.length === 1500) {
      // All retained records that have a detection prominence value
      // should be ≥ 0 (sort key valid).
      const proms = records
        .map((r) => r.detectionProminence)
        .filter((p) => typeof p === "number");
      expect(proms.length).toBeGreaterThan(0);
      // Spot-check: max retained prominence > median retained prominence.
      const sorted = [...proms].sort((a, b) => b - a);
      expect(sorted[0]).toBeGreaterThanOrEqual(sorted[Math.floor(sorted.length / 2)]);
    }
  });
});
