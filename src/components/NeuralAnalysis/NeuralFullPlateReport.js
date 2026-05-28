/**
 * BatchNeuralReport.js
 * Generates CSV reports for full-plate neural analysis
 * Each well gets optimized spike detection parameters
 */

import { runNeuralAnalysisPipeline } from "./NeuralPipeline";
import {
  suggestProminence,
  suggestWindow,
} from "./utilities/parameterSuggestions";

/**
 * Round to the nearest integer for CSV output. Per client request
 * (Dave Weaver, 2026-05-27): "For your metrics, I think you can round
 * all of them to the nearest integer." Frequencies (Hz) need sub-
 * integer precision because typical spike rates are < 1 Hz, so callers
 * pass decimals=2 for those.
 */
function formatMetric(num, decimals = 0) {
  if (num == null || isNaN(num)) return "N/A";
  if (num === 0) return decimals > 0 ? (0).toFixed(decimals) : "0";
  return decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString();
}

/**
 * Calculate spike frequency metrics
 */
function calculateSpikeFrequency(spikes, startTime, endTime) {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  const duration = endTime - startTime;
  const total = spikesInRange.length;
  const spikesPerSecond = duration > 0 ? total / duration : 0;
  let averageFrequency = 0;
  let medianFrequency = 0;
  let meanIsi = 0;
  let medianIsi = 0;
  if (total >= 2) {
    const sortedTimes = spikesInRange
      .map((s) => s.time)
      .sort((a, b) => a - b);
    const isis = new Array(sortedTimes.length - 1);
    for (let i = 1; i < sortedTimes.length; i++) {
      isis[i - 1] = sortedTimes[i] - sortedTimes[i - 1];
    }
    meanIsi = isis.reduce((s, v) => s + v, 0) / isis.length;
    const sortedIsis = [...isis].sort((a, b) => a - b);
    const mid = Math.floor(sortedIsis.length / 2);
    medianIsi =
      sortedIsis.length % 2 === 0
        ? (sortedIsis[mid - 1] + sortedIsis[mid]) / 2
        : sortedIsis[mid];
    averageFrequency = meanIsi > 0 ? 1 / meanIsi : 0;
    medianFrequency = medianIsi > 0 ? 1 / medianIsi : 0;
  }
  return {
    total,
    spikesPerSecond,
    averageFrequency,
    medianFrequency,
    meanIsi,
    medianIsi,
  };
}

/**
 * Calculate spike amplitude metrics
 */
