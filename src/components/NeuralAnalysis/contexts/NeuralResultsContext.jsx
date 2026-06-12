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
  const { selectedWell, controlWell } = useNeuralSelection();
  const {
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
    baselineThresholdRatio,
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
    outlierPercentile,
    outlierMultiplier,
    showBursts,
    maxInterSpikeInterval,
    minSpikesPerBurst,
  } = useNeuralSettings();
  // DataContext exposes nothing the pipeline needs directly — the
  // selected/control well objects already carry the materialized signal.
  // Subscribed only so future read needs (e.g., extractedIndicatorTimes
  // for x-axis bounds) require no further plumbing.
  useContext(DataContext);

  // Signal-data tokens. The filter pipeline mutates an indicator's
  // typed arrays *in place* (filterPack.js → setFilteredTypedArrays),
  // so the Well object reference doesn't change when a filter writes
  // new data. The Float64Array reference does. Memos and effects that
  // need to re-run when the underlying signal changes must depend on
  // these tokens, not on `selectedWell` / `controlWell` alone — otherwise
  // detection runs against the pre-filter signal after a filter pass.
  const selectedSignalRef = selectedWell?.indicators?.[0]?.filteredYs;
  const controlSignalRef = controlWell?.indicators?.[0]?.filteredYs;

  // ---- Effective spike params -------------------------------------------
  // Spike prominence/window are plate-wide global parameters, like every
  // other detection setting. The user sets them once and they apply to
  // every well; switching wells never changes them. (Per-well auto-
  // suggestion was removed — it caused parameters to silently drift
  // between wells.)
  const effectiveSpikeProminence = spikeProminence;
  const effectiveSpikeWindow = spikeWindow;

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
    const selectedFilteredData =
      typeof selectedWell.indicators[0].materializeFilteredData === "function"
        ? selectedWell.indicators[0].materializeFilteredData()
        : selectedWell.indicators[0].filteredData;
    const controlFilteredData =
      controlWell && controlWell.indicators && controlWell.indicators[0]
        ? typeof controlWell.indicators[0].materializeFilteredData === "function"
          ? controlWell.indicators[0].materializeFilteredData()
          : controlWell.indicators[0].filteredData
        : [];

    let active = true;
    runnerRef.current
      .run({
        rawSignal: selectedFilteredData,
        controlSignal: controlFilteredData,
        params: {
          subtractControl,
          trendFlatteningEnabled,
          trendFlatteningWindow,
          trendFlatteningMinimums,
          baselineCorrection,
          smoothingEnabled,
          smoothingWindow,
          handleOutliers,
          outlierPercentile,
          outlierMultiplier,
          spikeProminence: effectiveSpikeProminence,
          spikeWindow: effectiveSpikeWindow,
          spikeMinWidth,
          spikeMinDistance,
          spikeMinProminenceRatio,
          stdMultiplier,
          noiseFloorMultiplier,
          noiseWindowSize,
          activityThresholdRatio,
          activityThresholdEnabled,
          baselineThresholdRatio,
          baselineThresholdEnabled,
          maxInterSpikeInterval,
          minSpikesPerBurst,
        },
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
    subtractControl,
    trendFlatteningEnabled,
    trendFlatteningWindow,
    trendFlatteningMinimums,
    baselineCorrection,
    smoothingEnabled,
    smoothingWindow,
    handleOutliers,
    outlierPercentile,
    outlierMultiplier,
    effectiveSpikeProminence,
    effectiveSpikeWindow,
    spikeMinDistance,
    stdMultiplier,
    noiseFloorMultiplier,
    spikeMinWidth,
    spikeMinProminenceRatio,
    noiseWindowSize,
    activityThresholdRatio,
    activityThresholdEnabled,
    baselineThresholdRatio,
    baselineThresholdEnabled,
    showBursts,
    noiseSuppressionActive,
    maxInterSpikeInterval,
    minSpikesPerBurst,
  ]);

  const value = useMemo(
    () => ({
      pipelineResults,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
    }),
    [pipelineResults, effectiveSpikeProminence, effectiveSpikeWindow]
  );

  return (
    <NeuralResultsContext.Provider value={value}>
      {children}
    </NeuralResultsContext.Provider>
  );
};
