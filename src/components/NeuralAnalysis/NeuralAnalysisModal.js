import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tooltip, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
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
import CollapsibleSection from "./subComponents/CollapsibleSection";
import DetectionFunnel from "./subComponents/DetectionFunnel";
import PeakInspector from "./subComponents/PeakInspector";
import Distributions from "./subComponents/Distributions";
import NeuralGraph from "./subComponents/NeuralGraph/NeuralGraph";
import ChartLegend from "./subComponents/NeuralGraph/ChartLegend";
import ChartDisplayToggles from "./subComponents/NeuralGraph/ChartDisplayToggles";
import YScaleToggle from "./subComponents/NeuralGraph/controls/YScaleToggle";
import NeuralReportModal from "./NeuralReportModal";
import NeuralFullPlateReportModal from "./NeuralFullPlateReportModal";
import TemplateMenu from "./templates/TemplateMenu";
import NeuralDocsModal from "./docs/NeuralDocsModal";
import { NeuralDocsContext } from "./docs/NeuralDocsContext";
import "../NeuralAnalysis/styles/NeuralAnalysisModal.css";
import {
  useNeuralInspector,
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
  const { selectedWell, controlWell, controlWellSet, foExcludedWellSet } =
    useNeuralSelection();
  const { project, wellArrays } = useContext(DataContext);
  const settings = useNeuralSettings();
  const { roiList } = useNeuralInteraction();
  const {
    pipelineResults,
    effectiveSpikeProminence,
    effectiveSpikeWindow,
    isPipelineRunning,
    isPlateRangeComputing,
    pipelineError,
  } = useNeuralResults();

  // Any compute in flight → busy cursor on the whole modal (catch-all for the
  // small controls that can't host their own spinner). Does NOT disable them.
  const isBusy = isPipelineRunning || isPlateRangeComputing;

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

  // ---- Interactive documentation modal ------------------------------------
  // docsSectionId lets a control's [?] deep-link to a specific section;
  // null opens the docs at the top. (Header button uses null; per-control
  // deep-links are wired in a follow-up.)
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsSectionId, setDocsSectionId] = useState(null);
  const openDocs = useCallback((sectionId = null) => {
    setDocsSectionId(sectionId);
    setDocsOpen(true);
  }, []);
  // Stable context value so nested controls (via <DocsHelpButton>) can
  // deep-link into the docs without prop-drilling or extra re-renders.
  const docsContextValue = useMemo(() => ({ openDocs }), [openDocs]);

  // Accordion state for the modal's right column. Each entry maps a
  // section key to whether its body is expanded. Both Wells and Results
  // open by default — visually identical to today. Funnel and Peak
  // Inspector slots are added in later phases of the Decision
  // Explanation Layer; they default closed so the first-load layout
  // doesn't change.
  const [rightColumnExpanded, setRightColumnExpanded] = useState({
    wells: true,
    results: true,
    funnel: false, // Decision Explanation Layer — collapsed by default; opt-in.
    inspector: false,
    distributions: false,
  });
  const toggleRightSection = (key) =>
    setRightColumnExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Auto-expand Peak Inspector the moment a candidate is selected on
  // the chart. Idempotent — if the user explicitly collapses the
  // section while the same candidate is still selected, we don't fight
  // them. (Re-selecting a different candidate is a new transition and
  // will re-expand.)
  const { selectedCandidateIndex } = useNeuralInspector();
  const prevSelectedIndexRef = useRef(null);
  useEffect(() => {
    if (
      selectedCandidateIndex !== null &&
      selectedCandidateIndex !== prevSelectedIndexRef.current
    ) {
      setRightColumnExpanded((prev) =>
        prev.inspector ? prev : { ...prev, inspector: true }
      );
    }
    prevSelectedIndexRef.current = selectedCandidateIndex;
  }, [selectedCandidateIndex]);

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
      controlWellSet,
      controlScalingEnabled: settings.controlScalingEnabled,
      // ΔF/F₀ normalization + well-to-well rescale, so the full-plate
      // report applies the same detrend → F/Fo (× plate-median Fo) the
      // live modal does. Without these the report silently used the
      // filtered signal and emitted native (un-normalized) magnitudes.
      neuralNormalizationEnabled: settings.neuralNormalizationEnabled,
      neuralRescaleByMedianFo: settings.neuralRescaleByMedianFo,
      foWindowEnabled: settings.foWindowEnabled,
      foWindowStartRatio: settings.foWindowEnabled
        ? settings.foWindowStartRatio
        : undefined,
      foWindowEndRatio: settings.foWindowEnabled
        ? settings.foWindowEndRatio
        : undefined,
      // F/Fo well exclusion — the report drops these wells from the plate-
      // wide F₀ median (not the per-well loop, so they still get rows). Pass
      // ids for the filter and keys for the CSV readout. Empty unless the
      // feature toggle is on so the report matches the live modal exactly.
      foExclusionEnabled: settings.foExclusionEnabled,
      foExcludedWellIds:
        settings.foExclusionEnabled && settings.neuralNormalizationEnabled
          ? foExcludedWellSet.map((w) => w.id)
          : [],
      foExcludedWellKeys:
        settings.foExclusionEnabled && settings.neuralNormalizationEnabled
          ? foExcludedWellSet.map((w) => w.key || w.label || w.id)
          : [],
      baselineCorrection: settings.baselineCorrection,
      trendFlatteningEnabled: settings.trendFlatteningEnabled,
      handleOutliers: settings.handleOutliers,
      outlierSensitivity: settings.outlierSensitivity,
      spikeProminence: effectiveSpikeProminence,
      // Prominence is a fraction of signal range — reports convert it to
      // absolute per-well, same as the live modal.
      spikeProminenceRelative: true,
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
      baselineThresholdOffset: settings.baselineThresholdOffset,
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
      controlWellSet,
      settings.controlScalingEnabled,
      settings.neuralNormalizationEnabled,
      settings.neuralRescaleByMedianFo,
      settings.foWindowEnabled,
      settings.foWindowStartRatio,
      settings.foWindowEndRatio,
      settings.foExclusionEnabled,
      foExcludedWellSet,
      settings.baselineCorrection,
      settings.trendFlatteningEnabled,
      settings.handleOutliers,
      settings.outlierSensitivity,
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
      settings.baselineThresholdOffset,
      settings.showBursts,
      settings.maxInterSpikeInterval,
      settings.minSpikesPerBurst,
    ]
  );

  return (
    <NeuralDocsContext.Provider value={docsContextValue}>
    <Modal
      open={open}
      onClose={null}
      fullScreen
      className={`neural-analysis-modal${
        isBusy ? " neural-analysis-modal--busy" : ""
      }`}
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
        <Tooltip title="How the analysis works" arrow>
          <IconButton
            variant="subtle"
            size="md"
            aria-label="open documentation"
            onClick={() => openDocs(null)}
            className="neural-analysis-modal__docs-btn"
          >
            <MenuBookIcon />
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
                <div className="neural-analysis-modal__report-actions-csv-group">
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
                </div>
                <div className="neural-analysis-modal__report-actions-right">
                  <YScaleToggle />
                  <TemplateMenu />
                </div>
              </div>
            </div>
            <ChartControls
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
                {/* Right group: view toggles + an always-visible Reset Zoom.
                  * Reset Zoom lives here (not in the Chart Interaction card)
                  * so it stays reachable when a control set is expanded and
                  * collapses that card. */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "0.5rem",
                    paddingRight: "10px",
                  }}
                >
                  <ChartDisplayToggles />
                  <Button
                    variant="secondary"
                    size="sm"
                    startIcon={<RestartAltIcon fontSize="small" />}
                    onClick={resetZoom}
                    className="reset-zoom-button"
                  >
                    Reset Zoom
                  </Button>
                </div>
              </div>
              <div className="neural-graph-wrap">
                <NeuralGraph className="neural-graph" ref={neuralGraphRef} />
                {isPipelineRunning && selectedWell && (
                  <div
                    className="neural-graph-spinner-overlay"
                    aria-live="polite"
                  >
                    <CircularProgress size={18} thickness={5} />
                    <span>Updating…</span>
                  </div>
                )}
                {!isPipelineRunning && pipelineError && selectedWell && (
                  <div
                    className="neural-graph-error-overlay"
                    role="alert"
                    aria-live="assertive"
                  >
                    <span>{pipelineError}</span>
                  </div>
                )}
              </div>
            </section>
            <section className="selector-and-average-graph">
              <CollapsibleSection
                title="Wells"
                expanded={rightColumnExpanded.wells}
                onToggle={() => toggleRightSection("wells")}
              >
                <NeuralWellSelector />
              </CollapsibleSection>
              <CollapsibleSection
                title="Detection Funnel"
                expanded={rightColumnExpanded.funnel}
                onToggle={() => toggleRightSection("funnel")}
                growWhenExpanded
              >
                <DetectionFunnel />
              </CollapsibleSection>
              <CollapsibleSection
                title="Peak Inspector"
                expanded={rightColumnExpanded.inspector}
                onToggle={() => toggleRightSection("inspector")}
                growWhenExpanded
              >
                <PeakInspector />
              </CollapsibleSection>
              <CollapsibleSection
                title="Distributions"
                expanded={rightColumnExpanded.distributions}
                onToggle={() => toggleRightSection("distributions")}
                growWhenExpanded
              >
                <Distributions />
              </CollapsibleSection>
              <CollapsibleSection
                title="Analysis Results"
                expanded={rightColumnExpanded.results}
                onToggle={() => toggleRightSection("results")}
                growWhenExpanded
              >
                <NeuralResults />
              </CollapsibleSection>
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
        outlierCount={pipelineResults.outlierRemoval?.count ?? 0}
      />
      <NeuralFullPlateReportModal
        open={fullPlateModalOpen}
        onClose={() => setFullPlateModalOpen(false)}
        project={project}
        wellArrays={wellArrays}
        processingParams={processingParams}
        roiList={roiList}
      />
      <NeuralDocsModal
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        initialSectionId={docsSectionId}
      />
    </Modal>
    </NeuralDocsContext.Provider>
  );
};

export default NeuralAnalysisModal;
