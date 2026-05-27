import React, { useContext, useMemo, useRef, useState } from "react";
import { Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import NeuralResults, {
  calculateSpikeFrequency,
  calculateSpikeAmplitude,
  calculateSpikeWidth,
  calculateSpikeAUC,
  calculateMaxSpikeSignal,
  calculateBurstMetrics,
} from "./subComponents/NeuralResults/NeuralResults";
import ChartControls from "./subComponents/NeuralGraph/ChartControls";
import NeuralWellSelector from "./subComponents/WellSelection/NeuralWellSelector";
import NeuralGraph from "./subComponents/NeuralGraph/NeuralGraph";
import ChartLegend from "./subComponents/NeuralGraph/ChartLegend";
import ChartDisplayToggles from "./subComponents/NeuralGraph/ChartDisplayToggles";
import NeuralReportModal from "./NeuralReportModal";
import NeuralFullPlateReportModal from "./NeuralFullPlateReportModal";
import TemplateMenu from "./templates/TemplateMenu";
import "../NeuralAnalysis/styles/NeuralAnalysisModal.css";
import {
  useNeuralInteraction,
  useNeuralResults,
  useNeuralSelection,
  useNeuralSettings,
} from "../NeuralAnalysis/NeuralProvider";
import { DataContext } from "../../providers/DataProvider";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Modal, IconButton, Button } from "../ui";

Chart.register(zoomPlugin);

/**
 * NeuralAnalysisModal — composes the Neural Analysis screen.
 *
 * Owns:
 *   - the imperative chart-instance ref so ChartControls' Reset Zoom
 *     button can call into NeuralGraph (`resetZoom`);
 *   - the report-modal open flags + click handlers, since the report
 *     trigger buttons live in this modal's header (below the
 *     Selected Well item) and the report modals themselves are
 *     rendered out of this component.
 */
