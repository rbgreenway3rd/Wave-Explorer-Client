// Centralized Neural Analysis Pipeline
// All core logic for signal processing, spike/burst detection, and metrics

// ==================== NEURAL ANALYSIS PIPELINE PARAMETER FLOW DIAGRAM ====================

// runNeuralAnalysisPipeline({
//   rawSignal,         // From selectedWell.indicators[0].filteredData (NeuralAnalysisModal)
//   controlSignal,     // From controlWell.indicators[0].filteredData (NeuralAnalysisModal)
//   params: {
//     subtractControl,         // UI toggle (ChartControls/NoiseFilterControls)
//     trendFlatteningEnabled,  // UI toggle (ChartControls/NoiseFilterControls)
//     baselineCorrection,      // UI toggle (ChartControls/NoiseFilterControls)
//     filterBaseline,          // UI toggle (ChartControls/NoiseFilterControls)
//     smoothingWindow,         // UI input (ChartControls/NoiseFilterControls)
//     spikeProminence,         // Suggested or user input (NeuralControls, via suggestProminence)
//     spikeWindow,             // Suggested or user input (NeuralControls, via suggestWindow)
//     spikeMinWidth,           // User input (NeuralControls)
//     spikeMinDistance,        // User input (NeuralControls)
//     spikeMinProminenceRatio, // User input (NeuralControls)
//     maxInterSpikeInterval,   // User input (NeuralControls)
//     minSpikesPerBurst,       // User input (NeuralControls)
//   },
//   analysis: {
//     runSpikeDetection, // UI action (NeuralControls)
//     runBurstDetection, // UI action (NeuralControls)
//   }
// })

// Parameter flow:
// 1. suppressNoise(rawSignal, controlSignal, { subtractControl })
//    - rawSignal: from selectedWell
//    - controlSignal: from controlWell
//    - subtractControl: from UI
//    => returns processed signal (control subtracted if enabled)

// 2. trendFlattening(processed, { adaptiveBaseline, windowSize, numMinimums })
//    - processed: output of suppressNoise
//    - adaptiveBaseline: baselineCorrection (from UI)
//    - windowSize: smoothingWindow (from UI)
//    - numMinimums: fixed or from UI
//    => returns detrended and optionally baseline-corrected signal

// 3. baselineCorrected(processed, windowSize, numMinimums)
//    - processed: output of suppressNoise
//    - windowSize: smoothingWindow (from UI)
//    - numMinimums: fixed or from UI
//    => returns baseline-corrected signal

// 4. detectSpikes(processed, { prominence, window, minWidth, minDistance, minProminenceRatio })
//    - processed: output of smoothing/baseline
//    - prominence: spikeProminence (suggested or user)
//    - window: spikeWindow (suggested or user)
//    - minWidth, minDistance, minProminenceRatio: user
//    => returns spikeResults

// 5. detectBursts(spikeResults, { maxInterSpikeInterval, minSpikesPerBurst })
//    - spikeResults: output of detectSpikes
//    - maxInterSpikeInterval: user
//    - minSpikesPerBurst: user
//    => returns burstResults

// 6. Metrics functions (calculateSpikeFrequency, etc.)
//    - Use spikeResults, burstResults, processedSignal
//    - All metrics calculated from pipeline outputs

// Parameter suggestion functions:
//   suggestProminence(processedSignal) -- uses processed signal
//   suggestWindow(processedSignal, prominence) -- uses processed signal and prominence

// All UI controls and user actions feed into params and analysis objects, which are passed to the pipeline.
// ========================================================================================

import { suppressNoise } from "./utilities/noiseSuppression";
import {
  trendFlattening,
  baselineCorrected,
} from "./utilities/neuralSmoothing";
import { detectSpikes } from "./utilities/detectSpikes";
import { detectBursts } from "./utilities/burstDetection";

// --- Parameter Suggestion ---
export function suggestProminence(signal, factor = 3) {
  if (!Array.isArray(signal) || signal.length === 0) return 1;
  const ySignal = signal.map((pt) => pt.y);
  const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
  const variance =
    ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
  return Math.floor(factor * Math.sqrt(variance));
}

export function suggestWindow(signal, prominence, num = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return 20;
  const maxWindow = Math.min(100, Math.floor(signal.length / 10));
  let optimalWindowWidth = 0;
  for (let ww = 10; ww <= maxWindow; ww += 5) {
    optimalWindowWidth = ww;
    break;
  }
  return optimalWindowWidth || 20;
}

