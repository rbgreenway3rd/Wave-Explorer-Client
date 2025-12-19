/**
 * BatchNeuralReport.js
 * Generates CSV reports for full-plate neural analysis
 * Each well gets optimized spike detection parameters
 */

import { detectSpikes } from "./utilities/detectSpikes";
import { detectBursts } from "./utilities/burstDetection";
import {
  trendFlattening,
  baselineCorrected,
} from "./utilities/neuralSmoothing";
import { suppressNoise } from "./utilities/noiseSuppression";
import {
  removeOutliers,
  readdOutliersAsSpikes,
} from "./utilities/outlierRemoval";

/**
 * Fast number formatting - replaces toFixed(4) for performance
 * ~3x faster than toFixed() for metrics calculation
 */
function formatMetric(num) {
  if (num === 0) return "0.0000";
  if (num == null || isNaN(num)) return "N/A";
  // Use Math.round for faster formatting than toFixed()
  return (Math.round(num * 10000) / 10000).toString();
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
  const spikesPerSecond = duration > 0 ? total / (duration / 1000) : 0;

  return {
    total,
    average: spikesPerSecond,
    spikesPerSecond,
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
  const timeRangeSeconds = (endTime - startTime) / 1000;
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

/**
 * Suggest prominence based on signal variance (matches NeuralPipeline)
 */
function suggestProminence(signal, factor = 0.5) {
  if (!Array.isArray(signal) || signal.length === 0) return 1;
  const ySignal = signal.map((pt) => pt.y);
  const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
  const variance =
    ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
  return Math.floor(factor * Math.sqrt(variance));
}

/**
 * Suggest window based on prominence (matches NeuralPipeline algorithm)
 */
function suggestWindow(signal, prominence, num = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return 20;

  // Calculate sampling rate (average time between samples)
  const samplingRate =
    signal.length > 1
      ? (signal[signal.length - 1].x - signal[0].x) / signal.length
      : 1;

  // Estimate typical peak width from prominence
  // Larger prominence suggests wider peaks that need larger windows
  // Scale by num to allow tuning
  const baseWindow = Math.max(10, Math.floor(prominence * num * samplingRate));

  // Constrain to reasonable bounds
  const maxWindow = Math.min(
    Math.floor(signal.length / 50),
    Math.floor(signal.length / 10)
  );
  const minWindow = 10;

  const optimalWindowWidth = Math.max(
    minWindow,
    Math.min(baseWindow, maxWindow)
  );

  console.log(
    `[BatchNeuralReport suggestWindow] prominence: ${prominence}, num: ${num}, calculated: ${optimalWindowWidth}`
  );

  return optimalWindowWidth;
}

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
export function GenerateFullPlateReport(
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
  } = options;

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
  ];

  if (processingParams) {
    plateParamLines.push(
      `NoiseSuppressionActive,${
        processingParams.noiseSuppressionActive ?? "N/A"
      }`,
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

  wells.forEach((well, wellIndex) => {
    if (onProgress) {
      onProgress(wellIndex + 1, wells.length);
    }

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
      const rawSignal = well.indicators[0].filteredData;

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: rawSignal length=${rawSignal.length}`
      );
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: First 5 signal points:`,
        rawSignal.slice(0, 5)
      );

      // ========================================
      // CALCULATE OPTIMAL PARAMETERS (on RAW signal, like NeuralPipeline)
      // ========================================

      // Calculate optimal parameters for THIS well using RAW signal (before preprocessing)
      const optimalProminence = suggestProminence(rawSignal, 0.5);
      const optimalWindow = suggestWindow(rawSignal, optimalProminence, 5);

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: prominence=${optimalProminence}, window=${optimalWindow} (calculated on RAW signal)`
      );

      // ========================================
      // SIGNAL PREPROCESSING (same order as NeuralPipeline)
      // ========================================

      // Step 1: Noise suppression (control subtraction) - ALWAYS runs like NeuralPipeline
      // For batch processing, we don't have a control well, so pass empty array
      let processedSignal = suppressNoise(rawSignal, [], {
        subtractControl: processingParams.subtractControl || false,
      });

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: After suppressNoise, length=${processedSignal.length}`
      );

      // Step 2: Apply smoothing and baseline correction (only if noiseSuppressionActive)
      if (processingParams.noiseSuppressionActive) {
        if (processingParams.trendFlatteningEnabled) {
          processedSignal = trendFlattening(processedSignal, {
            adaptiveBaseline: processingParams.baselineCorrection,
            polynomialDegree: 2,
          });
          console.log(
            `[GenerateFullPlateReport] Well ${wellKey}: Applied trendFlattening`
          );
        }

        if (processingParams.baselineCorrection) {
          processedSignal = baselineCorrected(
            processedSignal,
            processingParams.smoothingWindow || 200,
            50
          );
          console.log(
            `[GenerateFullPlateReport] Well ${wellKey}: Applied baselineCorrection`
          );
        }
      }
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: Final processed signal length=${processedSignal.length}`
      );

      // Step 3: Outlier removal (if enabled) - matches NeuralPipeline
      let processedForDetection = processedSignal;
      let outlierSpikes = [];

      if (
        processingParams.noiseSuppressionActive &&
        processingParams.handleOutliers
      ) {
        const outlierResult = removeOutliers(processedForDetection, {
          percentile: processingParams.outlierPercentile || 95,
          multiplier: processingParams.outlierMultiplier || 2.0,
          slopeThreshold: 0.1,
        });
        processedForDetection = outlierResult.cleanedSignal;
        outlierSpikes = outlierResult.outlierSpikes;
        console.log(
          `[GenerateFullPlateReport] Well ${wellKey}: Removed ${outlierSpikes.length} outlier spikes`
        );
      }

      // WELL PARAMETERS - unique to this well (only if non-ROI sections requested)
      if (includeWellSections) {
        wellSections.push(
          [
            "<WELL_PARAMETERS>",
            `WellID,${wellKey}`,
            `OptimalProminence,${optimalProminence}`,
            `OptimalWindow,${optimalWindow}`,
            "</WELL_PARAMETERS>",
          ].join("\n")
        );
      }

      // ========================================
      // SPIKE DETECTION (on processed signal)
      // ========================================

      const spikeDetectionParams = {
        prominence: optimalProminence,
        window: optimalWindow,
        minWidth: processingParams.spikeMinWidth || 5,
        minDistance: processingParams.spikeMinDistance || 0,
        minProminenceRatio: 0.01,
      };

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: Calling detectSpikes with params:`,
        spikeDetectionParams
      );

      let spikes = detectSpikes(processedForDetection, spikeDetectionParams);

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: Detected ${spikes.length} spikes (before re-adding outliers)`
      );

      // Re-add outliers as spikes (if they were removed)
      if (processingParams.handleOutliers && outlierSpikes.length > 0) {
        spikes = readdOutliersAsSpikes(spikes, outlierSpikes);
        console.log(
          `[GenerateFullPlateReport] Well ${wellKey}: Re-added ${outlierSpikes.length} outliers as spikes, total: ${spikes.length}`
        );
      }
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: spikes array:`,
        spikes
      );
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: includeSpikeData=${includeSpikeData}, includeOverallMetrics=${includeOverallMetrics}`
      );

      // SPIKE METRICS
      if (includeOverallMetrics) {
        const spikeMetricsLines = [];
        if (spikes.length > 0) {
          const times = spikes.map((spike) => spike.time);
          const startTime = Math.min(...times);
          const endTime = Math.max(...times);

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
            `Spike Frequency,${formatMetric(spikeFrequency.average)},Hz`,
            `Spikes Per Second,${formatMetric(
              spikeFrequency.spikesPerSecond
            )},Hz`,
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

      // BURST DETECTION
      let bursts = [];
      if (spikes.length >= (processingParams.minSpikesPerBurst || 3)) {
        bursts = detectBursts(spikes, {
          maxInterSpikeInterval: processingParams.maxInterSpikeInterval || 50,
          minSpikesPerBurst: processingParams.minSpikesPerBurst || 3,
        });

        console.log(
          `[GenerateFullPlateReport] Well ${wellKey}: Detected ${bursts.length} bursts`
        );

        // Calculate AUC for each burst (sum of spike AUCs within the burst)
        bursts.forEach((burst) => {
          let burstAUC = 0;
          // Find all spikes that fall within this burst's time range
          spikes.forEach((spike) => {
            const spikeTime = spike.time ?? spike.peakCoords?.x;
            if (spikeTime >= burst.startTime && spikeTime <= burst.endTime) {
              if (spike.auc) {
                burstAUC += spike.auc;
              }
            }
          });
          burst.auc = burstAUC;
        });

        console.log(
          `[GenerateFullPlateReport] Well ${wellKey}: Calculated AUC for ${bursts.length} bursts`
        );
      }

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
          `Average Duration,${formatMetric(burstMetrics.duration.average)},ms`,
          `Median Duration,${formatMetric(burstMetrics.duration.median)},ms`,
          `Average Inter-Burst Interval,${formatMetric(
            burstMetrics.interBurstInterval.average
          )},ms`,
          `Median Inter-Burst Interval,${formatMetric(
            burstMetrics.interBurstInterval.median
          )},ms`,
          "</BURST_METRICS>",
        ];
        wellSections.push(burstMetricsLines.join("\n"));
      }

      // Store well data for horizontal spike data section
      allWellsData.push({
        wellKey,
        optimalProminence,
        optimalWindow,
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
  });

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
          processingParams?.maxInterSpikeInterval ?? 50
        } ms`
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

      // Metric names (13 metrics per ROI)
      const metricNames = [
        "Number of Spikes",
        "Spike Frequency (Hz)",
        "Median Spike Amplitude",
        "Median Spike Width",
        "Median Spike AUC",
        "Total Spike AUC",
        "Number of Bursts",
        "Burst Frequency (Hz)",
        "Median Spikes per Burst",
        "Median Burst Duration (ms)",
        "Median Interburst Interval (ms)",
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

          // Store 13 metrics for this ROI
          wellRoiMetrics[wellKey].push([
            spikesInROI.length, // Number of Spikes
            spikeFrequency?.average
              ? formatMetric(spikeFrequency.average)
              : "0.0000", // Spike Frequency
            spikeAmplitude?.median
              ? formatMetric(spikeAmplitude.median)
              : "0.0000", // Median Spike Amplitude
            spikeWidth?.median ? formatMetric(spikeWidth.median) : "0.0000", // Median Spike Width
            spikeAUC?.median ? formatMetric(spikeAUC.median) : "0.0000", // Median Spike AUC
            spikesInROI.reduce((sum, s) => sum + (s.auc || 0), 0).toFixed(4), // Total Spike AUC
            burstsInROI.length, // Number of Bursts
            burstMetrics?.frequency
              ? formatMetric(burstMetrics.frequency)
              : "0.0000", // Burst Frequency
            burstMetrics?.spikesPerBurst?.median
              ? formatMetric(burstMetrics.spikesPerBurst.median)
              : "0.0000", // Median Spikes per Burst
            burstMetrics?.duration?.median
              ? formatMetric(burstMetrics.duration.median)
              : "0.0000", // Median Burst Duration
            burstMetrics?.interBurstInterval?.median
              ? formatMetric(burstMetrics.interBurstInterval.median)
              : "0.0000", // Median Interburst Interval
            burstMetrics?.auc?.median
              ? formatMetric(burstMetrics.auc.median)
              : "0.0000", // Median Burst AUC
            burstsInROI.reduce((sum, b) => sum + (b.auc || 0), 0).toFixed(4), // Total Burst AUC
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
            : ((roi.xMax - roi.xMin) / 1000).toFixed(1);
        const endValue = roi.xMax === Infinity ? "End of trace" : roi.xMax;

        // Consolidated header in well label column
        row1.push(
          `${roiName} | Duration: ${duration}s | Start: ${roi.xMin} | End: ${endValue}`
        );
        // Fill remaining columns for this ROI's metrics (13 columns)
        for (let i = 0; i < 13; i++) {
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
        // Fill remaining columns for this ROI's metrics (13 columns)
        for (let i = 0; i < 13; i++) {
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
        // Fill remaining columns for this ROI's metrics (13 columns)
        for (let i = 0; i < 13; i++) {
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
        row4.push(...metricNames); // 13 metric names
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
          wellRow.push(...metrics[roiIndex]); // 13 metrics for this ROI
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
