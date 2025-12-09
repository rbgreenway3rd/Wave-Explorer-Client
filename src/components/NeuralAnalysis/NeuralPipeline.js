import { suppressNoise } from "./utilities/noiseSuppression";
import {
  trendFlattening,
  baselineCorrected,
} from "./utilities/neuralSmoothing";
import { detectSpikes } from "./utilities/detectSpikes";
import { detectBursts } from "./utilities/burstDetection";
import {
  removeOutliers,
  readdOutliersAsSpikes,
} from "./utilities/outlierRemoval";

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

  // Calculate sampling rate (average time between samples)
  const samplingRate =
    signal.length > 1
      ? (signal[signal.length - 1].x - signal[0].x) / signal.length
      : 1;

  // Estimate typical peak width from prominence
  // Larger prominence suggests wider peaks that need larger windows
  // Scale by num to allow tuning
  const baseWindow = Math.max(10, Math.floor(prominence * num * samplingRate));

  // Constrain to reasonable bounds
  //   const maxWindow = Math.min(500, Math.floor(signal.length / 10));
  const maxWindow = Math.min(
    Math.floor(signal.length / 50),
    Math.floor(signal.length / 10)
  );
  const minWindow = 10;

  const optimalWindowWidth = Math.max(
    minWindow,
    Math.min(baseWindow, maxWindow)
  );

  console.log(
    `[suggestWindow] prominence: ${prominence}, num: ${num}, calculated: ${optimalWindowWidth}`
  );

  return optimalWindowWidth;
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
  console.log("=== PIPELINE START ===");
  console.log("noiseSuppressionActive:", noiseSuppressionActive);
  console.log("params.handleOutliers:", params.handleOutliers);
  console.log("rawSignal length:", rawSignal?.length);

  // 1. Noise suppression (control subtraction)
  let processed = suppressNoise(rawSignal, controlSignal, {
    subtractControl: params.subtractControl,
  });
  console.log("After noise suppression, signal length:", processed.length);

  // 2. Apply trend flattening FIRST (before outlier removal)
  // This ensures outliers are detected on the flattened signal
  let processedForDetection = processed;

  if (noiseSuppressionActive) {
    if (params.trendFlatteningEnabled) {
      processed = trendFlattening(processed, {
        windowSize: 200,
        numMinimums: 50,
      });
      processedForDetection = processed;
      console.log("[Pipeline] Trend flattening applied BEFORE outlier removal");
    }

    if (params.baselineCorrection) {
      processed = baselineCorrected(
        processed,
        params.smoothingWindow || 200,
        50
      );
      processedForDetection = processed;
      console.log(
        "[Pipeline] Baseline correction applied BEFORE outlier removal"
      );
    }
  }

  // 3. Outlier removal (if enabled) - now on the flattened signal
  let outlierSpikes = [];

  console.log("[Pipeline] Checking outlier removal conditions:");
  console.log("  - noiseSuppressionActive:", noiseSuppressionActive);
  console.log("  - params.handleOutliers:", params.handleOutliers);
  console.log(
    "  - Will remove outliers?",
    noiseSuppressionActive && params.handleOutliers
  );

  if (noiseSuppressionActive && params.handleOutliers) {
    console.log("[Pipeline] *** REMOVING OUTLIERS FROM FLATTENED SIGNAL ***");
    const outlierResult = removeOutliers(processedForDetection, {
      percentile: params.outlierPercentile || 95,
      multiplier: params.outlierMultiplier || 2.0,
      slopeThreshold: 0.1,
    });
    processedForDetection = outlierResult.cleanedSignal;
    outlierSpikes = outlierResult.outlierSpikes;
    console.log(
      "[Pipeline] Outliers removed. Original length: " +
        processed.length +
        ", Cleaned length: " +
        processedForDetection.length
    );
    console.log(
      "[Pipeline] Outlier Y-coordinates are now in flattened coordinate space"
    );

    // IMPORTANT: Keep the full signal for display, outliers will be marked as special spikes
    // Don't modify 'processed' - it stays intact for visualization
  } else {
    console.log("[Pipeline] Outlier removal SKIPPED");
  }

  // 4. Spike detection (on cleaned signal without outliers)
  let spikeResults = [];
  if (analysis.runSpikeDetection) {
    spikeResults = detectSpikes(processedForDetection, {
      prominence: params.spikeProminence,
      window: params.spikeWindow,
      minWidth: params.spikeMinWidth,
      minDistance: params.spikeMinDistance,
      minProminenceRatio: params.spikeMinProminenceRatio,
      stdMultiplier: params.stdMultiplier,
    });

    // 5. Re-add outliers as spikes (if they were removed)
    if (params.handleOutliers && outlierSpikes.length > 0) {
      console.log(
        "[Pipeline] Re-adding " + outlierSpikes.length + " outlier(s) as spikes"
      );
      spikeResults = readdOutliersAsSpikes(spikeResults, outlierSpikes);
    }
  }

  // 6. Burst detection
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

  // 7. Metrics
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

  // Return the processed signal for display
  // Outliers have been removed from detection but will be marked as spikes
  return {
    processedSignal: processed,
    spikeResults,
    burstResults,
    metrics,
  };
}

// --- End Pipeline ---
