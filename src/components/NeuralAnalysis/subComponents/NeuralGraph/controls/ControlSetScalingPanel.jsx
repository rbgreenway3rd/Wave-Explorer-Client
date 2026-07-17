import React, { useState } from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel, Button } from "../../../../ui";
import {
  useNeuralSelection,
  useNeuralSettings,
  useNeuralResults,
} from "../../../NeuralProvider";
import NeuralWellPickerModal from "../../WellSelection/NeuralWellPickerModal";
import "./NeuralControlPanel.css";

/**
 * ControlSetScalingPanel — picks a SET of "control" wells and toggles
 * control-well scaling. When enabled, every well's reported peak height /
 * AUC read as a % of control (the control wells' median peak height = 100).
 * The graph itself stays in detection units — only the reported numbers
 * are scaled, so the y-axis doesn't move as detection params change.
 * Distinct from the single noise-subtraction control well
 * (ControlWellSelector).
 *
 * The scale factor itself is computed in NeuralResultsContext (detection
 * runs in native units; k is applied post-detection to the reported
 * metrics only — see scaleReportedMetrics in controlScaling.js) and
 * surfaced here read-only for transparency.
 */
const ControlSetScalingPanel = () => {
  const { controlWellSet, setControlWellSet, clearControlSet } =
    useNeuralSelection();
  const { controlScalingEnabled, setControlScalingEnabled } =
    useNeuralSettings();
  const { controlScalingActive, controlScaleFactor, controlMedianPeakHeight } =
    useNeuralResults();
  const [pickerOpen, setPickerOpen] = useState(false);

  const count = controlWellSet?.length || 0;

  // Adaptive format: integers for native-unit peaks (thousands), but
  // decimals for ΔF/F₀ peaks (< 1) — otherwise Math.round shows a real
  // ~0.14 control median as "0".
  const fmtPeak = (v) =>
    !Number.isFinite(v)
      ? "—"
      : Math.abs(v) >= 1
      ? String(Math.round(v))
      : v.toPrecision(2);

  const handleToggleEnabled = (_, checked) => {
    setControlScalingEnabled(checked);
  };

  return (
    <Panel
      variant="dark"
      className="neural-control-panel control-well-selector-container"
    >
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Control-Well Scaling</h4>
      </div>

      <FormControlLabel
        style={{ "--neural-method-accent": "var(--color-info)" }}
        control={
          <Switch
            size="small"
            checked={controlScalingEnabled}
            onChange={handleToggleEnabled}
          />
        }
        label="Scale peaks to % of control"
      />

      <Button
        variant="secondary"
        block
        className="neural-control-well-button"
        onClick={() => setPickerOpen(true)}
        disabled={!controlScalingEnabled}
      >
        {count > 0
          ? `Control wells: ${count} selected`
          : "Select Control Wells"}
      </Button>

      {count > 0 && (
        <Button
          variant="danger"
          block
          size="sm"
          className="neural-control-well-reset"
          onClick={clearControlSet}
          disabled={!controlScalingEnabled}
        >
          Clear Control Set
        </Button>
      )}

      {controlScalingEnabled && (
        <div className="neural-control-well-info">
          {count === 0 ? (
            <p>Select one or more control wells to compute the scale factor.</p>
          ) : controlScalingActive ? (
            <>
              <p>
                Control median peak:{" "}
                <span className="neural-control-well-info__control-key">
                  {fmtPeak(controlMedianPeakHeight)}
                </span>{" "}
                → 100
              </p>
              <p>
                Scale factor (×):{" "}
                <span className="neural-control-well-info__target-key">
                  {controlScaleFactor.toFixed(3)}
                </span>
              </p>
            </>
          ) : (
            <p>
              No scale factor — the selected control wells have no detected
              peaks at the current parameters.
            </p>
          )}
        </div>
      )}

      <NeuralWellPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Control Wells (scaling)"
        multiSelect
        accentColor="#ab47bc"
        initialSelectedIds={controlWellSet.map((w) => w.id)}
        onConfirm={(wells) => setControlWellSet(wells)}
      />
    </Panel>
  );
};

export default ControlSetScalingPanel;
