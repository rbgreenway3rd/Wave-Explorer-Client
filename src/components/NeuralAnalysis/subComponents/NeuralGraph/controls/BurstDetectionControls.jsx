import React from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import "./NeuralControlPanel.css";

/**
 * BurstDetectionControls — sliders for max inter-spike interval (ms)
 * and min spikes per burst, used by the burst-grouping step. Visible/
 * active only when `showBursts` is true; renders dimmed when disabled.
 */
const BurstDetectionControls = ({
  showBursts,
  maxInterSpikeInterval,
  setMaxInterSpikeInterval,
  minSpikesPerBurst,
  setMinSpikesPerBurst,
}) => {
  const DEFAULT_MAX_INTERVAL = 50;
  const DEFAULT_MIN_SPIKES = 3;

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
            {maxInterSpikeInterval} ms
          </span>
        </div>
        <Slider
          value={maxInterSpikeInterval}
          onChange={(_, value) => setMaxInterSpikeInterval(value)}
          disabled={!showBursts}
          min={0}
          max={250}
          step={5}
          marks={[
            { value: 10, label: "10ms" },
            { value: 50, label: "50ms" },
            { value: 100, label: "100ms" },
            { value: 150, label: "150ms" },
            { value: 200, label: "200ms" },
            { value: 250, label: "250ms" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Min Spikes Per Burst
          </span>
          <span className="neural-control-panel__field-value">
            {minSpikesPerBurst}
          </span>
        </div>
        <Slider
          value={minSpikesPerBurst}
          onChange={(_, value) => setMinSpikesPerBurst(value)}
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
