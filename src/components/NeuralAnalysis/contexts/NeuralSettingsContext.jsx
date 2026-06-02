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

// One-time migration for snapshots saved before the seconds-throughout
// unit conversion. `maxInterSpikeInterval` was previously stored in
// milliseconds (default 50, slider range 0–250). The current slider
// is log-scaled with max 30 s, so any value > 30 is unambiguously a
// legacy ms value — divide by 1000 to convert. Values in [5, 30] are
// treated as legitimate seconds; legacy ms values that happened to
// fall in that range (5–30 ms, rare; default was 50) would need to
// be re-saved manually.
const migrateLegacySnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== "object") return snapshot;
  const v = snapshot.maxInterSpikeInterval;
  if (typeof v === "number" && v > 30) {
    return { ...snapshot, maxInterSpikeInterval: v / 1000 };
  }
  return snapshot;
};

// Default values for every persistable setting. The `useState`
// initializers below are the per-section sources of truth, and this
// map MUST stay in sync with them — the master "Reset All Settings"
// button (PanZoomControls) calls applySettingsSnapshot(DEFAULT_SETTINGS)
// to restore the whole panel at once. Each per-section reset button
// already handles its own subset; this is the union.
const DEFAULT_SETTINGS = {
  // Spike detection
  spikeProminence: 1,
  spikeWindow: 20,
  spikeMinDistance: 0,
  stdMultiplier: 1.0,
  noiseFloorMultiplier: 0,
  spikeMinWidth: 5,
  spikeMinProminenceRatio: 0.01,
  noiseWindowSize: 0,
  // Thresholds
  activityThresholdRatio: 0.5,
  activityThresholdEnabled: true,
  baselineThresholdRatio: 0.1,
  baselineThresholdEnabled: true,
  // Noise / smoothing / baseline
  smoothingEnabled: true,
  smoothingWindow: 9,
  subtractControl: false,
  baselineCorrection: false,
  trendFlatteningEnabled: true,
  trendFlatteningWindow: 200,
  trendFlatteningMinimums: 50,
  // Decimation
  decimationEnabled: false,
  decimationSamples: 200,
  // Outlier detection
  handleOutliers: false,
  outlierPercentile: 95,
  outlierMultiplier: 2.0,
  // Burst detection
  showBursts: false,
  maxInterSpikeInterval: 1.0,
  minSpikesPerBurst: 3,
  // Display toggles
  showPeakBases: true,
  markAUC: false,
  // Parameter-visualization overlays — render gate thresholds (prominence,
  // window, noise floor) on top of detected peaks so users can see the
  // gate the slider controls. Master + sub-toggles, all off by default.
  showParamOverlays: false,
  showProminenceOverlay: false,
  showWindowOverlay: false,
  showNoiseFloorOverlay: false,
  // Decision Explanation Layer: master toggle for the candidate
  // overlay (ghost markers for near-miss rejections + marginal-pass
  // rings on kept peaks). Off by default — opt-in so a first-time
  // user isn't confronted with extra chart clutter.
  showRejectedCandidates: false,
  // Decision Explanation Layer / Detection Funnel control state.
  // `candidateShowAllRejections` widens the visibility from near-misses
  // only (tier ≤ marginal-fail) to include clear-fail rejections that
  // came through gates 2-9. `candidateHighlightGate` filters the
  // candidate scatter to a single gate's rejections (null = all).
  candidateShowAllRejections: false,
  candidateHighlightGate: null,
  // Legacy spike-display tweaks
  useAdjustedBases: false,
  findPeaksWindowWidth: 10,
  peakProminence: 1,
};

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
    useState(true);
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
    useState(true);
  // Plate-wide manual-override flag for spikeProminence / spikeWindow.
  // When false the effective values come from the per-well auto-
  // suggestion (NeuralResultsContext). When true the user-set values
  // apply to every well in the analysis. Other detection params are
  // already plate-wide; this brings prominence/window into the same
  // model.
  const [spikeParamsOverrideActive, setSpikeParamsOverrideActive] =
    useState(false);

  const handleSpikeProminenceChange = useCallback(
    (val) => {
      setSpikeParamsOverrideActive(true);
      setSpikeProminence(val);
    },
    []
  );
  const handleSpikeWindowChange = useCallback(
    (val) => {
      setSpikeParamsOverrideActive(true);
      setSpikeWindow(val);
    },
    []
  );
  const handleResetSpikeParams = useCallback(() => {
    setSpikeParamsOverrideActive(false);
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
  const [handleOutliers, setHandleOutliers] = useState(false);
  const [outlierPercentile, setOutlierPercentile] = useState(95);
  const [outlierMultiplier, setOutlierMultiplier] = useState(2.0);

  // ---- Burst detection ---------------------------------------------------
  const [showBursts, setShowBursts] = useState(false);
  const [maxInterSpikeInterval, setMaxInterSpikeInterval] = useState(1.0);
  const [minSpikesPerBurst, setMinSpikesPerBurst] = useState(3);

  // ---- Display toggles (chart overlay) -----------------------------------
  // showPeakBases: whether the white base markers (left/right base of
  // each detected peak) are drawn on the chart. Default ON to preserve
  // the prior behavior.
  // markAUC: when ON, the AUC region of each peak is filled with a
  // semi-transparent color on the chart (red for normal peaks, orange
  // for outliers — matching the marker colors). Pure visualization;
  // doesn't affect detection or metric values.
  const [showPeakBases, setShowPeakBases] = useState(true);
  const [markAUC, setMarkAUC] = useState(false);

  // ---- Parameter-visualization overlays ----------------------------------
  // Master toggle (`showParamOverlays`) gates the three sub-toggles. The
  // overlay plugin draws nothing unless master is on AND at least one
  // sub-toggle is on. Sub-toggles drive prominence, window, and noise
  // floor overlays respectively. All persistable; defaults all off.
  const [showParamOverlays, setShowParamOverlays] = useState(false);
  const [showProminenceOverlay, setShowProminenceOverlay] = useState(false);
  const [showWindowOverlay, setShowWindowOverlay] = useState(false);
  const [showNoiseFloorOverlay, setShowNoiseFloorOverlay] = useState(false);
  // Candidate overlay (Decision Explanation Layer) — see DEFAULT_SETTINGS.
  const [showRejectedCandidates, setShowRejectedCandidates] = useState(false);
  const [candidateShowAllRejections, setCandidateShowAllRejections] =
    useState(false);
  const [candidateHighlightGate, setCandidateHighlightGate] = useState(null);
  // Draft slider values published by useDraftSlider during drag so the
  // overlay plugin can redraw at the slider's current position without
  // waiting for onChangeCommitted (which is when the pipeline re-runs).
  // null = no draft in progress; the plugin falls back to the committed
  // value. Not persisted — purely transient render state.
  const [draftSpikeProminence, setDraftSpikeProminence] = useState(null);
  const [draftSpikeWindow, setDraftSpikeWindow] = useState(null);
  const [draftNoiseFloorMultiplier, setDraftNoiseFloorMultiplier] =
    useState(null);

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
    showPeakBases,
    markAUC,
    showParamOverlays,
    showProminenceOverlay,
    showWindowOverlay,
    showNoiseFloorOverlay,
    showRejectedCandidates,
    candidateShowAllRejections,
    candidateHighlightGate,
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
      showPeakBases: setShowPeakBases,
      markAUC: setMarkAUC,
      showParamOverlays: setShowParamOverlays,
      showProminenceOverlay: setShowProminenceOverlay,
      showWindowOverlay: setShowWindowOverlay,
      showNoiseFloorOverlay: setShowNoiseFloorOverlay,
      showRejectedCandidates: setShowRejectedCandidates,
      candidateShowAllRejections: setCandidateShowAllRejections,
      candidateHighlightGate: setCandidateHighlightGate,
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
    showPeakBases,
    markAUC,
    showParamOverlays,
    showProminenceOverlay,
    showWindowOverlay,
    showNoiseFloorOverlay,
    showRejectedCandidates,
    candidateShowAllRejections,
    candidateHighlightGate,
    useAdjustedBases,
    findPeaksWindowWidth,
    peakProminence,
  ]);

  const applySettingsSnapshot = useCallback(
    (snapshot) => {
      const migrated = migrateLegacySnapshot(snapshot);
      if (!migrated || typeof migrated !== "object") return;
      for (const key of Object.keys(migrated)) {
        const setter = settingSetterMap[key];
        if (setter) setter(migrated[key]);
      }
      // A loaded snapshot — template or master reset — is a manual
      // choice by definition. Flag the override as active so the
      // values flow into every well's effective params instead of
      // being silently overridden by the per-well auto-suggestion.
      // For the master-reset path this is paired with
      // `handleResetSpikeParams()` (which clears the flag) immediately
      // after, so the master reset still ends in the "auto" state.
      if (
        Object.prototype.hasOwnProperty.call(migrated, "spikeProminence") ||
        Object.prototype.hasOwnProperty.call(migrated, "spikeWindow")
      ) {
        setSpikeParamsOverrideActive(true);
      }
    },
    [settingSetterMap]
  );

  // Master reset: restores every persistable setting to its DEFAULT_
  // SETTINGS value AND clears the plate-wide spike-prominence/window
  // override so the auto-suggestion path takes over again (same
  // semantics as the Spike Detection section's own reset button). ROI
  // list, zoom state, and well selection are intentionally NOT
  // touched — the button is labeled "Reset All Settings" precisely
  // to scope it to parameters. Order matters: `applySettingsSnapshot`
  // sets the override flag because it writes spike params; the
  // subsequent `handleResetSpikeParams()` clears the flag so a master
  // reset ends in the auto-suggest state.
  const resetAllSettings = useCallback(() => {
    applySettingsSnapshot(DEFAULT_SETTINGS);
    handleResetSpikeParams();
  }, [applySettingsSnapshot, handleResetSpikeParams]);

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
      spikeParamsOverrideActive,
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
      // display toggles
      showPeakBases,
      setShowPeakBases,
      markAUC,
      setMarkAUC,
      // parameter-visualization overlays
      showParamOverlays,
      setShowParamOverlays,
      showProminenceOverlay,
      setShowProminenceOverlay,
      showWindowOverlay,
      setShowWindowOverlay,
      showNoiseFloorOverlay,
      setShowNoiseFloorOverlay,
      showRejectedCandidates,
      setShowRejectedCandidates,
      candidateShowAllRejections,
      setCandidateShowAllRejections,
      candidateHighlightGate,
      setCandidateHighlightGate,
      draftSpikeProminence,
      setDraftSpikeProminence,
      draftSpikeWindow,
      setDraftSpikeWindow,
      draftNoiseFloorMultiplier,
      setDraftNoiseFloorMultiplier,
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
      // master reset
      resetAllSettings,
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
      spikeParamsOverrideActive,
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
      showPeakBases,
      markAUC,
      showParamOverlays,
      showProminenceOverlay,
      showWindowOverlay,
      showNoiseFloorOverlay,
      showRejectedCandidates,
      candidateShowAllRejections,
      candidateHighlightGate,
      draftSpikeProminence,
      draftSpikeWindow,
      draftNoiseFloorMultiplier,
      useAdjustedBases,
      findPeaksWindowWidth,
      peakProminence,
      getSettingsSnapshot,
      applySettingsSnapshot,
      resetAllSettings,
    ]
  );

  return (
    <NeuralSettingsContext.Provider value={value}>
      {children}
    </NeuralSettingsContext.Provider>
  );
};
