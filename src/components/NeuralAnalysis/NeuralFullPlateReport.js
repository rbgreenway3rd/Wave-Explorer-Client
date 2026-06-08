/**
 * NeuralFullPlateReport.js — Full-Plate CSV report writer.
 *
 * After the report-engine unification: this file is a thin wrapper
 * around `buildWellReportSections`. It emits the file-level HEADER and
 * `<PLATE_PARAMETERS>` block (plate-global processing parameters), then
 * loops every well and delegates each well's CSV block to the shared
 * builder. Single-Well (`NeuralReport.js`) uses the same builder so the
 * per-well blocks of both reports are byte-identical for the same well
 * + same options.
 *
 * Control-well materialization happens ONCE before the loop — fixing
 * the prior `controlSignal: []` correctness bug that made full-plate
 * results diverge from the live UI whenever `subtractControl` was on.
 */

import { runNeuralAnalysisPipeline } from "./NeuralPipeline";
import { suggestSpikeParameters } from "./utilities/parameterSuggestions";
import {
  buildWellReportSections,
  serializeCsvRow,
  formatMetric,
  calculateSpikeFrequency,
  calculateSpikeAmplitude,
  calculateSpikeWidth,
  calculateSpikeAUC,
  calculateBurstMetrics,
  filterSpikesInROI,
  filterBurstsInROI,
  annotateBurstsWithAuc,
  shouldComputeBursts,
} from "./utilities/neuralReportBuilder";

// ---- File-level header --------------------------------------------------

function emitFileHeader({ project, processingParams, wells, parameterMode }) {
  const out = [];
  out.push("<SCOPE>FULL_PLATE</SCOPE>");
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

  out.push("<PROCESSING_PARAMETERS>");
  out.push(serializeCsvRow(["TotalWellsInReport", wells.length]));
  out.push(serializeCsvRow(["ParameterMode", parameterMode]));
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
      // SpikeProminence / SpikeWindow are emitted per-well inside
      // <WELL_PARAMETERS> (resolved per well from auto-suggest or
      // user-defined); skip here so plate-global vs per-well sources
      // don't look identical in the CSV.
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
    for (const [k, v] of rows) out.push(serializeCsvRow([k, v ?? "N/A"]));
  }
  out.push("</PROCESSING_PARAMETERS>");
  out.push("</HEADER>");
  out.push("");
  return out;
}

// ---- Optional <PLATE_SUMMARY> -------------------------------------------
// Side-by-side per-ROI table (one table per ROI, wells as rows). Kept
// largely as before for backward compatibility with downstream tools,
// but with the ROI filter rule swapped to the canonical fully-contained
// rule (the prior "overlap" rule was a per-ROI burst-count divergence
// from the live UI).

const PLATE_SUMMARY_METRIC_NAMES = [
  "Number of Spikes",
  "Spike Frequency (Hz)",
  "Mean ISI (s)",
  "Median ISI (s)",
  "Median Spike Amplitude",
  "Median Spike Width",
  "Median Spike AUC",
  "Total Spike AUC",
  "Number of Bursts",
  "Median Burst Duration (s)",
  "Median Interburst Interval (s)",
  "Total Burst AUC",
];

