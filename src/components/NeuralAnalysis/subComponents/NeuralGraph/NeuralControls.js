import React, { useState, useContext, useEffect } from "react";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
} from "@mui/material";
import { detectSpikes } from "../../utilities/detectSpikes";
import { detectBursts } from "../../utilities/burstDetection";

// ...existing code...
import { NeuralContext } from "../../NeuralProvider";
import "../../styles/NeuralControls.css";

// Suggest prominence based on signal amplitude
function suggestProminence(signal, factor = 3) {
  if (!Array.isArray(signal) || signal.length === 0) return 1;
  const ySignal = signal.map((pt) => pt.y);
  const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
  const variance =
    ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
  return Math.floor(factor * Math.sqrt(variance));
}

// Suggest window width by looking for stable peak count
function suggestWindow(signal, prominence, num = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return 20;
  // const maxWindow = Math.min(100, Math.floor(signal.length / 10));
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

const NoiseFilterControls = ({
  defineROI,
  setDefineROI,
  enablePanZoom,
  setEnablePanZoom,
  zoomState,
  setZoomState,
  noiseSuppressionActive,
  setNoiseSuppressionActive,
  subtractControl,
  setSubtractControl,
  filterBaseline,
  setFilterBaseline,
  baselineCorrection,
  setBaselineCorrection,
  controlWell,
  smoothingWindow,
  currentRoiIndex,
  setCurrentRoiIndex,
  roiList,
  setRoiList,
  selectingControl,
  setSelectingControl,
  panState,
  setPanState,
  decimationEnabled,
  processedSignal,
  setPeakResults,
  spikeProminence,
  setSpikeProminence,
  spikeWindow,
  setSpikeWindow,
  spikeThreshold,
  setSpikeThreshold,
  spikeMinDistance,
  setSpikeMinDistance,
  peakResults,
  setBurstResults,
  setShowBursts,
  trendFlatteningEnabled,
  setTrendFlatteningEnabled,
  selectedWell,
}) => {
  const [pendingRoiIndex, setPendingRoiIndex] = useState(null);

  useEffect(() => {
    if (
      !processedSignal ||
      !Array.isArray(processedSignal) ||
      processedSignal.length === 0
    ) {
      setSpikeProminence(1);
      setSpikeWindow(20);
      return;
    }
    const suggestedProminence = suggestProminence(processedSignal, 0.5);
    setSpikeProminence(suggestedProminence);
    const suggestedWindow = suggestWindow(
      processedSignal,
      Number(suggestedProminence),
      5
    );
    setSpikeWindow(suggestedWindow);
  }, [processedSignal, selectedWell]);

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
    setSpikeProminence(suggested);
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
    setSpikeWindow(suggested);
    alert(`Suggested window: ${suggested}`);
  };

  // --- Old spike detection handler (commented out for rollback) ---
  /*
  const handleRunSpikeDetection = () => {
    if (
      !processedSignal ||
      !Array.isArray(processedSignal) ||
      processedSignal.length === 0
    ) {
      alert("No processed signal available for this well.");
      return;
    }
    const suggestedProminence = suggestProminence(processedSignal, 0.5);
    setSpikeProminence(suggestedProminence);
    const suggestedWindow = suggestWindow(
      processedSignal,
      Number(suggestedProminence),
      5
    );
    setSpikeWindow(suggestedWindow);
    const options = {
      prominence: Number(suggestedProminence),
      window: Number(suggestedWindow),
      minWidth: 0,
      minDistance: 0,
      minProminenceRatio: 0,
    };
    const spikes = detectSpikes(processedSignal, options);
    setPeakResults(spikes);
    console.log("Detected spikes (NeuralPeak):", spikes);
    alert(`Detected ${spikes.length} spikes. See console for details.`);
  };
  */

  // --- New spike detection handler: triggers pipeline update via prop/callback ---
  const handleRunSpikeDetection = () => {
    // Instead of running detectSpikes directly, trigger a pipeline update by toggling a state or calling a callback
    // For example, if you have a prop like 'onRequestPipelineUpdate', call it here
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("triggerPipelineSpikeDetection"));
    }
    alert("Spike detection will be updated via the main analysis pipeline.");
  };

  // --- Old burst detection handler (commented out for rollback) ---
  /*
  const handleRunBurstDetection = () => {
    if (!Array.isArray(peakResults) || peakResults.length === 0) {
      alert("No spikes detected. Run spike detection first.");
      return;
    }
    const options = {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    };
    const bursts = detectBursts(peakResults, options);
    setBurstResults(bursts);
    setShowBursts(true);
    console.log("Detected bursts (NeuralBurst):", bursts);
    alert(`Detected ${bursts.length} bursts. See console for details.`);
  };
  */

  // --- Old burst detection handler (commented out for rollback) ---
  /*
  const handleRunBurstDetection = React.useCallback(() => {
    // Defensive: get latest peakResults from state
    if (!Array.isArray(peakResults) || peakResults.length === 0) {
      alert("No spikes detected. Run spike detection first.");
      return;
    }
    const options = {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    };
    const bursts = detectBursts(peakResults, options);
    setBurstResults(bursts);
    setShowBursts(true);
    console.log("Detected bursts (NeuralBurst):", bursts);
    alert(`Detected ${bursts.length} bursts. See console for details.`);
  }, [peakResults, setBurstResults, setShowBursts]);
  */

  // --- New burst detection handler: triggers pipeline update via state ---
  const handleRunBurstDetection = () => {
    if (typeof setShowBursts === "function") {
      setShowBursts(true);
      alert("Burst detection will be updated via the main analysis pipeline.");
    }
  };

  const handleDefineRoi = (idx) => {
    setCurrentRoiIndex(idx);
    setPendingRoiIndex(idx);
  };

  const handleDeleteRoi = (idx) => {
    const newRoiList = roiList.filter((_, i) => i !== idx);
    setRoiList(newRoiList);
    if (pendingRoiIndex !== null && pendingRoiIndex > idx) {
      setCurrentRoiIndex(pendingRoiIndex - 1);
      setPendingRoiIndex(pendingRoiIndex - 1);
    } else if (pendingRoiIndex === idx) {
      setCurrentRoiIndex(null);
      setPendingRoiIndex(null);
    }
  };

  useEffect(() => {
    const handleRunBurstDetection = () => {
      setShowBursts(true);
      alert("Burst detection will be updated via the main analysis pipeline.");
    };
    setPendingRoiIndex(currentRoiIndex);
  }, [currentRoiIndex]);

  useEffect(() => {
    if (!defineROI) {
      setPendingRoiIndex(null);
      setCurrentRoiIndex(null);
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

  return (
    <Box className="neural-controls-container">
      <FormGroup>
        <Box className="spike-detection-controls">
          <div>
            {/* ...existing code for spike detection controls... */}
            {/* <label className="spike-detection-label">
              Prominence:
              <input
                type="number"
                step="0.1"
                min="0"
                value={spikeProminence || ""}
                onChange={(e) => setSpikeProminence(e.target.value)}
                className="spike-detection-input"
              />
            </label>
            <label className="spike-detection-label">
              Window:
              <input
                type="number"
                min="1"
                value={spikeWindow || ""}
                onChange={(e) => setSpikeWindow(e.target.value)}
                className="spike-detection-input"
              />
            </label> */}
            {/* <label className="spike-detection-label">
              Threshold:
              <input
                type="number"
                step="0.1"
                value={spikeThreshold || ""}
                onChange={(e) => setSpikeThreshold(e.target.value)}
                className="spike-detection-input"
              />
            </label>
            <label className="spike-detection-label">
              Min Distance:
              <input
                type="number"
                min="1"
                value={spikeMinDistance || ""}
                onChange={(e) => setSpikeMinDistance(e.target.value)}
                className="spike-detection-input"
              />
            </label> */}
          </div>
        </Box>
        <Button
          onClick={handleRunSpikeDetection}
          // className="run-spike-detection-button"
        >
          Run Spike Detection
        </Button>
        <Button
          onClick={handleRunBurstDetection}
          // className="run-burst-detection-button"
        >
          Run Burst Detection
        </Button>
        <Box className="show-bursts-toggle-row">
          {/* <FormGroup row>
            <FormControlLabel
              control={
                <Switch
                  checked={defineROI}
                  onChange={(_, checked) => {
                    setDefineROI(checked);
                    if (checked) {
                      setEnablePanZoom(false);
                      setZoomState(false);
                      setPanState(false);
                    }
                  }}
                  color="primary"
                />
              }
              label="Define ROI"
              // Never disabled
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enablePanZoom}
                  onChange={(_, checked) => {
                    setEnablePanZoom(checked);
                    if (checked) {
                      setDefineROI(false);
                      setZoomState(true);
                      setPanState(true);
                    }
                  }}
                  color="primary"
                />
              }
              label="Enable Pan/Zoom"
              // Never disabled
            />
          </FormGroup> */}
        </Box>
        {renderRoiButtons()}
      </FormGroup>
    </Box>
  );
};

export default NoiseFilterControls;
