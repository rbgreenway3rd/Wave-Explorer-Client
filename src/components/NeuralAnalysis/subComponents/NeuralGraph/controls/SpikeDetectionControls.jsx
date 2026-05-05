import React from "react";
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
  } = useNeuralResults();
  const {
    spikeMinDistance,
    setSpikeMinDistance,
    stdMultiplier,
    setStdMultiplier,
    handleSpikeProminenceChange,
    handleSpikeWindowChange,
    handleResetSpikeParams,
  } = useNeuralSettings();
  const DEFAULT_MIN_DISTANCE = 0;
  const DEFAULT_STD_MULTIPLIER = 1.0;

  // ---- Dynamic prominence-slider range ----
  // The auto-suggested prominence can range from a few units (clean
  // signals) to several thousand (noisy or high-amplitude wells). Size
  // the slider to suggested * 1.2 so the user always has headroom past
  // the suggestion without losing fine-grained control on quiet signals.
  // Floor at 100 so the slider stays usable when the suggestion is tiny.
  const PROMINENCE_FLOOR = 100;
  const PROMINENCE_HEADROOM = 1.2;
  const promMax = Math.max(
    Math.ceil(((suggestedSpikeProminence ?? 0) || PROMINENCE_FLOOR) * PROMINENCE_HEADROOM),
    PROMINENCE_FLOOR
  );
  // Step scales with range so dragging always covers ~200 increments.
  const promStep = Math.max(0.5, Math.round((promMax / 200) * 10) / 10);
  // Marks at 0 / 25 / 50 / 75 / 100 % of the dynamic max, integer-rounded.
  const promMarks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = Math.round(promMax * f);
    return { value: v, label: String(v) };
  });

  const prominence = useDraftSlider(
    effectiveSpikeProminence,
    handleSpikeProminenceChange
  );
  const windowDraft = useDraftSlider(
    effectiveSpikeWindow,
    handleSpikeWindowChange
  );
  const minDistance = useDraftSlider(spikeMinDistance, setSpikeMinDistance);
  const std = useDraftSlider(stdMultiplier, setStdMultiplier);

  const handleReset = () => {
    handleResetSpikeParams && handleResetSpikeParams();
    setSpikeMinDistance(DEFAULT_MIN_DISTANCE);
    setStdMultiplier(DEFAULT_STD_MULTIPLIER);
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
          <span className="neural-control-panel__field-label">Prominence</span>
          <span className="neural-control-panel__field-value">
            {Number(prominence.value).toFixed(1)}
          </span>
        </div>
        <Slider
          value={Math.min(Number(prominence.value) || 0, promMax)}
          onChange={(e, v) => {
            perf.count("slider.spikeProminence");
            prominence.onChange(e, v);
          }}
          onChangeCommitted={prominence.onChangeCommitted}
          min={0}
          max={promMax}
          step={promStep}
          marks={promMarks}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">Window Width</span>
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
    </Panel>
  );
};

export default SpikeDetectionControls;
