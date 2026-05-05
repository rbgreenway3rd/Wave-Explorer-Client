import React from "react";
import {
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Slider,
  Switch,
} from "@mui/material";
import { Panel } from "../../../../ui";
import { useNeuralSettings } from "../../../NeuralProvider";
import { useDraftSlider } from "../../../utilities/useDraftSlider";
import "./NeuralControlPanel.css";

/**
 * NoiseSuppressionControls — section header + a master Switch for the
 * suppression pipeline + per-method switches (Trend Flattening,
 * Savitzky-Golay smoothing). The "Subtract Control Well Signature"
 * toggle lives in ControlWellSelector now (co-located with the control-
 * well selection it depends on).
 *
 * SG smoothing is the high-frequency noise reducer; trend flattening
 * tracks the low-frequency baseline. Both can run together. The
 * Advanced disclosure exposes the trend-flattening window + numMinimums
 * sliders, which were hardcoded (200 / 50) before this panel.
 */
const SG_WINDOW_OPTIONS = [5, 7, 9];

const NoiseSuppressionControls = () => {
  const {
    noiseSuppressionActive,
    setNoiseSuppressionActive,
    trendFlatteningEnabled,
    setTrendFlatteningEnabled,
    smoothingEnabled,
    setSmoothingEnabled,
    smoothingWindow,
    setSmoothingWindow,
    trendFlatteningWindow,
    setTrendFlatteningWindow,
    trendFlatteningMinimums,
    setTrendFlatteningMinimums,
  } = useNeuralSettings();

  const tfWindow = useDraftSlider(
    trendFlatteningWindow,
    setTrendFlatteningWindow
  );
  const tfMin = useDraftSlider(
    trendFlatteningMinimums,
    setTrendFlatteningMinimums
  );
  // numMinimums must remain ≤ window — clamp on commit.
  const handleTfMinCommit = (e, v) => {
    const clamped = Math.min(Number(v) || 0, trendFlatteningWindow - 1);
    tfMin.onChangeCommitted(e, clamped);
  };

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
              size="small"
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
              size="small"
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
          style={{ "--neural-method-accent": "var(--color-primary)" }}
          control={
            <Switch
              size="small"
              checked={!!smoothingEnabled}
              disabled={!noiseSuppressionActive}
              onChange={(_, checked) => setSmoothingEnabled(checked)}
            />
          }
          label="Savitzky-Golay Smoothing"
        />
      </div>

      <div className="neural-sg-window-strip">
        <FormLabel className="neural-sg-window-strip__label">Window:</FormLabel>
        <RadioGroup
          row
          value={smoothingWindow}
          onChange={(e) => setSmoothingWindow(Number(e.target.value))}
          aria-label="sg-window"
          name="sg-window"
          className="neural-sg-window-strip__group"
        >
          {SG_WINDOW_OPTIONS.map((w) => (
            <FormControlLabel
              key={w}
              value={w}
              control={<Radio size="small" />}
              label={w}
              disabled={!smoothingEnabled || !noiseSuppressionActive}
            />
          ))}
        </RadioGroup>
      </div>

      <details className="neural-control-panel__advanced">
        <summary>Advanced</summary>
        <div className="neural-control-panel__field">
          <div className="neural-control-panel__field-header">
            <span className="neural-control-panel__field-label">
              Baseline Window
            </span>
            <span className="neural-control-panel__field-value">
              {tfWindow.value}
            </span>
          </div>
          <Slider
            value={Number(tfWindow.value) || 0}
            onChange={tfWindow.onChange}
            onChangeCommitted={tfWindow.onChangeCommitted}
            min={50}
            max={500}
            step={10}
            disabled={!noiseSuppressionActive || !trendFlatteningEnabled}
            marks={[
              { value: 50, label: "50" },
              { value: 200, label: "200" },
              { value: 500, label: "500" },
            ]}
          />
        </div>

        <div className="neural-control-panel__field">
          <div className="neural-control-panel__field-header">
            <span className="neural-control-panel__field-label">
              Baseline Minimums
            </span>
            <span className="neural-control-panel__field-value">
              {tfMin.value}
            </span>
          </div>
          <Slider
            value={Number(tfMin.value) || 0}
            onChange={tfMin.onChange}
            onChangeCommitted={handleTfMinCommit}
            min={5}
            max={100}
            step={1}
            disabled={!noiseSuppressionActive || !trendFlatteningEnabled}
            marks={[
              { value: 5, label: "5" },
              { value: 50, label: "50" },
              { value: 100, label: "100" },
            ]}
          />
        </div>
      </details>
    </Panel>
  );
};

export default NoiseSuppressionControls;
