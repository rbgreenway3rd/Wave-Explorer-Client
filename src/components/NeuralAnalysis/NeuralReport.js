/**
 * NeuralReport.js — Single-Well CSV report writer.
 *
 * After the report-engine unification: this file is a thin wrapper
 * around `buildWellReportSections`. It emits the file-level HEADER
 * (project + plate + global processing parameters), then delegates
 * every per-well section to the shared builder. Full-Plate
 * (`NeuralFullPlateReport.js`) uses the same builder so both reports'
 * per-well blocks are byte-identical for the same well + same options.
 */

import {
  buildWellReportSections,
  serializeCsvRow,
} from "./utilities/neuralReportBuilder";

// File-level header block — project + plate + global params + the
// `<SCOPE>SINGLE_WELL` marker that distinguishes this CSV from a
// Full-Plate one. Per-well-derived values (e.g. ActivityThresholdY,
// resolved Prominence) live in the WELL_PARAMETERS section emitted by
// the shared builder, NOT here, because they vary per well.
function emitFileHeader({ project, processingParams, selectedWell }) {
  const out = [];
  out.push("<SCOPE>SINGLE_WELL</SCOPE>");
  out.push("<HEADER>");

  if (project) {
    out.push(serializeCsvRow(["Date", project.date || "N/A"]));
    out.push(serializeCsvRow(["Time", project.time || "N/A"]));
    out.push(serializeCsvRow(["Instrument", project.instrument || "N/A"]));
    out.push(serializeCsvRow(["ProtocolName", project.protocol || "N/A"]));
    out.push(serializeCsvRow(["Project", project.title || "N/A"]));

    if (project.plate && project.plate[0]) {
      const plate = project.plate[0];
      out.push(
        serializeCsvRow(["AssayPlateBarcode", plate.assayPlateBarcode || "N/A"])
      );
      out.push(
        serializeCsvRow(["AddPlateBarcode", plate.addPlateBarcode || "N/A"])
      );
      if (plate.experiments && plate.experiments[0]) {
        const experiment = plate.experiments[0];
        out.push(serializeCsvRow(["Binning", experiment.binning || "N/A"]));
        out.push(
          serializeCsvRow(["NumRows", experiment.numberOfRows || "N/A"])
        );
        out.push(
          serializeCsvRow(["NumCols", experiment.numberOfColumns || "N/A"])
        );
        out.push(
          serializeCsvRow([
            "Operator",
            experiment.operator ? experiment.operator.join(";") : "N/A",
          ])
        );
        if (
          experiment.indicatorConfigurations &&
          experiment.indicatorConfigurations[0]
        ) {
          const config = experiment.indicatorConfigurations[0];
          out.push(serializeCsvRow(["IndicatorName", config.name || "N/A"]));
          out.push(serializeCsvRow(["Excitation", config.Excitation || "N/A"]));
          out.push(serializeCsvRow(["Emission", config.Emission || "N/A"]));
          out.push(serializeCsvRow(["Exposure", config.Exposure || "N/A"]));
          out.push(serializeCsvRow(["Gain", config.Gain || "N/A"]));
        }
      }
    }
  }

  out.push(
    serializeCsvRow([
      "SelectedWell",
      selectedWell?.key || selectedWell?.label || "N/A",
    ])
  );

  out.push("<PROCESSING_PARAMETERS>");
  if (processingParams) {
    const rows = [
      ["NoiseSuppressionActive", processingParams.noiseSuppressionActive],
      ["SmoothingEnabled", processingParams.smoothingEnabled],
      ["SmoothingWindow", processingParams.smoothingWindow],
      ["SubtractControl", processingParams.subtractControl],
      ["ControlWell", processingParams.controlWell?.key || "None"],
      ["BaselineCorrection", processingParams.baselineCorrection],
      ["TrendFlatteningEnabled", processingParams.trendFlatteningEnabled],
      ["HandleOutliers", processingParams.handleOutliers],
      ["OutlierPercentile", processingParams.outlierPercentile],
      ["OutlierMultiplier", processingParams.outlierMultiplier],
      ["SpikeProminence", processingParams.spikeProminence],
      ["SpikeWindow", processingParams.spikeWindow],
      ["SpikeMinWidth", processingParams.spikeMinWidth],
      ["SpikeMinDistance", processingParams.spikeMinDistance],
      ["SpikeMinProminenceRatio", processingParams.spikeMinProminenceRatio],
      ["StdMultiplier", processingParams.stdMultiplier],
      ["NoiseFloorMultiplier", processingParams.noiseFloorMultiplier],
      ["NoiseWindowSize", processingParams.noiseWindowSize],
      ["ActivityThresholdEnabled", processingParams.activityThresholdEnabled],
      ["ActivityThresholdRatio", processingParams.activityThresholdRatio],
      ["BaselineThresholdEnabled", processingParams.baselineThresholdEnabled],
      ["BaselineThresholdRatio", processingParams.baselineThresholdRatio],
      ["ShowBursts", processingParams.showBursts],
      ["MaxInterSpikeInterval", processingParams.maxInterSpikeInterval],
      ["MinSpikesPerBurst", processingParams.minSpikesPerBurst],
    ];
    for (const [k, v] of rows) {
      out.push(serializeCsvRow([k, v ?? "N/A"]));
    }
  }
  out.push("</PROCESSING_PARAMETERS>");
  out.push("</HEADER>");
  out.push("");
  return out;
}