function calculateSpikeAmplitude(spikes) {
  if (spikes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const amplitudes = spikes.map((spike) => spike.amplitude);
  const average =
    amplitudes.reduce((sum, amp) => sum + amp, 0) / amplitudes.length;
  const sortedAmplitudes = [...amplitudes].sort((a, b) => a - b);
  const median =
    sortedAmplitudes.length % 2 === 0
      ? (sortedAmplitudes[sortedAmplitudes.length / 2 - 1] +
          sortedAmplitudes[sortedAmplitudes.length / 2]) /
        2
      : sortedAmplitudes[Math.floor(sortedAmplitudes.length / 2)];

  return {
    average,
    median,
    min: Math.min(...amplitudes),
    max: Math.max(...amplitudes),
  };
}

/**
 * Calculate spike width metrics
 */
function calculateSpikeWidth(spikes) {
  const spikesWithWidth = spikes.filter(
    (spike) => typeof spike.width === "number"
  );
  if (spikesWithWidth.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const widths = spikesWithWidth.map((spike) => spike.width);
  const average = widths.reduce((sum, w) => sum + w, 0) / widths.length;
  const sortedWidths = [...widths].sort((a, b) => a - b);
  const median =
    sortedWidths.length % 2 === 0
      ? (sortedWidths[sortedWidths.length / 2 - 1] +
          sortedWidths[sortedWidths.length / 2]) /
        2
      : sortedWidths[Math.floor(sortedWidths.length / 2)];

  return {
    average,
    median,
    min: Math.min(...widths),
    max: Math.max(...widths),
  };
}

/**
 * Calculate spike AUC metrics
 */
function calculateSpikeAUC(spikes) {
  const spikesWithAUC = spikes.filter((spike) => typeof spike.auc === "number");
  if (spikesWithAUC.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const aucs = spikesWithAUC.map((spike) => spike.auc);
  const average = aucs.reduce((sum, auc) => sum + auc, 0) / aucs.length;
  const sortedAUCs = [...aucs].sort((a, b) => a - b);
  const median =
    sortedAUCs.length % 2 === 0
      ? (sortedAUCs[sortedAUCs.length / 2 - 1] +
          sortedAUCs[sortedAUCs.length / 2]) /
        2
      : sortedAUCs[Math.floor(sortedAUCs.length / 2)];

  return {
    average,
    median,
    min: Math.min(...aucs),
    max: Math.max(...aucs),
  };
}

/**
 * Calculate burst metrics
 */
function calculateBurstMetrics(bursts, startTime, endTime) {
  if (bursts.length === 0) {
    return {
      total: 0,
      frequency: 0,
      duration: { average: 0, median: 0 },
      spikesPerBurst: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
      auc: { median: 0, total: 0 },
    };
  }

  // Calculate burst frequency (bursts per second)
  const timeRangeSeconds = endTime - startTime;
  const frequency = timeRangeSeconds > 0 ? bursts.length / timeRangeSeconds : 0;

  // Calculate durations
  const durations = bursts.map((burst) => burst.duration);
  const avgDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const medianDuration =
    sortedDurations.length % 2 === 0
      ? (sortedDurations[sortedDurations.length / 2 - 1] +
          sortedDurations[sortedDurations.length / 2]) /
        2
      : sortedDurations[Math.floor(sortedDurations.length / 2)];

  // Calculate spikes per burst
  const spikeCounts = bursts.map(
    (burst) => burst.spikeCount || burst.spikes?.length || 0
  );
  const avgSpikesPerBurst =
    spikeCounts.reduce((sum, count) => sum + count, 0) / spikeCounts.length;
  const sortedSpikeCounts = [...spikeCounts].sort((a, b) => a - b);
  const medianSpikesPerBurst =
    sortedSpikeCounts.length % 2 === 0
      ? (sortedSpikeCounts[sortedSpikeCounts.length / 2 - 1] +
          sortedSpikeCounts[sortedSpikeCounts.length / 2]) /
        2
      : sortedSpikeCounts[Math.floor(sortedSpikeCounts.length / 2)];

  // Calculate inter-burst intervals
  const interBurstIntervals = [];
  for (let i = 1; i < bursts.length; i++) {
    const interval = bursts[i].startTime - bursts[i - 1].endTime;
    if (interval > 0) interBurstIntervals.push(interval);
  }

  let avgIBI = 0;
  let medianIBI = 0;
  if (interBurstIntervals.length > 0) {
    avgIBI =
      interBurstIntervals.reduce((sum, ibi) => sum + ibi, 0) /
      interBurstIntervals.length;
    const sortedIBIs = [...interBurstIntervals].sort((a, b) => a - b);
    medianIBI =
      sortedIBIs.length % 2 === 0
        ? (sortedIBIs[sortedIBIs.length / 2 - 1] +
            sortedIBIs[sortedIBIs.length / 2]) /
          2
        : sortedIBIs[Math.floor(sortedIBIs.length / 2)];
  }

  // Calculate burst AUC metrics
  const burstAUCs = bursts.map((burst) => burst.auc || 0);
  const totalBurstAUC = burstAUCs.reduce((sum, auc) => sum + auc, 0);
  const sortedAUCs = [...burstAUCs].sort((a, b) => a - b);
  const medianBurstAUC =
    sortedAUCs.length % 2 === 0
      ? (sortedAUCs[sortedAUCs.length / 2 - 1] +
          sortedAUCs[sortedAUCs.length / 2]) /
        2
      : sortedAUCs[Math.floor(sortedAUCs.length / 2)];

  return {
    total: bursts.length,
    frequency: frequency,
    duration: { average: avgDuration, median: medianDuration },
    spikesPerBurst: {
      average: avgSpikesPerBurst,
      median: medianSpikesPerBurst,
    },
    interBurstInterval: { average: avgIBI, median: medianIBI },
    auc: { median: medianBurstAUC, total: totalBurstAUC },
  };
}

// suggestProminence / suggestWindow live in
// ./utilities/parameterSuggestions and are imported above. Previously
// this file shipped a copy of each that had drifted from the live
// pipeline's version (Math.floor zeroed prominence for normalized
// signals; report-side factor was 0.5 vs. pipeline's 3). Callers below
// pass their factor explicitly.

/**
 * Generate full-plate neural analysis CSV report
 *
 * @param {Object} project - Project metadata
 * @param {Array} wells - Array of well objects to process
 * @param {Object} processingParams - Processing parameters (noise suppression, baseline, etc.)
 * @param {Object} options - Report options (what sections to include)
 * @param {Function} onProgress - Optional callback for progress updates (wellIndex, totalWells)
 * @returns {string} CSV formatted string
 */
export async function GenerateFullPlateReport(
  project,
  wells,
  processingParams,
  options = {},
  onProgress = null,
  roiList = [] // Add roiList parameter
) {
  console.log(
    "[GenerateFullPlateReport] Starting full-plate report generation"
  );
  console.log(`[GenerateFullPlateReport] Processing ${wells.length} wells`);
  console.log(`[GenerateFullPlateReport] ROIs defined: ${roiList.length}`);

  const {
    includeSpikeData = true,
    includeOverallMetrics = true,
    includeBurstData = true,
    includeBurstMetrics = true,
    includeROIAnalysis = false,
    // "auto" (default) recomputes per-well via suggestProminence/Window —
    // legacy behavior. "defined" uses the user's slider values from
    // processingParams for every well in the plate.
    parameterMode = "auto",
  } = options;
  const useDefinedSpikeParams = parameterMode === "defined";

  // Check if any non-ROI sections are requested
  const includeWellSections =
    includeSpikeData ||
    includeOverallMetrics ||
    includeBurstData ||
    includeBurstMetrics;

  // Use array of section chunks for efficient concatenation
  const csvChunks = [];

  // Store well data for ROI analysis (processed after all wells)
  const wellData = {};

  // ========================================
  // HEADER SECTION
  // ========================================
  const headerLines = ["<HEADER>"];

  // Project metadata
  if (project) {
    headerLines.push(
      `Date,${project.date || "N/A"}`,
      `Time,${project.time || "N/A"}`,
      `Instrument,${project.instrument || "N/A"}`,
      `ProtocolName,${project.protocol || "N/A"}`,
      `Project,${project.title || "N/A"}`
    );

    // Plate information
    if (project.plate && project.plate[0]) {
      const plate = project.plate[0];
      headerLines.push(
        `AssayPlateBarcode,${plate.assayPlateBarcode || "N/A"}`,
        `AddPlateBarcode,${plate.addPlateBarcode || "N/A"}`
      );

      // Experiment information
      if (plate.experiments && plate.experiments[0]) {
        const experiment = plate.experiments[0];
        headerLines.push(
          `Binning,${experiment.binning || "N/A"}`,
          `NumRows,${experiment.numberOfRows || "N/A"}`,
          `NumCols,${experiment.numberOfColumns || "N/A"}`,
          `Operator,${
            experiment.operator ? experiment.operator.join(",") : "N/A"
          }`
        );

        // Indicator configuration
        if (
          experiment.indicatorConfigurations &&
          experiment.indicatorConfigurations[0]
        ) {
          const config = experiment.indicatorConfigurations[0];
          headerLines.push(
            `IndicatorName,${config.name || "N/A"}`,
            `Excitation,${config.Excitation || "N/A"}`,
            `Emission,${config.Emission || "N/A"}`,
            `Exposure,${config.Exposure || "N/A"}`,
            `Gain,${config.Gain || "N/A"}`
          );
        }
      }
    }
  }

  headerLines.push("</HEADER>");
  csvChunks.push(headerLines.join("\n"));

  // ========================================
  // PLATE PARAMETERS SECTION
  // ========================================
  const plateParamLines = [
    "<PLATE_PARAMETERS>",
    `TotalWellsInReport,${wells.length}`,
    `ParameterMode,${
      useDefinedSpikeParams ? "user-defined" : "per-well auto"
    }`,
  ];

  if (processingParams) {
    plateParamLines.push(
      `NoiseSuppressionActive,${
        processingParams.noiseSuppressionActive ?? "N/A"
      }`,
      `SmoothingEnabled,${processingParams.smoothingEnabled ?? "N/A"}`,
      `SmoothingWindow,${processingParams.smoothingWindow ?? "N/A"}`,
      `BaselineCorrection,${processingParams.baselineCorrection ?? "N/A"}`,
      `TrendFlatteningEnabled,${
        processingParams.trendFlatteningEnabled ?? "N/A"
      }`,
      `HandleOutliers,${processingParams.handleOutliers ?? "N/A"}`,
      `OutlierPercentile,${processingParams.outlierPercentile ?? "N/A"}`,
      `OutlierMultiplier,${processingParams.outlierMultiplier ?? "N/A"}`,
      `SpikeMinWidth,${processingParams.spikeMinWidth ?? "N/A"}`,
      `SpikeMinDistance,${processingParams.spikeMinDistance ?? "N/A"}`,
      `SpikeMinProminenceRatio,${
        processingParams.spikeMinProminenceRatio ?? "N/A"
      }`,
      `StdMultiplier,${processingParams.stdMultiplier ?? "N/A"}`,
      `NoiseFloorMultiplier,${
        processingParams.noiseFloorMultiplier ?? "N/A"
      }`,
      `NoiseWindowSize,${processingParams.noiseWindowSize ?? "N/A"}`,
      `ActivityThresholdEnabled,${
        processingParams.activityThresholdEnabled ?? "N/A"
      }`,
      `ActivityThresholdRatio,${
        processingParams.activityThresholdRatio ?? "N/A"
      }`,
      // Absolute Y is per-well (depends on each well's signal range) so
      // the full-plate header carries only the ratio — the per-well CSV
      // ([NeuralReport.js]) has the Y value alongside.
      `BaselineThresholdEnabled,${
        processingParams.baselineThresholdEnabled ?? "N/A"
      }`,
      `BaselineThresholdRatio,${
        processingParams.baselineThresholdRatio ?? "N/A"
      }`,
      `ShowBursts,${processingParams.showBursts ?? "N/A"}`,
      `MaxInterSpikeInterval,${
        processingParams.maxInterSpikeInterval ?? "N/A"
      }`,
      `MinSpikesPerBurst,${processingParams.minSpikesPerBurst ?? "N/A"}`
    );
  }

  plateParamLines.push("</PLATE_PARAMETERS>");
  csvChunks.push(plateParamLines.join("\n"));

  // ========================================
  // FIRST PASS: COLLECT SPIKE DATA FROM ALL WELLS
  // ========================================
  const allWellsData = []; // Store all wells' processed data

  for (let wellIndex = 0; wellIndex < wells.length; wellIndex++) {
    const well = wells[wellIndex];
    if (onProgress) {
      onProgress(wellIndex + 1, wells.length);
    }
    // Yield to the event loop so the progress popup can re-render
    // and the browser stays responsive. Running 384 wells of
    // detectSpikes + SG smoothing back-to-back on the main thread
    // was freezing the tab for minutes. setTimeout(0) lets queued
    // React state updates flush between wells; the overhead is a
    // few ms per well which is negligible against the pipeline cost.
    await new Promise((resolve) => setTimeout(resolve, 0));

    console.log(
      `[GenerateFullPlateReport] Processing well ${wellIndex + 1}/${
        wells.length
      }: ${well.key}`
    );

    const wellKey = well.key || well.id || `Well_${wellIndex + 1}`;
    const wellSections = []; // Array to collect all sections for this well

    // Only add well data header if non-ROI sections are requested
    if (includeWellSections) {
      wellSections.push(`<WELL_DATA: ${wellKey}>`);
    }

    try {
      // Build the {x,y}[] form on demand. Post-Phase C, wells store
      // filtered data as typed arrays (`filteredXs` / `filteredYs`)
      // and `filteredData` is empty until something asks for the
      // point array. The modal triggers materialization for the
      // *currently selected* well only; the other 383 wells in a
      // 384-well plate sit at `filteredData = []`. Without calling
      // `materializeFilteredData()` here, every well in the report
      // would see an empty rawSignal → zero spikes detected → all-
      // zero ROI metrics. (This was the root cause of the long
      // "every well = 0" full-plate ROI bug.)
      const ind = well.indicators[0];
      const rawSignal =
        typeof ind.materializeFilteredData === "function"
          ? ind.materializeFilteredData()
          : ind.filteredData || [];

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: rawSignal length=${rawSignal.length}`
      );

      // ========================================
      // CALCULATE OPTIMAL PARAMETERS (on RAW signal, like NeuralPipeline)
      // ========================================

      // Resolve per-well prominence/window. Defaults to per-well auto-
      // suggestions from the raw signal; switches to the user's slider
      // values when the dialog's Parameters radio is set to "defined".
      let prominenceForWell;
      let windowForWell;
      if (useDefinedSpikeParams) {
        prominenceForWell = processingParams.spikeProminence;
        windowForWell = processingParams.spikeWindow;
      } else {
        prominenceForWell = suggestProminence(rawSignal, 0.5);
        windowForWell = suggestWindow(rawSignal, prominenceForWell, 5);
      }

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: prominence=${prominenceForWell}, window=${windowForWell} (source: ${
          useDefinedSpikeParams ? "user-defined" : "per-well auto"
        })`
      );

      // ========================================
      // RUN THE SHARED PIPELINE
      // ========================================
      // Delegate to runNeuralAnalysisPipeline — the exact same function
      // the modal/worker uses. This guarantees the full-plate report
      // produces results identical to what the user sees on screen for
      // the currently-selected well, well by well across the plate.
      // Previously the full-plate path reimplemented the preprocessing
      // by hand and diverged from the canonical pipeline (missing SG
      // smoothing, missing baseline-mode bases, missing residual-based
      // σ for the noise-floor gate, etc.), which manifested as every
      // well's ROI metrics coming out as zero because spike detection
      // was producing different results than the modal.
      const noiseSuppressionActive =
        !!processingParams.trendFlatteningEnabled ||
        !!processingParams.smoothingEnabled;
      const pipelineResult = runNeuralAnalysisPipeline({
        rawSignal,
        controlSignal: [],
        params: {
          ...processingParams,
          // Override prominence/window with the per-well-resolved
          // values. In "defined" mode these are the user's slider
          // values; in "auto" mode they're per-well auto-suggestions
          // computed above.
          spikeProminence: prominenceForWell,
          spikeWindow: windowForWell,
        },
        analysis: {
          runSpikeDetection: true,
          // Always run burst detection in the report — the ROI burst
          // metrics need it, and downstream consumers can ignore the
          // burst list when they don't care.
          runBurstDetection: true,
        },
        noiseSuppressionActive,
        cache: null,
      });
      const spikes = pipelineResult.spikeResults || [];
      const bursts = pipelineResult.burstResults || [];

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: Pipeline produced ${spikes.length} spikes, ${bursts.length} bursts`
      );

      // WELL PARAMETERS - unique to this well (only if non-ROI sections requested)
      if (includeWellSections) {
        wellSections.push(
          [
            "<WELL_PARAMETERS>",
            `WellID,${wellKey}`,
            `Prominence,${prominenceForWell}`,
            `Window,${windowForWell}`,
            `ParameterSource,${
              useDefinedSpikeParams ? "user-defined" : "per-well auto"
            }`,
            "</WELL_PARAMETERS>",
          ].join("\n")
        );
      }

      // SPIKE METRICS
      if (includeOverallMetrics) {
        const spikeMetricsLines = [];
        if (spikes.length > 0) {
          // Recording-window bounds (first/last sample x), not the
          // spread of detected spike times.
          const startTime = rawSignal?.[0]?.x ?? 0;
          const endTime =
            rawSignal?.[rawSignal.length - 1]?.x ?? startTime;

          const spikeFrequency = calculateSpikeFrequency(
            spikes,
            startTime,
            endTime
          );
          const spikeAmplitude = calculateSpikeAmplitude(spikes);
          const spikeWidth = calculateSpikeWidth(spikes);
          const spikeAUC = calculateSpikeAUC(spikes);

          spikeMetricsLines.push(
            "<SPIKE_METRICS>",
            "Metric,Value,Unit",
            `Total Spikes,${spikeFrequency.total},count`,
            `Average Frequency,${formatMetric(spikeFrequency.averageFrequency, 4)},Hz`,
            `Median Frequency,${formatMetric(spikeFrequency.medianFrequency, 4)},Hz`,
            `Spikes Per Second,${formatMetric(
              spikeFrequency.spikesPerSecond,
              4
            )},Hz`,
            `Mean Inter-Spike Interval,${formatMetric(spikeFrequency.meanIsi, 4)},s`,
            `Median Inter-Spike Interval,${formatMetric(spikeFrequency.medianIsi, 4)},s`,
            `Average Amplitude,${formatMetric(spikeAmplitude.average)},units`,
            `Median Amplitude,${formatMetric(spikeAmplitude.median)},units`,
            `Min Amplitude,${formatMetric(spikeAmplitude.min)},units`,
            `Max Amplitude,${formatMetric(spikeAmplitude.max)},units`,
            `Average Width,${formatMetric(spikeWidth.average)},samples`,
            `Median Width,${formatMetric(spikeWidth.median)},samples`,
            `Min Width,${formatMetric(spikeWidth.min)},samples`,
            `Max Width,${formatMetric(spikeWidth.max)},samples`,
            `Average AUC,${formatMetric(spikeAUC.average)},units`,
            `Median AUC,${formatMetric(spikeAUC.median)},units`,
            `Min AUC,${formatMetric(spikeAUC.min)},units`,
            `Max AUC,${formatMetric(spikeAUC.max)},units`,
            "</SPIKE_METRICS>"
          );
        } else {
          spikeMetricsLines.push(
            "<SPIKE_METRICS>",
            "Metric,Value,Unit",
            "Total Spikes,0,count",
            "</SPIKE_METRICS>"
          );
        }
        wellSections.push(spikeMetricsLines.join("\n"));
      }

      // BURST AUC — runNeuralAnalysisPipeline doesn't compute per-
      // burst AUC, so do it here. Sum each burst's overlapping spike
      // AUCs (same calculation the modal does separately).
      bursts.forEach((burst) => {
        let burstAUC = 0;
        spikes.forEach((spike) => {
          const spikeTime = spike.time ?? spike.peakCoords?.x;
          if (spikeTime >= burst.startTime && spikeTime <= burst.endTime) {
            if (spike.auc) burstAUC += spike.auc;
          }
        });
        burst.auc = burstAUC;
      });

      // BURST DATA
      if (includeBurstData && bursts.length > 0) {
        const burstDataLines = [];
        burstDataLines.push(
          "<BURST_DATA>",
          "Burst#,StartTime,EndTime,Duration,SpikeCount"
        );

        bursts.forEach((burst, index) => {
          const burstNumber = index + 1;
          const startTime = burst.startTime ?? "N/A";
          const endTime = burst.endTime ?? "N/A";
          const duration = burst.duration ?? "N/A";
          const spikeCount = burst.spikeCount ?? "N/A";

          burstDataLines.push(
            `${burstNumber},${startTime},${endTime},${duration},${spikeCount}`
          );
        });

        burstDataLines.push("</BURST_DATA>");
        wellSections.push(burstDataLines.join("\n"));
      }

      // BURST METRICS
      if (includeBurstMetrics) {
        const burstMetrics = calculateBurstMetrics(bursts);

        const burstMetricsLines = [
          "<BURST_METRICS>",
          "Metric,Value,Unit",
          `Total Bursts,${burstMetrics.total},count`,
          `Average Duration,${formatMetric(burstMetrics.duration.average)},s`,
          `Median Duration,${formatMetric(burstMetrics.duration.median)},s`,
          `Average Inter-Burst Interval,${formatMetric(
            burstMetrics.interBurstInterval.average
          )},s`,
          `Median Inter-Burst Interval,${formatMetric(
            burstMetrics.interBurstInterval.median
          )},s`,
          "</BURST_METRICS>",
        ];
        wellSections.push(burstMetricsLines.join("\n"));
      }

      // Store well data for horizontal spike data section
      allWellsData.push({
        wellKey,
        prominence: prominenceForWell,
        window: windowForWell,
        spikes,
      });

      // ========================================
      // ROI ANALYSIS (Side-by-side format)
      // ========================================
      // Store spike and burst data for ROI analysis (processed later)
      if (includeROIAnalysis) {
        wellData[wellKey] = {
          spikes,
          bursts,
        };
      }
    } catch (error) {
      console.error(
        `[GenerateFullPlateReport] Error processing well ${wellKey}:`,
        error
      );
      if (includeWellSections) {
        const wellErrorLines = [
          "<ERROR>",
          `Error: ${error.message}`,
          "</ERROR>",
        ];
        wellSections.push(wellErrorLines.join("\n"));
      }
    }

    // Add well footer and combine all sections for this well (only if non-ROI sections requested)
    if (includeWellSections && wellSections.length > 0) {
      wellSections.push(`</WELL_DATA: ${wellKey}>`);
      csvChunks.push(wellSections.join("\n\n"));
    }
  }

  // ========================================
  // ROI SUMMARY TABLE - All Wells Combined
  // ========================================
  if (includeROIAnalysis) {
    try {
      console.log(
        `[GenerateFullPlateReport] Building ROI summary table for ${wells.length} wells`
      );

      const roiTableLines = [];
      roiTableLines.push("<ROI_SUMMARY_TABLE>");

      // Add analysis settings section at the top (displayed once)
      roiTableLines.push("");
      roiTableLines.push("=== ANALYSIS SETTINGS ===");
      roiTableLines.push("");

      // Spike Detection Settings
      roiTableLines.push("SPIKE DETECTION SETTINGS:");
      roiTableLines.push(
        `Spike Prominence Factor,${
          processingParams?.spikeProminenceFactor ?? 0.5
        }`
      );
      roiTableLines.push(
        `Spike Window Calculation,${
          processingParams?.spikeWindowNum ?? 5
        } peaks`
      );
      roiTableLines.push(
        `Min Spike Width,${processingParams?.spikeMinWidth ?? 5} samples`
      );
      roiTableLines.push(
        `Min Spike Distance,${processingParams?.spikeMinDistance ?? 0} samples`
      );
      roiTableLines.push("");

      // Burst Detection Settings
      roiTableLines.push("BURST DETECTION SETTINGS:");
      roiTableLines.push(
        `Max Inter-Spike Interval,${
          processingParams?.maxInterSpikeInterval ?? 0.05
        } s`
      );
      roiTableLines.push(
        `Min Spikes Per Burst,${
          processingParams?.minSpikesPerBurst ?? 3
        } spikes`
      );
      roiTableLines.push("");

      // Noise Suppression Status
      roiTableLines.push("NOISE SUPPRESSION STATUS:");
      roiTableLines.push(
        `Noise Suppression Active,${
          processingParams?.noiseSuppressionActive ?? false
        }`
      );
      roiTableLines.push(
        `Trend Flattening Enabled,${
          processingParams?.trendFlatteningEnabled ?? false
        }`
      );
      roiTableLines.push(
        `Smoothing Window,${processingParams?.smoothingWindow ?? "N/A"}`
      );
      roiTableLines.push("");

      // Outlier Handling Status and Parameters
      roiTableLines.push("OUTLIER HANDLING:");
      roiTableLines.push(
        `Outlier Handling Active,${processingParams?.handleOutliers ?? false}`
      );
      if (processingParams?.handleOutliers) {
        roiTableLines.push(
          `Outlier Percentile Threshold,${
            processingParams?.outlierPercentile ?? 95
          }th percentile`
        );
        roiTableLines.push(
          `Outlier Multiplier,${
            processingParams?.outlierMultiplier ?? 2.0
          }x median`
        );
      }
      roiTableLines.push("");
      roiTableLines.push("=== ROI DATA ===");
      roiTableLines.push("");

      // Use roiList if provided, otherwise treat entire trace as "Full Trace"
      const roisToAnalyze =
        roiList && roiList.length > 0
          ? roiList
          : [{ xMin: 0, xMax: Infinity, name: "Full Trace" }];

      console.log(
        `[GenerateFullPlateReport] Processing ${roisToAnalyze.length} ROIs`
      );

      // Metric names (15 metrics per ROI)
      const metricNames = [
        "Number of Spikes",
        "Spike Frequency (Hz)",
        "Mean ISI (s)",
        "Median ISI (s)",
        "Median Spike Amplitude",
        "Median Spike Width",
        "Median Spike AUC",
        "Total Spike AUC",
        "Number of Bursts",
        "Burst Frequency (Hz)",
        "Median Spikes per Burst",
        "Median Burst Duration (s)",
        "Median Interburst Interval (s)",
        "Median Burst AUC",
        "Total Burst AUC",
      ];

      // Pre-calculate metrics for all wells and ROIs
      const wellRoiMetrics = {};
      wells.forEach(({ key: wellKey }) => {
        const wellInfo = wellData[wellKey];
        if (!wellInfo) return;

        const { spikes, bursts } = wellInfo;
        wellRoiMetrics[wellKey] = [];

        roisToAnalyze.forEach((roi) => {
          const timeRangeMin = roi.xMin;
          const timeRangeMax =
            roi.xMax === Infinity
              ? Math.max(...spikes.map((s) => s.time ?? s.peakCoords?.x ?? 0))
              : roi.xMax;

          // Filter spikes and bursts in this ROI
          const spikesInROI = spikes.filter((spike) => {
            const time = spike.time ?? spike.peakCoords?.x;
            return time >= timeRangeMin && time <= timeRangeMax;
          });

          const burstsInROI = bursts.filter((burst) => {
            return (
              burst.endTime >= timeRangeMin && burst.startTime <= timeRangeMax
            );
          });

          // Calculate spike metrics
          const spikeFrequency = calculateSpikeFrequency(
            spikesInROI,
            timeRangeMin,
            timeRangeMax
          );
          const spikeAmplitude = calculateSpikeAmplitude(spikesInROI);
          const spikeWidth = calculateSpikeWidth(spikesInROI);
          const spikeAUC = calculateSpikeAUC(spikesInROI);

          // Calculate burst metrics
          const burstMetrics = calculateBurstMetrics(
            burstsInROI,
            timeRangeMin,
            timeRangeMax
          );

          // Store 15 metrics for this ROI. Use nullish checks (not
          // truthy) so legitimately-zero metric values render as "0",
          // not get swapped for the "no data" placeholder.
          wellRoiMetrics[wellKey].push([
            spikesInROI.length, // Number of Spikes
            spikeFrequency?.averageFrequency != null
              ? formatMetric(spikeFrequency.averageFrequency, 4)
              : "0", // Spike Frequency (1/mean ISI)
            spikeFrequency?.meanIsi != null
              ? formatMetric(spikeFrequency.meanIsi, 4)
              : "0", // Mean ISI
            spikeFrequency?.medianIsi != null
              ? formatMetric(spikeFrequency.medianIsi, 4)
              : "0", // Median ISI
            spikeAmplitude?.median != null
              ? formatMetric(spikeAmplitude.median)
              : "0", // Median Spike Amplitude
            spikeWidth?.median != null
              ? formatMetric(spikeWidth.median)
              : "0", // Median Spike Width
            spikeAUC?.median != null
              ? formatMetric(spikeAUC.median)
              : "0", // Median Spike AUC
            formatMetric(
              spikesInROI.reduce((sum, s) => sum + (s.auc || 0), 0)
            ), // Total Spike AUC
            burstsInROI.length, // Number of Bursts
            burstMetrics?.frequency != null
              ? formatMetric(burstMetrics.frequency, 4)
              : "0", // Burst Frequency
            burstMetrics?.spikesPerBurst?.median != null
              ? formatMetric(burstMetrics.spikesPerBurst.median)
              : "0", // Median Spikes per Burst
            burstMetrics?.duration?.median != null
              ? formatMetric(burstMetrics.duration.median)
              : "0", // Median Burst Duration
            burstMetrics?.interBurstInterval?.median != null
              ? formatMetric(burstMetrics.interBurstInterval.median)
              : "0", // Median Interburst Interval
            burstMetrics?.auc?.median != null
              ? formatMetric(burstMetrics.auc.median)
              : "0", // Median Burst AUC
            formatMetric(
              burstsInROI.reduce((sum, b) => sum + (b.auc || 0), 0)
            ), // Total Burst AUC
          ]);
        });
      });

      // Build side-by-side tables, each ROI gets its own table with header and well labels
      // Row 1: Headers for each ROI table (consolidated into well label column)
      const row1 = [];
      roisToAnalyze.forEach((roi, roiIndex) => {
        const roiName = roi.name || `ROI ${roiIndex + 1}`;
        const duration =
          roi.xMax === Infinity
            ? "Variable"
            : (roi.xMax - roi.xMin).toFixed(1);
        const endValue = roi.xMax === Infinity ? "End of trace" : roi.xMax;

        // Consolidated header in well label column
        row1.push(
          `${roiName} | Duration: ${duration}s | Start: ${roi.xMin} | End: ${endValue}`
        );
        // Fill remaining columns for this ROI's metrics (15 columns)
        for (let i = 0; i < 15; i++) {
          row1.push("");
        }
        // Add separator column between tables (except after last ROI)
        if (roiIndex < roisToAnalyze.length - 1) {
          row1.push(""); // Empty separator column
        }
      });
      roiTableLines.push(row1.join(","));

      // Row 2: Empty row for spacing
      const row2 = [];
      roisToAnalyze.forEach((roi, roiIndex) => {
        row2.push(""); // Empty well label column
        // Fill remaining columns for this ROI's metrics (15 columns)
        for (let i = 0; i < 15; i++) {
          row2.push("");
        }
        if (roiIndex < roisToAnalyze.length - 1) {
          row2.push(""); // Empty separator column
        }
      });
      roiTableLines.push(row2.join(","));

      // Row 3: Empty spacing row
      const row3 = [];
      roisToAnalyze.forEach((roi, roiIndex) => {
        row3.push(""); // Empty well label column
        // Fill remaining columns for this ROI's metrics (15 columns)
        for (let i = 0; i < 15; i++) {
          row3.push("");
        }
        if (roiIndex < roisToAnalyze.length - 1) {
          row3.push(""); // Empty separator column
        }
      });
      roiTableLines.push(row3.join(","));

      // Row 4: Metric names for each ROI table
      const row4 = [];
      roisToAnalyze.forEach((roi, roiIndex) => {
        row4.push(""); // Empty well label column
        row4.push(...metricNames); // 15 metric names
        if (roiIndex < roisToAnalyze.length - 1) {
          row4.push(""); // Empty separator column
        }
      });
      roiTableLines.push(row4.join(","));

      // Rows 5+: Well data for each ROI table
      wells.forEach(({ key: wellKey }) => {
        const metrics = wellRoiMetrics[wellKey];
        if (!metrics) {
          console.warn(
            `[GenerateFullPlateReport] No metrics found for well ${wellKey}`
          );
          return;
        }

        const wellRow = [];
        roisToAnalyze.forEach((roi, roiIndex) => {
          wellRow.push(wellKey); // Well label for this ROI table
          wellRow.push(...metrics[roiIndex]); // 15 metrics for this ROI
          if (roiIndex < roisToAnalyze.length - 1) {
            wellRow.push(""); // Empty separator column
          }
        });

        roiTableLines.push(wellRow.join(","));
      });

      roiTableLines.push("</ROI_SUMMARY_TABLE>");
      csvChunks.push(roiTableLines.join("\n"));

      console.log(
        `[GenerateFullPlateReport] ROI summary table created with ${wells.length} wells and ${roisToAnalyze.length} ROIs`
      );
    } catch (roiError) {
      console.error(
        `[GenerateFullPlateReport] Error creating ROI summary table:`,
        roiError
      );
      const roiErrorLines = [
        "<ROI_ERROR>",
        `Error creating ROI summary table: ${roiError.message}`,
        "</ROI_ERROR>",
      ];
      csvChunks.push(roiErrorLines.join("\n"));
    }
  }

  console.log("[GenerateFullPlateReport] Report generation complete");
  return csvChunks.join("\n\n");
}
