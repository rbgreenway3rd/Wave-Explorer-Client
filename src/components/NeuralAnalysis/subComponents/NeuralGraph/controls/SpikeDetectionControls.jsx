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
  const { effectiveSpikeProminence, effectiveSpikeWindow } = useNeuralResults();
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
          value={Number(prominence.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.spikeProminence");
            prominence.onChange(e, v);
          }}
          onChangeCommitted={prominence.onChangeCommitted}
          min={0}
          max={100}
          step={0.5}
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