// --- Metrics Calculation ---
export function calculateSpikeFrequency(spikes, startTime, endTime) {
  if (!Array.isArray(spikes) || spikes.length === 0) return 0;
  const duration = endTime - startTime || 1;
  return spikes.length / duration;
}

export function calculateSpikeAmplitude(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) return 0;
  return (
    spikes.reduce((sum, s) => sum + (s.peakCoords?.y || 0), 0) / spikes.length
  );
}

export function calculateSpikeWidth(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) return 0;
  return (
    spikes.reduce(
      (sum, s) =>
        sum + ((s.rightBaseCoords?.x || 0) - (s.leftBaseCoords?.x || 0)),
      0
    ) / spikes.length
  );
}

export function calculateSpikeAUC(spikes) {
  if (!Array.isArray(spikes) || spikes.length === 0) return 0;
  return (
    spikes.reduce(
      (sum, s) =>
        sum + (typeof s.calculateAUC === "function" ? s.calculateAUC() : 0),
      0
    ) / spikes.length
  );
}

export function calculateBurstMetrics(bursts) {
  if (!Array.isArray(bursts) || bursts.length === 0)
    return { avgDuration: 0, avgSpikeCount: 0 };
  const avgDuration =
    bursts.reduce((sum, b) => sum + (b.duration || 0), 0) / bursts.length;
  const avgSpikeCount =
    bursts.reduce((sum, b) => sum + (b.spikeCount || 0), 0) / bursts.length;
  return { avgDuration, avgSpikeCount };
}

// --- Main Pipeline ---

export function runNeuralAnalysisPipeline({
  rawSignal,
  controlSignal,
  params = {},
  analysis = {},
  noiseSuppressionActive = false,
}) {
  // 1. Noise suppression (control subtraction)
  let processed = suppressNoise(rawSignal, controlSignal, {
    subtractControl: params.subtractControl,
  });

  // 2. Smoothing and baseline correction (only if noiseSuppressionActive)
  if (noiseSuppressionActive) {
    if (params.trendFlatteningEnabled) {
      // Only pass parameters actually used by trendFlattening
      processed = trendFlattening(processed, {
        adaptiveBaseline: params.baselineCorrection,
        polynomialDegree: 2, // or make this user-configurable if needed
      });
      console.log("trendFlattening data: ", processed);
    } else if (params.baselineCorrection) {
      processed = baselineCorrected(
        processed,
        params.smoothingWindow || 200,
        50
      );
    }
  }

  // 3. Spike detection
  let spikeResults = [];
  if (analysis.runSpikeDetection) {
    spikeResults = detectSpikes(processed, {
      prominence: params.spikeProminence,
      window: params.spikeWindow,
      minWidth: params.spikeMinWidth,
      minDistance: params.spikeMinDistance,
      minProminenceRatio: params.spikeMinProminenceRatio,
    });
  }

  // 4. Burst detection
  let burstResults = [];
  if (analysis.runBurstDetection && spikeResults.length > 0) {
    // Debug: log spike x-values and inter-spike intervals
    const spikeXs = spikeResults
      .map((p) => p.peakCoords?.x ?? p.time ?? null)
      .filter((x) => x !== null);
    console.log("[Pipeline] Spike x-values:", spikeXs);
    const isi = spikeXs.slice(1).map((x, i) => x - spikeXs[i]);
    console.log("[Pipeline] Inter-spike intervals:", isi);
    console.log("[Pipeline] Burst detection params:", {
      maxInterSpikeInterval: params.maxInterSpikeInterval,
      minSpikesPerBurst: params.minSpikesPerBurst,
    });
    burstResults = detectBursts(spikeResults, {
      maxInterSpikeInterval: params.maxInterSpikeInterval,
      minSpikesPerBurst: params.minSpikesPerBurst,
    });
    console.log("[Pipeline] Burst results:", burstResults);
  }

  // 5. Metrics
  const metrics = {
    spikeFrequency: calculateSpikeFrequency(
      spikeResults,
      processed[0]?.x || 0,
      processed[processed.length - 1]?.x || 1
    ),
    spikeAmplitude: calculateSpikeAmplitude(spikeResults),
    spikeWidth: calculateSpikeWidth(spikeResults),
    spikeAUC: calculateSpikeAUC(spikeResults),
    burstMetrics: calculateBurstMetrics(burstResults),
  };

  return {
    processedSignal: processed,
    spikeResults,
    burstResults,
    metrics,
  };
}

// --- End Pipeline ---
