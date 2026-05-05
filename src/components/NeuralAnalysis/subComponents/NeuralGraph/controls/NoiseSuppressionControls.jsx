import React from "react";
import { FormControlLabel, Switch, Tooltip, IconButton } from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * NoiseSuppressionControls — wraps a section header, a dual ON/OFF
 * IconButton toggle for the suppression pipeline as a whole, and a list
 * of method switches (Trend Flattening, Subtract Control). Reads its own
 * state from NeuralSettingsContext.
 */
const NoiseSuppressionControls = () => {
  const {
    noiseSuppressionActive,
    setNoiseSuppressionActive,
    trendFlatteningEnabled,
    setTrendFlatteningEnabled,
    subtractControl,
    setSubtractControl,
    setFilterBaseline,
  } = useNeuralSettings();
  return (
    <Panel
      variant="dark"
      className="neural-control-panel noise-suppression-container"
    >
      <h4 className="neural-control-panel__section-title">Noise Suppression</h4>

      {/* ON/OFF dual-toggle */}
      <div className="neural-toggle-group">
        <Tooltip title="Enable Noise Suppression" arrow>
          <IconButton
            className={`neural-toggle-group__button neural-toggle-group__button--on ${
              noiseSuppressionActive ? "neural-toggle-group__button--active" : ""
            }`}
            onClick={() => setNoiseSuppressionActive(true)}
            disabled={noiseSuppressionActive}
          >
            ON
          </IconButton>
        </Tooltip>
        <span className="neural-toggle-group__divider">/</span>
        <Tooltip title="Disable Noise Suppression" arrow>
          <IconButton
            className={`neural-toggle-group__button neural-toggle-group__button--off ${
              !noiseSuppressionActive ? "neural-toggle-group__button--active" : ""
            }`}
            onClick={() => setNoiseSuppressionActive(false)}
            disabled={!noiseSuppressionActive}
          >
            OFF
          </IconButton>
        </Tooltip>
      </div>

      {/* Method switches */}
      <div className="neural-control-panel__methods">
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-primary)" }}
          control={
            <Switch
              checked={!!trendFlatteningEnabled}
              onChange={(_, checked) => {
                if (typeof setTrendFlatteningEnabled === "function") {
                  setTrendFlatteningEnabled(checked);
                }
              }}
            />
          }
          label="Trend Flattening (Detrending)"
        />

        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-info)" }}
          control={
            <Switch
              checked={subtractControl}
              onChange={(_, checked) => {
                setSubtractControl(checked);
                if (checked && typeof setFilterBaseline === "function") {
                  setFilterBaseline(false);
                }
              }}
            />
          }
          label="Subtract Control Well Signature"
        />
      </div>
    </Panel>
  );
};

export default NoiseSuppressionControls;
