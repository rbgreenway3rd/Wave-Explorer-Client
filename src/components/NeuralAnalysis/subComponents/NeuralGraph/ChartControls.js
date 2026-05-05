import "../../styles/ChartControls.css";

import React, { useContext, useState } from "react";
import NeuralReportModal from "../../NeuralReportModal";
import NeuralFullPlateReportModal from "../../NeuralFullPlateReportModal";

import NoiseSuppressionControls from "./controls/NoiseSuppressionControls";
import ControlWellSelector from "./controls/ControlWellSelector";
import ROIControls from "./controls/ROIControls";
import PanZoomControls from "./controls/PanZoomControls";
import ReportGenerationControls from "./controls/ReportGenerationControls";
import DecimationControls from "./controls/DecimationControls";

import { DataContext } from "../../../../providers/DataProvider";
import {
  useNeuralInteraction,
  useNeuralResults,
  useNeuralSelection,
  useNeuralSettings,
} from "../../NeuralProvider";

/**
 * ChartControls — top control bar above the Neural Graph. After Tier B
 * this is a thin layout shell:
 *
 *   - Each child control panel self-subscribes to the relevant context.
 *     ChartControls passes nothing to them (apart from `resetZoom`,
 *     an imperative ref handle into NeuralGraph).
 *   - ChartControls owns only the two report-modal `open` flags and the
 *     processingParams snapshot it builds for the report modals.
 *
 * Pre-Tier-B this component received 31 props; it now receives 1.
 */
const ChartControls = ({ resetZoom }) => {
  const { selectedWell, controlWell } = useNeuralSelection();
  const settings = useNeuralSettings();
  const { roiList } = useNeuralInteraction();
  const { pipelineResults, effectiveSpikeProminence, effectiveSpikeWindow } =
    useNeuralResults();
  const { project, wellArrays } = useContext(DataContext);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [fullPlateModalOpen, setFullPlateModalOpen] = useState(false);

  const peakResults = pipelineResults.spikeResults;
  const burstResults = pipelineResults.burstResults;
  const overallMetrics = pipelineResults.metrics;
  const processedSignal = pipelineResults.processedSignal;

  const handleGenerateReport = () => {
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
    setReportModalOpen(true);
  };

  const handleGenerateFullPlateReport = () => {
    if (!wellArrays || wellArrays.length === 0) {
      alert("No well data available. Please load a dataset first.");
      return;
    }
    setFullPlateModalOpen(true);
  };

  // Snapshot of the processing params used when building the CSV export.
  // Built per-render from settings + effective spike params + selection so
  // a report generated right after a slider drag reflects the latest
  // values (and not a stale snapshot from earlier).
  const processingParams = {
    noiseSuppressionActive: settings.noiseSuppressionActive,
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
    spikeMinWidth: 5,
    spikeMinDistance: settings.spikeMinDistance,
    maxInterSpikeInterval: settings.maxInterSpikeInterval,
    minSpikesPerBurst: settings.minSpikesPerBurst,
  };

  return (
    <div className="neural-chart-controls">
      <NeuralReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        project={project}
        selectedWell={selectedWell}
        processedSignal={processedSignal}
        peakResults={peakResults}
        burstResults={burstResults}
        overallMetrics={overallMetrics}
        roiMetrics={null}
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

      {/* Control well selector only shows when noise suppression is active. */}
      {settings.noiseSuppressionActive && (
        <ControlWellSelector disabled={!settings.subtractControl} />
      )}

      {settings.noiseSuppressionActive && (
        <div className="chart-controls-divider" />
      )}

      <NoiseSuppressionControls />

      <div className="chart-controls-divider" />

      <div style={{ display: "flex", flexDirection: "row", gap: 4 }}>
        <PanZoomControls resetZoom={resetZoom} />
        <ROIControls />
      </div>

      <div className="chart-controls-divider" />

      <ReportGenerationControls
        handleGenerateReport={handleGenerateReport}
        handleGenerateFullPlateReport={handleGenerateFullPlateReport}
      />

      <div className="chart-controls-divider" />

      <DecimationControls />
    </div>
  );
};

export default ChartControls;
