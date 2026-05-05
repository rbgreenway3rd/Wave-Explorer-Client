import React from "react";
import { Slider, Tooltip } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { Panel, IconButton } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { perf } from "../../../utilities/perfLogger";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * HandleOutlierControls — sliders for percentile threshold (50–99) and
 * median multiplier (0.5–5.0×). Reads outlier state directly from
 * NeuralSettingsContext; sliders use useDraftSlider so dragging only
 * updates a local value and the pipeline-triggering setter fires once
 * on release.
 */
const HandleOutlierControls = () => {
  const {
    handleOutliers,
    outlierPercentile,
    setOutlierPercentile,
    outlierMultiplier,
    setOutlierMultiplier,
  } = useNeuralSettings();
  const DEFAULT_PERCENTILE = 95;
  const DEFAULT_MULTIPLIER = 2.0;

  const percentile = useDraftSlider(outlierPercentile, setOutlierPercentile);
  const multiplier = useDraftSlider(outlierMultiplier, setOutlierMultiplier);

  const handleReset = () => {
    setOutlierPercentile(DEFAULT_PERCENTILE);
    setOutlierMultiplier(DEFAULT_MULTIPLIER);
  };

  return (
    <Panel
      variant="dark"
      className={`neural-control-panel ${
        handleOutliers ? "" : "neural-control-panel--disabled"
      }`}
      style={{ "--neural-control-accent": "var(--color-warning)" }}
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">
          Outlier Handling Parameters
        </h4>
        <Tooltip title="Reset to defaults" placement="top">
          <IconButton
            variant="subtle"
            size="sm"
            onClick={handleReset}
            disabled={!handleOutliers}
            className="neural-control-panel__reset"
            aria-label="reset outlier parameters"
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Percentile Threshold
          </span>
          <span className="neural-control-panel__field-value">
            {percentile.value}th
          </span>
        </div>
        <Slider
          value={percentile.value}
          onChange={(e, v) => {
            perf.count("slider.outlierPercentile");
            percentile.onChange(e, v);
          }}
          onChangeCommitted={percentile.onChangeCommitted}
          disabled={!handleOutliers}
          min={50}
          max={99}
          step={1}
          marks={[
            { value: 50, label: "50" },
            { value: 75, label: "75" },
            { value: 95, label: "95" },
            { value: 99, label: "99" },
          ]}
        />
      </div>

      <div className="neural-control-panel__field">
        <div className="neural-control-panel__field-header">
          <span className="neural-control-panel__field-label">
            Median Multiplier
          </span>
          <span className="neural-control-panel__field-value">
            {Number(multiplier.value).toFixed(1)}×
          </span>
        </div>
        <Slider
          value={multiplier.value}
          onChange={(e, v) => {
            perf.count("slider.outlierMultiplier");
            multiplier.onChange(e, v);
          }}
          onChangeCommitted={multiplier.onChangeCommitted}
          disabled={!handleOutliers}
          min={0.5}
          max={5.0}
          step={0.1}
          marks={[
            { value: 0.5, label: "0.5" },
            { value: 1.0, label: "1.0" },
            { value: 2.0, label: "2.0" },
            { value: 3.0, label: "3.0" },
            { value: 4.0, label: "4.0" },
            { value: 5.0, label: "5.0" },
          ]}
        />
      </div>
    </Panel>
  );
};

export default HandleOutlierControls;
