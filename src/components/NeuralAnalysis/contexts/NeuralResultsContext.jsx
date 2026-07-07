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
  PIPELINE_STALE,
} from "../utilities/pipelineRunner";
import {
  computeControlScaleFactor,
  scaleReportedMetrics,
} from "../utilities/neuralReportBuilder/controlScaling";
import { plateMedianFoFromWells } from "../utilities/neuralNormalization";
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
  const { selectedWell, controlWell, controlWellSet } = useNeuralSelection();
  const {
    controlScalingEnabled,
    neuralNormalizationEnabled,
    neuralRescaleByMedianFo,
    foWindowEnabled,
    foWindowStartRatio,
    foWindowEndRatio,
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
      // Window off → whole-trace median F₀ (pass no ratios).
      return plateMedianFoFromWells(
        wellArrays,
        foWindowEnabled
          ? { startRatio: foWindowStartRatio, endRatio: foWindowEndRatio }
          : {}
      );
    }, [
      wellArrays,
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
  // Tear down the worker when the provider unmounts (e.g. user closes
  // the modal entirely — though under the current modal lifecycle the
  // provider stays mounted with the navbar; the dispose still matters
  // for HMR and future use).
  useEffect(() => {
    const runner = runnerRef.current;
    return () => {
      if (runner && typeof runner.dispose === "function") runner.dispose();
    };
  }, []);
  const [pipelineResults, setPipelineResults] = useState(EMPTY_RESULTS);

  useEffect(() => {
    if (
      !selectedWell ||
      !selectedWell.indicators ||
      !selectedWell.indicators[0]
    ) {
      setPipelineResults(EMPTY_RESULTS);
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
        if (result === PIPELINE_STALE) return;
        setPipelineResults(result);
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
    ]
  );

  return (
    <NeuralResultsContext.Provider value={value}>
      {children}
    </NeuralResultsContext.Provider>
  );
};
