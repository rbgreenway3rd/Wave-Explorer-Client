import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNeuralSelection } from "./NeuralSelectionContext";

/**
 * NeuralSettingsContext — owns every analysis parameter the user can
 * adjust (spike, noise, outlier, burst, decimation, plus the legacy
 * useAdjustedBases / findPeaksWindowWidth / peakProminence triplet
 * threaded through to NeuralGraph).
 *
 * The pipeline (NeuralResultsContext) reads from here, but the chart
 * (NeuralGraph) and the results table (NeuralResults) do NOT. That's the
 * whole point of the split: dragging a slider re-renders the control
 * panels and re-runs the pipeline, but the chart canvas only re-renders
 * when the pipeline output actually changes.
 *
 * Spike-param overrides: handleSpikeProminenceChange / handleSpikeWindow
 * Change tag the override against the currently selected well's key.
 * NeuralResultsContext consumes that key, falling back to the auto-
 * suggestion when the active well changes.
 */

export const NeuralSettingsContext = createContext(null);

export const useNeuralSettings = () => {
  const ctx = useContext(NeuralSettingsContext);
  if (!ctx) {
    throw new Error(
      "useNeuralSettings must be used inside <NeuralSettingsProvider>"
    );
  }
  return ctx;
};

export const NeuralSettingsProvider = ({ children }) => {
  const { selectedWell } = useNeuralSelection();

  // ---- Spike detection params --------------------------------------------
  const [spikeProminence, setSpikeProminence] = useState(1);
  const [spikeWindow, setSpikeWindow] = useState(20);
  const [spikeThreshold, setSpikeThreshold] = useState(0);
  const [spikeMinDistance, setSpikeMinDistance] = useState(0);
  const [stdMultiplier, setStdMultiplier] = useState(1.0);
  // Tracks the well key the user has overridden spike params for. When
  // the selected well changes, the override no longer applies and the
  // effective values fall back to the auto-suggestion (computed in
  // NeuralResultsContext, where the raw signal is already accessible).
  const [spikeParamsOverrideForWellKey, setSpikeParamsOverrideForWellKey] =
    useState(null);

  const handleSpikeProminenceChange = useCallback(
    (val) => {
      setSpikeParamsOverrideForWellKey(selectedWell?.key ?? null);
      setSpikeProminence(val);
    },
    [selectedWell?.key]
  );
  const handleSpikeWindowChange = useCallback(
    (val) => {
      setSpikeParamsOverrideForWellKey(selectedWell?.key ?? null);
      setSpikeWindow(val);
    },
    [selectedWell?.key]
  );
  const handleResetSpikeParams = useCallback(() => {
    setSpikeParamsOverrideForWellKey(null);
  }, []);

  // ---- Noise / smoothing / baseline --------------------------------------
  const [noiseSuppressionActive, setNoiseSuppressionActive] = useState(true);
  const [smoothingWindow, setSmoothingWindow] = useState(5);
  const [subtractControl, setSubtractControl] = useState(false);
  const [filterBaseline, setFilterBaseline] = useState(false);
  const [baselineCorrection, setBaselineCorrection] = useState(false);
  const [trendFlatteningEnabled, setTrendFlatteningEnabled] = useState(true);

  // ---- Decimation --------------------------------------------------------
  const [decimationEnabled, setDecimationEnabled] = useState(false);
  const [decimationSamples, setDecimationSamples] = useState(200);

  // ---- Outlier detection -------------------------------------------------
  const [handleOutliers, setHandleOutliers] = useState(true);
  const [outlierPercentile, setOutlierPercentile] = useState(95);
  const [outlierMultiplier, setOutlierMultiplier] = useState(2.0);

  // ---- Burst detection ---------------------------------------------------
  const [showBursts, setShowBursts] = useState(false);
  const [maxInterSpikeInterval, setMaxInterSpikeInterval] = useState(50);
  const [minSpikesPerBurst, setMinSpikesPerBurst] = useState(3);

  // ---- Legacy spike-display tweaks consumed only by NeuralGraph ----------
  const [useAdjustedBases, setUseAdjustedBases] = useState(false);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(10);
  const [peakProminence, setPeakProminence] = useState(1);

  const value = useMemo(
    () => ({
      // spike
      spikeProminence,
      setSpikeProminence,
      spikeWindow,
      setSpikeWindow,
      spikeThreshold,
      setSpikeThreshold,
      spikeMinDistance,
      setSpikeMinDistance,
      stdMultiplier,
      setStdMultiplier,
      spikeParamsOverrideForWellKey,
      handleSpikeProminenceChange,
      handleSpikeWindowChange,
      handleResetSpikeParams,
      // noise / smoothing
      noiseSuppressionActive,
      setNoiseSuppressionActive,
      smoothingWindow,
      setSmoothingWindow,
      subtractControl,
      setSubtractControl,
      filterBaseline,
      setFilterBaseline,
      baselineCorrection,
      setBaselineCorrection,
      trendFlatteningEnabled,
      setTrendFlatteningEnabled,
      // decimation
      decimationEnabled,
      setDecimationEnabled,
      decimationSamples,
      setDecimationSamples,
      // outlier
      handleOutliers,
      setHandleOutliers,
      outlierPercentile,
      setOutlierPercentile,
      outlierMultiplier,
      setOutlierMultiplier,
      // burst
      showBursts,
      setShowBursts,
      maxInterSpikeInterval,
      setMaxInterSpikeInterval,
      minSpikesPerBurst,
      setMinSpikesPerBurst,
      // legacy
      useAdjustedBases,
      setUseAdjustedBases,
      findPeaksWindowWidth,
      setFindPeaksWindowWidth,
      peakProminence,
      setPeakProminence,
    }),
    [
      spikeProminence,
      spikeWindow,
      spikeThreshold,
      spikeMinDistance,
      stdMultiplier,
      spikeParamsOverrideForWellKey,
      handleSpikeProminenceChange,
      handleSpikeWindowChange,
      handleResetSpikeParams,
      noiseSuppressionActive,
      smoothingWindow,
      subtractControl,
      filterBaseline,
      baselineCorrection,
      trendFlatteningEnabled,
      decimationEnabled,
      decimationSamples,
      handleOutliers,
      outlierPercentile,
      outlierMultiplier,
      showBursts,
      maxInterSpikeInterval,
      minSpikesPerBurst,
      useAdjustedBases,
      findPeaksWindowWidth,
      peakProminence,
    ]
  );

  return (
    <NeuralSettingsContext.Provider value={value}>
      {children}
    </NeuralSettingsContext.Provider>
  );
};
