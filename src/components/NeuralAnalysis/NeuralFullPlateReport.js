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
  const spikesWithWidth = spikes.filter((spike) => spike.width);
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
  const spikesWithAUC = spikes.filter((spike) => spike.auc);
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
      spikesPerBurst: { average: 0, median: 0 },
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

  return {
    total: bursts.length,
    duration: { average: avgDuration, median: medianDuration },
    spikesPerBurst: {
      average: avgSpikesPerBurst,
      median: medianSpikesPerBurst,
    },
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

  // Use array of section chunks for efficient concatenation
  const csvChunks = [];

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
    const wellSections = []; // Array to collect all sections for this well

    wellSections.push(`<WELL_DATA: ${wellKey}>`);

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

      // WELL PARAMETERS - unique to this well
      wellSections.push(
        [
          "<WELL_PARAMETERS>",
          `WellID,${wellKey}`,
          `OptimalProminence,${optimalProminence}`,
          `OptimalWindow,${optimalWindow}`,
          "</WELL_PARAMETERS>",
        ].join("\n")
      );

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
        const spikeDataLines = [];
        if (spikes.length > 0) {
          spikeDataLines.push(
            "<SPIKE_DATA>",
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

            spikeDataLines.push(
              `${spikeNumber},${time},${peakY},${leftBaseX},${leftBaseY},${rightBaseX},${rightBaseY},${amplitude},${width},${auc},${leftProminence},${rightProminence}`
            );
          });

          spikeDataLines.push("</SPIKE_DATA>");
        } else {
          spikeDataLines.push(
            "<SPIKE_DATA>",
            "No spikes detected",
            "</SPIKE_DATA>"
          );
        }
        wellSections.push(spikeDataLines.join("\n"));
      }

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

      // ========================================
      // ROI ANALYSIS (Side-by-side format)
      // ========================================
      if (includeROIAnalysis && roiList && roiList.length > 0) {
        try {
          console.log(
            `[GenerateFullPlateReport] Well ${wellKey}: Processing ${roiList.length} ROIs`
          );

          // STEP 1: Build structured sections for each ROI
          const roiStructuredData = roiList.map((roi, roiIndex) => {
            const roiName = `ROI_${roiIndex + 1}`;
            const timeRange = `${roi.xMin}-${roi.xMax}`;

            // Filter spikes and bursts in this ROI
            const spikesInROI = spikes.filter((spike) => {
              const time = spike.time ?? spike.peakCoords?.x;
              return time >= roi.xMin && time <= roi.xMax;
            });

            const burstsInROI = bursts.filter((burst) => {
              return burst.endTime >= roi.xMin && burst.startTime <= roi.xMax;
            });

            console.log(
              `[GenerateFullPlateReport] Well ${wellKey}, ${roiName}: ${spikesInROI.length} spikes, ${burstsInROI.length} bursts`
            );

            // Build individual sections
            const sections = {
              header: [],
              spikeData: [],
              spikeMetrics: [],
              burstData: [],
              burstMetrics: [],
              footer: [],
            };

            // Header
            sections.header.push([`<${roiName}, TimeRange: ${timeRange}>`]);

            // Spike Data Section
            if (spikesInROI.length > 0) {
              sections.spikeData.push(["<ROI_SPIKE_DATA>"]);
              sections.spikeData.push([
                "Spike#",
                "Time",
                "PeakY",
                "LeftBaseX",
                "LeftBaseY",
                "RightBaseX",
                "RightBaseY",
                "Amplitude",
                "Width",
                "AUC",
              ]);

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

                sections.spikeData.push([
                  spikeNumber,
                  time,
                  peakY,
                  leftBaseX,
                  leftBaseY,
                  rightBaseX,
                  rightBaseY,
                  amplitude,
                  width,
                  auc,
                ]);
              });

              sections.spikeData.push(["</ROI_SPIKE_DATA>"]);
              sections.spikeData.push([""]); // Empty line
            } else {
              sections.spikeData.push(["<ROI_SPIKE_DATA>"]);
              sections.spikeData.push(["No spikes in this ROI"]);
              sections.spikeData.push(["</ROI_SPIKE_DATA>"]);
              sections.spikeData.push([""]); // Empty line
            }

            // Spike Metrics Section
            if (spikesInROI.length > 0) {
              const roiSpikeFrequency = calculateSpikeFrequency(
                spikesInROI,
                roi.xMin,
                roi.xMax
              );
              const roiSpikeAmplitude = calculateSpikeAmplitude(spikesInROI);
              const roiSpikeWidth = calculateSpikeWidth(spikesInROI);
              const roiSpikeAUC = calculateSpikeAUC(spikesInROI);

              sections.spikeMetrics.push(["<ROI_SPIKE_METRICS>"]);
              sections.spikeMetrics.push(["Metric", "Value", "Unit"]);
              sections.spikeMetrics.push([
                "Total Spikes",
                roiSpikeFrequency?.total ?? 0,
                "count",
              ]);
              sections.spikeMetrics.push([
                "Spike Frequency",
                roiSpikeFrequency?.average
                  ? formatMetric(roiSpikeFrequency.average)
                  : "0.0000",
                "Hz",
              ]);
              sections.spikeMetrics.push([
                "Average Amplitude",
                roiSpikeAmplitude?.average
                  ? formatMetric(roiSpikeAmplitude.average)
                  : "0.0000",
                "units",
              ]);
              sections.spikeMetrics.push([
                "Median Amplitude",
                roiSpikeAmplitude?.median
                  ? formatMetric(roiSpikeAmplitude.median)
                  : "0.0000",
                "units",
              ]);
              sections.spikeMetrics.push([
                "Average Width",
                roiSpikeWidth?.average
                  ? formatMetric(roiSpikeWidth.average)
                  : "0.0000",
                "samples",
              ]);
              sections.spikeMetrics.push([
                "Median Width",
                roiSpikeWidth?.median
                  ? formatMetric(roiSpikeWidth.median)
                  : "0.0000",
                "samples",
              ]);
              sections.spikeMetrics.push([
                "Average AUC",
                roiSpikeAUC?.average
                  ? formatMetric(roiSpikeAUC.average)
                  : "0.0000",
                "units",
              ]);
              sections.spikeMetrics.push([
                "Median AUC",
                roiSpikeAUC?.median
                  ? formatMetric(roiSpikeAUC.median)
                  : "0.0000",
                "units",
              ]);

              const maxSpikeSignal = Math.max(
                ...spikesInROI.map((s) => s.peakCoords?.y ?? 0)
              );
              sections.spikeMetrics.push([
                "Max Spike Signal",
                formatMetric(maxSpikeSignal),
                "units",
              ]);

              sections.spikeMetrics.push(["</ROI_SPIKE_METRICS>"]);
              sections.spikeMetrics.push([""]); // Empty line
            }

            // Burst Data Section
            if (burstsInROI.length > 0) {
              sections.burstData.push(["<ROI_BURST_DATA>"]);
              sections.burstData.push([
                "Burst#",
                "StartTime",
                "EndTime",
                "Duration",
                "SpikeCount",
              ]);

              burstsInROI.forEach((burst, index) => {
                const burstNumber = index + 1;
                const startTime = burst.startTime ?? "N/A";
                const endTime = burst.endTime ?? "N/A";
                const duration = burst.duration ?? "N/A";
                const spikeCount =
                  burst.spikeCount ?? burst.spikes?.length ?? "N/A";

                sections.burstData.push([
                  burstNumber,
                  startTime,
                  endTime,
                  duration,
                  spikeCount,
                ]);
              });

              sections.burstData.push(["</ROI_BURST_DATA>"]);
              sections.burstData.push([""]); // Empty line
            }

            // Burst Metrics Section
            if (burstsInROI.length > 0) {
              const roiBurstMetrics = calculateBurstMetrics(burstsInROI);

              sections.burstMetrics.push(["<ROI_BURST_METRICS>"]);
              sections.burstMetrics.push(["Metric", "Value", "Unit"]);
              sections.burstMetrics.push([
                "Total Bursts",
                roiBurstMetrics?.total ?? 0,
                "count",
              ]);
              sections.burstMetrics.push([
                "Average Duration",
                roiBurstMetrics?.duration?.average
                  ? formatMetric(roiBurstMetrics.duration.average)
                  : "0.0000",
                "ms",
              ]);
              sections.burstMetrics.push([
                "Median Duration",
                roiBurstMetrics?.duration?.median
                  ? formatMetric(roiBurstMetrics.duration.median)
                  : "0.0000",
                "ms",
              ]);
              sections.burstMetrics.push([
                "Average Spikes Per Burst",
                roiBurstMetrics?.spikesPerBurst?.average
                  ? formatMetric(roiBurstMetrics.spikesPerBurst.average)
                  : "0.0000",
                "count",
              ]);
              sections.burstMetrics.push([
                "Median Spikes Per Burst",
                roiBurstMetrics?.spikesPerBurst?.median
                  ? formatMetric(roiBurstMetrics.spikesPerBurst.median)
                  : "0.0000",
                "count",
              ]);

              if (roiBurstMetrics?.interBurstInterval) {
                sections.burstMetrics.push([
                  "Average Inter-Burst Interval",
                  roiBurstMetrics.interBurstInterval.average
                    ? formatMetric(roiBurstMetrics.interBurstInterval.average)
                    : "0.0000",
                  "ms",
                ]);
                sections.burstMetrics.push([
                  "Median Inter-Burst Interval",
                  roiBurstMetrics.interBurstInterval.median
                    ? formatMetric(roiBurstMetrics.interBurstInterval.median)
                    : "0.0000",
                  "ms",
                ]);
              }

              sections.burstMetrics.push(["</ROI_BURST_METRICS>"]);
              sections.burstMetrics.push([""]); // Empty line
            }

            // Footer
            sections.footer.push([`</${roiName}>`]);

            return sections;
          });

          // STEP 2: Find maximum row count for each section across all ROIs
          const maxSectionLengths = {
            header: Math.max(
              ...roiStructuredData.map((roi) => roi.header.length)
            ),
            spikeData: Math.max(
              ...roiStructuredData.map((roi) => roi.spikeData.length)
            ),
            spikeMetrics: Math.max(
              ...roiStructuredData.map((roi) => roi.spikeMetrics.length)
            ),
            burstData: Math.max(
              ...roiStructuredData.map((roi) => roi.burstData.length)
            ),
            burstMetrics: Math.max(
              ...roiStructuredData.map((roi) => roi.burstMetrics.length)
            ),
            footer: Math.max(
              ...roiStructuredData.map((roi) => roi.footer.length)
            ),
          };

          console.log(
            `[GenerateFullPlateReport] Well ${wellKey} - Max section lengths:`,
            maxSectionLengths
          );

          // STEP 3: Pad each section to match maximum length
          roiStructuredData.forEach((roiSections) => {
            Object.keys(maxSectionLengths).forEach((sectionName) => {
              const section = roiSections[sectionName];
              const maxLength = maxSectionLengths[sectionName];
              while (section.length < maxLength) {
                section.push([]); // Add empty row
              }
            });
          });

          // STEP 4: Combine all sections into single blocks for each ROI
          const roiDataBlocks = roiStructuredData.map((roiSections) => {
            return [
              ...roiSections.header,
              ...roiSections.spikeData,
              ...roiSections.spikeMetrics,
              ...roiSections.burstData,
              ...roiSections.burstMetrics,
              ...roiSections.footer,
            ];
          });

          // STEP 5: Output all ROI blocks side-by-side with proper column separation
          // All blocks should now have the same number of rows (sections are aligned)
          const maxLines = Math.max(
            ...roiDataBlocks.map((block) => block.length)
          );

          // Find the maximum number of columns needed for each ROI block
          const maxColumnsPerBlock = roiDataBlocks.map((block) =>
            Math.max(...block.map((row) => row.length))
          );

          // Pad each row in each block to match its block's max columns
          roiDataBlocks.forEach((block, blockIndex) => {
            const maxCols = maxColumnsPerBlock[blockIndex];
            block.forEach((row) => {
              while (row.length < maxCols) {
                row.push(""); // Empty cell
              }
            });
          });

          // Combine all blocks side-by-side with two empty columns between each ROI block
          const roiSectionLines = [];
          for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
            const rowParts = [];

            roiDataBlocks.forEach((block, blockIndex) => {
              // Add all columns from this ROI block's row
              const row = block[lineIndex] || [];
              rowParts.push(...row);

              // Add two empty columns as separator (but not after the last block)
              if (blockIndex < roiDataBlocks.length - 1) {
                rowParts.push("");
                rowParts.push("");
              }
            });

            roiSectionLines.push(rowParts.join(","));
          }

          wellSections.push(roiSectionLines.join("\n"));
        } catch (roiError) {
          console.error(
            `[GenerateFullPlateReport] Error processing ROIs for well ${wellKey}:`,
            roiError
          );
          const roiErrorLines = [
            "<ROI_ERROR>",
            `Error processing ROIs: ${roiError.message}`,
            `Stack: ${roiError.stack}`,
            "</ROI_ERROR>",
          ];
          wellSections.push(roiErrorLines.join("\n"));
        }
      }
    } catch (error) {
      console.error(
        `[GenerateFullPlateReport] Error processing well ${wellKey}:`,
        error
      );
      const wellErrorLines = ["<ERROR>", `Error: ${error.message}`, "</ERROR>"];
      wellSections.push(wellErrorLines.join("\n"));
    }

    // Add well footer and combine all sections for this well
    wellSections.push(`</WELL_DATA: ${wellKey}>`);
    csvChunks.push(wellSections.join("\n\n"));
  });

  console.log("[GenerateFullPlateReport] Report generation complete");
  return csvChunks.join("\n\n");
}
