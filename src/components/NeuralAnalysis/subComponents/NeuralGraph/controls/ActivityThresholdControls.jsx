import React from "react";
import { FormControlLabel, Slider, Switch, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

const DEFAULT_ACTIVITY_THRESHOLD_RATIO = 0.5;
const DEFAULT_BASELINE_THRESHOLD_OFFSET = 0;

/**
 * ActivityThresholdControls — toggles + sliders for the chart's two
 * horizontal threshold lines:
 *   1. Activity Threshold (orange) — filters out peaks whose apex Y
 *      falls below the line. Stored as a 0–1 ratio of each well's Y range.
 *   2. Baseline Threshold (cyan) — when enabled, overrides per-peak base
 *      detection (peak width + AUC measured between the line's intercepts
 *      with the signal). It AUTO-CENTERS on each well's baseline noise; this
 *      slider is the manual OFFSET from that center in robust σ units
 *      (0 = at the noise center), scale-free so it applies uniformly across
 *      wells.
 *
 * Both lines are also draggable on the chart itself (see NeuralGraph.js);
 * the chart and these sliders sync on commit (release).
 */
const ActivityThresholdControls = () => {
  const {
    activityThresholdRatio,
    setActivityThresholdRatio,
    activityThresholdEnabled,
    setActivityThresholdEnabled,
    baselineThresholdOffset,
    setBaselineThresholdOffset,
    baselineThresholdEnabled,
    setBaselineThresholdEnabled,
  } = useNeuralSettings();

  const activityRatio = useDraftSlider(
    activityThresholdRatio,
    setActivityThresholdRatio,
  );
  const baselineOffset = useDraftSlider(
    baselineThresholdOffset,
    setBaselineThresholdOffset,
  );

  const handleResetActivity = () => {
    setActivityThresholdRatio(DEFAULT_ACTIVITY_THRESHOLD_RATIO);
  };
  const handleResetBaseline = () => {
    setBaselineThresholdOffset(DEFAULT_BASELINE_THRESHOLD_OFFSET);
  };

  const activityPct = `${Math.round(Number(activityRatio.value) * 100)}%`;
  const baselineOffsetLabel = `${
    Number(baselineOffset.value) > 0 ? "+" : ""
  }${Number(baselineOffset.value).toFixed(1)}σ`;

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
          <Tooltip title="Reset Baseline to noise center (0σ)" placement="top">
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
            <span className="neural-control-panel__field-label">Offset</span>
            <span className="neural-control-panel__field-value">
              {baselineOffsetLabel}
            </span>
          </div>
          <Slider
            value={Number(baselineOffset.value) || 0}
            onChange={(e, v) => {
              perf.count("slider.baselineThresholdOffset");
              baselineOffset.onChange(e, v);
            }}
            onChangeCommitted={baselineOffset.onChangeCommitted}
            min={-5}
            max={5}
            step={0.5}
            marks={[
              { value: -5, label: "-5" },
              { value: 0, label: "0" },
              { value: 5, label: "+5" },
            ]}
            disabled={!baselineThresholdEnabled}
          />
        </div>
        <p className="neural-control-panel__hint">
          Auto-centers on the baseline noise; offset in σ nudges it up/down.
        </p>
      </div>
    </Panel>
  );
};

export default ActivityThresholdControls;
