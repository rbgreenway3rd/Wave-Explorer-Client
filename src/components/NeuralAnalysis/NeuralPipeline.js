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
import {
  computeSignalStats,
  classifyMargin,
  GATE_ACTIVITY,
} from "./utilities/peakGeometry";
import { detectBursts } from "./utilities/burstDetection";
import {
  identifyOutlierSpikes,
  preserveOutliersInSmoothed,
  flagOutliersOnDetectedPeaks,
} from "./utilities/outlierRemoval";
import { perf } from "./utilities/perfLogger";

// Auto-suggest helpers live in their own module so the live pipeline,
// full-plate report, and report worker all agree. Re-exported here
// because existing call sites import them from this file.
export { suggestProminence, suggestWindow } from "./utilities/parameterSuggestions";

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

  // 2. Apply trend flattening FIRST (before outlier identification).
  // Outliers are included in trend flattening — the `rollingMinMedian`
  // tracker naturally ignores tall peaks (they're never among the K
  // smallest in any window) so their presence doesn't bias the
  // baseline.
  let processedForDetection = processed;
  // Snapshot of the signal BEFORE Savitzky-Golay smoothing (when SG is
  // enabled). Used as the noise reference for the noise-floor σ estimate
  // in detectSpikes — see step 4 below — and as the source for outlier
  // sample-region restoration in step 2b.
  let preSmoothingSignal = null;
  // Identified outlier spikes; captured during step 2b so the
  // post-detection flag pass (step 5) can mark matching detectSpikes
  // results with isOutlier=true. Empty when handleOutliers is off.
  let pipelineOutlierSpikes = [];

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

    // 2b. Identify outliers BEFORE smoothing on the trend-flattened
    // (but not yet smoothed) signal — that's the most faithful
    // amplitude reference for classification. Runs whenever
    // handleOutliers is on; the result is used for two things:
    //   (1) preserve outlier sample regions through SG smoothing
    //       (only matters when smoothing is also on)
    //   (2) post-detectSpikes flag pass to mark `isOutlier=true` on
    //       matching peaks (for the orange-ring chart distinction).
    if (params.handleOutliers) {
      const outlierResult = memo(
        "identifyOutliers",
        [
          id(processed),
          params.outlierPercentile || 95,
          params.outlierMultiplier || 2.0,
        ],
        () =>
          perf.time("identifyOutliers", () =>
            identifyOutlierSpikes(processed, {
              percentile: params.outlierPercentile || 95,
              multiplier: params.outlierMultiplier || 2.0,
              slopeThreshold: 0.1,
            })
          )
      );
      pipelineOutlierSpikes = outlierResult.outlierSpikes;
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

      // Restore outlier sample regions from the pre-smoothing signal
      // so SG doesn't flatten the user's biggest peaks. Whole spike
      // region preserved (startIdx → endIdx), not just the apex —
      // keeps both amplitude AND width intact through smoothing.
      if (pipelineOutlierSpikes.length > 0) {
        processed = memo(
          "preserveOutliers",
          [id(processed), id(preSmoothingSignal), id(pipelineOutlierSpikes)],
          () =>
            perf.time("preserveOutliers", () =>
              preserveOutliersInSmoothed(
                processed,
                preSmoothingSignal,
                pipelineOutlierSpikes
              )
            )
        );
      }
      processedForDetection = processed;
    }
  }

  // 4. Spike detection (on cleaned signal without outliers)
  let spikeResults = [];
  // Hoisted outside the `if (runSpikeDetection)` block so the pipeline's
  // final return can read it whether detection runs or not. Empty Map
  // when detection didn't run; populated by detectSpikes and Gate-9
  // (activity threshold) demotion otherwise.
  let candidateDiagnostics = new Map();
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

    // Baseline override for peak bases — when the user has enabled the
    // chart's Baseline Threshold line, peak width and AUC are computed
    // relative to where the signal crosses that absolute Y value, not
    // the lowest local minimum near each peak.
    //
    // Compute the absolute Y once from the rendered signal's range so
    // it matches the on-chart line exactly. Done outside the memo so
    // the cache key can be a simple primitive (`baselineY`) rather
    // than dragging the whole signal in.
    let baselineY = null;
    if (
      params.baselineThresholdEnabled &&
      typeof params.baselineThresholdRatio === "number"
    ) {
      let yMin = Infinity;
      let yMax = -Infinity;
      for (let i = 0; i < processed.length; i++) {
        const y = processed[i].y;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
      if (isFinite(yMin) && isFinite(yMax) && yMax > yMin) {
        baselineY = yMin + params.baselineThresholdRatio * (yMax - yMin);
      }
    }

    // Memo wraps both the kept spikes and the diagnostic Map together
    // so the candidate-overlay data stays cache-coherent with the spike
    // array. Without bundling, a cache hit would return the spikes but
    // not the diagnostics (the Map would be empty on a cached run).
    const detectResult = memo(
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
        baselineY,
        // Outlier-set identity. `id(pipelineOutlierSpikes)` returns a
        // stable hash for the same outlier-list reference, so the cache
        // hits when the outlier list hasn't changed and misses when it
        // has (e.g., on outlier slider drags).
        id(pipelineOutlierSpikes),
      ],
      () =>
        perf.time("detectSpikes", () => {
          const diag = new Map();
          const spikes = detectSpikes(processedForDetection, {
            prominence: params.spikeProminence,
            window: params.spikeWindow,
            minWidth: params.spikeMinWidth,
            minDistance: params.spikeMinDistance,
            minProminenceRatio: params.spikeMinProminenceRatio,
            stdMultiplier: params.stdMultiplier,
            noiseFloorMultiplier: params.noiseFloorMultiplier,
            noiseReference: preSmoothingSignal,
            localStds,
            diagnostics: diag,
            useBaselineForBases: baselineY !== null,
            baselineY: baselineY ?? undefined,
            // Outlier spike structures (with start/peak/end indices)
            // are passed in so detectSpikes can: (a) preserve outlier
            // apex peaks through window-grouping and k-means; (b) drop
            // any normal peak whose sample index falls within an
            // outlier's spike structure — those are noise wiggles on
            // the same event, not separate events. The shadow zone is
            // each spike's actual start/end range, so the suppression
            // radius adapts to spike width regardless of signal type
            // or sample rate.
            outlierSpikes: pipelineOutlierSpikes,
          });
          return { spikes, diagnostics: diag };
        })
    );
    spikeResults = detectResult.spikes;
    candidateDiagnostics = detectResult.diagnostics;

    // 5. Flag detected peaks that match the identified outlier set
    // with isOutlier=true. Pure visual classification — every peak's
    // metric values (auc, width, amplitude) are already computed by
    // NeuralPeak. The flag is what drives the orange-ring rendering
    // in NeuralGraph; detection has already preserved these peaks via
    // the `outlierIndices` bypass above.
    if (pipelineOutlierSpikes.length > 0) {
      spikeResults = memo(
        "flagOutliers",
        [id(spikeResults), id(pipelineOutlierSpikes)],
        () =>
          perf.time("flagOutliers", () =>
            flagOutliersOnDetectedPeaks(spikeResults, pipelineOutlierSpikes)
          )
      );
    }

    // 5b. Activity Threshold — drop peaks whose apex Y falls below the
    // user-defined line. Ratio (0–1) is mapped to absolute Y using the
    // *rendered* processed signal's Y range (the variable named
    // `processed` here, which is what the modal also renders as
    // processedSignal) so the filter and the chart line agree exactly.
    if (params.activityThresholdEnabled && spikeResults.length > 0) {
      const activityResult = memo(
        "activityThreshold",
        [
          id(spikeResults),
          id(processed),
          params.activityThresholdRatio,
        ],
        () =>
          perf.time("activityThreshold", () => {
            let yMin = Infinity;
            let yMax = -Infinity;
            for (let i = 0; i < processed.length; i++) {
              const y = processed[i].y;
              if (y < yMin) yMin = y;
              if (y > yMax) yMax = y;
            }
            if (!isFinite(yMin) || !isFinite(yMax) || yMax === yMin) {
              return { spikes: spikeResults, demoted: [] };
            }
            const absoluteThreshold =
              yMin + params.activityThresholdRatio * (yMax - yMin);
            const yScale = Math.max(yMax - yMin, 1e-9);
            const kept = [];
            const demoted = [];
            for (const pk of spikeResults) {
              if (pk.peakCoords.y >= absoluteThreshold) {
                kept.push(pk);
              } else {
                demoted.push({
                  index: pk.index,
                  peakX: pk.peakCoords.x,
                  peakY: pk.peakCoords.y,
                  threshold: absoluteThreshold,
                  yScale,
                  detectionProminence:
                    typeof pk.detectionProminence === "number"
                      ? pk.detectionProminence
                      : null,
                });
              }
            }
            return { spikes: kept, demoted };
          })
      );
      spikeResults = activityResult.spikes;
      // Gate 9: demote activity-threshold rejections into the diagnostics
      // Map so the Inspector can show "rejected by activity threshold" on
      // peaks that detectSpikes considered valid. Records that were
      // KEPT through detectSpikes get their rejectedBy flipped to
      // GATE_ACTIVITY here; the rejection's tier is computed against
      // the signal's Y range.
      for (const d of activityResult.demoted) {
        const tier = classifyMargin(d.peakY, d.threshold, d.yScale);
        let rec = candidateDiagnostics.get(d.index);
        if (!rec) {
          rec = {
            index: d.index,
            peakX: d.peakX,
            peakY: d.peakY,
            rejectedBy: GATE_ACTIVITY,
            tier,
            gates: [],
            nmsSuppressor: null,
            detectionProminence: d.detectionProminence,
          };
          candidateDiagnostics.set(d.index, rec);
        }
        rec.rejectedBy = GATE_ACTIVITY;
        rec.tier = tier;
        rec.gates.push({
          id: GATE_ACTIVITY,
          value: d.peakY,
          threshold: d.threshold,
          tier,
          status: "fail",
        });
      }
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
      perf.time("metrics", () => {
        // Cache-warm read on signal stats; `computeSignalStats` is
        // WeakMap-keyed against the data array so calling it here is
        // free once detectSpikes has already populated it.
        const stats =
          processedForDetection.length > 0
            ? computeSignalStats(processedForDetection)
            : { signalRange: 0, globalMin: 0, globalMax: 0 };
        return {
          // Same σ the noise-floor check uses (residual when SG is on,
          // data-only otherwise). Surfaced so the UI can show the
          // absolute threshold value next to the slider.
          robustStd:
            processedForDetection.length > 0
              ? computeResidualRobustStd(processedForDetection, preSmoothingSignal)
              : 0,
          // Signal envelope, surfaced so the prominence slider can
          // size itself per-well. Without this the slider hard-floored
          // at 100, unrepresentable for normalized y ∈ [-0.02, 0.17].
          signalRange: stats.signalRange,
          signalYMin: stats.globalMin,
          signalYMax: stats.globalMax,
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
      })
  );

  perf.flushGroup();

  // Finalize candidate diagnostics for the Decision Explanation Layer.
  // Cap to top-MAX_DIAGNOSTIC_RECORDS by detection prominence so the
  // worker → main-thread payload stays bounded on noisy wells. Records
  // without a measured detection prominence (zone/activity rejections)
  // sort last; their visual placement is by peakY anyway.
  const MAX_DIAGNOSTIC_RECORDS = 1500;
  let diagRecords = Array.from(candidateDiagnostics.values());
  const totalCandidates = diagRecords.length;
  let truncatedCount = 0;
  if (diagRecords.length > MAX_DIAGNOSTIC_RECORDS) {
    diagRecords.sort((a, b) => {
      const ap = a.detectionProminence ?? -Infinity;
      const bp = b.detectionProminence ?? -Infinity;
      return bp - ap;
    });
    truncatedCount = diagRecords.length - MAX_DIAGNOSTIC_RECORDS;
    diagRecords = diagRecords.slice(0, MAX_DIAGNOSTIC_RECORDS);
  }

  // Return the processed signal for display
  // Outliers have been removed from detection but will be marked as spikes
  return {
    processedSignal: processed,
    spikeResults,
    burstResults,
    metrics,
    candidateDiagnostics: {
      records: diagRecords,
      truncatedCount,
      totalCandidates,
    },
  };
}

// --- End Pipeline ---
