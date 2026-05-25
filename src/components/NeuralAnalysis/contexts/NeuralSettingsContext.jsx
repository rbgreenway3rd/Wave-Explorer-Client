import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useNeuralSelection } from "./NeuralSelectionContext";
import { PERSISTABLE_KEYS } from "../templates/templateStorage";

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
  const [spikeMinDistance, setSpikeMinDistance] = useState(0);
  const [stdMultiplier, setStdMultiplier] = useState(1.0);
  const [noiseFloorMultiplier, setNoiseFloorMultiplier] = useState(0);
  // Shape-based filters (rejects asymmetric / narrow noise peaks).
  // Defaults preserve previous hardcoded behavior (passes through).
  const [spikeMinWidth, setSpikeMinWidth] = useState(5);
  const [spikeMinProminenceRatio, setSpikeMinProminenceRatio] = useState(0.01);
  // Block size for local windowed σ (used by the noise-floor check).
  // 0 = use global σ (current behavior). > 0 = block-wise local σ at that
  // window size; lets the per-peak floor adapt to non-stationary noise.
  const [noiseWindowSize, setNoiseWindowSize] = useState(0);
  // Activity Threshold — a horizontal "floor" drawn on the chart. When
  // enabled, peaks whose apex Y is below the line are filtered out before
  // burst detection and metrics. Stored as a ratio (0–1) of each well's
  // processed-signal Y range so the line stays in range when switching
  // wells with different amplitudes.
  const [activityThresholdRatio, setActivityThresholdRatio] = useState(0.5);
  const [activityThresholdEnabled, setActivityThresholdEnabled] =
    useState(false);
  // Baseline Threshold — a second horizontal line. When enabled, it
  // overrides per-peak base detection so peak width and AUC are
  // measured between the line's intercepts with the signal on either
  // side of each peak (per client request from the Neural modal UI
  // review). Stored as a ratio (0–1) of each well's Y range so the
  // line stays in range across well switches with different amplitudes,
  // mirroring activityThresholdRatio above. Default ratio 0.1 reads as
  // "near the bottom of the signal range"; NeuralGraph seeds a more
  // accurate noise-median value the first time the toggle is flipped
  // on for a given well (see baselineSeededWellRef there).
  const [baselineThresholdRatio, setBaselineThresholdRatio] = useState(0.1);
  const [baselineThresholdEnabled, setBaselineThresholdEnabled] =
    useState(false);
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
  // `noiseSuppressionActive` is derived from the two method switches
  // (see the value object below). The redundant master "Enable" toggle
  // and its setter were removed — turning both methods off already
  // disables the pipeline.
  // Savitzky-Golay smoothing — high-frequency noise reducer applied
  // after trend-flattening but before outlier removal. `smoothingWindow`
  // is the SG window (5/7/9), order 2. Default 9 per client feedback —
  // resolves bursts containing two peaks better than 5/7.
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);
  const [smoothingWindow, setSmoothingWindow] = useState(9);
  const [subtractControl, setSubtractControl] = useState(false);
  const [baselineCorrection, setBaselineCorrection] = useState(false);
  const [trendFlatteningEnabled, setTrendFlatteningEnabled] = useState(true);
  // Baseline tracker (used by both trendFlattening and baselineCorrected).
  // Hardcoded as 200 / 50 historically; now exposed for per-file tuning.
  const [trendFlatteningWindow, setTrendFlatteningWindow] = useState(200);
  const [trendFlatteningMinimums, setTrendFlatteningMinimums] = useState(50);

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

  // Derived: noise suppression is "active" when at least one method is
  // running. Kept in the public context shape because several consumers
  // (ChartControls Control Well gating, NeuralGraph dataset label, CSV
  // metadata) still read the boolean directly.
  const noiseSuppressionActive = !!trendFlatteningEnabled || !!smoothingEnabled;

  // ---- Template snapshot bridge ------------------------------------------
  // Persistable knob → live value map (built per render so the snapshot
  // helper always reflects the latest state) and a parallel setter map.
  // Splitting them keeps the apply path simple: iterate the incoming
  // snapshot's keys, call the matching setter, ignore unknowns. Missing
  // keys are left as-is so older templates don't clobber newer knobs.
  const settingValueMap = {
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
    smoothingEnabled,
    smoothingWindow,
    subtractControl,
    baselineCorrection,
    trendFlatteningEnabled,
    trendFlatteningWindow,
    trendFlatteningMinimums,
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
  };
  // useState setters are stable across renders, so this map is too.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settingSetterMap = useMemo(
    () => ({
      spikeProminence: setSpikeProminence,
      spikeWindow: setSpikeWindow,
      spikeMinDistance: setSpikeMinDistance,
      stdMultiplier: setStdMultiplier,
      noiseFloorMultiplier: setNoiseFloorMultiplier,
      spikeMinWidth: setSpikeMinWidth,
      spikeMinProminenceRatio: setSpikeMinProminenceRatio,
      noiseWindowSize: setNoiseWindowSize,
      activityThresholdRatio: setActivityThresholdRatio,
      activityThresholdEnabled: setActivityThresholdEnabled,
      baselineThresholdRatio: setBaselineThresholdRatio,
      baselineThresholdEnabled: setBaselineThresholdEnabled,
      smoothingEnabled: setSmoothingEnabled,
      smoothingWindow: setSmoothingWindow,
      subtractControl: setSubtractControl,
      baselineCorrection: setBaselineCorrection,
      trendFlatteningEnabled: setTrendFlatteningEnabled,
      trendFlatteningWindow: setTrendFlatteningWindow,
      trendFlatteningMinimums: setTrendFlatteningMinimums,
      decimationEnabled: setDecimationEnabled,
      decimationSamples: setDecimationSamples,
      handleOutliers: setHandleOutliers,
      outlierPercentile: setOutlierPercentile,
      outlierMultiplier: setOutlierMultiplier,
      showBursts: setShowBursts,
      maxInterSpikeInterval: setMaxInterSpikeInterval,
      minSpikesPerBurst: setMinSpikesPerBurst,
      useAdjustedBases: setUseAdjustedBases,
      findPeaksWindowWidth: setFindPeaksWindowWidth,
      peakProminence: setPeakProminence,
    }),
    []
  );

  const getSettingsSnapshot = useCallback(() => {
    const snap = {};
    for (const k of PERSISTABLE_KEYS) {
      if (k in settingValueMap) snap[k] = settingValueMap[k];
    }
    return snap;
    // settingValueMap is rebuilt every render but its values are the live
    // state — relying on closure capture per render is intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
    smoothingEnabled,
    smoothingWindow,
    subtractControl,
    baselineCorrection,
    trendFlatteningEnabled,
    trendFlatteningWindow,
    trendFlatteningMinimums,
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
  ]);

  const applySettingsSnapshot = useCallback(
    (snapshot) => {
      if (!snapshot || typeof snapshot !== "object") return;
      for (const key of Object.keys(snapshot)) {
        const setter = settingSetterMap[key];
        if (setter) setter(snapshot[key]);
      }
    },
    [settingSetterMap]
  );

  const value = useMemo(
    () => ({
      // spike
      spikeProminence,
      setSpikeProminence,
      spikeWindow,
      setSpikeWindow,
      spikeMinDistance,
      setSpikeMinDistance,
      stdMultiplier,
      setStdMultiplier,
      noiseFloorMultiplier,
      setNoiseFloorMultiplier,
      spikeMinWidth,
      setSpikeMinWidth,
      spikeMinProminenceRatio,
      setSpikeMinProminenceRatio,
      noiseWindowSize,
      setNoiseWindowSize,
      activityThresholdRatio,
      setActivityThresholdRatio,
      activityThresholdEnabled,
      setActivityThresholdEnabled,
      baselineThresholdRatio,
      setBaselineThresholdRatio,
      baselineThresholdEnabled,
      setBaselineThresholdEnabled,
      spikeParamsOverrideForWellKey,
      handleSpikeProminenceChange,
      handleSpikeWindowChange,
      handleResetSpikeParams,
      // noise / smoothing
      noiseSuppressionActive,
      smoothingEnabled,
      setSmoothingEnabled,
      smoothingWindow,
      setSmoothingWindow,
      subtractControl,
      setSubtractControl,
      baselineCorrection,
      setBaselineCorrection,
      trendFlatteningEnabled,
      setTrendFlatteningEnabled,
      trendFlatteningWindow,
      setTrendFlatteningWindow,
      trendFlatteningMinimums,
      setTrendFlatteningMinimums,
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
      // template snapshot bridge
      getSettingsSnapshot,
      applySettingsSnapshot,
    }),
    [
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
      spikeParamsOverrideForWellKey,
      handleSpikeProminenceChange,
      handleSpikeWindowChange,
      handleResetSpikeParams,
      noiseSuppressionActive,
      smoothingEnabled,
      smoothingWindow,
      subtractControl,
      baselineCorrection,
      trendFlatteningEnabled,
      trendFlatteningWindow,
      trendFlatteningMinimums,
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
      getSettingsSnapshot,
      applySettingsSnapshot,
    ]
  );

  return (
    <NeuralSettingsContext.Provider value={value}>
      {children}
    </NeuralSettingsContext.Provider>
  );
};