/**
 * Generate a Single-Well CSV report.
 *
 * Signature preserved for backward compatibility with NeuralReportModal.
 * The previously-precomputed `overallMetrics` and `roiMetrics` arguments
 * are now ignored — the shared builder recomputes them from the raw
 * spike/burst arrays so the two reports cannot drift.
 *
 * @returns {string} CSV (CRLF line endings)
 */
export const GenerateNeuralCSV = (
  project,
  selectedWell,
  processedSignal,
  peakResults,
  burstResults,
  _overallMetrics, // unused; recomputed from peakResults
  _roiMetrics, // unused; recomputed from peakResults
  roiList,
  processingParams,
  options = {}
) => {
  const csvLines = [];

  csvLines.push(...emitFileHeader({ project, processingParams, selectedWell }));

  const recordingStartTime =
    Array.isArray(processedSignal) && processedSignal.length > 0
      ? processedSignal[0].x
      : 0;
  const recordingEndTime =
    Array.isArray(processedSignal) && processedSignal.length > 0
      ? processedSignal[processedSignal.length - 1].x
      : recordingStartTime;

  const wellLines = buildWellReportSections({
    wellKey: selectedWell?.key || selectedWell?.label || "unknown",
    processedSignal,
    spikes: peakResults || [],
    // burstResults is what the live pipeline produced. The builder
    // gates rerun on shouldComputeBursts(options); if the user
    // checked burst-related options in the report modal but
    // `showBursts` was off in the chart, the builder reruns
    // detection itself with the params snapshot. That's the explicit
    // version of the prior implicit "rerun if absent" fallback.
    bursts: Array.isArray(burstResults) && burstResults.length > 0
      ? burstResults
      : null,
    roiList: roiList || [],
    processingParams,
    resolvedParams: {
      prominenceForWell: processingParams?.spikeProminence,
      windowForWell: processingParams?.spikeWindow,
      // Single-Well always reports against the live (user-set) params,
      // never per-well auto-suggested ones. Full-Plate populates this
      // differently in its per-well loop.
      parameterSource: "user-defined",
      recordingStartTime,
      recordingEndTime,
    },
    options: {
      includeProcessedSignal: false,
      includeSpikeData: true,
      includeOverallMetrics: true,
      includeBurstData: true,
      includeBurstMetrics: true,
      includeROIAnalysis: true,
      ...options,
    },
  });
  csvLines.push(...wellLines);

  return csvLines.join("\r\n");
};
