import React from "react";
import DecimationControls from "./DecimationControls";
import "../../styles/ChartControls.css";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";

const ChartControls = ({
  resetZoom,
  useAdjustedBases,
  setUseAdjustedBases,
  findPeaksWindowWidth,
  setFindPeaksWindowWidth,
  peakProminence,
  setPeakProminence,
  decimationEnabled,
  setDecimationEnabled,
  decimationSamples,
  setDecimationSamples,
  noiseSuppressionActive,
  setNoiseSuppressionActive,
  subtractControl,
  setSubtractControl,
  filterBaseline,
  setFilterBaseline,
  baselineCorrection,
  setBaselineCorrection,
  trendFlatteningEnabled,
  setTrendFlatteningEnabled,
  controlWell,
  setControlWell,
  selectingControl,
  setSelectingControl,
}) => {
  return (
    <div className="chart-controls">
      <div className="noise-suppression-container">
        <div className="noise-suppression-toggle">
          <Tooltip title="Turn Noise Suppression ON">
            <span>
              <IconButton
                className="noise-suppression-on-button"
                onClick={() => setNoiseSuppressionActive(true)}
                color={noiseSuppressionActive ? "primary" : "default"}
                disabled={noiseSuppressionActive}
                sx={{
                  background: noiseSuppressionActive ? "#e0f7fa" : undefined,
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    color: noiseSuppressionActive ? "#00bcd4" : "#888",
                  }}
                >
                  ON
                </span>
              </IconButton>
            </span>
          </Tooltip>
          <span>{` / `}</span>
          <Tooltip title="Turn Noise Suppression OFF">
            <span>
              <IconButton
                className="noise-suppression-off-button"
                onClick={() => setNoiseSuppressionActive(false)}
                color={!noiseSuppressionActive ? "primary" : "default"}
                disabled={!noiseSuppressionActive}
                sx={{
                  background: !noiseSuppressionActive ? "#e0f7fa" : undefined,
                }}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: 16,
                    color: !noiseSuppressionActive ? "#00bcd4" : "#888",
                  }}
                >
                  OFF
                </span>
              </IconButton>
            </span>
          </Tooltip>
        </div>
        <div className="noise-suppression-methods">
          <FormControlLabel
            control={
              <Switch
                checked={!!trendFlatteningEnabled}
                onChange={(_, checked) => {
                  if (typeof setTrendFlatteningEnabled === "function")
                    setTrendFlatteningEnabled(checked);
                  if (checked) {
                    // When trend flattening is enabled, turn off other baseline corrections
                    if (typeof setBaselineCorrection === "function")
                      setBaselineCorrection(false);
                    if (typeof setFilterBaseline === "function")
                      setFilterBaseline(false);
                    if (typeof setSubtractControl === "function")
                      setSubtractControl(false);
                  }
                }}
                color="primary"
              />
            }
            label="Trend Flattening (Detrending)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={subtractControl}
                onChange={(_, checked) => {
                  setSubtractControl(checked);
                  if (checked && typeof setFilterBaseline === "function")
                    setFilterBaseline(false);
                }}
                color="primary"
              />
            }
            label="Subtract Control Well Signature"
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!filterBaseline}
                onChange={(_, checked) => {
                  if (typeof setFilterBaseline === "function")
                    setFilterBaseline(checked);
                  if (checked) setSubtractControl(false);
                }}
                color="primary"
              />
            }
            label="Filter Baseline Noise"
          />

          <FormControlLabel
            control={
              <Switch
                checked={!!baselineCorrection}
                onChange={(_, checked) => {
                  if (typeof setBaselineCorrection === "function")
                    setBaselineCorrection(checked);
                  if (checked) {
                    setSubtractControl(false);
                    if (typeof setFilterBaseline === "function")
                      setFilterBaseline(false);
                  }
                }}
                color="primary"
              />
            }
            label="Baseline Correction"
          />
          {noiseSuppressionActive && (
            <Box sx={{ mt: 2 }}>
              <button
                className={
                  selectingControl
                    ? "grid-mode-button grid-mode-button-active"
                    : "grid-mode-button"
                }
                onClick={() => {
                  if (controlWell) {
                    setControlWell(null);
                    setSelectingControl(true);
                  } else {
                    setSelectingControl((v) => !v);
                  }
                }}
              >
                {selectingControl
                  ? "Click a well to set as Control"
                  : controlWell
                  ? `Control: ${controlWell.key}`
                  : "Select Control Well"}
              </button>
            </Box>
          )}
        </div>
      </div>
      <DecimationControls
        decimationEnabled={decimationEnabled}
        setDecimationEnabled={setDecimationEnabled}
        decimationSamples={decimationSamples}
        setDecimationSamples={setDecimationSamples}
      />
      <button onClick={resetZoom}>Reset Zoom</button>
      {/* Add more controls as needed */}
    </div>
  );
};

export default ChartControls;
