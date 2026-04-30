import React from "react";
import {
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  IconButton,
  Tooltip,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Panel } from "../../../../ui";
import "./NeuralControlPanel.css";

/**
 * DecimationControls — toggles graph decimation and selects target
 * sample count. Reduces points rendered to chart.js for very long
 * recordings; improves interactivity at the cost of fidelity.
 */
const DecimationControls = ({
  decimationEnabled,
  setDecimationEnabled,
  decimationSamples,
  setDecimationSamples,
}) => {
  const sampleOptions = [50, 100, 200, 400];

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__section-header">
        <FilterListIcon />
        <h4 className="neural-control-panel__title">Data Decimation</h4>
      </div>

      {/* ON/OFF dual-toggle */}
      <div className="neural-toggle-group">
        <Tooltip title="Enable Decimation" arrow>
          <IconButton
            className={`neural-toggle-group__button neural-toggle-group__button--on ${
              decimationEnabled ? "neural-toggle-group__button--active" : ""
            }`}
            onClick={() => setDecimationEnabled(true)}
            disabled={decimationEnabled}
          >
            ON
          </IconButton>
        </Tooltip>
        <span className="neural-toggle-group__divider">/</span>
        <Tooltip title="Disable Decimation" arrow>
          <IconButton
            className={`neural-toggle-group__button neural-toggle-group__button--off ${
              !decimationEnabled ? "neural-toggle-group__button--active" : ""
            }`}
            onClick={() => setDecimationEnabled(false)}
            disabled={!decimationEnabled}
          >
            OFF
          </IconButton>
        </Tooltip>
      </div>

      {/* Sample count radio group */}
      <div className="neural-decimation-samples">
        <FormLabel>Samples:</FormLabel>
        <RadioGroup
          row
          value={decimationSamples}
          onChange={(e) => setDecimationSamples(Number(e.target.value))}
          aria-label="decimation-samples"
          name="decimation-samples"
        >
          {sampleOptions.map((val) => (
            <FormControlLabel
              key={val}
              value={val}
              control={<Radio size="small" />}
              label={val}
              disabled={!decimationEnabled}
            />
          ))}
        </RadioGroup>
      </div>
    </Panel>
  );
};

export default DecimationControls;
