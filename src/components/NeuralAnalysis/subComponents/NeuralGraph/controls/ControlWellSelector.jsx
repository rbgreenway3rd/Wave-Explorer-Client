import React from "react";
import { Panel } from "../../../../ui";
import "./NeuralControlPanel.css";

/**
 * ControlWellSelector — picks a control well for noise suppression.
 * Three states reflected in the chip button:
 *   - default:  "Select Control Well"
 *   - selecting: "Click a well to set as Control" (info-blue)
 *   - selected:  "Control: <key>" (success-green) + Reset button
 */
const ControlWellSelector = ({
  controlWell,
  setControlWell,
  selectingControl,
  setSelectingControl,
  selectedWell,
  disabled = false,
}) => {
  const handleButtonClick = () => {
    if (disabled || controlWell) return;
    setSelectingControl(!selectingControl);
  };

  const buttonClass = [
    "neural-control-well-button",
    selectingControl && "neural-control-well-button--selecting",
    !selectingControl && controlWell && "neural-control-well-button--selected",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Panel
      variant="dark"
      className="neural-control-panel control-well-selector-container"
      style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}
    >
      <h4 className="neural-control-panel__section-title">
        Control Well Selection
      </h4>

      <button
        type="button"
        className={buttonClass}
        onClick={handleButtonClick}
        disabled={disabled}
      >
        {selectingControl
          ? "Click a well to set as Control"
          : controlWell
          ? `Control: ${controlWell.key}`
          : "Select Control Well"}
      </button>

      {controlWell && !selectingControl && (
        <button
          type="button"
          className="neural-control-well-button--reset"
          onClick={() => setControlWell(null)}
          disabled={disabled}
        >
          Reset Control Well
        </button>
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
