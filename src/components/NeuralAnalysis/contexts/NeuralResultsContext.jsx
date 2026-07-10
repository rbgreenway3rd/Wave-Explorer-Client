import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataContext } from "../../../providers/DataProvider";
import {
  makePipelineRunner,
  makePlateRangeRunner,
  PIPELINE_STALE,
} from "../utilities/pipelineRunner";
import {
  computeControlScaleFactor,
  scaleReportedMetrics,
} from "../utilities/neuralReportBuilder/controlScaling";
import { plateMedianFoFromWells } from "../utilities/neuralNormalization";
import { excludeWellsById } from "../utilities/neuralWellExclusion";
import { useNeuralSelection } from "./NeuralSelectionContext";
import { useNeuralSettings } from "./NeuralSettingsContext";

/**
 * NeuralResultsContext — single source of truth for the pipeline output.
 *
 * Two layers:
 *
 *   1. effective spike params — the plate-wide settings values. Spike
 *      prominence/window are global parameters the user sets once; they
 *      do not change when switching wells.
 *
 *   2. pipelineResults — driven by an async pipelineRunner. The runner
 *      yields to the browser before computing so the slider release
 *      paints before the pipeline blocks; rapid drags coalesce because
 *      stale runs bail before paying the compute cost.
 *
 * Exposed as read-only `pipelineResults`, shaped {processedSignal,
 * spikeResults, burstResults, metrics}. NeuralGraph and NeuralResults
 * subscribe here; nothing writes to it.
 */

export const NeuralResultsContext = createContext(null);

const EMPTY_RESULTS = Object.freeze({
  processedSignal: [],
  spikeResults: [],
  burstResults: [],
  metrics: {},
  candidateDiagnostics: Object.freeze({
    records: [],
    truncatedCount: 0,
    totalCandidates: 0,
  }),
  candidateDistributions: Object.freeze({
    prominence: Object.freeze({
      edges: new Float32Array([0, 1]),
      counts: new Uint32Array([0]),
      max: 0,
    }),
  }),
  outlierRemoval: Object.freeze({ count: 0, regions: [], outlierPoints: [] }),
});

export const useNeuralResults = () => {
  const ctx = useContext(NeuralResultsContext);
  if (!ctx) {
    throw new Error(
      "useNeuralResults must be used inside <NeuralResultsProvider>"
    );
  }
  return ctx;
};

