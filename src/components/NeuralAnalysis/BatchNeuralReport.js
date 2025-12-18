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
function calculateBurstMetrics(bursts) {
  if (bursts.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }

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

  return {
    total: bursts.length,
    duration: { average: avgDuration, median: medianDuration },
    interBurstInterval: { average: avgIBI, median: medianIBI },
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
  onProgress = null
) {
  console.log(
    "[GenerateFullPlateReport] Starting full-plate report generation"
  );
  console.log(`[GenerateFullPlateReport] Processing ${wells.length} wells`);

  const {
    includeSpikeData = true,
    includeOverallMetrics = true,
    includeBurstData = true,
    includeBurstMetrics = true,
  } = options;

  const csvLines = [];

  // ========================================
  // HEADER SECTION
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

  csvLines.push("</HEADER>");
  csvLines.push("");

  // ========================================
  // PLATE PARAMETERS SECTION
  // ========================================
  csvLines.push("<PLATE_PARAMETERS>");
  csvLines.push(`TotalWellsInReport,${wells.length}`);

  if (processingParams) {
    csvLines.push(
      `NoiseSuppressionActive,${
        processingParams.noiseSuppressionActive ?? "N/A"
      }`
    );
    csvLines.push(
      `SmoothingWindow,${processingParams.smoothingWindow ?? "N/A"}`
    );
    csvLines.push(
      `BaselineCorrection,${processingParams.baselineCorrection ?? "N/A"}`
    );
    csvLines.push(
      `TrendFlatteningEnabled,${
        processingParams.trendFlatteningEnabled ?? "N/A"
      }`
    );
    csvLines.push(`SpikeMinWidth,${processingParams.spikeMinWidth ?? "N/A"}`);
    csvLines.push(
      `SpikeMinDistance,${processingParams.spikeMinDistance ?? "N/A"}`
    );
    csvLines.push(
      `MaxInterSpikeInterval,${processingParams.maxInterSpikeInterval ?? "N/A"}`
    );
    csvLines.push(
      `MinSpikesPerBurst,${processingParams.minSpikesPerBurst ?? "N/A"}`
    );
  }

  csvLines.push("</PLATE_PARAMETERS>");
  csvLines.push("");

  // ========================================
  // PROCESS EACH WELL
  // ========================================
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
    csvLines.push(`<WELL_DATA: ${wellKey}>`);

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
      ); // WELL PARAMETERS - unique to this well
      csvLines.push("<WELL_PARAMETERS>");
      csvLines.push(`WellID,${wellKey}`);
      csvLines.push(`OptimalProminence,${optimalProminence}`);
      csvLines.push(`OptimalWindow,${optimalWindow}`);
      csvLines.push("</WELL_PARAMETERS>");
      csvLines.push("");

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

      const spikes = detectSpikes(processedSignal, spikeDetectionParams);

      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: Detected ${spikes.length} spikes`
      );
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: spikes array:`,
        spikes
      );
      console.log(
        `[GenerateFullPlateReport] Well ${wellKey}: includeSpikeData=${includeSpikeData}, includeOverallMetrics=${includeOverallMetrics}`
      );

      // SPIKE DATA
      if (includeSpikeData) {
        if (spikes.length > 0) {
          csvLines.push("<SPIKE_DATA>");
          csvLines.push(
            "Spike#,Time,PeakY,LeftBaseX,LeftBaseY,RightBaseX,RightBaseY,Amplitude,Width,AUC,LeftProminence,RightProminence"
          );

          spikes.forEach((spike, index) => {
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
          csvLines.push("");
        } else {
          csvLines.push("<SPIKE_DATA>");
          csvLines.push("No spikes detected");
          csvLines.push("</SPIKE_DATA>");
          csvLines.push("");
        }
      }

      // SPIKE METRICS
      if (includeOverallMetrics) {
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

          csvLines.push("<SPIKE_METRICS>");
          csvLines.push("Metric,Value,Unit");
          csvLines.push(`Total Spikes,${spikeFrequency.total},count`);
          csvLines.push(
            `Spike Frequency,${spikeFrequency.average.toFixed(4)},Hz`
          );
          csvLines.push(
            `Spikes Per Second,${spikeFrequency.spikesPerSecond.toFixed(4)},Hz`
          );
          csvLines.push(
            `Average Amplitude,${spikeAmplitude.average.toFixed(4)},units`
          );
          csvLines.push(
            `Median Amplitude,${spikeAmplitude.median.toFixed(4)},units`
          );
          csvLines.push(`Min Amplitude,${spikeAmplitude.min.toFixed(4)},units`);
          csvLines.push(`Max Amplitude,${spikeAmplitude.max.toFixed(4)},units`);
          csvLines.push(
            `Average Width,${spikeWidth.average.toFixed(4)},samples`
          );
          csvLines.push(`Median Width,${spikeWidth.median.toFixed(4)},samples`);
          csvLines.push(`Min Width,${spikeWidth.min.toFixed(4)},samples`);
          csvLines.push(`Max Width,${spikeWidth.max.toFixed(4)},samples`);
          csvLines.push(`Average AUC,${spikeAUC.average.toFixed(4)},units`);
          csvLines.push(`Median AUC,${spikeAUC.median.toFixed(4)},units`);
          csvLines.push(`Min AUC,${spikeAUC.min.toFixed(4)},units`);
          csvLines.push(`Max AUC,${spikeAUC.max.toFixed(4)},units`);
          csvLines.push("</SPIKE_METRICS>");
          csvLines.push("");
        } else {
          csvLines.push("<SPIKE_METRICS>");
          csvLines.push("Metric,Value,Unit");
          csvLines.push(`Total Spikes,0,count`);
          csvLines.push("</SPIKE_METRICS>");
          csvLines.push("");
        }
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
      }

      // BURST DATA
      if (includeBurstData && bursts.length > 0) {
        csvLines.push("<BURST_DATA>");
        csvLines.push("Burst#,StartTime,EndTime,Duration,SpikeCount");

        bursts.forEach((burst, index) => {
          const burstNumber = index + 1;
          const startTime = burst.startTime ?? "N/A";
          const endTime = burst.endTime ?? "N/A";
          const duration = burst.duration ?? "N/A";
          const spikeCount = burst.spikeCount ?? "N/A";

          csvLines.push(
            `${burstNumber},${startTime},${endTime},${duration},${spikeCount}`
          );
        });

        csvLines.push("</BURST_DATA>");
        csvLines.push("");
      }

      // BURST METRICS
      if (includeBurstMetrics) {
        const burstMetrics = calculateBurstMetrics(bursts);

        csvLines.push("<BURST_METRICS>");
        csvLines.push("Metric,Value,Unit");
        csvLines.push(`Total Bursts,${burstMetrics.total},count`);
        csvLines.push(
          `Average Duration,${burstMetrics.duration.average.toFixed(4)},ms`
        );
        csvLines.push(
          `Median Duration,${burstMetrics.duration.median.toFixed(4)},ms`
        );
        csvLines.push(
          `Average Inter-Burst Interval,${burstMetrics.interBurstInterval.average.toFixed(
            4
          )},ms`
        );
        csvLines.push(
          `Median Inter-Burst Interval,${burstMetrics.interBurstInterval.median.toFixed(
            4
          )},ms`
        );
        csvLines.push("</BURST_METRICS>");
        csvLines.push("");
      }
    } catch (error) {
      console.error(
        `[GenerateFullPlateReport] Error processing well ${wellKey}:`,
        error
      );
      csvLines.push(`<ERROR>`);
      csvLines.push(`Error: ${error.message}`);
      csvLines.push(`</ERROR>`);
      csvLines.push("");
    }

    csvLines.push(`</WELL_DATA: ${wellKey}>`);
    csvLines.push("");
  });

  console.log("[GenerateFullPlateReport] Report generation complete");
  return csvLines.join("\r\n");
}
