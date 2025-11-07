import "../../styles/ChartControls.css";

import React, { useState } from "react";
import NeuralReportModal from "../../NeuralReportModal";
import NeuralFullPlateReportModal from "../../NeuralFullPlateReportModal";

// Import extracted control components
import NoiseSuppressionControls from "./controls/NoiseSuppressionControls";
import ControlWellSelector from "./controls/ControlWellSelector";
import ROIControls from "./controls/ROIControls";
import PanZoomControls from "./controls/PanZoomControls";
import ReportGenerationControls from "./controls/ReportGenerationControls";
import DecimationControls from "./controls/DecimationControls";

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
  // New props for CSV generation
  project,
  burstResults,
  overallMetrics,
  roiMetrics,
  spikeMinWidth,
  maxInterSpikeInterval,
  minSpikesPerBurst,
  wellArrays,
}) => {
  // State for Neural Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // State for Full-Plate Report Modal
  const [fullPlateModalOpen, setFullPlateModalOpen] = useState(false);

  const handleGenerateReport = () => {
    // Validate we have the necessary data
    if (!selectedWell) {
      alert("No well selected. Please select a well to generate a report.");
      return;
    }

    if (!peakResults || peakResults.length === 0) {
      alert(
        "No spikes detected. Please run spike detection before generating a report."
      );
      return;
    }

    // Open the report modal
    setReportModalOpen(true);
  };

  const handleGenerateFullPlateReport = () => {
    console.log("[ChartControls] wellArrays:", wellArrays);
    console.log("[ChartControls] wellArrays type:", typeof wellArrays);
    console.log("[ChartControls] wellArrays length:", wellArrays?.length);

    // Validate we have well data
    if (!wellArrays || wellArrays.length === 0) {
      alert("No well data available. Please load a dataset first.");
      return;
    }

    // Open the full-plate report modal
    setFullPlateModalOpen(true);
  };

  // Prepare processing parameters for report generation
  const processingParams = {
    noiseSuppressionActive,
    smoothingWindow,
    subtractControl,
    controlWell,
    baselineCorrection,
    trendFlatteningEnabled,
    spikeProminence,
    spikeWindow,
    spikeMinWidth: spikeMinWidth ?? 5,
    spikeMinDistance,
    maxInterSpikeInterval: maxInterSpikeInterval ?? 50,
    minSpikesPerBurst: minSpikesPerBurst ?? 3,
  };

  // --- UI ---
  return (
    <div className="neural-chart-controls">
      {/* Neural Report Modal */}
      <NeuralReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        project={project}
        selectedWell={selectedWell}
        processedSignal={processedSignal}
        peakResults={peakResults}
        burstResults={burstResults}
        overallMetrics={overallMetrics}
        roiMetrics={roiMetrics}
        roiList={roiList}
        processingParams={processingParams}
      />

      {/* Full-Plate Report Modal */}
      <NeuralFullPlateReportModal
        open={fullPlateModalOpen}
        onClose={() => setFullPlateModalOpen(false)}
        project={project}
        wellArrays={wellArrays}
        processingParams={processingParams}
      />

      {/* Control Well Selector (shown when noise suppression is active) */}
      {noiseSuppressionActive && (
        <ControlWellSelector
          controlWell={controlWell}
          setControlWell={setControlWell}
          selectingControl={selectingControl}
          setSelectingControl={setSelectingControl}
          selectedWell={selectedWell}
          disabled={!subtractControl}
        />
      )}

      {noiseSuppressionActive && <div className="chart-controls-divider" />}

      {/* Noise Suppression Controls */}
      <NoiseSuppressionControls
        noiseSuppressionActive={noiseSuppressionActive}
        setNoiseSuppressionActive={setNoiseSuppressionActive}
        trendFlatteningEnabled={trendFlatteningEnabled}
        setTrendFlatteningEnabled={setTrendFlatteningEnabled}
        subtractControl={subtractControl}
        setSubtractControl={setSubtractControl}
        baselineCorrection={baselineCorrection}
        setBaselineCorrection={setBaselineCorrection}
        filterBaseline={filterBaseline}
        setFilterBaseline={setFilterBaseline}
      />

      <div className="chart-controls-divider" />

      {/* Pan/Zoom and ROI Controls */}
      <PanZoomControls
        defineROI={defineROI}
        setDefineROI={setDefineROI}
        enablePanZoom={enablePanZoom}
        setEnablePanZoom={setEnablePanZoom}
        zoomState={zoomState}
        setZoomState={setZoomState}
        panState={panState}
        setPanState={setPanState}
        resetZoom={resetZoom}
      />

      {/* ROI Management */}
      <ROIControls
        defineROI={defineROI}
        setDefineROI={setDefineROI}
        roiList={roiList}
        setRoiList={setRoiList}
        currentRoiIndex={currentRoiIndex}
        setCurrentRoiIndex={setCurrentRoiIndex}
      />

      <div className="chart-controls-divider" />

      {/* Report Generation */}
      <ReportGenerationControls
        selectedWell={selectedWell}
        peakResults={peakResults}
        wellArrays={wellArrays}
        handleGenerateReport={handleGenerateReport}
        handleGenerateFullPlateReport={handleGenerateFullPlateReport}
      />

      <div className="chart-controls-divider" />

      {/* Decimation Controls */}
      <DecimationControls
        decimationEnabled={decimationEnabled}
        setDecimationEnabled={setDecimationEnabled}
        decimationSamples={decimationSamples}
        setDecimationSamples={setDecimationSamples}
      />
    </div>
  );
};
export default ChartControls;
