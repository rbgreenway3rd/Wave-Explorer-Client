import React from "react";
import { FormControlLabel, Switch } from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import "./NeuralControlPanel.css";

/**
 * NoiseSuppressionControls — section header + a master Switch for the
 * suppression pipeline + per-method switches (Trend Flattening,
 * Subtract Control). Reads its own state from NeuralSettingsContext.
 *
 * Master toggle is a plain MUI Switch — replaces the previous nested
 * dual ON/OFF IconButton pill which read as triple-bordered chrome on
 * top of the new card design.
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
      <div className="neural-control-panel__header">
        <h4 className="neural-control-panel__title">Noise Suppression</h4>
      </div>

      <div className="neural-control-panel__methods">
        {/* Master toggle */}
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-primary)" }}
          control={
            <Switch
              checked={noiseSuppressionActive}
              onChange={(_, checked) => setNoiseSuppressionActive(checked)}
            />
          }
          label={noiseSuppressionActive ? "Enabled" : "Disabled"}
        />

        {/* Method switches */}
        <FormControlLabel
          style={{ "--neural-method-accent": "var(--color-primary)" }}
          control={
            <Switch
              checked={!!trendFlatteningEnabled}
              disabled={!noiseSuppressionActive}
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
              disabled={!noiseSuppressionActive}
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
