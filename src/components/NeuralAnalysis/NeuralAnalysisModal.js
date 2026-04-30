import React, { useContext, useRef, useEffect } from "react";
import { Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NeuralResults from "./subComponents/NeuralResults/NeuralResults";
import ChartControls from "./subComponents/NeuralGraph/ChartControls";
import NeuralWellSelector from "./subComponents/WellSelection/NeuralWellSelector";
import NeuralGraph from "./subComponents/NeuralGraph/NeuralGraph";
import "../NeuralAnalysis/styles/NeuralAnalysisModal.css";
import { NeuralContext } from "../NeuralAnalysis/NeuralProvider";
import { DataContext } from "../../providers/DataProvider";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Modal, IconButton, Heading } from "../ui";
import NoiseFilterControls from "./subComponents/NeuralGraph/NeuralControls";

import {
  runNeuralAnalysisPipeline,
  suggestProminence,
  suggestWindow,
} from "./NeuralPipeline";

Chart.register(zoomPlugin);

export const NeuralAnalysisModal = ({ open, onClose }) => {
  // Spike detection parameter state for NoiseFilterControls
  const [spikeProminence, setSpikeProminence] = React.useState(1);
  const [spikeWindow, setSpikeWindow] = React.useState(20);
  const [spikeThreshold, setSpikeThreshold] = React.useState(0);
  const [spikeMinDistance, setSpikeMinDistance] = React.useState(0);
  const [stdMultiplier, setStdMultiplier] = React.useState(1.0); // Cluster separation threshold multiplier
  // Track if user has manually set spike params
  const spikeParamsManuallySet = React.useRef(false);

  // Handlers to mark when user changes spike params
  const handleSpikeProminenceChange = (val) => {
    spikeParamsManuallySet.current = true;
    setSpikeProminence(val);
  };
  const handleSpikeWindowChange = (val) => {
    spikeParamsManuallySet.current = true;
    setSpikeWindow(val);
  };
  const {
    selectedWell,
    useAdjustedBases,
    setUseAdjustedBases,
    findPeaksWindowWidth,
    setFindPeaksWindowWidth,
    peakProminence,
    setPeakProminence,
    peakResults,
    setPeakResults,
    burstResults,
    setBurstResults,
    showBursts,
    setShowBursts,
    handleOutliers,
    setHandleOutliers,
    outlierPercentile,
    outlierMultiplier,
    maxInterSpikeInterval,
    minSpikesPerBurst,
  } = useContext(NeuralContext);
  const { project, wellArrays, extractedIndicatorTimes } =
    useContext(DataContext);

  // Noise suppression state
  const [noiseSuppressionActive, setNoiseSuppressionActive] =
    React.useState(true);
  const [smoothingWindow, setSmoothingWindow] = React.useState(5);
  const [subtractControl, setSubtractControl] = React.useState(false);
  const [filterBaseline, setFilterBaseline] = React.useState(false);
  const [baselineCorrection, setBaselineCorrection] = React.useState(false);
  const [trendFlatteningEnabled, setTrendFlatteningEnabled] =
    React.useState(true);
  const [controlWell, setControlWell] = React.useState(null);
  // Control well selection mode (lifted from NeuralWellSelector)
  const [selectingControl, setSelectingControl] = React.useState(false);
  // Decimation state
  const [decimationEnabled, setDecimationEnabled] = React.useState(false);
  const [decimationSamples, setDecimationSamples] = React.useState(200);

  // ROI and Pan/Zoom state (lifted for controls)
  const [defineROI, setDefineROI] = React.useState(false);
  const [enablePanZoom, setEnablePanZoom] = React.useState(true);
  const [zoomState, setZoomState] = React.useState(true);
  const [panState, setPanState] = React.useState(true);

  // ROI state for multiple ROIs
  const [roiList, setRoiList] = React.useState([]);
  const [currentRoiIndex, setCurrentRoiIndex] = React.useState(null);

  // Ref to access Neural Graph's chart instance
  const neuralGraphRef = useRef(null);

  // Reset zoom handler
  const resetZoom = () => {
    if (neuralGraphRef.current) {
      neuralGraphRef.current.resetZoom(); // Call resetZoom on the chart instance
    }
  };

  // Centralized pipeline computation
  const pipelineResults = React.useMemo(() => {
    if (
      !selectedWell ||
      !selectedWell.indicators ||
      !selectedWell.indicators[0]
    )
      return {
        processedSignal: [],
        spikeResults: [],
        burstResults: [],
        metrics: {},
      };

    // Post-Phase C, filteredData is an empty {x,y}[] until materialized
    // from the canonical filteredXs/filteredYs typed arrays. The neural
    // pipeline expects a {x,y}[]; materialize on demand for just the two
    // wells the modal needs (selected + optional control), not the whole plate.
    const selectedFilteredData =
      typeof selectedWell.indicators[0].materializeFilteredData === "function"
        ? selectedWell.indicators[0].materializeFilteredData()
        : selectedWell.indicators[0].filteredData;
    const controlFilteredData =
      controlWell && controlWell.indicators && controlWell.indicators[0]
        ? typeof controlWell.indicators[0].materializeFilteredData === "function"
          ? controlWell.indicators[0].materializeFilteredData()
          : controlWell.indicators[0].filteredData
        : [];

    const pipeline = runNeuralAnalysisPipeline({
      rawSignal: selectedFilteredData,
      controlSignal: controlFilteredData,
      params: {
        subtractControl,
        trendFlatteningEnabled,
        baselineCorrection,
        filterBaseline,
        smoothingWindow,
        handleOutliers,
        outlierPercentile,
        outlierMultiplier,
        spikeProminence,
        spikeWindow,
        spikeMinWidth: 5, // TODO: wire from UI if needed
        spikeMinDistance,
        spikeMinProminenceRatio: 0.01, // TODO: wire from UI if needed
        stdMultiplier, // Pass through the noise threshold multiplier
        maxInterSpikeInterval,
        minSpikesPerBurst,
      },
      analysis: {
        runSpikeDetection: true,
        runBurstDetection: showBursts,
      },
      noiseSuppressionActive,
    });
    return pipeline;
  }, [
    selectedWell,
    controlWell,
    subtractControl,
    trendFlatteningEnabled,
    baselineCorrection,
    filterBaseline,
    smoothingWindow,
    handleOutliers,
    outlierPercentile,
    outlierMultiplier,
    spikeProminence,
    spikeWindow,
    spikeMinDistance,
    stdMultiplier,
    showBursts,
    noiseSuppressionActive,
    maxInterSpikeInterval,
    minSpikesPerBurst,
  ]);

  useEffect(() => {
    spikeParamsManuallySet.current = false;
  }, [selectedWell]);

  // Centralized spike parameter suggestion (only if user hasn't changed them)
  // This runs BEFORE the pipeline to ensure correct parameters are used
  useEffect(() => {
    if (
      !spikeParamsManuallySet.current &&
      selectedWell &&
      selectedWell.indicators &&
      selectedWell.indicators[0]
    ) {
      const ind = selectedWell.indicators[0];
      const rawSignal =
        typeof ind.materializeFilteredData === "function"
          ? ind.materializeFilteredData()
          : ind.filteredData;
      if (!rawSignal || rawSignal.length === 0) return;
      const suggestedProminence = suggestProminence(rawSignal, 0.5);
      setSpikeProminence(suggestedProminence);
      const suggestedWindow = suggestWindow(
        rawSignal,
        Number(suggestedProminence),
        5
      );
      setSpikeWindow(suggestedWindow);
    }
  }, [selectedWell]);

  // Sync pipeline results to context for NeuralGraph and other consumers
  useEffect(() => {
    if (Array.isArray(pipelineResults.spikeResults)) {
      setPeakResults(pipelineResults.spikeResults);
    }
    if (Array.isArray(pipelineResults.burstResults)) {
      setBurstResults(pipelineResults.burstResults);
    }
  }, [pipelineResults, setPeakResults, setBurstResults]);

  // Debug: log processedSignal to check if it changes with trend flattening
  // console.log(
  //   "[NeuralAnalysisModal] processedSignal (first 5):",
  //   pipelineResults.processedSignal?.slice(0, 5)
  // );
  return (
    <Modal
      open={open}
      onClose={null}
      fullScreen
      className="neural-analysis-modal"
    >
      <Modal.Header className="neural-analysis-modal__header">
        <Heading level={2}>Neural Analysis</Heading>
        <Tooltip title="Exit Neural Analysis" arrow>
          <IconButton
            variant="subtle"
            size="md"
            aria-label="close"
            onClick={onClose}
            className="neural-analysis-modal__close"
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Modal.Header>
      <Modal.Body className="neural-analysis-modal__body">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-header-item-container">
              <h3 className="modal-header-item">
                Project: {project?.title || "No Project"}
              </h3>
              <h5 className="modal-header-item">
                Instrument: {project?.instrument || "N/A"}
              </h5>
              <h5 className="modal-header-item">
                Protocol: {project?.protocol || "N/A"}
              </h5>
              <h5 className="modal-header-item">
                Plate Barcode: {project?.plate?.[0]?.assayPlateBarcode || "N/A"}
              </h5>
              {selectedWell ? (
                <>
                  <h2
                    style={{
                      padding: 0,
                      margin: 0,
                      borderTop: "solid black 1px",
                    }}
                  >
                    Selected Well: {selectedWell.key}
                  </h2>
                </>
              ) : (
                <h2 className="no-well-selected">No Well Selected</h2>
              )}
            </div>
            <ChartControls
              className="chart-controls"
              resetZoom={resetZoom}
              decimationEnabled={decimationEnabled}
              setDecimationEnabled={setDecimationEnabled}
              decimationSamples={decimationSamples}
              setDecimationSamples={setDecimationSamples}
              noiseSuppressionActive={noiseSuppressionActive}
              setNoiseSuppressionActive={setNoiseSuppressionActive}
              subtractControl={subtractControl}
              setSubtractControl={setSubtractControl}
              filterBaseline={filterBaseline}
              setFilterBaseline={setFilterBaseline}
              baselineCorrection={baselineCorrection}
              setBaselineCorrection={setBaselineCorrection}
              trendFlatteningEnabled={trendFlatteningEnabled}
              setTrendFlatteningEnabled={setTrendFlatteningEnabled}
              handleOutliers={handleOutliers}
              setHandleOutliers={setHandleOutliers}
              outlierPercentile={outlierPercentile}
              outlierMultiplier={outlierMultiplier}
              controlWell={controlWell}
              setControlWell={setControlWell}
              selectingControl={selectingControl}
              setSelectingControl={setSelectingControl}
              defineROI={defineROI}
              setDefineROI={setDefineROI}
              enablePanZoom={enablePanZoom}
              setEnablePanZoom={setEnablePanZoom}
              zoomState={zoomState}
              setZoomState={setZoomState}
              panState={panState}
              setPanState={setPanState}
              roiList={roiList}
              setRoiList={setRoiList}
              currentRoiIndex={currentRoiIndex}
              setCurrentRoiIndex={setCurrentRoiIndex}
              selectedWell={selectedWell}
              processedSignal={pipelineResults.processedSignal}
              smoothingWindow={smoothingWindow}
              spikeProminence={spikeProminence}
              spikeWindow={spikeWindow}
              spikeMinDistance={spikeMinDistance}
              peakResults={pipelineResults.spikeResults}
              burstResults={pipelineResults.burstResults}
              overallMetrics={pipelineResults.metrics}
              roiMetrics={null} // TODO: Calculate roiMetrics if needed for CSV
              project={project}
              spikeMinWidth={5}
              maxInterSpikeInterval={50}
              minSpikesPerBurst={3}
              wellArrays={wellArrays}
            />
          </div>
          <div className="modal-body">
            <section className="controls-and-graph">
              <NeuralGraph
                className="neural-graph"
                ref={neuralGraphRef}
                useAdjustedBases={useAdjustedBases}
                findPeaksWindowWidth={findPeaksWindowWidth}
                peakProminence={peakProminence}
                processedSignal={pipelineResults.processedSignal}
                // Debug: log the processedSignal passed to NeuralGraph (first 5 points)
                {...(console.log(
                  "[NeuralAnalysisModal] processedSignal to NeuralGraph (first 5):",
                  pipelineResults.processedSignal?.slice(0, 5)
                ) || {})}
                noiseSuppressionActive={noiseSuppressionActive}
                smoothingWindow={smoothingWindow}
                subtractControl={subtractControl}
                filterBaseline={filterBaseline}
                baselineCorrection={baselineCorrection}
                controlWell={controlWell}
                decimationEnabled={decimationEnabled}
                decimationSamples={decimationSamples}
                defineROI={defineROI}
                setDefineROI={setDefineROI}
                enablePanZoom={enablePanZoom}
                setEnablePanZoom={setEnablePanZoom}
                zoomState={zoomState}
                setZoomState={setZoomState}
                panState={panState}
                setPanState={setPanState}
                roiList={roiList}
                setRoiList={setRoiList}
                currentRoiIndex={currentRoiIndex}
                setCurrentRoiIndex={setCurrentRoiIndex}
                showBursts={showBursts}
              />
            </section>
            <section className="selector-and-average-graph">
              <NeuralWellSelector
                className="well-selector"
                noiseSuppressionActive={noiseSuppressionActive}
                controlWell={controlWell}
                setControlWell={setControlWell}
                selectingControl={selectingControl}
                setSelectingControl={setSelectingControl}
              />
              <NoiseFilterControls
                processedSignal={pipelineResults.processedSignal}
                smoothingWindow={smoothingWindow}
                setSmoothingWindow={setSmoothingWindow}
                minWindow={1}
                maxWindow={21}
                defineROI={defineROI}
                setDefineROI={setDefineROI}
                enablePanZoom={enablePanZoom}
                setEnablePanZoom={setEnablePanZoom}
                zoomState={zoomState}
                setZoomState={setZoomState}
                panState={panState}
                setPanState={setPanState}
                roiList={roiList}
                setRoiList={setRoiList}
                currentRoiIndex={currentRoiIndex}
                setCurrentRoiIndex={setCurrentRoiIndex}
                setPeakResults={setPeakResults}
                setBurstResults={setBurstResults}
                showBursts={showBursts}
                setShowBursts={setShowBursts}
                spikeProminence={spikeProminence}
                setSpikeProminence={handleSpikeProminenceChange}
                spikeWindow={spikeWindow}
                setSpikeWindow={handleSpikeWindowChange}
                spikeThreshold={spikeThreshold}
                setSpikeThreshold={setSpikeThreshold}
                spikeMinDistance={spikeMinDistance}
                setSpikeMinDistance={setSpikeMinDistance}
                trendFlatteningEnabled={trendFlatteningEnabled}
                setTrendFlatteningEnabled={setTrendFlatteningEnabled}
                selectedWell={selectedWell}
                handleOutliers={handleOutliers}
                setHandleOutliers={setHandleOutliers}
              />

              {/* <ChartControls
                className="chart-controls"
                resetZoom={resetZoom}
                decimationEnabled={decimationEnabled}
                setDecimationEnabled={setDecimationEnabled}
                decimationSamples={decimationSamples}
                setDecimationSamples={setDecimationSamples}
                noiseSuppressionActive={noiseSuppressionActive}
                setNoiseSuppressionActive={setNoiseSuppressionActive}
                subtractControl={subtractControl}
                setSubtractControl={setSubtractControl}
                filterBaseline={filterBaseline}
                setFilterBaseline={setFilterBaseline}
                baselineCorrection={baselineCorrection}
                setBaselineCorrection={setBaselineCorrection}
                trendFlatteningEnabled={trendFlatteningEnabled}
                setTrendFlatteningEnabled={setTrendFlatteningEnabled}
                controlWell={controlWell}
                setControlWell={setControlWell}
                selectingControl={selectingControl}
                setSelectingControl={setSelectingControl}
                defineROI={defineROI}
                setDefineROI={setDefineROI}
                enablePanZoom={enablePanZoom}
                setEnablePanZoom={setEnablePanZoom}
                zoomState={zoomState}
                setZoomState={setZoomState}
                panState={panState}
                setPanState={setPanState}
                roiList={roiList}
                setRoiList={setRoiList}
                currentRoiIndex={currentRoiIndex}
                setCurrentRoiIndex={setCurrentRoiIndex}
              /> */}
            </section>
          </div>
          <NeuralResults
            peakResults={pipelineResults.spikeResults}
            burstResults={pipelineResults.burstResults}
            roiList={roiList}
            selectedWell={selectedWell}
            metrics={pipelineResults.metrics}
          />
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NeuralAnalysisModal;
