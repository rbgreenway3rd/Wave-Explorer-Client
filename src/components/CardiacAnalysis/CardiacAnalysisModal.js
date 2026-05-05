import React, { useContext, useRef } from "react";
import { Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { WellSelector } from "./subComponents/WellSelection/WellSelector";
import CardiacGraph from "./subComponents/CardiacGraph/CardiacGraph";
import { AnalysisContext } from "./AnalysisProvider";
import ChartControls from "./subComponents/CardiacGraph/ChartControls";
import "./styles/CardiacAnalysisModal.css";
import AnalysisResults from "./subComponents/AnalysisResults/AnalysisResults";
import { DataContext } from "../../providers/DataProvider";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Modal, IconButton, Heading } from "../ui";
import { MedianSignalGraph } from "./subComponents/MedianSignal/MedianSignalGraph";

Chart.register(zoomPlugin);

const CardiacAnalysisModal = ({ open, onClose }) => {
  const {
    selectedWell,
    useAdjustedBases,
    setUseAdjustedBases,
    findPeaksWindowWidth,
    setFindPeaksWindowWidth,
    peakProminence,
    setPeakProminence,
    peakResults,
  } = useContext(AnalysisContext);
  const { project } = useContext(DataContext);

  const cardiacGraphRef = useRef(null);

  const resetZoom = () => {
    if (cardiacGraphRef.current) {
      cardiacGraphRef.current.resetZoom();
    }
  };

  return (
    <Modal
      open={open}
      onClose={null}
      fullScreen
      className="cardiac-analysis-modal"
    >
      <Modal.Header className="cardiac-analysis-modal__header">
        <Heading level={2}>Cardiac Analysis</Heading>
        <Tooltip title="Exit Cardiac Analysis" arrow>
          <IconButton
            variant="subtle"
            size="md"
            aria-label="close"
            onClick={onClose}
            className="cardiac-analysis-modal__close"
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Modal.Header>
      <Modal.Body className="cardiac-analysis-modal__body">
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
                <h2 className="cardiac-analysis-modal__selected-well">
                  Selected Well: {selectedWell.key}
                </h2>
              ) : (
                <h2 className="no-well-selected">No Well Selected</h2>
              )}
            </div>
            <ChartControls
              className="chart-controls"
              resetZoom={resetZoom}
              useAdjustedBases={useAdjustedBases}
              setUseAdjustedBases={setUseAdjustedBases}
              findPeaksWindowWidth={findPeaksWindowWidth}
              setFindPeaksWindowWidth={setFindPeaksWindowWidth}
              peakProminence={peakProminence}
              setPeakProminence={setPeakProminence}
            />
          </div>
          <div className="modal-body">
            <section className="controls-and-graph">
              <CardiacGraph
                className="cardiac-graph"
                ref={cardiacGraphRef}
                useAdjustedBases={useAdjustedBases}
                findPeaksWindowWidth={findPeaksWindowWidth}
                peakProminence={peakProminence}
              />
            </section>
            <section className="selector-and-average-graph">
              <WellSelector className="well-selector" />
              <MedianSignalGraph className="average-signal-graph" />
            </section>
            <AnalysisResults className="analysis-results" />
          </div>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CardiacAnalysisModal;
