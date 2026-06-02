import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataContext } from "../../../providers/DataProvider";
import { suggestSpikeParameters } from "../utilities/parameterSuggestions";
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
 *   1. effective spike params — synchronous useMemo. Picks the user
 *      override OR a signal-derived auto-suggestion. Cheap.
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
    spikeParamsOverrideActive,
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

  // ---- Suggested spike params (signal-derived, override-independent) ----
  // Always-computed auto-suggestion for the currently selected well.
  // Exposed alongside the effective values so consumers (e.g. the
  // SpikeDetectionControls slider) can size their range to the
  // suggestion regardless of whether the user has overridden it.
  const suggestedSpikeParams = useMemo(() => {
    if (!selectedWell?.indicators?.[0]) {
      return { prominence: null, window: null, diagnostics: null };
    }
    const ind = selectedWell.indicators[0];
    const rawSignal =
      typeof ind.materializeFilteredData === "function"
        ? ind.materializeFilteredData()
        : ind.filteredData;
    if (!rawSignal || rawSignal.length === 0) {
      return { prominence: null, window: null, diagnostics: null };
    }
    const bundle = suggestSpikeParameters(rawSignal);
    return {
      prominence: bundle.prominence.value,
      window: bundle.window.value,
      diagnostics: bundle,
    };
  }, [selectedWell]);

  // ---- Effective spike params -------------------------------------------
  // Plate-wide manual-override model: when `spikeParamsOverrideActive`
  // is true the user-set values apply to every well; otherwise the
  // per-well auto-suggestion takes over. This matches the (already
  // plate-wide) behavior of every other detection parameter. Switching
  // wells no longer evaporates the user's tunings.
  const { effectiveSpikeProminence, effectiveSpikeWindow } = useMemo(() => {
    if (spikeParamsOverrideActive) {
      return {
        effectiveSpikeProminence: spikeProminence,
        effectiveSpikeWindow: spikeWindow,
      };
    }
    return {
      effectiveSpikeProminence:
        suggestedSpikeParams.prominence ?? spikeProminence,
      effectiveSpikeWindow: suggestedSpikeParams.window ?? spikeWindow,
    };
  }, [
    spikeParamsOverrideActive,
    spikeProminence,
    spikeWindow,
    suggestedSpikeParams,
  ]);

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
    controlWell,
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
      // Raw signal-derived suggestions, exposed so the prominence
      // slider can size its range to the suggestion (which can exceed
      // 2,000 on noisy wells) regardless of any user override.
      suggestedSpikeProminence: suggestedSpikeParams.prominence,
      suggestedSpikeWindow: suggestedSpikeParams.window,
      // Full diagnostic envelope from the auto-suggester. UI consumers
      // (the slider auto/manual hint) read `.prominence.method` from
      // here to surface which Otsu path fired per well.
      suggestedSpikeDiagnostics: suggestedSpikeParams.diagnostics,
    }),
    [
      pipelineResults,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
      suggestedSpikeParams,
    ]
  );

  return (
    <NeuralResultsContext.Provider value={value}>
      {children}
    </NeuralResultsContext.Provider>
  );
};
