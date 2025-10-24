import DecimationControls from "./DecimationControls";
import "../../styles/ChartControls.css";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import Box from "@mui/material/Box";

import React, { useEffect, useState } from "react";
import { detectSpikes } from "../../utilities/detectSpikes";
import { detectBursts } from "../../utilities/burstDetection";
// ...existing imports...

const ChartControls = ({
  resetZoom,
  useAdjustedBases,
  setUseAdjustedBases,
  findPeaksWindowWidth,
  setFindPeaksWindowWidth,
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
  processedSignal,
  smoothingWindow,
  spikeProminence,
  setSpikeProminence,
  spikeWindow,
  setSpikeWindow,
  spikeThreshold,
  setSpikeThreshold,
  spikeMinDistance,
  setSpikeMinDistance,
  setPeakResults,
  peakResults,
  setBurstResults,
  setShowBursts,
  defineROI,
  setDefineROI,
  enablePanZoom,
  setEnablePanZoom,
  zoomState,
  setZoomState,
  panState,
  setPanState,
  roiList,
  setRoiList,
  currentRoiIndex,
  setCurrentRoiIndex,
  selectedWell,
}) => {
  // (Removed: default state setting now handled in NeuralAnalysisModal)

  // --- Spike/Burst Detection Controls and Logic ---
  const [pendingRoiIndex, setPendingRoiIndex] = useState(null);

  // Enable Pan/Zoom ON by default, only one control can be on at a time
  useEffect(() => {
    // Only set defaults on initial mount
    setEnablePanZoom?.(true);
    setDefineROI?.(false);
    setZoomState?.(true);
    setPanState?.(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suggest prominence based on signal amplitude
  function suggestProminence(signal, factor = 3) {
    if (!Array.isArray(signal) || signal.length === 0) return 1;
    const ySignal = signal.map((pt) => pt.y);
    const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
    const variance =
      ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
    return Math.floor(factor * Math.sqrt(variance));
  }

  function suggestWindow(signal, prominence, num = 5) {
    if (!Array.isArray(signal) || signal.length === 0) return 20;
    const maxWindow = Math.floor(signal.length / 10);
    const foundPeaks = [];
    let optimalWindowWidth = 0;
    for (let ww = 10; ww <= maxWindow; ww += 5) {
      const peaks = detectSpikes(signal, { prominence, window: ww });
      foundPeaks.push(peaks.length);
      if (foundPeaks.length > num) foundPeaks.shift();
      if (foundPeaks.length === num) {
        const average = foundPeaks.reduce((sum, v) => sum + v, 0) / num;
        const variance =
          foundPeaks.reduce((sum, v) => sum + (v - average) ** 2, 0) / num;
        if (Math.sqrt(variance) <= 1) {
          optimalWindowWidth = ww;
          break;
        }
      }
    }
    return optimalWindowWidth || 20;
  }

  // (Removed: spike parameter suggestion now handled in NeuralAnalysisModal)

  const handleSuggestProminence = () => {
    if (
      !processedSignal ||
      !Array.isArray(processedSignal) ||
      processedSignal.length === 0
    ) {
      alert("No processed signal available for this well.");
      return;
    }
    const suggested = suggestProminence(processedSignal, 0.5);
    setSpikeProminence && setSpikeProminence(suggested);
    alert(`Suggested prominence: ${suggested}`);
  };

  const handleSuggestWindow = () => {
    if (
      !processedSignal ||
      !Array.isArray(processedSignal) ||
      processedSignal.length === 0
    ) {
      alert("No processed signal available for this well.");
      return;
    }
    const suggested = suggestWindow(
      processedSignal,
      Number(spikeProminence),
      5
    );
    setSpikeWindow && setSpikeWindow(suggested);
    alert(`Suggested window: ${suggested}`);
  };

  const handleRunSpikeDetection = () => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("triggerPipelineSpikeDetection"));
    }
    alert("Spike detection will be updated via the main analysis pipeline.");
  };

  const handleRunBurstDetection = () => {
    if (typeof setShowBursts === "function") {
      setShowBursts(true);
      alert("Burst detection will be updated via the main analysis pipeline.");
    }
  };

  const handleDefineRoi = (idx) => {
    setCurrentRoiIndex && setCurrentRoiIndex(idx);
    setPendingRoiIndex(idx);
  };

  const handleDeleteRoi = (idx) => {
    const newRoiList = roiList.filter((_, i) => i !== idx);
    setRoiList && setRoiList(newRoiList);
    if (pendingRoiIndex !== null && pendingRoiIndex > idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(pendingRoiIndex - 1);
      setPendingRoiIndex(pendingRoiIndex - 1);
    } else if (pendingRoiIndex === idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(null);
      setPendingRoiIndex(null);
    }
  };

  useEffect(() => {
    setPendingRoiIndex(currentRoiIndex);
  }, [currentRoiIndex]);

  useEffect(() => {
    if (!defineROI) {
      setPendingRoiIndex(null);
      setCurrentRoiIndex && setCurrentRoiIndex(null);
    }
  }, [defineROI, setCurrentRoiIndex]);

  const roiColors = [
    { bg: "rgba(0, 255, 0, 0.15)", border: "rgba(0, 255, 0, 0.7)" },
    { bg: "rgba(0, 0, 255, 0.12)", border: "rgba(0, 0, 255, 0.7)" },
    { bg: "rgba(255, 0, 0, 0.12)", border: "rgba(255, 0, 0, 0.7)" },
    { bg: "rgba(255, 165, 0, 0.13)", border: "rgba(255, 165, 0, 0.7)" },
    { bg: "rgba(128, 0, 128, 0.13)", border: "rgba(128, 0, 128, 0.7)" },
    { bg: "rgba(0, 206, 209, 0.13)", border: "rgba(0, 206, 209, 0.7)" },
    { bg: "rgba(255, 192, 203, 0.13)", border: "rgba(255, 192, 203, 0.7)" },
    { bg: "rgba(255, 255, 0, 0.13)", border: "rgba(255, 255, 0, 0.7)" },
  ];

  const renderRoiButtons = () => {
    if (!defineROI) return null;
    const buttons = [];
    const numRois = roiList.length;
    for (let i = 0; i <= numRois; i++) {
      const isDefined = i < numRois;
      const isActive = pendingRoiIndex === i;
      const label = isDefined ? `Edit ROI ${i + 1}` : `Define ROI ${i + 1}`;
      const roiColor = roiColors[i % roiColors.length];
      buttons.push(
        <span
          key={i}
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: 8,
          }}
        >
          <button
            className="define-roi-button"
            style={{
              background: isActive ? "#00bcd4" : undefined,
              color: isActive ? "#fff" : undefined,
              border: isActive
                ? "2px solid #00bcd4"
                : isDefined
                ? `2px solid ${roiColor.border}`
                : "1px solid #888",
              borderRadius: 4,
              fontWeight: 600,
              cursor: "pointer",
              opacity: isActive ? 1 : isDefined ? 0.95 : 1,
              marginRight: 2,
            }}
            disabled={!defineROI || (pendingRoiIndex !== null && !isActive)}
            onClick={() => handleDefineRoi(i)}
          >
            {label}
          </button>
          {isDefined && (
            <button
              className="delete-roi-x"
              style={{
                marginLeft: 2,
                background: "transparent",
                color: "#f44336",
                border: "none",
                fontWeight: "bold",
                fontSize: "1.1em",
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
              title={`Delete ROI ${i + 1}`}
              onClick={() => handleDeleteRoi(i)}
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </span>
      );
    }
    return <Box sx={{ mt: 2 }}>{buttons}</Box>;
  };

  // --- UI ---
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
          {/* <FormControlLabel
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
          /> */}

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
      {/* --- Spike/Burst Detection Controls UI --- */}
      <div className="spike-detection-controls">
        {/* <div>
          <button
            className="spike-detection-parameter-button"
            onClick={handleSuggestProminence}
          >
            Suggest Prominence
          </button>
          <button
            className="spike-detection-parameter-button"
            onClick={handleSuggestWindow}
          >
            Suggest Window
          </button>
          <label className="spike-detection-label">
            Prominence:
            <input
              type="number"
              step="0.1"
              min="0"
              value={spikeProminence || ""}
              onChange={(e) =>
                setSpikeProminence && setSpikeProminence(e.target.value)
              }
              className="spike-detection-input"
            />
          </label>
          <label className="spike-detection-label">
            Window:
            <input
              type="number"
              min="1"
              value={spikeWindow || ""}
              onChange={(e) => setSpikeWindow && setSpikeWindow(e.target.value)}
              className="spike-detection-input"
            />
          </label>
          <label className="spike-detection-label">
            Threshold:
            <input
              type="number"
              step="0.1"
              value={spikeThreshold || ""}
              onChange={(e) =>
                setSpikeThreshold && setSpikeThreshold(e.target.value)
              }
              className="spike-detection-input"
            />
          </label>
          <label className="spike-detection-label">
            Min Distance:
            <input
              type="number"
              min="1"
              value={spikeMinDistance || ""}
              onChange={(e) =>
                setSpikeMinDistance && setSpikeMinDistance(e.target.value)
              }
              className="spike-detection-input"
            />
          </label>
        </div> */}
        {/* <Button
          onClick={handleRunSpikeDetection}
          className="run-spike-detection-button"
        >
          Run Spike Detection
        </Button>
        <Button
          onClick={handleRunBurstDetection}
          className="run-burst-detection-button"
        >
          Run Burst Detection
        </Button> */}
      </div>
      {/* --- ROI and Pan/Zoom Toggles --- */}
      <div className="show-bursts-toggle-row">
        <FormGroup row>
          <FormControlLabel
            control={
              <Switch
                checked={!!defineROI}
                onChange={(_, checked) => {
                  setDefineROI?.(checked);
                  if (checked) {
                    setEnablePanZoom?.(false);
                    setZoomState?.(false);
                    setPanState?.(false);
                  }
                }}
                color="primary"
              />
            }
            label="Define ROI"
          />
          <FormControlLabel
            control={
              <Switch
                checked={!!zoomState && !!panState}
                onChange={(_, checked) => {
                  setEnablePanZoom?.(checked);
                  setZoomState?.(checked);
                  setPanState?.(checked);
                  if (checked) {
                    setDefineROI?.(false);
                  }
                }}
                color="primary"
              />
            }
            label="Enable Pan/Zoom"
          />
        </FormGroup>
      </div>
      {/* --- ROI Buttons --- */}
      {renderRoiButtons()}
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
