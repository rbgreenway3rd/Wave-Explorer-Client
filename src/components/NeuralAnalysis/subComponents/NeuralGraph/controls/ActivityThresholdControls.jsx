import React from "react";
import { FormControlLabel, Slider, Switch, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

const DEFAULT_ACTIVITY_THRESHOLD_RATIO = 0.5;
const DEFAULT_BASELINE_THRESHOLD_RATIO = 0.1;

/**
 * ActivityThresholdControls — toggles + sliders for the chart's two
 * horizontal threshold lines:
 *   1. Activity Threshold (orange) — filters out peaks whose apex Y
 *      falls below the line. The threshold the client praised in the
 *      Neural modal UI review.
 *   2. Baseline Threshold (cyan) — when enabled, overrides per-peak
 *      base detection. Peak width + AUC are then measured between
 *      the line's intercepts with the signal on either side of each
 *      peak. Added per the same UI review.
 *
 * Both ratios are stored 0–1 of each well's processed-signal Y range
 * so each line stays in range across well switches. Both lines are
 * also draggable on the chart itself (see NeuralGraph.js); the chart
 * and these sliders sync on commit (release).
 */
const ActivityThresholdControls = () => {
  const {
    activityThresholdRatio,
    setActivityThresholdRatio,
    activityThresholdEnabled,
    setActivityThresholdEnabled,
    baselineThresholdRatio,
    setBaselineThresholdRatio,
    baselineThresholdEnabled,
    setBaselineThresholdEnabled,
  } = useNeuralSettings();

  const activityRatio = useDraftSlider(
    activityThresholdRatio,
    setActivityThresholdRatio,
  );
  const baselineRatio = useDraftSlider(
    baselineThresholdRatio,
    setBaselineThresholdRatio,
  );

  const handleResetActivity = () => {
    setActivityThresholdRatio(DEFAULT_ACTIVITY_THRESHOLD_RATIO);
  };
  const handleResetBaseline = () => {
    setBaselineThresholdRatio(DEFAULT_BASELINE_THRESHOLD_RATIO);
  };

  const activityPct = `${Math.round(Number(activityRatio.value) * 100)}%`;
  const baselinePct = `${Math.round(Number(baselineRatio.value) * 100)}%`;

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Thresholds</h4>
      </div>

      {/* ----- Activity Threshold ----- */}
      <div className="neural-threshold-section">
        <div className="neural-threshold-section__row">
          <FormControlLabel
            control={
              <Switch
                checked={activityThresholdEnabled}
                onChange={(e) =>
                  setActivityThresholdEnabled(e.target.checked)
                }
                size="small"
              />
            }
            label="Activity"
            sx={{ marginLeft: 0 }}
          />
          <Tooltip title="Reset Activity to 50%" placement="top">
            <span>
              <IconButton
                variant="subtle"
                size="sm"
                onClick={handleResetActivity}
                aria-label="reset activity threshold"
                disabled={!activityThresholdEnabled}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>

        <div className="neural-control-panel__field">
          <div className="neural-control-panel__field-header">
            <span className="neural-control-panel__field-label">
              Position
            </span>
            <span className="neural-control-panel__field-value">
              {activityPct}
            </span>
          </div>
          <Slider
            value={Number(activityRatio.value) || 0}
            onChange={(e, v) => {
              perf.count("slider.activityThresholdRatio");
              activityRatio.onChange(e, v);
            }}
            onChangeCommitted={activityRatio.onChangeCommitted}
            min={0}
            max={1}
            step={0.01}
            disabled={!activityThresholdEnabled}
          />
        </div>
      </div>

      {/* ----- Baseline Threshold ----- */}
      <div className="neural-threshold-section neural-threshold-section--bordered">
        <div className="neural-threshold-section__row">
          <FormControlLabel
            control={
              <Switch
                checked={baselineThresholdEnabled}
                onChange={(e) =>
                  setBaselineThresholdEnabled(e.target.checked)
                }
                size="small"
              />
            }
            label="Baseline"
            sx={{ marginLeft: 0 }}
          />
          <Tooltip title="Reset Baseline to 10%" placement="top">
            <span>
              <IconButton
                variant="subtle"
                size="sm"
                onClick={handleResetBaseline}
                aria-label="reset baseline threshold"
                disabled={!baselineThresholdEnabled}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>

        <div className="neural-control-panel__field">
          <div className="neural-control-panel__field-header">
            <span className="neural-control-panel__field-label">
              Position
            </span>
            <span className="neural-control-panel__field-value">
              {baselinePct}
            </span>
          </div>
          <Slider
            value={Number(baselineRatio.value) || 0}
            onChange={(e, v) => {
              perf.count("slider.baselineThresholdRatio");
              baselineRatio.onChange(e, v);
            }}
            onChangeCommitted={baselineRatio.onChangeCommitted}
            min={0}
            max={1}
            step={0.01}
            disabled={!baselineThresholdEnabled}
          />
        </div>
      </div>
    </Panel>
  );
};

export default ActivityThresholdControls;