function buildPlateSummary({ wells, wellData, roiList, processingParams }) {
  const out = [];
  out.push("<PLATE_SUMMARY>");
  out.push("");
  out.push("=== ANALYSIS SETTINGS ===");
  out.push("");
  out.push("SPIKE DETECTION SETTINGS:");
  out.push(
    serializeCsvRow([
      "Min Spike Width",
      `${processingParams?.spikeMinWidth ?? 5} samples`,
    ])
  );
  out.push(
    serializeCsvRow([
      "Min Spike Distance",
      `${processingParams?.spikeMinDistance ?? 0} samples`,
    ])
  );
  out.push("");
  out.push("BURST DETECTION SETTINGS:");
  out.push(
    serializeCsvRow([
      "Max Inter-Spike Interval",
      `${processingParams?.maxInterSpikeInterval ?? 0.05} s`,
    ])
  );
  out.push(
    serializeCsvRow([
      "Min Spikes Per Burst",
      `${processingParams?.minSpikesPerBurst ?? 3} spikes`,
    ])
  );
  out.push("");
  out.push("=== ROI DATA ===");
  out.push("");

  const roisToAnalyze =
    Array.isArray(roiList) && roiList.length > 0
      ? roiList
      : [{ xMin: 0, xMax: Infinity, name: "Full Trace" }];
  const NCOLS = PLATE_SUMMARY_METRIC_NAMES.length;

  // Pre-calculate per-well-per-ROI metric vectors using the SHARED
  // helpers + the canonical contained-fully ROI filter. This is the
  // file's one remaining metric-calculation site outside the per-well
  // builder; the parity contract is per-well so this plate-scope
  // section is OK as a supplement.
  const wellRoiMetrics = {};
  for (const w of wells) {
    const wellKey = w.key;
    const info = wellData[wellKey];
    if (!info) continue;
    const { spikes, bursts } = info;
    wellRoiMetrics[wellKey] = [];
    for (const roi of roisToAnalyze) {
      const effectiveXMax =
        roi.xMax === Infinity
          ? Math.max(
              ...spikes.map((s) => s.time ?? s.peakCoords?.x ?? 0),
              roi.xMin
            )
          : roi.xMax;
      const effectiveRoi = { xMin: roi.xMin, xMax: effectiveXMax };
      const window = { startTime: roi.xMin, endTime: effectiveXMax };
      const spikesInROI = filterSpikesInROI(spikes, effectiveRoi);
      const burstsInROI = filterBurstsInROI(bursts, effectiveRoi);
      const freq = calculateSpikeFrequency(spikesInROI, window);
      const amp = calculateSpikeAmplitude(spikesInROI);
      const width = calculateSpikeWidth(spikesInROI);
      const auc = calculateSpikeAUC(spikesInROI);
      const burst = calculateBurstMetrics(burstsInROI, window);

      wellRoiMetrics[wellKey].push([
        spikesInROI.length,
        formatMetric(freq.averageFrequency, 4),
        formatMetric(freq.meanIsi, 4),
        formatMetric(freq.medianIsi, 4),
        formatMetric(amp.median),
        formatMetric(width.median),
        formatMetric(auc.median),
        formatMetric(spikesInROI.reduce((sum, s) => sum + (s.auc || 0), 0)),
        burstsInROI.length,
        formatMetric(burst.duration.median, 4),
        formatMetric(burst.interBurstInterval.median, 4),
        formatMetric(burstsInROI.reduce((sum, b) => sum + (b.auc || 0), 0)),
      ]);
    }
  }

  // Side-by-side tables: one block per ROI, separator column between.
  // Header row
  const row1 = [];
  roisToAnalyze.forEach((roi, roiIndex) => {
    const roiName = roi.name || `ROI ${roiIndex + 1}`;
    const duration =
      roi.xMax === Infinity ? "Variable" : (roi.xMax - roi.xMin).toFixed(1);
    const endValue = roi.xMax === Infinity ? "End of trace" : roi.xMax;
    row1.push(
      `${roiName} | Duration: ${duration}s | Start: ${roi.xMin} | End: ${endValue}`
    );
    for (let i = 0; i < NCOLS; i++) row1.push("");
    if (roiIndex < roisToAnalyze.length - 1) row1.push("");
  });
  out.push(serializeCsvRow(row1));

  // Spacing rows (keep existing layout)
  for (let _ = 0; _ < 2; _++) {
    const r = [];
    roisToAnalyze.forEach((roi, roiIndex) => {
      r.push("");
      for (let i = 0; i < NCOLS; i++) r.push("");
      if (roiIndex < roisToAnalyze.length - 1) r.push("");
    });
    out.push(serializeCsvRow(r));
  }

  // Metric-name row
  const row4 = [];
  roisToAnalyze.forEach((roi, roiIndex) => {
    row4.push("");
    for (const name of PLATE_SUMMARY_METRIC_NAMES) row4.push(name);
    if (roiIndex < roisToAnalyze.length - 1) row4.push("");
  });
  out.push(serializeCsvRow(row4));

  // Per-well rows
  for (const w of wells) {
    const wellKey = w.key;
    const metrics = wellRoiMetrics[wellKey];
    if (!metrics) continue;
    const wellRow = [];
    roisToAnalyze.forEach((roi, roiIndex) => {
      wellRow.push(wellKey);
      for (const m of metrics[roiIndex]) wellRow.push(m);
      if (roiIndex < roisToAnalyze.length - 1) wellRow.push("");
    });
    out.push(serializeCsvRow(wellRow));
  }

  out.push("</PLATE_SUMMARY>");
  out.push("");
  return out;
}

