import React from "react";
import { Panel, Button } from "../../../../ui";
import { useNeuralSelection } from "../../../NeuralProvider";
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
  const {
    selectedWell,
    controlWell,
    setControlWell,
    selectingControl,
    setSelectingControl,
  } = useNeuralSelection();

  const handleButtonClick = () => {
    if (disabled || controlWell) return;
    setSelectingControl(!selectingControl);
  };

  const stateClass = selectingControl
    ? "neural-control-well-button--selecting"
    : controlWell
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

      <Button
        variant="secondary"
        block
        className={`neural-control-well-button ${stateClass}`.trim()}
        onClick={handleButtonClick}
        disabled={disabled || (!selectingControl && !!controlWell)}
      >
        {selectingControl
          ? "Click a well to set as Control"
          : controlWell
          ? `Control: ${controlWell.key}`
          : "Select Control Well"}
      </Button>

      {controlWell && !selectingControl && (
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
    </Panel>
  );
};

export default ControlWellSelector;
