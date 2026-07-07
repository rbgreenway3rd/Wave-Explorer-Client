import React from "react";
import { Slider, Tooltip, FormControlLabel, Switch } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * HandleOutlierControls — the Sensitivity slider (cutoff margin above the
 * real signal) plus a "Show Removed Outliers" visualization toggle. Reads
 * outlier state directly from NeuralSettingsContext; the slider uses
 * useDraftSlider so dragging only updates a local value and the
 * pipeline-triggering setter fires once on release.
 */
const HandleOutlierControls = () => {
  const {
    handleOutliers,
    outlierSensitivity,
    setOutlierSensitivity,
    showRemovedOutliers,
    setShowRemovedOutliers,
  } = useNeuralSettings();
  const DEFAULT_SENSITIVITY = 5;

  const sensitivity = useDraftSlider(outlierSensitivity, setOutlierSensitivity);

  return (
    <Panel
      variant="dark"
      className={`neural-control-panel ${
        handleOutliers ? "" : "neural-control-panel--disabled"
      }`}
      style={{ "--neural-control-accent": "var(--color-warning)" }}
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Outlier Handling</h4>
        <Tooltip title="Reset to default" placement="top">
          <IconButton
            variant="subtle"
            size="sm"
            onClick={() => setOutlierSensitivity(DEFAULT_SENSITIVITY)}
            disabled={!handleOutliers}
            className="neural-control-panel__reset"
            aria-label="reset outlier sensitivity"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">Sensitivity</span>
          <span className="neural-control-panel__field-value">
            {Number(sensitivity.value).toFixed(1)}σ
          </span>
        </div>
        <Slider
          value={sensitivity.value}
          onChange={(e, v) => {
            perf.count("slider.outlierSensitivity");
            sensitivity.onChange(e, v);
          }}
          onChangeCommitted={sensitivity.onChangeCommitted}
          disabled={!handleOutliers}
          min={2}
          max={15}
          step={0.5}
          marks={[
            { value: 2, label: "2" },
            { value: 5, label: "5" },
            { value: 10, label: "10" },
            { value: 15, label: "15" },
          ]}
        />
        <p className="neural-control-panel__hint">
          Removes points more than {Number(sensitivity.value).toFixed(1)}× the
          baseline noise (σ) above baseline. Lower removes more; higher keeps
          all but the most extreme.
        </p>
      </div>

      <FormControlLabel
        className="neural-control-panel__switch"
        control={
          <Switch
            checked={showRemovedOutliers}
            onChange={(e) => setShowRemovedOutliers(e.target.checked)}
            disabled={!handleOutliers}
            size="small"
          />
        }
        label="Show removed outliers"
      />
    </Panel>
  );
};

export default HandleOutlierControls;
