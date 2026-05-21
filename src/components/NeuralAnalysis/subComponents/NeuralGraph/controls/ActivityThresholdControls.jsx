import React from "react";
import { FormControlLabel, Slider, Switch, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

const DEFAULT_ACTIVITY_THRESHOLD_RATIO = 0.5;

/**
 * ActivityThresholdControls — toggle + slider for the chart's horizontal
 * "activity floor" line. Stored as a ratio (0–1) of each well's
 * processed-signal Y range so the line stays in range across well
 * switches with different amplitudes.
 *
 * The line is also draggable on the chart itself (see NeuralGraph.js);
 * the chart and this slider sync on commit (release).
 */
const ActivityThresholdControls = () => {
  const {
    activityThresholdRatio,
    setActivityThresholdRatio,
    activityThresholdEnabled,
    setActivityThresholdEnabled,
  } = useNeuralSettings();

  const ratio = useDraftSlider(
    activityThresholdRatio,
    setActivityThresholdRatio,
  );

  const handleReset = () => {
    setActivityThresholdRatio(DEFAULT_ACTIVITY_THRESHOLD_RATIO);
  };

  const percentLabel = `${Math.round(Number(ratio.value) * 100)}%`;

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Activity Threshold</h4>
        <Tooltip title="Reset to 50%" placement="top">
          <IconButton
            variant="subtle"
            size="sm"
            onClick={handleReset}
            className="neural-control-panel__reset"
            aria-label="reset activity threshold"
            disabled={!activityThresholdEnabled}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <FormControlLabel
        control={
          <Switch
            checked={activityThresholdEnabled}
            onChange={(e) => setActivityThresholdEnabled(e.target.checked)}
            size="small"
          />
        }
        label={activityThresholdEnabled ? "Enabled" : "Disabled"}
        sx={{ marginLeft: 0 }}
      />

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Threshold position
          </span>
          <span className="neural-control-panel__field-value">
            {percentLabel}
          </span>
        </div>
        <Slider
          value={Number(ratio.value) || 0}
          onChange={(e, v) => {
            perf.count("slider.activityThresholdRatio");
            ratio.onChange(e, v);
          }}
          onChangeCommitted={ratio.onChangeCommitted}
          min={0}
          max={1}
          step={0.01}
          marks={[
            { value: 0, label: "0%" },
            { value: 0.25, label: "25%" },
            { value: 0.5, label: "50%" },
            { value: 0.75, label: "75%" },
            { value: 1, label: "100%" },
          ]}
          disabled={!activityThresholdEnabled}
        />
      </div>
    </Panel>
  );
};

export default ActivityThresholdControls;
