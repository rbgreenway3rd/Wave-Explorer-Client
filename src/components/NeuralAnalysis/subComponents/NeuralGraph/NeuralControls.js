import React from "react";
import { Box, FormGroup } from "@mui/material";
import "../../styles/NeuralControls.css";

// Import extracted control components
import ROIControls from "./controls/ROIControls";
import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import { NeuralContext } from "../../NeuralProvider";

/*
 * Utility functions for spike parameter suggestions
 * (Available for future SpikeDetectionControls component)
 *
 * import { detectSpikes } from "../../utilities/detectSpikes";
 *
 * function suggestProminence(signal, factor = 3) {
 *   if (!Array.isArray(signal) || signal.length === 0) return 1;
 *   const ySignal = signal.map((pt) => pt.y);
 *   const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
 *   const variance =
 *     ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
 *   return Math.floor(factor * Math.sqrt(variance));
 * }
 *
 * function suggestWindow(signal, prominence, num = 5) {
 *   if (!Array.isArray(signal) || signal.length === 0) return 20;
 *   const maxWindow = Math.floor(signal.length / 10);
 *   const foundPeaks = [];
 *   let optimalWindowWidth = 0;
 *   for (let ww = 10; ww <= maxWindow; ww += 5) {
 *     const peaks = detectSpikes(signal, { prominence, window: ww });
 *     foundPeaks.push(peaks.length);
 *     if (foundPeaks.length > num) foundPeaks.shift();
 *     if (foundPeaks.length === num) {
 *       const average = foundPeaks.reduce((sum, v) => sum + v, 0) / num;
 *       const variance =
 *         foundPeaks.reduce((sum, v) => sum + (v - average) ** 2, 0) / num;
 *       if (Math.sqrt(variance) <= 1) {
 *         optimalWindowWidth = ww;
 *         break;
 *       }
 *     }
 *   }
 *   return optimalWindowWidth || 20;
 * }
 */

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
  showBursts,
  setShowBursts,
  trendFlatteningEnabled,
  setTrendFlatteningEnabled,
  selectedWell,
  handleOutliers,
  setHandleOutliers,
}) => {
  // Get outlier parameters from context
  const {
    outlierPercentile,
    setOutlierPercentile,
    outlierMultiplier,
    setOutlierMultiplier,
    maxInterSpikeInterval,
    setMaxInterSpikeInterval,
    minSpikesPerBurst,
    setMinSpikesPerBurst,
  } = React.useContext(NeuralContext);

  // Spike detection handler: triggers pipeline update
  /* const handleRunSpikeDetection = () => {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("triggerPipelineSpikeDetection"));
    }
    alert("Spike detection will be updated via the main analysis pipeline.");
  };

  // Burst detection handler: triggers pipeline update
  /* const handleRunBurstDetection = () => {
    if (typeof setShowBursts === "function") {
      setShowBursts(true);
      alert("Burst detection will be updated via the main analysis pipeline.");
    }
  }; */

  /*
   * Note: The following spike parameter suggestion handlers are available
   * but not currently used in the UI. They can be integrated into a
   * SpikeDetectionControls component in the future:
   *
   * const handleSuggestProminence = () => {
   *   if (!processedSignal || !Array.isArray(processedSignal) || processedSignal.length === 0) {
   *     alert("No processed signal available for this well.");
   *     return;
   *   }
   *   const suggested = suggestProminence(processedSignal, 0.5);
   *   setSpikeProminence(suggested);
   *   alert(`Suggested prominence: ${suggested}`);
   * };
   *
   * const handleSuggestWindow = () => {
   *   if (!processedSignal || !Array.isArray(processedSignal) || processedSignal.length === 0) {
   *     alert("No processed signal available for this well.");
   *     return;
   *   }
   *   const suggested = suggestWindow(processedSignal, Number(spikeProminence), 5);
   *   setSpikeWindow(suggested);
   *   alert(`Suggested window: ${suggested}`);
   * };
   */

  return (
    <Box className="neural-controls-container">
      <FormGroup>
        <Box className="spike-detection-controls">
          <div></div>
        </Box>
        {/* <Button onClick={handleRunSpikeDetection}>Run Spike Detection</Button>
        <Button onClick={handleRunBurstDetection}>Run Burst Detection</Button> */}

        {/* Detection Controls - Side by side layout with toggles above each control */}
        <Box className="detection-controls-row">
          {/* Outlier Detection Column */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <HandleOutliersToggle
              handleOutliers={handleOutliers}
              setHandleOutliers={setHandleOutliers}
            />
            <HandleOutlierControls
              handleOutliers={handleOutliers}
              outlierPercentile={outlierPercentile}
              setOutlierPercentile={setOutlierPercentile}
              outlierMultiplier={outlierMultiplier}
              setOutlierMultiplier={setOutlierMultiplier}
            />
          </Box>

          {/* Burst Detection Column */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <ShowBurstsToggle
              showBursts={showBursts}
              setShowBursts={setShowBursts}
            />
            <BurstDetectionControls
              showBursts={showBursts}
              maxInterSpikeInterval={maxInterSpikeInterval}
              setMaxInterSpikeInterval={setMaxInterSpikeInterval}
              minSpikesPerBurst={minSpikesPerBurst}
              setMinSpikesPerBurst={setMinSpikesPerBurst}
            />
          </Box>
        </Box>

        {/* ROI Management using extracted component */}
        <ROIControls
          defineROI={defineROI}
          setDefineROI={setDefineROI}
          roiList={roiList}
          setRoiList={setRoiList}
          currentRoiIndex={currentRoiIndex}
          setCurrentRoiIndex={setCurrentRoiIndex}
        />
      </FormGroup>
    </Box>
  );
};

export default NoiseFilterControls;