export const NeuralAnalysisModal = ({ open, onClose }) => {
  const { selectedWell, controlWell } = useNeuralSelection();
  const { project, wellArrays } = useContext(DataContext);
  const settings = useNeuralSettings();
  const { roiList } = useNeuralInteraction();
  const { pipelineResults, effectiveSpikeProminence, effectiveSpikeWindow } =
    useNeuralResults();

  // Ref forwarded to NeuralGraph so the chart instance is reachable from
  // ChartControls' Reset Zoom button.
  const neuralGraphRef = useRef(null);
  const resetZoom = () => {
    if (neuralGraphRef.current) {
      neuralGraphRef.current.resetZoom();
    }
  };

  // ---- Advanced Tweakables accordion state --------------------------------
  // Owned here (not inside ChartControls) so the modal can toggle a body-
  // level class that shrinks the chart-row height while a section is
  // open. Starts collapsed every time the modal opens.
  const [expandedTweakableSection, setExpandedTweakableSection] =
    useState(null);

  // ---- Report-generation state + handlers ---------------------------------
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [fullPlateModalOpen, setFullPlateModalOpen] = useState(false);

  const peakResults = pipelineResults.spikeResults;
  const burstResults = pipelineResults.burstResults;
  const overallMetrics = pipelineResults.metrics;
  const processedSignal = pipelineResults.processedSignal;

  // Compute per-ROI metrics here so the CSV report receives the same
  // shape that <NeuralResults> displays. Previously the report was
  // called with `roiMetrics={null}`, so the per-ROI section of the
  // CSV was always empty. <NeuralResults> still computes its own
  // copy internally — both call the same exported calculators with
  // the same inputs, so the values are identical.
  const roiMetricsForReport = useMemo(() => {
    if (!Array.isArray(roiList) || roiList.length === 0) return null;
    if (!Array.isArray(peakResults)) return null;
    const out = {};
    roiList.forEach((roi, index) => {
      if (!roi || roi.xMin === undefined || roi.xMax === undefined) return;
      const spikesInROI = peakResults.filter(
        (spike) => spike.time >= roi.xMin && spike.time <= roi.xMax
      );
      const burstsInROI = Array.isArray(burstResults)
        ? burstResults.filter(
            (burst) =>
              burst.startTime >= roi.xMin && burst.endTime <= roi.xMax
          )
        : [];
      out[`ROI ${index + 1}`] = {
        spikeFrequency: calculateSpikeFrequency(spikesInROI, roi.xMin, roi.xMax),
        spikeAmplitude: calculateSpikeAmplitude(spikesInROI, roi.xMin, roi.xMax),
        spikeWidth: calculateSpikeWidth(spikesInROI, roi.xMin, roi.xMax),
        spikeAUC: calculateSpikeAUC(spikesInROI, roi.xMin, roi.xMax),
        maxSpikeSignal: calculateMaxSpikeSignal(spikesInROI, roi.xMin, roi.xMax),
        burstMetrics: calculateBurstMetrics(burstsInROI, roi.xMin, roi.xMax),
      };
    });
    return Object.keys(out).length > 0 ? out : null;
  }, [roiList, peakResults, burstResults]);

  const isSingleWellDisabled =
    !selectedWell || !peakResults || peakResults.length === 0;
  const isFullPlateDisabled = !wellArrays || wellArrays.length === 0;

  const singleWellTooltip = isSingleWellDisabled
    ? "Select a well and run spike detection first"
    : "Generate CSV report for the currently selected well";
  const fullPlateTooltip = isFullPlateDisabled
    ? "Load a dataset with multiple wells first"
    : "Generate comprehensive CSV report for all wells in the plate";

  const handleGenerateReport = () => setReportModalOpen(true);
  const handleGenerateFullPlateReport = () => setFullPlateModalOpen(true);

  // Snapshot of processing params the report modals embed in their CSV
  // headers. Memoized so its identity is stable across renders that
  // don't change any of the embedded values — without this wrap, every
  // settings-context change rebuilt the object and propagated a new
  // prop reference into both report modals (forcing them to re-render
  // even when closed). Deps list mirrors the object's keys 1:1.
  const processingParams = useMemo(
    () => ({
      noiseSuppressionActive: settings.noiseSuppressionActive,
      smoothingEnabled: settings.smoothingEnabled,
      smoothingWindow: settings.smoothingWindow,
      subtractControl: settings.subtractControl,
      controlWell,
      baselineCorrection: settings.baselineCorrection,
      trendFlatteningEnabled: settings.trendFlatteningEnabled,
      handleOutliers: settings.handleOutliers,
      outlierPercentile: settings.outlierPercentile,
      outlierMultiplier: settings.outlierMultiplier,
      spikeProminence: effectiveSpikeProminence,
      spikeWindow: effectiveSpikeWindow,
      spikeMinWidth: settings.spikeMinWidth,
      spikeMinDistance: settings.spikeMinDistance,
      spikeMinProminenceRatio: settings.spikeMinProminenceRatio,
      stdMultiplier: settings.stdMultiplier,
      noiseFloorMultiplier: settings.noiseFloorMultiplier,
      noiseWindowSize: settings.noiseWindowSize,
      activityThresholdEnabled: settings.activityThresholdEnabled,
      activityThresholdRatio: settings.activityThresholdRatio,
      baselineThresholdEnabled: settings.baselineThresholdEnabled,
      baselineThresholdRatio: settings.baselineThresholdRatio,
      showBursts: settings.showBursts,
      maxInterSpikeInterval: settings.maxInterSpikeInterval,
      minSpikesPerBurst: settings.minSpikesPerBurst,
    }),
    [
      settings.noiseSuppressionActive,
      settings.smoothingEnabled,
      settings.smoothingWindow,
      settings.subtractControl,
      controlWell,
      settings.baselineCorrection,
      settings.trendFlatteningEnabled,
      settings.handleOutliers,
      settings.outlierPercentile,
      settings.outlierMultiplier,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
      settings.spikeMinWidth,
      settings.spikeMinDistance,
      settings.spikeMinProminenceRatio,
      settings.stdMultiplier,
      settings.noiseFloorMultiplier,
      settings.noiseWindowSize,
      settings.activityThresholdEnabled,
      settings.activityThresholdRatio,
      settings.baselineThresholdEnabled,
      settings.baselineThresholdRatio,
      settings.showBursts,
      settings.maxInterSpikeInterval,
      settings.minSpikesPerBurst,
    ]
  );

  return (
    <Modal
      open={open}
      onClose={null}
      fullScreen
      className="neural-analysis-modal"
    >
      <Modal.Header className="neural-analysis-modal__header">
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
                Protocol: {project?.protocol || "N/A"}
              </h5>
              <h5 className="modal-header-item">
                Plate ID 1: {project?.plate?.[0]?.assayPlateBarcode || "N/A"}
              </h5>
              <h5 className="modal-header-item">
                Plate ID 2: {project?.plate?.[0]?.addPlateBarcode || "N/A"}
              </h5>
              {selectedWell ? (
                <h2
                  style={{
                    padding: 0,
                    margin: 0,
                    borderTop: "solid black 1px",
                    borderBottom: "solid black 1px",
                    textAlign: "center",
                  }}
                >
                  Selected Well: {selectedWell.key}
                </h2>
              ) : (
                <h2 className="no-well-selected">No Well Selected</h2>
              )}

              <span className="neural-analysis-modal__report-actions-label">
                Generate Report
              </span>
              <div className="neural-analysis-modal__report-actions">
                <Tooltip title={singleWellTooltip} arrow placement="top">
                  <span>
                    <Button
                      variant="primary"
                      size="sm"
                      startIcon={<DescriptionIcon />}
                      onClick={handleGenerateReport}
                      disabled={isSingleWellDisabled}
                    >
                      Single-Well CSV
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={fullPlateTooltip} arrow placement="top">
                  <span>
                    <Button
                      variant="primary"
                      size="sm"
                      startIcon={<DashboardIcon />}
                      onClick={handleGenerateFullPlateReport}
                      disabled={isFullPlateDisabled}
                    >
                      Full-Plate CSV
                    </Button>
                  </span>
                </Tooltip>
                <TemplateMenu />
              </div>
            </div>
            <ChartControls
              resetZoom={resetZoom}
              expandedTweakableSection={expandedTweakableSection}
              onExpandedTweakableChange={setExpandedTweakableSection}
            />
          </div>
          <div className="modal-body">
            <section className="controls-and-graph">
              {/* Shared row above the chart: legend on the left,
                * display toggles on the right. Background + border
                * applied here so the two children render as one
                * seamless strip. */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "stretch",
                  background: "rgb(0, 0, 0)",
                  borderTop: "0.1em solid rgb(100, 100, 100)",
                  borderLeft: "0.1em solid rgb(100, 100, 100)",
                  borderRight: "0.1em solid rgb(100, 100, 100)",
                }}
              >
                <ChartLegend />
                <ChartDisplayToggles />
              </div>
              <NeuralGraph className="neural-graph" ref={neuralGraphRef} />
            </section>
            <section className="selector-and-average-graph">
              <NeuralWellSelector />
              <NeuralResults />
            </section>
          </div>
        </div>
      </Modal.Body>

      <NeuralReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        project={project}
        selectedWell={selectedWell}
        processedSignal={processedSignal}
        peakResults={peakResults}
        burstResults={burstResults}
        overallMetrics={overallMetrics}
        roiMetrics={roiMetricsForReport}
        roiList={roiList}
        processingParams={processingParams}
      />
      <NeuralFullPlateReportModal
        open={fullPlateModalOpen}
        onClose={() => setFullPlateModalOpen(false)}
        project={project}
        wellArrays={wellArrays}
        processingParams={processingParams}
        roiList={roiList}
      />
    </Modal>
  );
};

export default NeuralAnalysisModal;
