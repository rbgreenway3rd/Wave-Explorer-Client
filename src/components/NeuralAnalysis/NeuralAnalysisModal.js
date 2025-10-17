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
import { detectSpikes } from "./utilities/detectSpikes";
import {
  baselineCorrected,
  baselineSmoothed,
  trendFlattening,
} from "./utilities/neuralSmoothing";

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

  // Centralized processedSignal computation (shared by NeuralGraph and NoiseFilterControls)
  const processedSignal = React.useMemo(() => {
    if (
      !selectedWell ||
      !selectedWell.indicators ||
      !selectedWell.indicators[0]
    )
      return [];
    let signal = selectedWell.indicators[0].filteredData;
    if (!Array.isArray(signal) || signal.length === 0) return [];
    let processed = signal;
    if (noiseSuppressionActive) {
      if (trendFlatteningEnabled) {
        processed = trendFlattening(processed, {
          adaptiveBaseline: true,
          windowSize: smoothingWindow * 40 || 200,
          numMinimums: Math.max(10, Math.floor(smoothingWindow * 10)),
        });
      } else if (
        subtractControl &&
        controlWell &&
        controlWell.indicators &&
        controlWell.indicators[0]
      ) {
        // Subtract control well signal
        const controlSignal = controlWell.indicators[0].filteredData;
        if (
          Array.isArray(controlSignal) &&
          controlSignal.length === processed.length
        ) {
          processed = processed.map((pt, i) => ({
            x: pt.x,
            y: pt.y - controlSignal[i].y,
          }));
        }
      } else if (filterBaseline) {
        processed = baselineSmoothed(processed, smoothingWindow);
      } else if (baselineCorrection) {
        processed = baselineCorrected(processed, smoothingWindow);
      }
    }
    // Ensure output is always array of {x, y}
    if (
      Array.isArray(processed) &&
      processed.length > 0 &&
      typeof processed[0] === "number"
    ) {
      processed = processed.map((y, i) => ({ x: i, y }));
    }
    return processed;
  }, [
    selectedWell,
    noiseSuppressionActive,
    trendFlatteningEnabled,
    subtractControl,
    controlWell,
    filterBaseline,
    baselineCorrection,
    smoothingWindow,
  ]);

  // Spike detection is now only run manually via controls; no automatic detection here.

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
                processedSignal={processedSignal}
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
                processedSignal={processedSignal}
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
              peakResults={peakResults}
              burstResults={burstResults}
              roiList={roiList}
              selectedWell={selectedWell}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NeuralAnalysisModal;
