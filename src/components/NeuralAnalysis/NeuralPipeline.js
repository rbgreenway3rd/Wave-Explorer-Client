import { suppressNoise } from "./utilities/noiseSuppression";
import {
  trendFlattening,
  baselineCorrected,
} from "./utilities/neuralSmoothing";
import { savitzkyGolay } from "./utilities/savitzkyGolay";
import {
  computeFo,
  foWindowIndices,
  applyDeltaFOverFo,
  isValidFo,
  UNIT_MODE,
} from "./utilities/neuralNormalization";
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
import { removeOutliers } from "./utilities/outlierRemoval";
import { perf } from "./utilities/perfLogger";

// Floor for the relative-prominence bar, in robust-σ units. When the
// prominence is given as a fraction of the signal range, a flat/noisy
// trace collapses that range to the noise band, so `fraction × range`
// drops to a sub-noise value and tens of thousands of noise wiggles pass
// Gate 1 — enough to wedge the downstream k-means / NMS. Requiring a
// candidate to rise at least this many robust σ above its base rejects
// noise (~1σ) while never binding on a real trace, where `fraction ×
// range` dominates. See docs / neural freeze investigation.
const PROM_SIGMA_FLOOR = 3;

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

// Compact linear histogram for the candidate prominence distribution.
// Returned as typed arrays for cheap structured-clone across the worker
// boundary (~600 B regardless of input size). Counts are unbiased —
// every local maximum's prominence is binned, not just the survivors.
function binLinearProminences(values, nBins) {
  if (!Array.isArray(values) || values.length === 0) {
    return {
      edges: new Float32Array([0, 1]),
      counts: new Uint32Array([0]),
      max: 0,
    };
  }
  let max = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isFinite(v) && v > max) max = v;
  }
  if (!(max > 0)) max = 1; // degenerate: all zeros / negatives
  const edges = new Float32Array(nBins + 1);
  for (let i = 0; i <= nBins; i++) edges[i] = (i / nBins) * max;
  const counts = new Uint32Array(nBins);
  const denom = max / nBins;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v) || v < 0) continue;
    let bin = Math.floor(v / denom);
    if (bin >= nBins) bin = nBins - 1;
    counts[bin]++;
  }
  return { edges, counts, max };
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

  // 1b. Outlier handling. Runs whenever the toggle is on, DECOUPLED from
  // noiseSuppressionActive, and BEFORE trend flattening / ΔF/F₀ / smoothing /
  // detection — a tall outlier left in the trace inflates globalMax /
  // signalRange and skews every relative threshold and auto-suggested
  // parameter downstream. Detection is global (anchored to the real signal's
  // height); each above-cutoff run is replaced by a straight line. Removal
  // (not source mutation) keeps array length and x-values, so all integer
  // sample indices and identity-keyed memos stay valid. When nothing is
  // removed, `removeOutliers` returns the same array reference so downstream
  // memo identity is unchanged.
  let outlierMeta = { count: 0, regions: [], outlierPoints: [] };
  if (params.handleOutliers) {
    const outlierResult = memo(
      "removeOutliers",
      [id(processed), params.outlierSensitivity ?? 1.5],
      () =>
        perf.time("removeOutliers", () =>
          removeOutliers(processed, {
            sensitivity: params.outlierSensitivity ?? 1.5,
          })
        )
    );
    processed = outlierResult.cleanedSignal;
    outlierMeta = {
      count: outlierResult.regions.length,
      regions: outlierResult.regions,
      outlierPoints: outlierResult.outlierPoints,
    };
  }

  // 2. Apply trend flattening (before smoothing/detection). Outliers are
  // included in trend flattening — the `rollingMinMedian` tracker naturally
  // ignores tall peaks (they're never among the K smallest in any window) so
  // their presence doesn't bias the baseline.
  let processedForDetection = processed;
  // Snapshot of the signal BEFORE Savitzky-Golay smoothing (when SG is
  // enabled). Used as the noise reference for the noise-floor σ estimate
  // in detectSpikes — see step 4 below.
  let preSmoothingSignal = null;
  // ΔF/F₀ normalization outcome, surfaced on the result for the panel
  // readout + unit labeling. Default = not applied (native units).
  let normalizationMeta = {
    applied: false,
    thisWellFo: null,
    plateMedianFo: null,
    unitMode: UNIT_MODE.NATIVE,
    skipped: false,
  };

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

    // ΔF/F₀ normalization (the client's "detrend → F/Fo"). Runs right
    // after detrending so F₀ is the resting brightness and the detrended
    // signal is the ΔF numerator. F₀ comes from the RAW input signal
    // (median — robust to sparse spikes), NOT the detrended signal (which
    // is centered near zero). Detection then runs in ΔF/F₀ units, so the
    // subsequent outlier/smoothing steps (scale-invariant) operate on the
    // normalized signal. Gated independently but requires trend flattening
    // (the ΔF source); default OFF pending D1 sign-off — see
    // docs/neural-fofo-normalization-plan.md.
    //
    // Well-to-well rescale (client step 3): when `rescaleByMedianFo` is on
    // and the caller supplies the plate-wide `plateMedianFo` scalar, the
    // ΔF/F₀ fold-change is multiplied back up by it so peak height / AUC
    // land in a readable magnitude instead of a "little-bitty" ratio. The
    // plate median is a single scalar shared by every well, so it shifts
    // magnitude uniformly and never changes which peaks are detected
    // per-well. Computed across wells by the caller (NeuralResultsContext)
    // because the per-well pipeline has no plate view.
    if (params.neuralNormalizationEnabled && params.trendFlatteningEnabled) {
      // F₀ = median of the RAW signal over the user-defined baseline window
      // (plate-wide ratios → this well's sample indices). No window ratios
      // → whole-trace median (legacy fallback).
      const rawYs = rawSignal.map((p) => p.y);
      const fo = computeFo(
        rawYs,
        foWindowIndices(
          rawYs.length,
          params.foWindowStartRatio,
          params.foWindowEndRatio
        )
      );
      if (fo != null) {
        const detrended = processed;
        // Only rescale when a valid plate-median F₀ scalar is supplied;
        // otherwise emit the bare ΔF/F₀ fold-change. Derived outside the
        // memo so the unit label is correct on a cache hit too.
        const plateMedianFo =
          params.rescaleByMedianFo && isValidFo(params.plateMedianFo)
            ? params.plateMedianFo
            : null;
        const rescaled = plateMedianFo != null;
        processed = memo("normalize", [id(detrended), fo, plateMedianFo], () =>
          perf.time("normalize", () => {
            const { ys } = applyDeltaFOverFo(
              detrended.map((p) => p.y),
              fo,
              { medianFo: plateMedianFo }
            );
            return detrended.map((p, i) => ({ x: p.x, y: ys[i] }));
          })
        );
        processedForDetection = processed;
        normalizationMeta = {
          applied: true,
          thisWellFo: fo,
          plateMedianFo,
          unitMode: rescaled ? UNIT_MODE.DFF0_X_MEDIAN_FO : UNIT_MODE.DFF0,
          skipped: false,
        };
      } else {
        // No valid F₀ (empty/dead well) — leave the signal native and
        // report the skip rather than dividing by ~0.
        normalizationMeta = {
          applied: false,
          thisWellFo: null,
          plateMedianFo: null,
          unitMode: UNIT_MODE.NATIVE,
          skipped: true,
        };
      }
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

  // 4. Spike detection (on the outlier-cleaned signal)
  let spikeResults = [];
  // Hoisted outside the `if (runSpikeDetection)` block so the pipeline's
  // final return can read it whether detection runs or not. Empty Map
  // when detection didn't run; populated by detectSpikes and Gate-9
  // (activity threshold) demotion otherwise.
  let candidateDiagnostics = new Map();
  // Compact candidate-prominence histogram for the Distributions panel.
  // Empty (zero-bin) shape when detection didn't run; populated below
  // when it does. Lives in `candidateDistributions` to leave room for
  // future per-attribute histograms (amplitude, noise σ, …) the worker
  // may want to emit pre-binned.
  let candidateDistributions = {
    prominence: { edges: new Float32Array([0, 1]), counts: new Uint32Array([0]), max: 0 },
  };
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
    // Auto-center the baseline on the trace's noise: median = center of the
    // baseline noise (spikes are a minority, above it), robust σ scales the
    // manual offset. Uses the SAME computeSignalStats the chart uses, so the
    // value detection measures widths/AUC to matches the on-chart line
    // exactly. Computed outside the memo so the cache key stays a simple
    // primitive (`baselineY`).
    let baselineY = null;
    if (
      params.baselineThresholdEnabled &&
      typeof params.baselineThresholdOffset === "number" &&
      processed.length > 0
    ) {
      const { medianY, robustStd } = computeSignalStats(processed);
      if (isFinite(medianY) && isFinite(robustStd)) {
        baselineY = medianY + params.baselineThresholdOffset * robustStd;
      }
    }

    // Memo wraps both the kept spikes and the diagnostic Map together
    // so the candidate-overlay data stays cache-coherent with the spike
    // array. Without bundling, a cache hit would return the spikes but
    // not the diagnostics (the Map would be empty on a cached run).
    // Prominence may be given as a FRACTION of the detection signal's
    // range (params.spikeProminenceRelative), so it stays meaningful when
    // units change — native ~thousands vs ΔF/F₀ ~0.2. The UI uses relative;
    // the pipeline default is absolute (back-compat for direct callers and
    // tests). When relative, convert using the range of the signal
    // detection runs on (computeSignalStats is WeakMap-cached → free).
    // Clamp to [0,1] so a stale absolute value just means "≥ full envelope"
    // (≈ no peaks) instead of exploding.
    let absoluteProminence = params.spikeProminence;
    if (params.spikeProminenceRelative) {
      const promFraction = Math.min(
        Math.max(params.spikeProminence ?? 0, 0),
        1
      );
      const detStats =
        processedForDetection.length > 0
          ? computeSignalStats(processedForDetection)
          : null;
      const detSignalRange = detStats ? detStats.signalRange : 0;
      // Floor the bar at PROM_SIGMA_FLOOR robust σ so a flat/noisy trace
      // (range ≈ noise band) can't collapse it and flood detection with
      // noise wiggles. On a real trace `promFraction × range` dominates,
      // so the floor never binds and no true events are dropped.
      const sigmaFloor =
        detStats && isFinite(detStats.robustStd)
          ? PROM_SIGMA_FLOOR * detStats.robustStd
          : 0;
      absoluteProminence = Math.max(promFraction * detSignalRange, sigmaFloor);
    }

    const detectResult = memo(
      "detectSpikes",
      [
        id(processedForDetection),
        id(preSmoothingSignal),
        id(localStds),
        absoluteProminence,
        params.spikeWindow,
        params.spikeMinWidth,
        params.spikeMinDistance,
        params.spikeMinProminenceRatio,
        params.stdMultiplier,
        params.noiseFloorMultiplier,
        baselineY,
      ],
      () =>
        perf.time("detectSpikes", () => {
          const diag = new Map();
          // Collect every local maximum's detection prominence so we
          // can bin into a histogram. Distinct from the diagnostics Map
          // (which is capped at 1500 records sorted by prominence and
          // would therefore over-represent the high tail). This array
          // is unbiased and released immediately after binning below.
          const candProms = [];
          const spikes = detectSpikes(processedForDetection, {
            prominence: absoluteProminence,
            window: params.spikeWindow,
            minWidth: params.spikeMinWidth,
            minDistance: params.spikeMinDistance,
            minProminenceRatio: params.spikeMinProminenceRatio,
            stdMultiplier: params.stdMultiplier,
            noiseFloorMultiplier: params.noiseFloorMultiplier,
            noiseReference: preSmoothingSignal,
            localStds,
            diagnostics: diag,
            candidateProminencesOut: candProms,
            useBaselineForBases: baselineY !== null,
            baselineY: baselineY ?? undefined,
          });
          // Bin the raw prominences into 50 linear bins between 0 and
          // max. Compact wire form: ~600 B for the binEdges + counts
          // pair regardless of how many candidates there were.
          const prominenceHistogram = binLinearProminences(candProms, 50);
          return {
            spikes,
            diagnostics: diag,
            distributions: { prominence: prominenceHistogram },
          };
        })
    );
    spikeResults = detectResult.spikes;
    candidateDiagnostics = detectResult.diagnostics;
    candidateDistributions = detectResult.distributions;

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
    candidateDistributions,
    normalization: normalizationMeta,
    outlierRemoval: outlierMeta,
  };
}

// --- End Pipeline ---