export const NeuralResultsProvider = ({ children }) => {
  const { selectedWell, controlWell, controlWellSet, foExcludedWellSet } =
    useNeuralSelection();
  const {
    controlScalingEnabled,
    neuralNormalizationEnabled,
    neuralRescaleByMedianFo,
    foWindowEnabled,
    foWindowStartRatio,
    foWindowEndRatio,
    foExclusionEnabled,
    spikeProminence,
    spikeWindow,
    spikeMinDistance,
    stdMultiplier,
    noiseFloorMultiplier,
    spikeMinWidth,
    spikeMinProminenceRatio,
    noiseWindowSize,
    activityThresholdRatio,
    activityThresholdEnabled,
    baselineThresholdOffset,
    baselineThresholdEnabled,
    noiseSuppressionActive,
    smoothingEnabled,
    smoothingWindow,
    subtractControl,
    baselineCorrection,
    trendFlatteningEnabled,
    trendFlatteningWindow,
    trendFlatteningMinimums,
    handleOutliers,
    outlierSensitivity,
    showBursts,
    maxInterSpikeInterval,
    minSpikesPerBurst,
    yScaleMode,
  } = useNeuralSettings();
  // DataContext provides the full plate (`wellArrays`) — needed for the
  // plate-wide median F₀ that the well-to-well rescale multiplies by. The
  // selected/control well objects carry their own materialized signal; the
  // plate list is used only for the F₀ prepass below.
  const { wellArrays } = useContext(DataContext);

  // Signal-data tokens. The filter pipeline mutates an indicator's
  // typed arrays *in place* (filterPack.js → setFilteredTypedArrays),
  // so the Well object reference doesn't change when a filter writes
  // new data. The Float64Array reference does. Memos and effects that
  // need to re-run when the underlying signal changes must depend on
  // these tokens, not on `selectedWell` / `controlWell` alone — otherwise
  // detection runs against the pre-filter signal after a filter pass.
  const selectedSignalRef = selectedWell?.indicators?.[0]?.filteredYs;
  const controlSignalRef = controlWell?.indicators?.[0]?.filteredYs;

  // ---- F/Fo well exclusion ----------------------------------------------
  // Wells the user drops from the two plate-wide pooled computations (the
  // F₀ median below and the Universal y-scale sweep further down) so flat/
  // dim edge wells can't skew the normalization or stretch the shared axis.
  // Matched by id (robust to wellArrays being rebuilt after a filter run).
  // Only active when the feature toggle AND normalization are both on.
  const foExclusionActive =
    foExclusionEnabled && neuralNormalizationEnabled && foExcludedWellSet.length > 0;
  const foExcludedIds = useMemo(
    () => new Set((foExcludedWellSet || []).map((w) => w.id)),
    [foExcludedWellSet]
  );
  // Stable membership key so effects/memos don't refire on unrelated renders.
  const foExcludedKey = useMemo(
    () =>
      (foExcludedWellSet || [])
        .map((w) => w.id)
        .sort()
        .join(","),
    [foExcludedWellSet]
  );
  // The plate list with excluded wells removed — the single input both the
  // F₀ median and the Universal sweep pool over. When inactive it's the
  // untouched wellArrays reference (no filtering cost, no new identity).
  const wellsForPlate = useMemo(
    () =>
      foExclusionActive
        ? excludeWellsById(wellArrays, foExcludedIds)
        : wellArrays,
    [foExclusionActive, wellArrays, foExcludedIds]
  );

  // ---- Plate-wide median F₀ (well-to-well rescale) ----------------------
  // The client's "median Fo across the whole plate" — the scalar the ΔF/F₀
  // fold-change is multiplied back up by so peak height / AUC read in a
  // sensible magnitude. Reads each well's raw typed array (`rawYs`)
  // directly; it never calls materializeRawData(), which would cache an
  // {x,y}[] per well and recreate the full-plate OOM pattern. F₀ depends
  // only on the raw signal (and, in Phase 2, a quiet Fo window) — not on
  // any detection param — so it's memoized on the plate identity and
  // recomputed only when the data changes or normalization toggles on.
  // Wells with no valid (≤0 / empty) F₀ are excluded from the median and
  // counted for the panel readout (computePlateMedianFo).
  const { medianFo: plateMedianFo, skippedCount: plateSkippedFoCount } =
    useMemo(() => {
      if (!neuralNormalizationEnabled) {
        return { medianFo: null, validCount: 0, skippedCount: 0 };
      }
      // Window off → whole-trace median F₀ (pass no ratios). Excluded wells
      // (wellsForPlate) are already filtered out so they don't drag the median.
      return plateMedianFoFromWells(
        wellsForPlate,
        foWindowEnabled
          ? { startRatio: foWindowStartRatio, endRatio: foWindowEndRatio }
          : {}
      );
    }, [
      wellsForPlate,
      neuralNormalizationEnabled,
      foWindowEnabled,
      foWindowStartRatio,
      foWindowEndRatio,
    ]);

  // ---- Effective spike params -------------------------------------------
  // Spike prominence/window are plate-wide global parameters, like every
  // other detection setting. The user sets them once and they apply to
  // every well; switching wells never changes them. (Per-well auto-
  // suggestion was removed — it caused parameters to silently drift
  // between wells.)
  const effectiveSpikeProminence = spikeProminence;
  const effectiveSpikeWindow = spikeWindow;

  // ---- Shared pipeline params -------------------------------------------
  // One source of truth for the detection params, so the live selected-well
  // run and the control-set scale-factor computation detect identically.
  const pipelineParams = useMemo(
    () => ({
      subtractControl,
      trendFlatteningEnabled,
      trendFlatteningWindow,
      trendFlatteningMinimums,
      baselineCorrection,
      smoothingEnabled,
      smoothingWindow,
      handleOutliers,
      outlierSensitivity,
      spikeProminence: effectiveSpikeProminence,
      // Prominence is a fraction of signal range; the pipeline converts it
      // to absolute per-run so detection is scale-invariant.
      spikeProminenceRelative: true,
      spikeWindow: effectiveSpikeWindow,
      spikeMinWidth,
      spikeMinDistance,
      spikeMinProminenceRatio,
      stdMultiplier,
      noiseFloorMultiplier,
      noiseWindowSize,
      activityThresholdRatio,
      activityThresholdEnabled,
      baselineThresholdOffset,
      baselineThresholdEnabled,
      maxInterSpikeInterval,
      minSpikesPerBurst,
      neuralNormalizationEnabled,
      // Well-to-well rescale: only active when normalization is on AND the
      // user keeps the rescale toggle on AND a valid plate median exists.
      // The pipeline guards isValidFo, but gating here keeps params honest.
      rescaleByMedianFo: neuralNormalizationEnabled && neuralRescaleByMedianFo,
      plateMedianFo,
      // Baseline (Fo) window ratios — the pipeline converts them to this
      // well's sample indices when computing F₀. When the window is off,
      // pass no ratios so F₀ falls back to the whole-trace median.
      foWindowStartRatio: foWindowEnabled ? foWindowStartRatio : undefined,
      foWindowEndRatio: foWindowEnabled ? foWindowEndRatio : undefined,
    }),
    [
      subtractControl,
      trendFlatteningEnabled,
      trendFlatteningWindow,
      trendFlatteningMinimums,
      baselineCorrection,
      smoothingEnabled,
      smoothingWindow,
      handleOutliers,
      outlierSensitivity,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
      spikeMinWidth,
      spikeMinDistance,
      spikeMinProminenceRatio,
      stdMultiplier,
      noiseFloorMultiplier,
      noiseWindowSize,
      activityThresholdRatio,
      activityThresholdEnabled,
      baselineThresholdOffset,
      baselineThresholdEnabled,
      maxInterSpikeInterval,
      minSpikesPerBurst,
      neuralNormalizationEnabled,
      neuralRescaleByMedianFo,
      plateMedianFo,
      foWindowEnabled,
      foWindowStartRatio,
      foWindowEndRatio,
    ]
  );

  // ---- Pipeline runner (worker-backed, stale-aware) ---------------------
  const runnerRef = useRef(null);
  if (runnerRef.current === null) {
    runnerRef.current = makePipelineRunner();
  }
  // Separate worker for the Universal (whole-plate) y-scale sweep, so a
  // multi-second plate range calc never blocks the per-well chart worker.
  const plateRangeRunnerRef = useRef(null);
  if (plateRangeRunnerRef.current === null) {
    plateRangeRunnerRef.current = makePlateRangeRunner();
  }
  // Tear down the workers when the provider unmounts (e.g. user closes
  // the modal entirely — though under the current modal lifecycle the
  // provider stays mounted with the navbar; the dispose still matters
  // for HMR and future use).
  useEffect(() => {
    const runner = runnerRef.current;
    const plateRunner = plateRangeRunnerRef.current;
    return () => {
      if (runner && typeof runner.dispose === "function") runner.dispose();
      if (plateRunner && typeof plateRunner.dispose === "function")
        plateRunner.dispose();
    };
  }, []);
  const [pipelineResults, setPipelineResults] = useState(EMPTY_RESULTS);
  // Compute-state flags surfaced to the UI (spinners + busy cursor).
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isPlateRangeComputing, setIsPlateRangeComputing] = useState(false);

  useEffect(() => {
    if (
      !selectedWell ||
      !selectedWell.indicators ||
      !selectedWell.indicators[0]
    ) {
      setPipelineResults(EMPTY_RESULTS);
      setIsPipelineRunning(false);
      return undefined;
    }

    // Materialize on demand for just the two wells the modal needs
    // (selected + optional control). filteredData {x,y}[] is empty
    // post-Phase C until materializeFilteredData() is called.
    // Source switch (D3): when ΔF/F₀ normalization is on, the neural
    // pipeline owns detrend → F/Fo and must start from the RAW signal —
    // feeding it the already-F/Fo'd filtered signal would double-apply
    // the ratio. When off, keep today's filtered-data path exactly.
    // materializeRawData/FilteredData are per-well lazy; fine for the 1-2
    // wells the modal needs (the full-plate path uses a no-cache helper —
    // see docs/neural-fofo-normalization-plan.md §4c).
    const materializeSignal = (ind) => {
      if (!ind) return [];
      if (neuralNormalizationEnabled) {
        return typeof ind.materializeRawData === "function"
          ? ind.materializeRawData()
          : ind.rawData || [];
      }
      return typeof ind.materializeFilteredData === "function"
        ? ind.materializeFilteredData()
        : ind.filteredData || [];
    };
    const selectedFilteredData = materializeSignal(selectedWell.indicators[0]);
    const controlFilteredData =
      controlWell && controlWell.indicators && controlWell.indicators[0]
        ? materializeSignal(controlWell.indicators[0])
        : [];

    let active = true;
    setIsPipelineRunning(true);
    runnerRef.current
      .run({
        rawSignal: selectedFilteredData,
        controlSignal: controlFilteredData,
        params: pipelineParams,
        analysis: {
          runSpikeDetection: true,
          runBurstDetection: showBursts,
        },
        noiseSuppressionActive,
      })
      .then((result) => {
        if (!active) return;
        // A stale result means a newer run() is already in flight; leave the
        // running flag set — that newer run will clear it when it lands.
        if (result === PIPELINE_STALE) return;
        setPipelineResults(result);
        setIsPipelineRunning(false);
      })
      .catch(() => {
        if (active) setIsPipelineRunning(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedWell,
    selectedSignalRef,
    controlWell,
    controlSignalRef,
    pipelineParams,
    showBursts,
    noiseSuppressionActive,
  ]);

  // ---- Universal (whole-plate) y-scale range ----------------------------
  // When the Y-Scale toggle is "all" (Universal/Absolute), the chart's y-axis
  // is fixed to the range of the PROCESSED signal across EVERY well, so well
  // amplitudes are directly comparable. That range isn't precomputed anywhere
  // (it depends on the neural pipeline: detrend / ΔF/F₀ / smoothing / outlier),
  // so the pipeline runs per well with detection OFF. Three things keep this
  // from being felt as lag:
  //   1. CACHED by the processing params (plateScaleKey) in a ref — toggling
  //      Relative↔Universal, or leaving and re-entering with the same params,
  //      reuses the result instantly. Only a genuine processing-param change
  //      recomputes.
  //   2. OFF THE MAIN THREAD — the whole-plate sweep runs in a dedicated
  //      Web Worker (plateRange.worker.js), so the modal never freezes; the
  //      chart shows the relative fit until the range lands. isPlateRangeComputing
  //      drives the spinner while it's in flight.
  //   3. NO per-well {x,y}[] materialization — each well is flattened straight
  //      into transferable Float64Arrays from its canonical typed arrays (never
  //      touching materializeFilteredData, which caches on the indicator and
  //      would OOM a big plate).
  const [plateProcessedYRange, setPlateProcessedYRange] = useState(null);
  const plateRangeCacheRef = useRef({ key: null, range: null });
  const plateScaleKey = useMemo(
    () =>
      JSON.stringify({
        subtractControl: pipelineParams.subtractControl,
        tf: pipelineParams.trendFlatteningEnabled,
        tfw: pipelineParams.trendFlatteningWindow,
        tfm: pipelineParams.trendFlatteningMinimums,
        bc: pipelineParams.baselineCorrection,
        sm: pipelineParams.smoothingEnabled,
        smw: pipelineParams.smoothingWindow,
        ho: pipelineParams.handleOutliers,
        os: pipelineParams.outlierSensitivity,
        nn: pipelineParams.neuralNormalizationEnabled,
        rs: pipelineParams.rescaleByMedianFo,
        pmf: pipelineParams.plateMedianFo,
        fws: pipelineParams.foWindowStartRatio,
        fwe: pipelineParams.foWindowEndRatio,
        // Excluded wells drop out of the sweep too — key on membership so
        // toggling exclusions invalidates the cached range even when the
        // median F₀ didn't move (e.g. rescale off).
        fex: foExclusionActive ? foExcludedKey : "",
        nsa: noiseSuppressionActive,
      }),
    [pipelineParams, noiseSuppressionActive, foExclusionActive, foExcludedKey]
  );
  useEffect(() => {
    if (
      yScaleMode !== "all" ||
      !Array.isArray(wellArrays) ||
      wellArrays.length === 0
    ) {
      return undefined; // keep the cached range; Relative simply ignores it
    }
    // Cache hit → reuse instantly (the common Relative↔Universal toggle path).
    if (
      plateRangeCacheRef.current.key === plateScaleKey &&
      plateRangeCacheRef.current.range
    ) {
      setPlateProcessedYRange(plateRangeCacheRef.current.range);
      return undefined;
    }
    let active = true;
    // Flatten each indicator's canonical typed arrays into fresh, transferable
    // Float64Arrays. No {x,y}[] is materialized on the main thread — the worker
    // rebuilds points on its side. Copy into new arrays so transferring the
    // buffers to the worker doesn't detach the indicators' own data.
    const useRaw = !!pipelineParams.neuralNormalizationEnabled;
    const flatten = (ind) => {
      if (!ind) return null;
      const xs = useRaw ? ind.rawXs : ind.filteredXs;
      const ys = useRaw ? ind.rawYs : ind.filteredYs;
      if (!xs || !ys || ys.length === 0) return null;
      return { xs: Float64Array.from(xs), ys: Float64Array.from(ys) };
    };
    // wellsForPlate has F/Fo-excluded wells already removed, so a flat/dim
    // edge well can't stretch the Universal (whole-plate) y-axis either.
    const wells = [];
    for (const well of wellsForPlate) {
      const flat = flatten(well?.indicators?.[0]);
      if (flat) wells.push(flat);
    }
    if (wells.length === 0) return undefined;
    const control =
      flatten(controlWell?.indicators?.[0]) || {
        xs: new Float64Array(0),
        ys: new Float64Array(0),
      };

    setIsPlateRangeComputing(true);
    plateRangeRunnerRef.current
      .run({
        wells,
        control,
        params: pipelineParams,
        noiseSuppressionActive,
      })
      .then((result) => {
        if (!active) return;
        // Stale result → a newer run is already in flight; it clears the flag.
        if (result === PIPELINE_STALE) return;
        if (
          result &&
          isFinite(result.min) &&
          isFinite(result.max) &&
          result.max > result.min
        ) {
          const range = { min: result.min, max: result.max };
          plateRangeCacheRef.current = { key: plateScaleKey, range };
          setPlateProcessedYRange(range);
        }
        setIsPlateRangeComputing(false);
      })
      .catch(() => {
        if (active) setIsPlateRangeComputing(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yScaleMode, wellArrays, controlSignalRef, plateScaleKey]);

  // ---- Control-well scaling factor (k = 100 / control median peak) ------
  // Computed off the render path. Detects each control well with the SAME
  // params, takes its median peak height, then the median of those (see
  // computeControlScaleFactor). Only runs when scaling is enabled and a
  // control set exists; control sets are small, so the synchronous detection
  // is acceptable (mirrors the synchronous full-plate report loop).
  const [controlScale, setControlScale] = useState({
    controlMedian: null,
    k: null,
  });

  // Stable membership key so the effect doesn't refire on unrelated renders.
  const controlSetKey = useMemo(
    () => (controlWellSet || []).map((w) => w.id).join(","),
    [controlWellSet]
  );

  useEffect(() => {
    if (
      !controlScalingEnabled ||
      !controlWellSet ||
      controlWellSet.length === 0
    ) {
      setControlScale({ controlMedian: null, k: null });
      return;
    }
    // Match the selected-well source: raw when normalization is on (the
    // control-set pipeline also normalizes), else filtered.
    const controlInd =
      controlWell && controlWell.indicators && controlWell.indicators[0];
    const controlFilteredData = !controlInd
      ? []
      : neuralNormalizationEnabled
      ? (typeof controlInd.materializeRawData === "function"
          ? controlInd.materializeRawData()
          : controlInd.rawData) || []
      : (typeof controlInd.materializeFilteredData === "function"
          ? controlInd.materializeFilteredData()
          : controlInd.filteredData) || [];
    const { controlMedian, k } = computeControlScaleFactor(controlWellSet, {
      params: pipelineParams,
      controlSignal: controlFilteredData,
      noiseSuppressionActive,
    });
    setControlScale({ controlMedian, k });
    // controlSetKey captures membership; per-control-well signal tokens are
    // omitted for simplicity (recompute on set / params / control changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    controlScalingEnabled,
    controlSetKey,
    pipelineParams,
    controlWell,
    controlSignalRef,
    noiseSuppressionActive,
  ]);

  const controlScalingActive =
    controlScalingEnabled &&
    typeof controlScale.k === "number" &&
    Number.isFinite(controlScale.k);

  // Control-scaled view when scaling is active. Only the reported
  // magnitude NUMBERS (amplitude / AUC + aggregates) are scaled to "% of
  // control"; the signal + coordinates stay native so the graph's y-axis
  // and peak markers don't move when k changes (k is recomputed from the
  // control wells' detection, which depends on prominence — scaling the
  // signal made the axis lurch while tuning). See scaleReportedMetrics.
  const displayedResults = useMemo(
    () =>
      controlScalingActive
        ? scaleReportedMetrics(pipelineResults, controlScale.k)
        : pipelineResults,
    [controlScalingActive, pipelineResults, controlScale.k]
  );

  // Prominence is a FRACTION of the signal range (scale-invariant). The
  // pipeline converts it to absolute per-run for detection. For the
  // parameter overlay — which draws the threshold line in signal units —
  // expose the absolute value (fraction × signalRange). One-cycle lag off
  // the latest signalRange is fine; the overlay is opt-in.
  const effectiveSpikeProminenceAbs =
    effectiveSpikeProminence * (pipelineResults?.metrics?.signalRange || 0);

  const value = useMemo(
    () => ({
      pipelineResults: displayedResults,
      effectiveSpikeProminence,
      effectiveSpikeProminenceAbs,
      effectiveSpikeWindow,
      controlScalingActive,
      controlScaleFactor: controlScale.k,
      controlMedianPeakHeight: controlScale.controlMedian,
      // Plate-wide F₀ readouts for the normalization panel: the scalar the
      // rescale multiplies by, and how many wells were skipped for an
      // invalid F₀ (empty/dead). Null/0 when normalization is off.
      plateMedianFo,
      plateSkippedFoCount,
      // Whole-plate processed y-range for Universal scale mode; null when
      // Relative (or not yet computed).
      plateProcessedYRange,
      // Compute-state flags for loading spinners + busy cursor. Selected-well
      // pipeline (chart) and the Universal whole-plate sweep, respectively.
      isPipelineRunning,
      isPlateRangeComputing,
    }),
    [
      displayedResults,
      effectiveSpikeProminence,
      effectiveSpikeProminenceAbs,
      effectiveSpikeWindow,
      controlScalingActive,
      controlScale.k,
      controlScale.controlMedian,
      plateMedianFo,
      plateSkippedFoCount,
      plateProcessedYRange,
      isPipelineRunning,
      isPlateRangeComputing,
    ]
  );

  return (
    <NeuralResultsContext.Provider value={value}>
      {children}
    </NeuralResultsContext.Provider>
  );
};
