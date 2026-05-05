import React, { useContext, useRef } from "react";
import { Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NeuralResults from "./subComponents/NeuralResults/NeuralResults";
import ChartControls from "./subComponents/NeuralGraph/ChartControls";
import NeuralWellSelector from "./subComponents/WellSelection/NeuralWellSelector";
import NeuralGraph from "./subComponents/NeuralGraph/NeuralGraph";
import "../NeuralAnalysis/styles/NeuralAnalysisModal.css";
import { useNeuralSelection } from "../NeuralAnalysis/NeuralProvider";
import { DataContext } from "../../providers/DataProvider";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Modal, IconButton, Heading } from "../ui";
import NoiseFilterControls from "./subComponents/NeuralGraph/NeuralControls";

Chart.register(zoomPlugin);

/**
 * NeuralAnalysisModal — composes the Neural Analysis screen.
 *
 * After the Tier-B context split, this component owns NO neural state and
 * threads (almost) NO neural state through to children — every child
 * panel self-subscribes to one of the four contexts (Selection /
 * Settings / Interaction / Results) via the hooks exported from
 * NeuralProvider.
 *
 * The modal still owns the imperative chart-instance ref so ChartControls'
 * Reset Zoom button can call into NeuralGraph; that's the one prop
 * (`resetZoom`) we still pass.
 */
export const NeuralAnalysisModal = ({ open, onClose }) => {
  const { selectedWell } = useNeuralSelection();
  const { project } = useContext(DataContext);

  // Ref forwarded to NeuralGraph so the chart instance is reachable from
  // ChartControls' Reset Zoom button.
  const neuralGraphRef = useRef(null);
  const resetZoom = () => {
    if (neuralGraphRef.current) {
      neuralGraphRef.current.resetZoom();
    }
  };

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
                <h2
                  style={{
                    padding: 0,
                    margin: 0,
                    borderTop: "solid black 1px",
                  }}
                >
                  Selected Well: {selectedWell.key}
                </h2>
              ) : (
                <h2 className="no-well-selected">No Well Selected</h2>
              )}
            </div>
            <ChartControls resetZoom={resetZoom} />
          </div>
          <div className="modal-body">
            <section className="controls-and-graph">
              <NeuralGraph className="neural-graph" ref={neuralGraphRef} />
            </section>
            <section className="selector-and-average-graph">
              <NeuralWellSelector />
              <NoiseFilterControls />
            </section>
          </div>
          <NeuralResults />
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default NeuralAnalysisModal;
