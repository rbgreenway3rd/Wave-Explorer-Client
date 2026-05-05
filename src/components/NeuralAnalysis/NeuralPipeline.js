import { suppressNoise } from "./utilities/noiseSuppression";
import {
  trendFlattening,
  baselineCorrected,
} from "./utilities/neuralSmoothing";
import { savitzkyGolay } from "./utilities/savitzkyGolay";
import {
  detectSpikes,
  computeResidualRobustStd,
  computeLocalRobustStd,
} from "./utilities/detectSpikes";
import { detectBursts } from "./utilities/burstDetection";
import {
  removeOutliers,
  readdOutliersAsSpikes,
} from "./utilities/outlierRemoval";
import { perf } from "./utilities/perfLogger";

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
  cache = null,
}) {
  // memo(stage, keyParts, fn) — runs fn() and caches under (stage,key) when
  // a cache is supplied; just runs fn() otherwise. Lets the same pipeline
  // body work both for cached use (the runner's path) and for any caller
  // that wants a one-shot uncached run.
  const memo = cache
    ? (stage, keyParts, fn) => cache.memo(stage, keyParts, fn)
    : (_stage, _keyParts, fn) => fn();
  const id = cache ? cache.idOf : () => "_";

  perf.group("pipeline");
  // 1. Noise suppression (control subtraction)
  let processed = memo(
    "suppressNoise",
    [id(rawSignal), id(controlSignal), params.subtractControl ? "1" : "0"],
    () =>
      perf.time("suppressNoise", () =>
        suppressNoise(rawSignal, controlSignal, {
          subtractControl: params.subtractControl,
        })
      )
  );

  // 2. Apply trend flattening FIRST (before outlier removal)
  // This ensures outliers are detected on the flattened signal
  let processedForDetection = processed;
  // Snapshot of the signal BEFORE Savitzky-Golay smoothing (when SG is
  // enabled). Used as the noise reference for the noise-floor σ estimate
  // in detectSpikes — see step 4 below.
  let preSmoothingSignal = null;

  if (noiseSuppressionActive) {
    const tfWindow = params.trendFlatteningWindow ?? 200;
    const tfMinimums = params.trendFlatteningMinimums ?? 50;

    if (params.trendFlatteningEnabled) {
      processed = memo(
        "trendFlattening",
        [id(processed), tfWindow, tfMinimums],
        () =>
          perf.time("trendFlattening", () =>
            trendFlattening(processed, {
              windowSize: tfWindow,
              numMinimums: tfMinimums,
            })
          )
      );
      processedForDetection = processed;
    }

    if (params.baselineCorrection) {
      processed = memo(
        "baselineCorrected",
        [id(processed), tfWindow, tfMinimums],
        () =>
          perf.time("baselineCorrected", () =>
            baselineCorrected(processed, tfWindow, tfMinimums)
          )
      );
      processedForDetection = processed;
    }

    if (params.smoothingEnabled) {
      const sgWindow = params.smoothingWindow ?? 5;
      // Snapshot pre-smoothing as the noise reference for residual-based
      // σ. Lets the noise-floor slider's "× σ" threshold reflect the
      // actual noise (data − smoothed) regardless of how aggressive the
      // smoother is.
      preSmoothingSignal = processed;
      processed = memo(
        "smoothing",
        [id(processed), sgWindow],
        () =>
          perf.time("smoothing", () => savitzkyGolay(processed, sgWindow))
      );
      processedForDetection = processed;
    }
  }

  // 3. Outlier removal (if enabled) - now on the flattened signal
  let outlierSpikes = [];

  if (noiseSuppressionActive && params.handleOutliers) {
    const outlierResult = memo(
      "removeOutliers",
      [
        id(processedForDetection),
        params.outlierPercentile || 95,
        params.outlierMultiplier || 2.0,
      ],
      () =>
        perf.time("removeOutliers", () =>
          removeOutliers(processedForDetection, {
            percentile: params.outlierPercentile || 95,
            multiplier: params.outlierMultiplier || 2.0,
            slopeThreshold: 0.1,
          })
        )
    );
    processedForDetection = outlierResult.cleanedSignal;
    outlierSpikes = outlierResult.outlierSpikes;

    // IMPORTANT: Keep the full signal for display, outliers will be marked as special spikes
    // Don't modify 'processed' - it stays intact for visualization
  }

  // 4. Spike detection (on cleaned signal without outliers)
  let spikeResults = [];
  if (analysis.runSpikeDetection) {
    // Optional per-sample local σ — kicks in when the user sets a
    // Noise Window > 0 in the UI. Cached separately so the same
    // (signal × reference × window) tuple is computed once across
    // slider drags that change downstream-only params.
    const noiseWindowSize = params.noiseWindowSize ?? 0;
    const localStds =
      noiseWindowSize > 0
        ? memo(
            "localStds",
            [id(processedForDetection), id(preSmoothingSignal), noiseWindowSize],
            () =>
              perf.time("localStds", () =>
                computeLocalRobustStd(
                  processedForDetection,
                  preSmoothingSignal,
                  noiseWindowSize
                )
              )
          )
        : null;

    spikeResults = memo(
      "detectSpikes",
      [
        id(processedForDetection),
        id(preSmoothingSignal),
        id(localStds),
        params.spikeProminence,
        params.spikeWindow,
        params.spikeMinWidth,
        params.spikeMinDistance,
        params.spikeMinProminenceRatio,
        params.stdMultiplier,
        params.noiseFloorMultiplier,
      ],
      () =>
        perf.time("detectSpikes", () =>
          detectSpikes(processedForDetection, {
            prominence: params.spikeProminence,
            window: params.spikeWindow,
            minWidth: params.spikeMinWidth,
            minDistance: params.spikeMinDistance,
            minProminenceRatio: params.spikeMinProminenceRatio,
            stdMultiplier: params.stdMultiplier,
            noiseFloorMultiplier: params.noiseFloorMultiplier,
            noiseReference: preSmoothingSignal,
            localStds,
          })
        )
    );

    // 5. Re-add outliers as spikes (if they were removed)
    if (params.handleOutliers && outlierSpikes.length > 0) {
      spikeResults = memo(
        "readdOutliers",
        [id(spikeResults), id(outlierSpikes)],
        () =>
          perf.time("readdOutliers", () =>
            readdOutliersAsSpikes(spikeResults, outlierSpikes)
          )
      );
    }
  }

  // 6. Burst detection
  let burstResults = [];
  if (analysis.runBurstDetection && spikeResults.length > 0) {
    burstResults = memo(
      "detectBursts",
      [
        id(spikeResults),
        params.maxInterSpikeInterval,
        params.minSpikesPerBurst,
      ],
      () =>
        perf.time("detectBursts", () =>
          detectBursts(spikeResults, {
            maxInterSpikeInterval: params.maxInterSpikeInterval,
            minSpikesPerBurst: params.minSpikesPerBurst,
          })
        )
    );
  }

  // 7. Metrics
  const metrics = memo(
    "metrics",
    [
      id(spikeResults),
      id(burstResults),
      id(processed),
      id(processedForDetection),
      id(preSmoothingSignal),
    ],
    () =>
      perf.time("metrics", () => ({
        // Same σ the noise-floor check uses (residual when SG is on,
        // data-only otherwise). Surfaced so the UI can show the
        // absolute threshold value next to the slider.
        robustStd:
          processedForDetection.length > 0
            ? computeResidualRobustStd(processedForDetection, preSmoothingSignal)
            : 0,
        spikeFrequency: calculateSpikeFrequency(
          spikeResults,
          processed[0]?.x || 0,
          processed[processed.length - 1]?.x || 1
        ),
        spikeAmplitude: calculateSpikeAmplitude(spikeResults),
        spikeWidth: calculateSpikeWidth(spikeResults),
        spikeAUC: calculateSpikeAUC(spikeResults),
        burstMetrics: calculateBurstMetrics(burstResults),
      }))
  );

  perf.flushGroup();

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
