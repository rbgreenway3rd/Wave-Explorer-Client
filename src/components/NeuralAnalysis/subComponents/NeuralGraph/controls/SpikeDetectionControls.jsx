import React, { useCallback, useEffect, useRef, useState } from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import {
  useNeuralResults,
  useNeuralSettings,
} from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * SpikeDetectionControls — sliders for the four wired spike-detection
 * params (prominence, window, min distance between peaks, cluster
 * separation multiplier).
 *
 * Reads the EFFECTIVE spike values (auto-suggestion or user override) from
 * NeuralResultsContext for display, and writes through the override-aware
 * handlers from NeuralSettingsContext. Each slider is wrapped in
 * useDraftSlider so dragging only updates a local value (cheap) and the
 * pipeline-triggering setter only runs once on release.
 *
 * The Reset button clears the override so the auto-suggestion takes over
 * again, and resets minDistance/stdMultiplier to their fixed defaults.
 */
const SpikeDetectionControls = () => {
  const {
    effectiveSpikeProminence,
    effectiveSpikeWindow,
    suggestedSpikeProminence,
    suggestedSpikeWindow,
    suggestedSpikeDiagnostics,
    pipelineResults,
  } = useNeuralResults();
  const {
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
    handleSpikeProminenceChange,
    handleSpikeWindowChange,
    handleResetSpikeParams,
    spikeParamsOverrideActive,
    // Parameter-viz draft publishing. Sliders publish their live drag
    // value into these context slots so the graph overlay can redraw
    // mid-drag without waiting for onChangeCommitted (which fires
    // the pipeline). Only published when the corresponding overlay is
    // on; otherwise the callback no-ops so unused renders cost nothing.
    showParamOverlays,
    showProminenceOverlay,
    showWindowOverlay,
    showNoiseFloorOverlay,
    setDraftSpikeProminence,
    setDraftSpikeWindow,
    setDraftNoiseFloorMultiplier,
  } = useNeuralSettings();
  const DEFAULT_MIN_DISTANCE = 0;
  const DEFAULT_STD_MULTIPLIER = 1.0;
  const DEFAULT_NOISE_FLOOR = 0;
  const DEFAULT_MIN_WIDTH = 5;
  const DEFAULT_MIN_PROM_RATIO = 0.01;
  const DEFAULT_NOISE_WINDOW = 0;
  // σ used by the noise-floor check, exposed by the pipeline so the UI
  // can show the absolute prominence threshold next to the slider value.
  const noiseSigma = pipelineResults?.metrics?.robustStd ?? 0;
  // Per-well signal envelope, exposed by the pipeline so the slider
  // can size itself to the data it's gating. Without this the
  // prominence slider hard-floored at 100 — unusable for normalized
  // y ∈ [-0.02, 0.17] where the right threshold is < 0.05.
  const signalRange = pipelineResults?.metrics?.signalRange ?? 0;

  // ---- Dynamic prominence-slider range ----
  // promMax covers the larger of: (1) headroom past the auto-suggested
  // value, (2) headroom past the user's CURRENT effective value (so the
  // slider doesn't shrink under them mid-session), (3) a per-well floor
  // derived from the signal range (2% of envelope) so the slider stays
  // draggable on quiet signals and on first-render before the
  // suggestion arrives. The 1e-6 final floor is the "no data yet" safety
  // net — without it the slider's `max` is 0 and the slider freezes.
  const PROMINENCE_HEADROOM = 1.2;
  const rangeFloor = signalRange > 0 ? signalRange * 0.02 : 0;
  const promMax = Math.max(
    (suggestedSpikeProminence ?? 0) * PROMINENCE_HEADROOM,
    (effectiveSpikeProminence ?? 0) * PROMINENCE_HEADROOM,
    rangeFloor,
    1e-6
  );
  // ---- Animated range transition ----
  // When the pipeline returns and `promMax` changes, the user's
  // committed value sits at a different *visual* position even though
  // the value didn't change. Without animation, the thumb appears to
  // jump (often back near where it was before the drag), which makes
  // the drag feel like it did nothing. Solution:
  //   - track `displayedMax` separately from `promMax`
  //   - when `promMax` changes, animate `displayedMax` toward it over
  //     RANGE_ANIM_MS so the thumb's visual position glides smoothly
  //   - drive the slider's max/step/marks off `displayedMax` so the
  //     whole scale animates, not just the thumb
  //   - if the user starts a new drag mid-animation, snap to the final
  //     value so step/marks are consistent during the new drag
  //   - skip the very first transition (initial 1e-6 → real value)
  const RANGE_ANIM_MS = 600;
  const [displayedMax, setDisplayedMax] = useState(promMax);
  const animationRef = useRef(null);
  const isInteractingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const cancelRangeAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    // First settle: snap, don't animate. Avoids animating the bootstrap
    // jump from the 1e-6 fallback to the first real range.
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setDisplayedMax(promMax);
      return;
    }
    // No-op when the user is still dragging — promMax shouldn't change
    // during drag in normal flow, but if a stale pipeline finishes
    // mid-drag we defer the visual change until release.
    if (isInteractingRef.current) return;
    // Skip if already at target (avoid useless animation runs).
    if (promMax === displayedMax) return;
    // Skip if change is trivial — pointless animation flash.
    const denom = Math.max(promMax, displayedMax, 1e-9);
    if (Math.abs(promMax - displayedMax) / denom < 0.005) {
      setDisplayedMax(promMax);
      return;
    }

    cancelRangeAnimation();
    const fromMax = displayedMax;
    const toMax = promMax;
    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / RANGE_ANIM_MS);
      // easeInOutSine — smooth start and stop
      const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
      setDisplayedMax(fromMax + (toMax - fromMax) * eased);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(tick);
    return cancelRangeAnimation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promMax]);

  // Step scales with the *displayed* range so dragging always covers
  // ~200 increments at the current visual scale.
  const promStep = displayedMax / 200;

  // Marks at 0 / 25 / 50 / 75 / 100 % of the displayed max. They animate
  // along with displayedMax so the whole rail visibly rescales — the
  // user sees the scale change, not just the thumb teleport.
  const promFormat = (v) =>
    (displayedMax < 1 ? v.toFixed(4) : String(Math.round(v)));
  const promMarks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = displayedMax * f;
    return { value: v, label: promFormat(v) };
  });

  // ---- Auto / Manual hint ---------------------------------------------
  // The slider rows surface what mode prominence and window are in.
  // When the user hasn't touched the slider, the effective value comes
  // from the per-well auto-suggestion — show "Auto (method)" so the
  // user can see which Otsu path fired. When they've manually set a
  // value, that value applies plate-wide — show "Manual" plus the
  // current per-well suggestion in parens so the user can see how far
  // they've drifted from sensible per-well values when switching wells.
  const otsuMethod = suggestedSpikeDiagnostics?.prominence?.method ?? null;
  const promHint = spikeParamsOverrideActive
    ? `Manual — auto: ${
        suggestedSpikeProminence != null
          ? promFormat(suggestedSpikeProminence)
          : "—"
      }`
    : otsuMethod
    ? `Auto (${otsuMethod})`
    : "Auto";
  const winHint = spikeParamsOverrideActive
    ? `Manual — auto: ${
        suggestedSpikeWindow != null ? suggestedSpikeWindow : "—"
      }`
    : "Auto";

  // Conditional draft publishers. When the corresponding overlay is on
  // the slider's live value flows into the shared draft slot so the
  // chart overlay can redraw mid-drag; when off the callback is a
  // no-op and the published draft stays at whatever it last was (which
  // is never read because master overlay is off).
  const publishProminenceDraft = useCallback(
    (val) => {
      if (showParamOverlays && showProminenceOverlay) {
        setDraftSpikeProminence(val);
      }
    },
    [showParamOverlays, showProminenceOverlay, setDraftSpikeProminence]
  );
  const publishWindowDraft = useCallback(
    (val) => {
      if (showParamOverlays && showWindowOverlay) {
        setDraftSpikeWindow(val);
      }
    },
    [showParamOverlays, showWindowOverlay, setDraftSpikeWindow]
  );
  const publishNoiseFloorDraft = useCallback(
    (val) => {
      if (showParamOverlays && showNoiseFloorOverlay) {
        setDraftNoiseFloorMultiplier(val);
      }
    },
    [showParamOverlays, showNoiseFloorOverlay, setDraftNoiseFloorMultiplier]
  );

  const prominence = useDraftSlider(
    effectiveSpikeProminence,
    handleSpikeProminenceChange,
    publishProminenceDraft
  );
  const windowDraft = useDraftSlider(
    effectiveSpikeWindow,
    handleSpikeWindowChange,
    publishWindowDraft
  );
  const minDistance = useDraftSlider(spikeMinDistance, setSpikeMinDistance);
  const std = useDraftSlider(stdMultiplier, setStdMultiplier);
  const noiseFloor = useDraftSlider(
    noiseFloorMultiplier,
    setNoiseFloorMultiplier,
    publishNoiseFloorDraft
  );
  const minWidth = useDraftSlider(spikeMinWidth, setSpikeMinWidth);
  const promRatio = useDraftSlider(
    spikeMinProminenceRatio,
    setSpikeMinProminenceRatio
  );
  const noiseWindow = useDraftSlider(noiseWindowSize, setNoiseWindowSize);

  const handleReset = () => {
    handleResetSpikeParams && handleResetSpikeParams();
    setSpikeMinDistance(DEFAULT_MIN_DISTANCE);
    setStdMultiplier(DEFAULT_STD_MULTIPLIER);
    setNoiseFloorMultiplier(DEFAULT_NOISE_FLOOR);
    setSpikeMinWidth(DEFAULT_MIN_WIDTH);
    setSpikeMinProminenceRatio(DEFAULT_MIN_PROM_RATIO);
    setNoiseWindowSize(DEFAULT_NOISE_WINDOW);
  };

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">
          Spike Detection Parameters
        </h4>
        <Tooltip
          title="Reset to auto-suggested prominence/window for this well"
          placement="top"
        >
          <IconButton
            variant="subtle"
            size="sm"
            onClick={handleReset}
            className="neural-control-panel__reset"
            aria-label="reset spike parameters"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Prominence
            <span className="neural-control-panel__field-hint">
              {promHint}
            </span>
          </span>
          <span className="neural-control-panel__field-value">
            {promFormat(Number(prominence.value) || 0)}
          </span>
        </div>
        <Slider
          value={Math.min(Number(prominence.value) || 0, displayedMax)}
          onChange={(e, v) => {
            perf.count("slider.spikeProminence");
            // A new drag starts — snap any in-flight range animation
            // to its endpoint so the visual scale doesn't shift under
            // the user's fingers.
            if (animationRef.current !== null) {
              cancelRangeAnimation();
              setDisplayedMax(promMax);
            }
            isInteractingRef.current = true;
            prominence.onChange(e, v);
          }}
          onChangeCommitted={(e, v) => {
            isInteractingRef.current = false;
            prominence.onChangeCommitted(e, v);
          }}
          min={0}
          max={displayedMax}
          step={promStep}
          marks={promMarks}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Window Width
            <span className="neural-control-panel__field-hint">
              {winHint}
            </span>
          </span>
          <span className="neural-control-panel__field-value">
            {windowDraft.value}
          </span>
        </div>
        <Slider
          value={Number(windowDraft.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.spikeWindow");
            windowDraft.onChange(e, v);
          }}
          onChangeCommitted={windowDraft.onChangeCommitted}
          min={5}
          max={200}
          step={5}
          marks={[
            { value: 5, label: "5" },
            { value: 50, label: "50" },
            { value: 100, label: "100" },
            { value: 150, label: "150" },
            { value: 200, label: "200" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">Min Distance</span>
          <span className="neural-control-panel__field-value">
            {minDistance.value}
          </span>
        </div>
        <Slider
          value={Number(minDistance.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.spikeMinDistance");
            minDistance.onChange(e, v);
          }}
          onChangeCommitted={minDistance.onChangeCommitted}
          min={0}
          max={100}
          step={1}
          marks={[
            { value: 0, label: "0" },
            { value: 25, label: "25" },
            { value: 50, label: "50" },
            { value: 75, label: "75" },
            { value: 100, label: "100" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Cluster Separation
          </span>
          <span className="neural-control-panel__field-value">
            {Number(std.value).toFixed(1)}
          </span>
        </div>
        <Slider
          value={Number(std.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.stdMultiplier");
            std.onChange(e, v);
          }}
          onChangeCommitted={std.onChangeCommitted}
          min={0.1}
          max={5}
          step={0.1}
          marks={[
            { value: 0.5, label: "0.5" },
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
            { value: 5, label: "5" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Noise Floor (× σ)
          </span>
          <span className="neural-control-panel__field-value">
            {Number(noiseFloor.value) === 0
              ? "Off"
              : `${Number(noiseFloor.value).toFixed(1)}× ≈ ${(
                  Number(noiseFloor.value) * noiseSigma
                ).toFixed(0)}`}
          </span>
        </div>
        <Slider
          value={Number(noiseFloor.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.noiseFloorMultiplier");
            noiseFloor.onChange(e, v);
          }}
          onChangeCommitted={noiseFloor.onChangeCommitted}
          min={0}
          max={50}
          step={0.5}
          marks={[
            { value: 0, label: "Off" },
            { value: 10, label: "10" },
            { value: 25, label: "25" },
            { value: 50, label: "50" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">Min Width</span>
          <span className="neural-control-panel__field-value">
            {minWidth.value}
          </span>
        </div>
        <Slider
          value={Number(minWidth.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.spikeMinWidth");
            minWidth.onChange(e, v);
          }}
          onChangeCommitted={minWidth.onChangeCommitted}
          min={1}
          max={200}
          step={1}
          marks={[
            { value: 1, label: "1" },
            { value: 50, label: "50" },
            { value: 100, label: "100" },
            { value: 200, label: "200" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Symmetry (Min Prominence Ratio)
          </span>
          <span className="neural-control-panel__field-value">
            {Number(promRatio.value).toFixed(2)}
          </span>
        </div>
        <Slider
          value={Number(promRatio.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.spikeMinProminenceRatio");
            promRatio.onChange(e, v);
          }}
          onChangeCommitted={promRatio.onChangeCommitted}
          min={0}
          max={1}
          step={0.05}
          marks={[
            { value: 0, label: "0" },
            { value: 0.3, label: "0.3" },
            { value: 0.5, label: "0.5" },
            { value: 1, label: "1" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Noise Window (samples)
          </span>
          <span className="neural-control-panel__field-value">
            {Number(noiseWindow.value) === 0
              ? "Global σ"
              : Number(noiseWindow.value)}
          </span>
        </div>
        <Slider
          value={Number(noiseWindow.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.noiseWindowSize");
            noiseWindow.onChange(e, v);
          }}
          onChangeCommitted={noiseWindow.onChangeCommitted}
          min={0}
          max={10000}
          step={100}
          marks={[
            { value: 0, label: "Off" },
            { value: 1000, label: "1k" },
            { value: 5000, label: "5k" },
            { value: 10000, label: "10k" },
          ]}
        />
      </div>
    </Panel>
  );
};

export default SpikeDetectionControls;
