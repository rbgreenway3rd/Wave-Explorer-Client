/**
 * NeuralReport.js
 * Generates CSV reports for neural spike and burst analysis
 * Similar to GenerateReport.js but specialized for neural data
 */

import { detectBursts } from "./utilities/burstDetection";

// Round metric values to the nearest integer per client request
// (Dave Weaver, 2026-05-27). Frequencies (Hz) need sub-integer
// precision because typical spike rates are < 1 Hz, so callers pass
// decimals=2 for those.
function formatMetric(num, decimals = 0) {
  if (num == null || isNaN(num)) return "N/A";
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
function calculateSpikeAmplitude(spikes, startTime, endTime) {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const amplitudes = spikesInRange.map((spike) => spike.amplitude);
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
function calculateSpikeWidth(spikes, startTime, endTime) {
  const spikesInRange = spikes.filter(
    (spike) =>
      spike.time >= startTime &&
      spike.time <= endTime &&
      typeof spike.width === "number"
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const widths = spikesInRange.map((spike) => spike.width);
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
function calculateSpikeAUC(spikes, startTime, endTime) {
  const spikesInRange = spikes.filter(
    (spike) =>
      spike.time >= startTime &&
      spike.time <= endTime &&
      typeof spike.auc === "number"
  );
  if (spikesInRange.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const aucs = spikesInRange.map((spike) => spike.auc);
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
 * Calculate maximum spike signal
 */
function calculateMaxSpikeSignal(spikes, startTime, endTime) {
  const spikesInRange = spikes.filter(
    (spike) => spike.time >= startTime && spike.time <= endTime
  );
  if (spikesInRange.length === 0) {
    return 0;
  }

  const maxSignal = Math.max(
    ...spikesInRange.map((spike) => spike.peakCoords.y)
  );
  return maxSignal;
}

/**
 * Calculate burst metrics from burst results
 * @param {Array} bursts - Array of burst objects
 * @param {number} startTime - Start time of analysis window
 * @param {number} endTime - End time of analysis window
 * @returns {Object} Burst metrics
 */
function calculateBurstMetrics(bursts, startTime, endTime) {
  const burstsInRange = bursts.filter(
    (burst) => burst.startTime >= startTime && burst.endTime <= endTime
  );

  if (burstsInRange.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }

  // Calculate durations
  const durations = burstsInRange.map((burst) => burst.duration);
  const avgDuration =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const sortedDurations = [...durations].sort((a, b) => a - b);
  const medianDuration =
    sortedDurations.length % 2 === 0
      ? (sortedDurations[sortedDurations.length / 2 - 1] +
          sortedDurations[sortedDurations.length / 2]) /
        2
      : sortedDurations[Math.floor(sortedDurations.length / 2)];

  // Calculate inter-burst intervals
  const interBurstIntervals = [];
  for (let i = 1; i < burstsInRange.length; i++) {
    const interval = burstsInRange[i].startTime - burstsInRange[i - 1].endTime;
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

  return {
    total: burstsInRange.length,
    duration: { average: avgDuration, median: medianDuration },
    interBurstInterval: { average: avgIBI, median: medianIBI },
  };
}

/**
 * Generate a CSV report for neural analysis data
 *
 * @param {Object} project - The project data containing metadata
 * @param {Object} selectedWell - The well that was analyzed
 * @param {Array} processedSignal - The processed signal data [{x, y}]
 * @param {Array} peakResults - Array of detected spikes (NeuralPeak objects)
 * @param {Array} burstResults - Array of detected bursts (NeuralBurst objects)
 * @param {Object} overallMetrics - Summary metrics for all spikes
 * @param {Object} roiMetrics - Metrics calculated per ROI
 * @param {Array} roiList - List of defined ROIs [{xMin, xMax}]
 * @param {Object} processingParams - Parameters used for processing
 * @param {Object} options - Options for what to include in the report
 * @returns {string} CSV formatted string
 */
export const GenerateNeuralCSV = (
  project,
  selectedWell,
  processedSignal,
  peakResults,
  burstResults,
  overallMetrics,
  roiMetrics,
  roiList,
  processingParams,
  options = {}
) => {
  const {
    includeProcessedSignal = false,
    includeSpikeData = true,
    includeOverallMetrics = true,
    includeBurstData = true,
    includeBurstMetrics = true,
    includeROIAnalysis = true,
  } = options;

  // ========================================
  // BURST DETECTION AND METRICS
  // ========================================
  // Use burst results from pipeline if available, otherwise run burst detection
  // This ensures burst metrics are populated even if bursts weren't detected in the UI
  let finalBurstResults = burstResults || [];
  let burstMetricsForReport = null;

  if (peakResults && peakResults.length > 0) {
    // If no burst results provided, run burst detection
    if (!burstResults || burstResults.length === 0) {
      // Run burst detection with parameters from processingParams
      const detectedBursts = detectBursts(peakResults, {
        maxInterSpikeInterval: processingParams?.maxInterSpikeInterval || 0.05,
        minSpikesPerBurst: processingParams?.minSpikesPerBurst || 3,
      });

      finalBurstResults = detectedBursts;
    }

    // Calculate burst metrics for the full time range. Use the
    // recording window from processedSignal (first/last sample x), not
    // the spread of detected spike times — sparse spikes inside a long
    // recording would otherwise yield bogus per-second rates.
    if (finalBurstResults.length > 0) {
      const startTime = processedSignal?.[0]?.x ?? 0;
      const endTime =
        processedSignal?.[processedSignal.length - 1]?.x ?? startTime;

      burstMetricsForReport = calculateBurstMetrics(
        finalBurstResults,
        startTime,
        endTime
      );
    } else {
      // No bursts detected, but we still populate with zeros
      burstMetricsForReport = {
        total: 0,
        duration: { average: 0, median: 0 },
        interBurstInterval: { average: 0, median: 0 },
      };
    }
  } else {
    // No spikes, so no bursts possible
    burstMetricsForReport = {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }

  // ========================================
  // CALCULATE OVERALL METRICS FROM PEAK RESULTS
  // ========================================
  // Calculate metrics directly from peakResults instead of relying on passed overallMetrics
  let calculatedOverallMetrics = null;

  if (peakResults && peakResults.length > 0) {
    // Recording-window bounds, not detected-spike-spread bounds. See
    // NeuralResults.js's overallMetrics block for why — sparse spikes
    // would otherwise produce an inflated spikesPerSecond divisor.
    const startTime = processedSignal?.[0]?.x ?? 0;
    const endTime =
      processedSignal?.[processedSignal.length - 1]?.x ?? startTime;

    calculatedOverallMetrics = {
      spikeFrequency: calculateSpikeFrequency(peakResults, startTime, endTime),
      spikeAmplitude: calculateSpikeAmplitude(peakResults, startTime, endTime),
      spikeWidth: calculateSpikeWidth(peakResults, startTime, endTime),
      spikeAUC: calculateSpikeAUC(peakResults, startTime, endTime),
      maxSpikeSignal: calculateMaxSpikeSignal(peakResults, startTime, endTime),
    };
  }

  const csvLines = [];

  // ========================================
  // 1. HEADER SECTION
  // ========================================
  csvLines.push("<HEADER>");

  // Project metadata
  if (project) {
    csvLines.push(`Date,${project.date || "N/A"}`);
    csvLines.push(`Time,${project.time || "N/A"}`);
    csvLines.push(`Instrument,${project.instrument || "N/A"}`);
    csvLines.push(`ProtocolName,${project.protocol || "N/A"}`);
    csvLines.push(`Project,${project.title || "N/A"}`);

    // Plate information
    if (project.plate && project.plate[0]) {
      const plate = project.plate[0];
      csvLines.push(`AssayPlateBarcode,${plate.assayPlateBarcode || "N/A"}`);
      csvLines.push(`AddPlateBarcode,${plate.addPlateBarcode || "N/A"}`);

      // Experiment information
      if (plate.experiments && plate.experiments[0]) {
        const experiment = plate.experiments[0];
        csvLines.push(`Binning,${experiment.binning || "N/A"}`);
        csvLines.push(`NumRows,${experiment.numberOfRows || "N/A"}`);
        csvLines.push(`NumCols,${experiment.numberOfColumns || "N/A"}`);
        csvLines.push(
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
          csvLines.push(`IndicatorName,${config.name || "N/A"}`);
          csvLines.push(`Excitation,${config.Excitation || "N/A"}`);
          csvLines.push(`Emission,${config.Emission || "N/A"}`);
          csvLines.push(`Exposure,${config.Exposure || "N/A"}`);
          csvLines.push(`Gain,${config.Gain || "N/A"}`);
        }
      }
    }
  }

  // Selected well information
  csvLines.push(
    `SelectedWell,${selectedWell?.key || selectedWell?.label || "N/A"}`
  );

  // Processing parameters
  csvLines.push("<PROCESSING_PARAMETERS>");
  if (processingParams) {
    csvLines.push(
      `NoiseSuppressionActive,${
        processingParams.noiseSuppressionActive ?? "N/A"
      }`
    );
    csvLines.push(
      `SmoothingEnabled,${processingParams.smoothingEnabled ?? "N/A"}`
    );
    csvLines.push(
      `SmoothingWindow,${processingParams.smoothingWindow ?? "N/A"}`
    );
    csvLines.push(
      `SubtractControl,${processingParams.subtractControl ?? "N/A"}`
    );
    csvLines.push(`ControlWell,${processingParams.controlWell?.key || "None"}`);
    csvLines.push(
      `BaselineCorrection,${processingParams.baselineCorrection ?? "N/A"}`
    );
    csvLines.push(
      `TrendFlatteningEnabled,${
        processingParams.trendFlatteningEnabled ?? "N/A"
      }`
    );
    csvLines.push(
      `HandleOutliers,${processingParams.handleOutliers ?? "N/A"}`
    );
    csvLines.push(
      `OutlierPercentile,${processingParams.outlierPercentile ?? "N/A"}`
    );
    csvLines.push(
      `OutlierMultiplier,${processingParams.outlierMultiplier ?? "N/A"}`
    );
    csvLines.push(
      `SpikeProminence,${processingParams.spikeProminence ?? "N/A"}`
    );
    csvLines.push(`SpikeWindow,${processingParams.spikeWindow ?? "N/A"}`);
    csvLines.push(`SpikeMinWidth,${processingParams.spikeMinWidth ?? "N/A"}`);
    csvLines.push(
      `SpikeMinDistance,${processingParams.spikeMinDistance ?? "N/A"}`
    );
    csvLines.push(
      `SpikeMinProminenceRatio,${
        processingParams.spikeMinProminenceRatio ?? "N/A"
      }`
    );
    csvLines.push(
      `StdMultiplier,${processingParams.stdMultiplier ?? "N/A"}`
    );
    csvLines.push(
      `NoiseFloorMultiplier,${processingParams.noiseFloorMultiplier ?? "N/A"}`
    );
    csvLines.push(
      `NoiseWindowSize,${processingParams.noiseWindowSize ?? "N/A"}`
    );
    // Threshold lines — emit both the ratio (0–1) and the absolute Y
    // value the ratio maps to on this well's processed signal. The
    // ratio alone is meaningless without the Y range; the absolute Y
    // is what the user actually saw on the chart.
    let _csvSigYMin = null;
    let _csvSigYMax = null;
    if (Array.isArray(processedSignal) && processedSignal.length > 0) {
      let yMin = Infinity;
      let yMax = -Infinity;
      for (let i = 0; i < processedSignal.length; i++) {
        const y = processedSignal[i].y;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
      if (isFinite(yMin) && isFinite(yMax)) {
        _csvSigYMin = yMin;
        _csvSigYMax = yMax;
      }
    }
    const ratioToY = (r) => {
      if (
        typeof r !== "number" ||
        !isFinite(r) ||
        _csvSigYMin === null ||
        _csvSigYMax === null
      ) {
        return "N/A";
      }
      return _csvSigYMin + r * (_csvSigYMax - _csvSigYMin);
    };

    csvLines.push(
      `ActivityThresholdEnabled,${
        processingParams.activityThresholdEnabled ?? "N/A"
      }`
    );
    csvLines.push(
      `ActivityThresholdRatio,${
        processingParams.activityThresholdRatio ?? "N/A"
      }`
    );
    csvLines.push(
      `ActivityThresholdY,${ratioToY(processingParams.activityThresholdRatio)}`
    );
    csvLines.push(
      `BaselineThresholdEnabled,${
        processingParams.baselineThresholdEnabled ?? "N/A"
      }`
    );
    csvLines.push(
      `BaselineThresholdRatio,${
        processingParams.baselineThresholdRatio ?? "N/A"
      }`
    );
    csvLines.push(
      `BaselineThresholdY,${ratioToY(processingParams.baselineThresholdRatio)}`
    );
    csvLines.push(`ShowBursts,${processingParams.showBursts ?? "N/A"}`);
    csvLines.push(
      `MaxInterSpikeInterval,${processingParams.maxInterSpikeInterval ?? "N/A"}`
    );
    csvLines.push(
      `MinSpikesPerBurst,${processingParams.minSpikesPerBurst ?? "N/A"}`
    );
  }
  csvLines.push("</PROCESSING_PARAMETERS>");

  csvLines.push("</HEADER>");
  csvLines.push(""); // Empty line for readability

  // ========================================
  // 2. SPIKE DATA SECTION
  // ========================================
  if (includeSpikeData && peakResults && peakResults.length > 0) {
    csvLines.push("<SPIKE_DATA>");
    csvLines.push(
      "Spike#,Time,PeakY,LeftBaseX,LeftBaseY,RightBaseX,RightBaseY,Amplitude,Width,AUC,LeftProminence,RightProminence"
    );

    peakResults.forEach((spike, index) => {
      const spikeNumber = index + 1;
      const time = spike.time ?? spike.peakCoords?.x ?? "N/A";
      const peakY = spike.peakCoords?.y ?? "N/A";
      const leftBaseX = spike.leftBaseCoords?.x ?? "N/A";
      const leftBaseY = spike.leftBaseCoords?.y ?? "N/A";
      const rightBaseX = spike.rightBaseCoords?.x ?? "N/A";
      const rightBaseY = spike.rightBaseCoords?.y ?? "N/A";
      const amplitude = spike.amplitude ?? "N/A";
      const width = spike.width ?? "N/A";
      const auc = spike.auc ?? "N/A";
      const leftProminence = spike.prominences?.leftProminence ?? "N/A";
      const rightProminence = spike.prominences?.rightProminence ?? "N/A";

      csvLines.push(
        `${spikeNumber},${time},${peakY},${leftBaseX},${leftBaseY},${rightBaseX},${rightBaseY},${amplitude},${width},${auc},${leftProminence},${rightProminence}`
      );
    });

    csvLines.push("</SPIKE_DATA>");
    csvLines.push(""); // Empty line for readability
  }

  // ========================================
  // 3. SPIKE METRICS SECTION
  // ========================================
  if (includeOverallMetrics && calculatedOverallMetrics) {
    csvLines.push("<SPIKE_METRICS>");
    csvLines.push("Metric,Value,Unit");

    // Spike frequency metrics
    if (calculatedOverallMetrics.spikeFrequency) {
      csvLines.push(
        `Total Spikes,${
          calculatedOverallMetrics.spikeFrequency.total ?? "N/A"
        },count`
      );
      csvLines.push(
        `Average Frequency,${
          formatMetric(calculatedOverallMetrics.spikeFrequency.averageFrequency, 4)
        },Hz`
      );
      csvLines.push(
        `Median Frequency,${
          formatMetric(calculatedOverallMetrics.spikeFrequency.medianFrequency, 4)
        },Hz`
      );
      csvLines.push(
        `Spikes Per Second,${formatMetric(
          calculatedOverallMetrics.spikeFrequency.spikesPerSecond,
          4
        )},Hz`
      );
      csvLines.push(
        `Mean Inter-Spike Interval,${formatMetric(
          calculatedOverallMetrics.spikeFrequency.meanIsi,
          4
        )},s`
      );
      csvLines.push(
        `Median Inter-Spike Interval,${formatMetric(
          calculatedOverallMetrics.spikeFrequency.medianIsi,
          4
        )},s`
      );
    }

    // Spike amplitude metrics
    if (calculatedOverallMetrics.spikeAmplitude) {
      csvLines.push(
        `Average Amplitude,${
          formatMetric(calculatedOverallMetrics.spikeAmplitude.average)
        },units`
      );
      csvLines.push(
        `Median Amplitude,${
          formatMetric(calculatedOverallMetrics.spikeAmplitude.median)
        },units`
      );
      csvLines.push(
        `Min Amplitude,${
          formatMetric(calculatedOverallMetrics.spikeAmplitude.min)
        },units`
      );
      csvLines.push(
        `Max Amplitude,${
          formatMetric(calculatedOverallMetrics.spikeAmplitude.max)
        },units`
      );
    }

    // Spike width metrics
    if (calculatedOverallMetrics.spikeWidth) {
      csvLines.push(
        `Average Width,${
          formatMetric(calculatedOverallMetrics.spikeWidth.average)
        },samples`
      );
      csvLines.push(
        `Median Width,${
          formatMetric(calculatedOverallMetrics.spikeWidth.median)
        },samples`
      );
      csvLines.push(
        `Min Width,${
          formatMetric(calculatedOverallMetrics.spikeWidth.min)
        },samples`
      );
      csvLines.push(
        `Max Width,${
          formatMetric(calculatedOverallMetrics.spikeWidth.max)
        },samples`
      );
    }

    // Spike AUC metrics
    if (calculatedOverallMetrics.spikeAUC) {
      csvLines.push(
        `Average AUC,${
          formatMetric(calculatedOverallMetrics.spikeAUC.average)
        },units`
      );
      csvLines.push(
        `Median AUC,${
          formatMetric(calculatedOverallMetrics.spikeAUC.median)
        },units`
      );
      csvLines.push(
        `Min AUC,${
          formatMetric(calculatedOverallMetrics.spikeAUC.min)
        },units`
      );
      csvLines.push(
        `Max AUC,${
          formatMetric(calculatedOverallMetrics.spikeAUC.max)
        },units`
      );
    }

    // Max spike signal
    if (calculatedOverallMetrics.maxSpikeSignal !== undefined) {
      csvLines.push(
        `Max Spike Signal,${
          formatMetric(calculatedOverallMetrics.maxSpikeSignal)
        },units`
      );
    }

    csvLines.push("</SPIKE_METRICS>");
    csvLines.push(""); // Empty line for readability
  }

  // ========================================
  // 4. BURST DATA SECTION
  // ========================================
  if (includeBurstData && finalBurstResults && finalBurstResults.length > 0) {
    csvLines.push("<BURST_DATA>");
    csvLines.push("Burst#,StartTime,EndTime,Duration,SpikeCount,SpikeIndices");

    finalBurstResults.forEach((burst, index) => {
      const burstNumber = index + 1;
      const startTime = burst.startTime ?? "N/A";
      const endTime = burst.endTime ?? "N/A";
      const duration = burst.duration ?? "N/A";
      const spikeCount = burst.spikeCount ?? burst.spikes?.length ?? "N/A";

      // Get spike indices if available
      let spikeIndices = "N/A";
      if (burst.spikes && Array.isArray(burst.spikes)) {
        // Find the indices of these spikes in the peakResults array
        const indices = burst.spikes.map((spike) => {
          const idx = peakResults.findIndex((p) => p.time === spike.time);
          return idx >= 0 ? idx + 1 : "N/A";
        });
        spikeIndices = `"${indices.join(",")}"`;
      }

      csvLines.push(
        `${burstNumber},${startTime},${endTime},${duration},${spikeCount},${spikeIndices}`
      );
    });

    csvLines.push("</BURST_DATA>");
    csvLines.push(""); // Empty line for readability
  }

  // ========================================
  // 5. BURST METRICS SECTION
  // ========================================
  // ALWAYS include burst metrics section (even if no bursts detected)
  if (includeBurstMetrics && burstMetricsForReport) {
    csvLines.push("<BURST_METRICS>");
    csvLines.push("Metric,Value,Unit");

    csvLines.push(`Total Bursts,${burstMetricsForReport.total ?? "N/A"},count`);
    csvLines.push(
      `Average Duration,${formatMetric(
        burstMetricsForReport.duration?.average
      )},s`
    );
    csvLines.push(
      `Median Duration,${formatMetric(
        burstMetricsForReport.duration?.median
      )},s`
    );
    csvLines.push(
      `Average Inter-Burst Interval,${formatMetric(
        burstMetricsForReport.interBurstInterval?.average
      )},s`
    );
    csvLines.push(
      `Median Inter-Burst Interval,${formatMetric(
        burstMetricsForReport.interBurstInterval?.median
      )},s`
    );

    csvLines.push("</BURST_METRICS>");
    csvLines.push(""); // Empty line for readability
  }

  // ========================================
  // 6. ROI ANALYSIS SECTION
  // ========================================
  if (includeROIAnalysis && roiMetrics && Object.keys(roiMetrics).length > 0) {
    csvLines.push("<ROI_ANALYSIS>");

    Object.entries(roiMetrics).forEach(([roiName, metrics], roiIndex) => {
      const roi = roiList[roiIndex];
      const timeRange = roi ? `${roi.xMin}-${roi.xMax}` : "N/A";

      csvLines.push(`<${roiName}, TimeRange: ${timeRange}>`);

      // ROI Spike Data
      const spikesInROI = peakResults.filter((spike) => {
        if (!roi) return false;
        const time = spike.time ?? spike.peakCoords?.x;
        return time >= roi.xMin && time <= roi.xMax;
      });

      if (spikesInROI.length > 0) {
        csvLines.push("<ROI_SPIKE_DATA>");
        csvLines.push(
          "Spike#,Time,PeakY,LeftBaseX,LeftBaseY,RightBaseX,RightBaseY,Amplitude,Width,AUC"
        );

        spikesInROI.forEach((spike, index) => {
          const spikeNumber = index + 1;
          const time = spike.time ?? spike.peakCoords?.x ?? "N/A";
          const peakY = spike.peakCoords?.y ?? "N/A";
          const leftBaseX = spike.leftBaseCoords?.x ?? "N/A";
          const leftBaseY = spike.leftBaseCoords?.y ?? "N/A";
          const rightBaseX = spike.rightBaseCoords?.x ?? "N/A";
          const rightBaseY = spike.rightBaseCoords?.y ?? "N/A";
          const amplitude = spike.amplitude ?? "N/A";
          const width = spike.width ?? "N/A";
          const auc = spike.auc ?? "N/A";

          csvLines.push(
            `${spikeNumber},${time},${peakY},${leftBaseX},${leftBaseY},${rightBaseX},${rightBaseY},${amplitude},${width},${auc}`
          );
        });

        csvLines.push("</ROI_SPIKE_DATA>");
      }

      // ROI Metrics
      csvLines.push("<ROI_METRICS>");
      csvLines.push("Metric,Value,Unit");

      if (metrics.spikeFrequency) {
        csvLines.push(
          `Total Spikes,${metrics.spikeFrequency.total ?? "N/A"},count`
        );
        csvLines.push(
          `Average Frequency,${
            formatMetric(metrics.spikeFrequency.averageFrequency, 4)
          },Hz`
        );
        csvLines.push(
          `Median Frequency,${
            formatMetric(metrics.spikeFrequency.medianFrequency, 4)
          },Hz`
        );
        csvLines.push(
          `Spikes Per Second,${
            formatMetric(metrics.spikeFrequency.spikesPerSecond, 4)
          },Hz`
        );
        csvLines.push(
          `Mean Inter-Spike Interval,${
            formatMetric(metrics.spikeFrequency.meanIsi, 4)
          },s`
        );
        csvLines.push(
          `Median Inter-Spike Interval,${
            formatMetric(metrics.spikeFrequency.medianIsi, 4)
          },s`
        );
      }
      if (metrics.spikeAmplitude) {
        csvLines.push(
          `Average Amplitude,${
            formatMetric(metrics.spikeAmplitude.average)
          },units`
        );
        csvLines.push(
          `Median Amplitude,${
            formatMetric(metrics.spikeAmplitude.median)
          },units`
        );
      }
      if (metrics.spikeWidth) {
        csvLines.push(
          `Average Width,${
            formatMetric(metrics.spikeWidth.average)
          },samples`
        );
        csvLines.push(
          `Median Width,${
            formatMetric(metrics.spikeWidth.median)
          },samples`
        );
      }
      if (metrics.spikeAUC) {
        csvLines.push(
          `Average AUC,${formatMetric(metrics.spikeAUC.average)},units`
        );
        csvLines.push(
          `Median AUC,${formatMetric(metrics.spikeAUC.median)},units`
        );
      }
      if (metrics.maxSpikeSignal !== undefined) {
        csvLines.push(
          `Max Spike Signal,${
            formatMetric(metrics.maxSpikeSignal)
          },units`
        );
      }

      csvLines.push("</ROI_METRICS>");

      // ROI Burst Data (if bursts exist in this ROI)
      const burstsInROI = finalBurstResults.filter((burst) => {
        if (!roi) return false;
        return burst.startTime >= roi.xMin && burst.endTime <= roi.xMax;
      });

      if (burstsInROI.length > 0) {
        csvLines.push("<ROI_BURST_DATA>");
        csvLines.push("Burst#,StartTime,EndTime,Duration,SpikeCount");

        burstsInROI.forEach((burst, index) => {
          const burstNumber = index + 1;
          const startTime = burst.startTime ?? "N/A";
          const endTime = burst.endTime ?? "N/A";
          const duration = burst.duration ?? "N/A";
          const spikeCount = burst.spikeCount ?? burst.spikes?.length ?? "N/A";

          csvLines.push(
            `${burstNumber},${startTime},${endTime},${duration},${spikeCount}`
          );
        });

        csvLines.push("</ROI_BURST_DATA>");

        // ROI Burst Metrics
        if (metrics.burstMetrics && metrics.burstMetrics.total > 0) {
          csvLines.push("<ROI_BURST_METRICS>");
          csvLines.push("Metric,Value,Unit");

          csvLines.push(
            `Total Bursts,${metrics.burstMetrics.total ?? "N/A"},count`
          );
          csvLines.push(
            `Average Duration,${formatMetric(
              metrics.burstMetrics.duration?.average
            )},s`
          );
          csvLines.push(
            `Median Duration,${formatMetric(
              metrics.burstMetrics.duration?.median
            )},s`
          );
          csvLines.push(
            `Average Inter-Burst Interval,${formatMetric(
              metrics.burstMetrics.interBurstInterval?.average
            )},s`
          );
          csvLines.push(
            `Median Inter-Burst Interval,${formatMetric(
              metrics.burstMetrics.interBurstInterval?.median
            )},s`
          );

          csvLines.push("</ROI_BURST_METRICS>");
        }
      }

      csvLines.push(`</${roiName}>`);
      csvLines.push(""); // Empty line between ROIs
    });

    csvLines.push("</ROI_ANALYSIS>");
  }

  // ========================================
  // 7. PROCESSED SIGNAL SECTION
  // ========================================
  if (includeProcessedSignal && processedSignal && processedSignal.length > 0) {
    csvLines.push("<PROCESSED_SIGNAL>");
    csvLines.push("Time,SignalValue");

    processedSignal.forEach((point) => {
      csvLines.push(`${point.x},${point.y}`);
    });

    csvLines.push("</PROCESSED_SIGNAL>");
    csvLines.push(""); // Empty line for readability
  }

  // Join all lines with Windows-style line endings (matching GenerateReport.js)
  return csvLines.join("\r\n");
};
