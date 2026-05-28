import React from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * BurstDetectionControls — sliders for max inter-spike interval (s)
 * and min spikes per burst. Reads burst state directly from
 * NeuralSettingsContext; sliders use useDraftSlider so dragging only
 * updates a local value and the pipeline-triggering setter fires once
 * on release.
 */
const BurstDetectionControls = () => {
  const {
    showBursts,
    maxInterSpikeInterval,
    setMaxInterSpikeInterval,
    minSpikesPerBurst,
    setMinSpikesPerBurst,
  } = useNeuralSettings();
  const DEFAULT_MAX_INTERVAL = 0.05;
  const DEFAULT_MIN_SPIKES = 3;

  const interval = useDraftSlider(
    maxInterSpikeInterval,
    setMaxInterSpikeInterval
  );
  const minSpikes = useDraftSlider(minSpikesPerBurst, setMinSpikesPerBurst);

  const handleReset = () => {
    setMaxInterSpikeInterval(DEFAULT_MAX_INTERVAL);
    setMinSpikesPerBurst(DEFAULT_MIN_SPIKES);
  };

  return (
    <Panel
      variant="dark"
      className={`neural-control-panel ${
        showBursts ? "" : "neural-control-panel--disabled"
      }`}
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">
          Burst Detection Parameters
        </h4>
        <Tooltip title="Reset to defaults" placement="top">
          <IconButton
            variant="subtle"
            size="sm"
            onClick={handleReset}
            disabled={!showBursts}
            className="neural-control-panel__reset"
            aria-label="reset burst parameters"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Max Inter-Spike Interval
          </span>
          <span className="neural-control-panel__field-value">
            {interval.value} s
          </span>
        </div>
        <Slider
          value={interval.value}
          onChange={(e, v) => {
            perf.count("slider.maxInterSpikeInterval");
            interval.onChange(e, v);
          }}
          onChangeCommitted={interval.onChangeCommitted}
          disabled={!showBursts}
          min={0}
          max={0.25}
          step={0.005}
          marks={[
            { value: 0.01, label: "0.01s" },
            { value: 0.05, label: "0.05s" },
            { value: 0.1, label: "0.1s" },
            { value: 0.15, label: "0.15s" },
            { value: 0.2, label: "0.2s" },
            { value: 0.25, label: "0.25s" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Min Spikes Per Burst
          </span>
          <span className="neural-control-panel__field-value">
            {minSpikes.value}
          </span>
        </div>
        <Slider
          value={minSpikes.value}
          onChange={(e, v) => {
            perf.count("slider.minSpikesPerBurst");
            minSpikes.onChange(e, v);
          }}
          onChangeCommitted={minSpikes.onChangeCommitted}
          disabled={!showBursts}
          min={2}
          max={10}
          step={1}
          marks={[
            { value: 2, label: "2" },
            { value: 4, label: "4" },
            { value: 6, label: "6" },
            { value: 8, label: "8" },
            { value: 10, label: "10" },
          ]}
        />
      </div>
    </Panel>
  );
};

export default BurstDetectionControls;
