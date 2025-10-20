import React, { useContext, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
} from "@mui/material";
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
import { makeStyles } from "@mui/styles";
import NoiseFilterControls from "./subComponents/NeuralGraph/NeuralControls";

import {
  runNeuralAnalysisPipeline,
  suggestProminence,
  suggestWindow,
} from "./NeuralPipeline";

Chart.register(zoomPlugin);

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    backgroundColor: "rgb(150, 150, 150)", // Change this to your desired background color
  },
}));

export const NeuralAnalysisModal = ({ open, onClose }) => {
  // Spike detection parameter state for NoiseFilterControls
  const [spikeProminence, setSpikeProminence] = React.useState(1);
  const [spikeWindow, setSpikeWindow] = React.useState(20);
  const [spikeThreshold, setSpikeThreshold] = React.useState(0);
  const [spikeMinDistance, setSpikeMinDistance] = React.useState(0);
  const classes = useStyles();
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
  } = useContext(NeuralContext);
  const { project } = useContext(DataContext);

  // Noise suppression state
  const [noiseSuppressionActive, setNoiseSuppressionActive] =
    React.useState(false);
  const [smoothingWindow, setSmoothingWindow] = React.useState(5);
  const [subtractControl, setSubtractControl] = React.useState(true);
  const [filterBaseline, setFilterBaseline] = React.useState(false);
  const [baselineCorrection, setBaselineCorrection] = React.useState(false);
  const [trendFlatteningEnabled, setTrendFlatteningEnabled] =
    React.useState(false);
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

    return runNeuralAnalysisPipeline({
      rawSignal: selectedWell.indicators[0].filteredData,
      controlSignal:
        controlWell && controlWell.indicators && controlWell.indicators[0]
          ? controlWell.indicators[0].filteredData
          : [],
      params: {
        subtractControl,
        trendFlatteningEnabled,
        baselineCorrection,
        filterBaseline,
        smoothingWindow,
        spikeProminence,
        spikeWindow,
        spikeMinWidth: 5, // TODO: wire from UI if needed
        spikeMinDistance,
        spikeMinProminenceRatio: 0.01, // TODO: wire from UI if needed
        maxInterSpikeInterval: 50, // TODO: wire from UI if needed
        minSpikesPerBurst: 3, // TODO: wire from UI if needed
      },
      analysis: {
        runSpikeDetection: true,
        runBurstDetection: showBursts,
      },
      noiseSuppressionActive,
    });
  }, [
    selectedWell,
    controlWell,
    subtractControl,
    trendFlatteningEnabled,
    baselineCorrection,
    filterBaseline,
    smoothingWindow,
    spikeProminence,
    spikeWindow,
    spikeMinDistance,
    showBursts,
    noiseSuppressionActive,
  ]);

  // Debug: log processedSignal to check if it changes with trend flattening
  console.log(
    "[NeuralAnalysisModal] processedSignal (first 5):",
    pipelineResults.processedSignal?.slice(0, 5)
  );
  return (
    <Dialog
      open={open}
      onClose={null}
      fullScreen
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle>
        Neural Analysis
        <Tooltip title="Exit Neural Analysis" arrow>
          <IconButton
            aria-label="close"
            onClick={onClose}
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon className="close-icon" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent>
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
              controlWell={controlWell}
              setControlWell={setControlWell}
              selectingControl={selectingControl}
              setSelectingControl={setSelectingControl}
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
                setShowBursts={setShowBursts}
                spikeProminence={spikeProminence}
                setSpikeProminence={setSpikeProminence}
                spikeWindow={spikeWindow}
                setSpikeWindow={setSpikeWindow}
                spikeThreshold={spikeThreshold}
                setSpikeThreshold={setSpikeThreshold}
                spikeMinDistance={spikeMinDistance}
                setSpikeMinDistance={setSpikeMinDistance}
                trendFlatteningEnabled={trendFlatteningEnabled}
                setTrendFlatteningEnabled={setTrendFlatteningEnabled}
                selectedWell={selectedWell}
              />
            </section>
            <NeuralResults
              peakResults={pipelineResults.spikeResults}
              burstResults={pipelineResults.burstResults}
              roiList={roiList}
              selectedWell={selectedWell}
              metrics={pipelineResults.metrics}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NeuralAnalysisModal;