// ---- Public entry --------------------------------------------------------

/**
 * Generate Full-Plate CSV report.
 *
 * Returns an array of string chunks rather than one concatenated CSV
 * string. A 384-well plate with `includeProcessedSignal: true` can
 * produce hundreds of megabytes; joining the chunks into a single JS
 * string would hit Firefox's "allocation size overflow" limit. The
 * modal passes the array directly to `new Blob([...chunks])`, which
 * handles the storage natively without ever materializing one
 * contiguous JS string.
 *
 * @param {Object} project metadata
 * @param {Array} wells array of well objects
 * @param {Object} processingParams full settings snapshot (must include
 *   `controlWell` when `subtractControl` is on)
 * @param {Object} options report-modal options
 * @param {Function} onProgress (wellIndex, totalWells) progress callback
 * @param {Array} roiList ROI definitions
 * @returns {Promise<string[]>} array of CSV chunks for Blob construction
 */
export async function GenerateFullPlateReport(
  project,
  wells,
  processingParams,
  options = {},
  onProgress = null,
  roiList = []
) {
  const {
    includeProcessedSignal = false,
    includeSpikeData = true,
    includeOverallMetrics = true,
    includeBurstData = true,
    includeBurstMetrics = true,
    includeROIAnalysis = false,
    includePlateSummary = true,
    parameterMode = "auto",
  } = options;
  const useDefinedSpikeParams = parameterMode === "defined";
  const wantsBursts = shouldComputeBursts({
    includeBurstData,
    includeBurstMetrics,
    includeROIAnalysis,
  });

  // ---- File-level header + plate parameters ----
  const csvChunks = [];
  csvChunks.push(
    emitFileHeader({
      project,
      processingParams,
      wells,
      parameterMode: useDefinedSpikeParams ? "user-defined" : "per-well auto",
    }).join("\n")
  );

  // ---- Materialize the control signal once before the well loop ----
  // The live pipeline (NeuralResultsContext.jsx#L186-L193) materializes
  // the control well's filtered data and passes it as `controlSignal`.
  // Full-Plate previously hard-coded `controlSignal: []`, causing the
  // same well analyzed by the two paths to diverge whenever
  // `subtractControl` was enabled.
  let controlSignal = [];
  if (
    processingParams?.subtractControl &&
    processingParams?.controlWell?.indicators?.[0]
  ) {
    const ind = processingParams.controlWell.indicators[0];
    controlSignal =
      typeof ind.materializeFilteredData === "function"
        ? ind.materializeFilteredData()
        : ind.filteredData || [];
  }

  const noiseSuppressionActive =
    !!processingParams?.trendFlatteningEnabled ||
    !!processingParams?.smoothingEnabled;

  // ---- Per-well loop ----
  // wellData accumulates kept-spike + burst arrays per well so the
  // optional <PLATE_SUMMARY> block can run cross-ROI analysis after
  // the loop without rerunning the pipeline.
  const wellData = {};

  for (let wellIndex = 0; wellIndex < wells.length; wellIndex++) {
    const well = wells[wellIndex];
    if (onProgress) onProgress(wellIndex + 1, wells.length);
    // Yield to the event loop so the progress popup re-renders and
    // the browser stays responsive across 384 wells.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const wellKey = well.key || well.id || `Well_${wellIndex + 1}`;

    try {
      const ind = well.indicators[0];
      const rawSignal =
        typeof ind.materializeFilteredData === "function"
          ? ind.materializeFilteredData()
          : ind.filteredData || [];

      // Resolve per-well prominence/window — user-defined or auto.
      let prominenceForWell;
      let windowForWell;
      if (useDefinedSpikeParams) {
        prominenceForWell = processingParams.spikeProminence;
        windowForWell = processingParams.spikeWindow;
      } else {
        const bundle = suggestSpikeParameters(rawSignal);
        prominenceForWell = bundle.prominence.value;
        windowForWell = bundle.window.value;
      }

      // Run the shared pipeline with the SAME `controlSignal` and
      // `params` shape the live pipeline uses.
      const pipelineResult = runNeuralAnalysisPipeline({
        rawSignal,
        controlSignal,
        params: {
          ...processingParams,
          spikeProminence: prominenceForWell,
          spikeWindow: windowForWell,
        },
        analysis: {
          runSpikeDetection: true,
          // Report-time burst detection decision is gated on the
          // report's burst options — decoupled from the chart's
          // `showBursts` toggle. shouldComputeBursts() is the
          // canonical predicate.
          runBurstDetection: wantsBursts,
        },
        noiseSuppressionActive,
        cache: null,
      });
      const spikes = pipelineResult.spikeResults || [];
      const bursts = pipelineResult.burstResults || [];
      const processedSignal = pipelineResult.processedSignal || [];

      // Annotate burst.auc once here so the per-well builder sees the
      // same field Single-Well does (the builder also calls annotate
      // defensively for the fallback path, but if bursts come from the
      // pipeline we annotate at the source).
      if (wantsBursts && bursts.length > 0) {
        annotateBurstsWithAuc(bursts, spikes);
      }

      // Recording window from the processed signal (consistent with
      // single-well; first/last sample x is the canonical scope).
      const recordingStartTime = processedSignal[0]?.x ?? 0;
      const recordingEndTime =
        processedSignal[processedSignal.length - 1]?.x ?? recordingStartTime;

      // Delegate the per-well CSV block to the shared builder.
      const wellLines = buildWellReportSections({
        wellKey,
        processedSignal,
        spikes,
        bursts,
        roiList,
        processingParams,
        resolvedParams: {
          prominenceForWell,
          windowForWell,
          parameterSource: useDefinedSpikeParams
            ? "user-defined"
            : "per-well auto",
          recordingStartTime,
          recordingEndTime,
        },
        options: {
          includeProcessedSignal,
          includeSpikeData,
          includeOverallMetrics,
          includeBurstData,
          includeBurstMetrics,
          includeROIAnalysis,
        },
      });
      csvChunks.push(wellLines.join("\n"));

      if (includePlateSummary) {
        // CRITICAL: do NOT stash the raw NeuralPeak / NeuralBurst
        // objects here. Each NeuralPeak retains a reference to its
        // well's full `data` array (the processedSignal — 8K-250K
        // {x,y} objects per well). Holding 384 wells' worth of that
        // chain OOMs around well 277 in practice.
        //
        // Strip to exactly the fields the <PLATE_SUMMARY> table reads
        // (`buildPlateSummary` above): on spikes, the time + the four
        // distributional metrics; on bursts, the time window + count +
        // auc. This drops total retained memory by 3+ orders of
        // magnitude.
        wellData[wellKey] = {
          spikes: spikes.map((s) => ({
            time: typeof s.time === "number" ? s.time : s.peakCoords?.x,
            amplitude: s.amplitude,
            width: s.width,
            auc: s.auc,
          })),
          bursts: bursts.map((b) => ({
            startTime: b.startTime,
            endTime: b.endTime,
            duration: b.duration,
            spikeCount: b.spikeCount,
            auc: b.auc,
          })),
        };
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `[GenerateFullPlateReport] Error processing well ${wellKey}:`,
        error
      );
      csvChunks.push(
        [
          `<WELL key=${wellKey}>`,
          "<ERROR>",
          serializeCsvRow(["Error", error.message]),
          "</ERROR>",
          `</WELL>`,
        ].join("\n")
      );
    }
  }

  // ---- Optional <PLATE_SUMMARY> ----
  if (includePlateSummary) {
    try {
      csvChunks.push(
        buildPlateSummary({
          wells,
          wellData,
          roiList,
          processingParams,
        }).join("\n")
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[GenerateFullPlateReport] Error building <PLATE_SUMMARY>:`,
        err
      );
      csvChunks.push(
        [
          "<PLATE_SUMMARY_ERROR>",
          serializeCsvRow(["Error", err.message]),
          "</PLATE_SUMMARY_ERROR>",
        ].join("\n")
      );
    }
  }

  // Interleave separator strings so the array can be passed directly
  // to `new Blob([...chunks])` and the resulting CSV has the same
  // section spacing as the prior single-string output. We deliberately
  // do NOT call `csvChunks.join("\n\n")` here — that allocation is
  // exactly what triggers Firefox's "allocation size overflow" on
  // large plates.
  const interleaved = [];
  for (let i = 0; i < csvChunks.length; i++) {
    interleaved.push(csvChunks[i]);
    if (i < csvChunks.length - 1) interleaved.push("\n\n");
  }
  return interleaved;
}
