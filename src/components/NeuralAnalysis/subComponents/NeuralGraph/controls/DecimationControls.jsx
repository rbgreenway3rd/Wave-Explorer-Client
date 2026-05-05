import React from "react";
import {
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Switch,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * DecimationControls — toggles graph decimation and selects target
 * sample count. Reduces points rendered to chart.js for very long
 * recordings; improves interactivity at the cost of fidelity. Reads its
 * own state from NeuralSettingsContext.
 *
 * Master toggle uses a plain MUI Switch (matches every other toggle in
 * the modal). Sample picker uses dark-themed `.neural-decimation-samples`.
 */
const DecimationControls = () => {
  const {
    decimationEnabled,
    setDecimationEnabled,
    decimationSamples,
    setDecimationSamples,
  } = useNeuralSettings();
  const sampleOptions = [50, 100, 200, 400];

  return (
    <Panel variant="dark" className="neural-control-panel">
      <div className="neural-control-panel__header">
        <FilterListIcon className="neural-control-panel__icon" />
        <h4 className="neural-control-panel__title">Data Decimation</h4>
      </div>

      <div className="neural-control-panel__methods">
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-primary)" }}
          control={
            <Switch
              checked={decimationEnabled}
              onChange={(_, checked) => setDecimationEnabled(checked)}
            />
          }
          label={decimationEnabled ? "Enabled" : "Disabled"}
        />
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
