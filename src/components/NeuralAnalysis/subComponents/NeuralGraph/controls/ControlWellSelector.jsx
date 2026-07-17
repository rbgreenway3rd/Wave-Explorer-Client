import React, { useState } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel, Button } from "../../../../ui";
import {
  useNeuralSelection,
  useNeuralSettings,
} from "../../../NeuralProvider";
import NeuralWellPickerModal from "../../WellSelection/NeuralWellPickerModal";
import "./NeuralControlPanel.css";

/**
 * ControlWellSelector — picks a control well for noise suppression.
 * Reads selection state from NeuralSelectionContext directly. The only
 * prop is `disabled`, since whether the control should be active is
 * driven by the parent's noise-suppression toggle (not selection state).
 *
 * Buttons use the Button primitive (variants: secondary / danger) plus
 * two state-modifier classes (`--selecting` / `--selected`) that
 * override the variant's color tokens for the dark-theme info-cyan and
 * success-green visual states. Replaces ~50 lines of hand-rolled
 * <button>/CSS that didn't share size/font/focus-ring conventions with
 * the rest of the modal's actions.
 */
const ControlWellSelector = ({ disabled = false }) => {
  const { selectedWell, controlWell, setControlWell } = useNeuralSelection();
  const { subtractControl, setSubtractControl } = useNeuralSettings();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleButtonClick = () => {
    if (disabled) return;
    setPickerOpen(true);
  };

  const stateClass = controlWell
    ? "neural-control-well-button--selected"
    : "";

  return (
    <Panel
      variant="dark"
      className={
        "neural-control-panel control-well-selector-container" +
        (disabled ? " neural-control-panel--inert" : "")
      }
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Control Well Selection</h4>
      </div>

      <FormControlLabel
        style={{ "--neural-method-accent": "var(--color-info)" }}
        control={
          <Switch
            size="small"
            checked={subtractControl}
            disabled={disabled}
            onChange={(_, checked) => setSubtractControl(checked)}
          />
        }
        label="Subtract Control Well Signature"
      />

      <Button
        variant="secondary"
        block
        className={`neural-control-well-button ${stateClass}`.trim()}
        onClick={handleButtonClick}
        disabled={disabled}
      >
        {controlWell ? `Control: ${controlWell.key}` : "Select Control Well"}
      </Button>

      {controlWell && (
        <Button
          variant="danger"
          block
          size="sm"
          className="neural-control-well-reset"
          onClick={() => setControlWell(null)}
          disabled={disabled}
        >
          Reset Control Well
        </Button>
      )}

      {controlWell && (
        <div className="neural-control-well-info">
          <p>
            Control Well:{" "}
            <span className="neural-control-well-info__control-key">
              {controlWell.key}
            </span>
          </p>
          {selectedWell && (
            <p>
              Subtracting from:{" "}
              <span className="neural-control-well-info__target-key">
                {selectedWell.key}
              </span>
            </p>
          )}
        </div>
      )}

      <NeuralWellPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Control Well"
        multiSelect={false}
        accentColor="#00bcd4"
        initialSelectedIds={controlWell ? [controlWell.id] : []}
        onConfirm={(wells) => setControlWell(wells[0] ?? null)}
      />
    </Panel>
  );
};

export default ControlWellSelector;
