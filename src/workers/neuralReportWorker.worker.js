/* eslint-disable no-restricted-globals */
/**
 * neuralReportWorker.js
 * Web Worker for parallel processing of neural analysis wells
 * Processes a single well and returns CSV content
 */

import { detectSpikes } from "../components/NeuralAnalysis/utilities/detectSpikes";
import { detectBursts } from "../components/NeuralAnalysis/utilities/burstDetection";
import {
  trendFlattening,
  baselineCorrected,
} from "../components/NeuralAnalysis/utilities/neuralSmoothing";
import { suppressNoise } from "../components/NeuralAnalysis/utilities/noiseSuppression";

/**
 * Fast number formatting - replaces toFixed(4) for performance
 */
function formatMetric(num) {
  if (num === 0) return "0.0000";
  if (num == null || isNaN(num)) return "N/A";
  return (Math.round(num * 10000) / 10000).toString();
}

/**
 * Calculate spike frequency metrics
 */
function calculateSpikeFrequency(spikes, startTime, endTime) {
  const duration = endTime - startTime;
  const total = spikes.length;
  const spikesPerSecond = total / (duration / 1000);

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
  const amplitudes = spikes
    .map((spike) => spike.amplitude)
    .filter((a) => a != null);

  if (amplitudes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const sorted = [...amplitudes].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return {
    average: amplitudes.reduce((sum, a) => sum + a, 0) / amplitudes.length,
    median,
    min: Math.min(...amplitudes),
    max: Math.max(...amplitudes),
  };
}

/**
 * Calculate spike width metrics
 */
function calculateSpikeWidth(spikes) {
  const widths = spikes.map((spike) => spike.width).filter((w) => w != null);

  if (widths.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const sorted = [...widths].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return {
    average: widths.reduce((sum, w) => sum + w, 0) / widths.length,
    median,
    min: Math.min(...widths),
    max: Math.max(...widths),
  };
}

/**
 * Calculate spike AUC metrics
 */
function calculateSpikeAUC(spikes) {
  const aucs = spikes.map((spike) => spike.auc).filter((a) => a != null);

  if (aucs.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0 };
  }

  const sorted = [...aucs].sort((a, b) => a - b);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  return {
    average: aucs.reduce((sum, a) => sum + a, 0) / aucs.length,
    median,
    min: Math.min(...aucs),
    max: Math.max(...aucs),
  };
}

/**
 * Calculate burst metrics
 */
function calculateBurstMetrics(bursts) {
  if (!Array.isArray(bursts) || bursts.length === 0) {
    return {
      total: 0,
      duration: { average: 0, median: 0 },
      spikesPerBurst: { average: 0, median: 0 },
      interBurstInterval: { average: 0, median: 0 },
    };
  }

  const durations = bursts.map((b) => b.duration).filter((d) => d != null);
  const spikeCounts = bursts
    .map((b) => b.spikeCount ?? b.spikes?.length)
    .filter((c) => c != null);

  const sortedDurations = [...durations].sort((a, b) => a - b);
  const medianDuration =
    sortedDurations.length % 2 === 0
      ? (sortedDurations[sortedDurations.length / 2 - 1] +
          sortedDurations[sortedDurations.length / 2]) /
        2
      : sortedDurations[Math.floor(sortedDurations.length / 2)];

  const sortedSpikeCounts = [...spikeCounts].sort((a, b) => a - b);
  const medianSpikeCount =
    sortedSpikeCounts.length % 2 === 0
      ? (sortedSpikeCounts[sortedSpikeCounts.length / 2 - 1] +
          sortedSpikeCounts[sortedSpikeCounts.length / 2]) /
        2
      : sortedSpikeCounts[Math.floor(sortedSpikeCounts.length / 2)];

  // Calculate inter-burst intervals
  const intervals = [];
  for (let i = 1; i < bursts.length; i++) {
    const interval = bursts[i].startTime - bursts[i - 1].endTime;
    if (interval >= 0) {
      intervals.push(interval);
    }
  }

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval =
    intervals.length === 0
      ? 0
      : sortedIntervals.length % 2 === 0
      ? (sortedIntervals[sortedIntervals.length / 2 - 1] +
          sortedIntervals[sortedIntervals.length / 2]) /
        2
      : sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  return {
    total: bursts.length,
    duration: {
      average:
        durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0,
      median: medianDuration,
    },
    spikesPerBurst: {
      average:
        spikeCounts.length > 0
          ? spikeCounts.reduce((sum, c) => sum + c, 0) / spikeCounts.length
          : 0,
      median: medianSpikeCount,
    },
    interBurstInterval: {
      average:
        intervals.length > 0
          ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length
          : 0,
      median: medianInterval,
    },
  };
}

/**
 * Suggest prominence based on signal variance
 */
function suggestProminence(signal, factor = 0.5) {
  const ySignal = signal.map((pt) => pt.y);
  const mean = ySignal.reduce((sum, y) => sum + y, 0) / ySignal.length;
  const variance =
    ySignal.reduce((sum, y) => sum + (y - mean) ** 2, 0) / ySignal.length;
  return Math.floor(factor * Math.sqrt(variance));
}

/**
 * Suggest window based on prominence
 */
function suggestWindow(signal, prominence, num = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return 10;

  const samplingRate =
    signal.length > 1
      ? (signal[signal.length - 1].x - signal[0].x) / (signal.length - 1)
      : 1;

  const ySignal = signal.map((pt) => pt.y);
  const peakIndices = [];

  for (let i = 1; i < ySignal.length - 1; i++) {
    if (ySignal[i] > ySignal[i - 1] && ySignal[i] > ySignal[i + 1]) {
      let leftProminence = 0;
      for (let j = i - 1; j >= 0; j--) {
        const drop = ySignal[i] - ySignal[j];
        if (drop >= prominence) {
          leftProminence = drop;
          break;
        }
      }

      let rightProminence = 0;
      for (let j = i + 1; j < ySignal.length; j++) {
        const drop = ySignal[i] - ySignal[j];
        if (drop >= prominence) {
          rightProminence = drop;
          break;
        }
      }

      if (leftProminence >= prominence && rightProminence >= prominence) {
        peakIndices.push(i);
      }
    }
  }

  if (peakIndices.length < 2) return 10;

  const distances = [];
  for (let i = 1; i < peakIndices.length; i++) {
    distances.push(peakIndices[i] - peakIndices[i - 1]);
  }

  distances.sort((a, b) => a - b);
  const topNum = Math.min(num, distances.length);
  const topDistances = distances.slice(0, topNum);
  const avgDistance =
    topDistances.reduce((sum, d) => sum + d, 0) / topDistances.length;

  return Math.max(5, Math.floor((avgDistance * samplingRate) / 2));
}

/**
 * Process a single well and return CSV content
 * This is the main worker function that mirrors processSingleWell from NeuralFullPlateReport.js
 */
function processSingleWell(
  well,
  wellKey,
  processingParams,
  options,
  roiList = []
) {
  const {
    includeSpikeData = true,
    includeOverallMetrics = true,
    includeBurstData = true,
    includeBurstMetrics = true,
    includeROIAnalysis = false,
  } = options;

  const wellSections = [];
  wellSections.push(`<WELL_DATA: ${wellKey}>`);

  try {
    const rawSignal = well.indicators[0].filteredData;

    // Calculate optimal parameters
    const optimalProminence = suggestProminence(rawSignal, 0.5);
    const optimalWindow = suggestWindow(rawSignal, optimalProminence, 5);

    // Signal preprocessing
    let processedSignal = suppressNoise(rawSignal, [], {
      subtractControl: processingParams.subtractControl || false,
    });

    if (processingParams.noiseSuppressionActive) {
      if (processingParams.trendFlatteningEnabled) {
        processedSignal = trendFlattening(processedSignal, {
          adaptiveBaseline: processingParams.baselineCorrection,
          polynomialDegree: 2,
        });
      }

      if (processingParams.baselineCorrection) {
        processedSignal = baselineCorrected(
          processedSignal,
          processingParams.smoothingWindow || 200,
          50
        );
      }
    }

    // Well parameters
    wellSections.push(
      [
        "<WELL_PARAMETERS>",
        `WellID,${wellKey}`,
        `OptimalProminence,${optimalProminence}`,
        `OptimalWindow,${optimalWindow}`,
        "</WELL_PARAMETERS>",
      ].join("\n")
    );

    // Spike detection
    const spikeDetectionParams = {
      prominence: optimalProminence,
      window: optimalWindow,
      minWidth: processingParams.spikeMinWidth || 5,
      minDistance: processingParams.spikeMinDistance || 0,
      minProminenceRatio: 0.01,
    };

    const spikes = detectSpikes(processedSignal, spikeDetectionParams);

    // Spike data
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

    // Spike metrics
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

    // Burst detection
    let bursts = [];
    if (spikes.length >= (processingParams.minSpikesPerBurst || 3)) {
      bursts = detectBursts(spikes, {
        maxInterSpikeInterval: processingParams.maxInterSpikeInterval || 50,
        minSpikesPerBurst: processingParams.minSpikesPerBurst || 3,
      });
    }

    // Burst data
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

    // Burst metrics
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

    // ROI analysis (if enabled)
    if (includeROIAnalysis && roiList && roiList.length > 0) {
      try {
        // Build structured sections for each ROI
        const roiStructuredData = roiList.map((roi, roiIndex) => {
          const roiName = `ROI_${roiIndex + 1}`;
          const timeRange = `${roi.xMin}-${roi.xMax}`;

          const spikesInROI = spikes.filter((spike) => {
            const time = spike.time ?? spike.peakCoords?.x;
            return time >= roi.xMin && time <= roi.xMax;
          });

          const burstsInROI = bursts.filter((burst) => {
            return burst.endTime >= roi.xMin && burst.startTime <= roi.xMax;
          });

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

          // Spike Data
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
            sections.spikeData.push([""]);
          } else {
            sections.spikeData.push(["<ROI_SPIKE_DATA>"]);
            sections.spikeData.push(["No spikes in this ROI"]);
            sections.spikeData.push(["</ROI_SPIKE_DATA>"]);
            sections.spikeData.push([""]);
          }

          // Spike Metrics
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
              roiSpikeAUC?.median ? formatMetric(roiSpikeAUC.median) : "0.0000",
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
            sections.spikeMetrics.push([""]);
          }

          // Burst Data
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
            sections.burstData.push([""]);
          }

          // Burst Metrics
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
            sections.burstMetrics.push([""]);
          }

          // Footer
          sections.footer.push([`</${roiName}>`]);

          return sections;
        });

        // Find maximum row count for each section
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

        // Pad each section
        roiStructuredData.forEach((roiSections) => {
          Object.keys(maxSectionLengths).forEach((sectionName) => {
            const section = roiSections[sectionName];
            const maxLength = maxSectionLengths[sectionName];
            while (section.length < maxLength) {
              section.push([]);
            }
          });
        });

        // Combine sections
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

        // Output side-by-side
        const maxLines = Math.max(
          ...roiDataBlocks.map((block) => block.length)
        );
        const maxColumnsPerBlock = roiDataBlocks.map((block) =>
          Math.max(...block.map((row) => row.length))
        );

        roiDataBlocks.forEach((block, blockIndex) => {
          const maxCols = maxColumnsPerBlock[blockIndex];
          block.forEach((row) => {
            while (row.length < maxCols) {
              row.push("");
            }
          });
        });

        const roiSectionLines = [];
        for (let lineIndex = 0; lineIndex < maxLines; lineIndex++) {
          const rowParts = [];

          roiDataBlocks.forEach((block, blockIndex) => {
            const row = block[lineIndex] || [];
            rowParts.push(...row);

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
          `[Worker] Error processing ROIs for well ${wellKey}:`,
          roiError
        );
        const roiErrorLines = [
          "<ROI_ERROR>",
          `Error processing ROIs: ${roiError.message}`,
          "</ROI_ERROR>",
        ];
        wellSections.push(roiErrorLines.join("\n"));
      }
    }
  } catch (error) {
    console.error(`[Worker] Error processing well ${wellKey}:`, error);
    const wellErrorLines = ["<ERROR>", `Error: ${error.message}`, "</ERROR>"];
    wellSections.push(wellErrorLines.join("\n"));
  }

  wellSections.push(`</WELL_DATA: ${wellKey}>`);

  return {
    wellKey,
    csvContent: wellSections.join("\n\n"),
  };
}

/**
 * Worker message handler
 */
self.onmessage = function (e) {
  console.log("[Worker] Received message:", e.data?.wellKey || "unknown");
  const { well, wellKey, processingParams, options, roiList } = e.data;

  try {
    console.log(`[Worker] Processing well ${wellKey}`);
    const result = processSingleWell(
      well,
      wellKey,
      processingParams,
      options,
      roiList
    );
    
    console.log(`[Worker] Completed well ${wellKey}`);
    self.postMessage({
      success: true,
      result,
    });
  } catch (error) {
    console.error(`[Worker] Error processing well ${wellKey}:`, error);
    self.postMessage({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
      },
      wellKey,
    });
  }
};
