// The canonical per-well CSV writer. Both Single-Well and Full-Plate
// reports call this function. Single-Well calls it once; Full-Plate
// calls it once per well in the plate. Every well block in either
// report is the same sequence of sections — the parity contract is
// enforced by `__tests__/reportParity.test.js`.
//
// Stable section presence: if an `include*` flag is set, the section
// header is always emitted (even when the underlying data is empty).
// Downstream CSV parsers see a consistent shape across wells.

import { serializeCsvRow } from "./csvRows";
import {
  formatMetric,
  calculateSpikeFrequency,
  calculateSpikeAmplitude,
  calculateSpikeWidth,
  calculateSpikeAUC,
  calculateMaxSpikeSignal,
  calculateBurstMetrics,
} from "./reportMetrics";
import { filterSpikesInROI, filterBurstsInROI } from "./roiScoping";
import {
  shouldComputeBursts,
  runReportBurstDetection,
  annotateBurstsWithAuc,
} from "./burstReportUtils";

// ---- Section writers ----------------------------------------------------

function pushSpikeData(out, spikes) {
  out.push("<SPIKE_DATA>");
  out.push(
    serializeCsvRow([
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
      "LeftProminence",
      "RightProminence",
    ])
  );
  spikes.forEach((spike, index) => {
    out.push(
      serializeCsvRow([
        index + 1,
        spike.time ?? spike.peakCoords?.x,
        spike.peakCoords?.y,
        spike.leftBaseCoords?.x,
        spike.leftBaseCoords?.y,
        spike.rightBaseCoords?.x,
        spike.rightBaseCoords?.y,
        spike.amplitude,
        spike.width,
        spike.auc,
        spike.prominences?.leftProminence,
        spike.prominences?.rightProminence,
      ])
    );
  });
  out.push("</SPIKE_DATA>");
  out.push("");
}

function pushSpikeMetricsBody({ out, freq, amp, width, auc, maxY }) {
  out.push(serializeCsvRow(["Total Spikes", freq.total, "count"]));
  out.push(
    serializeCsvRow(["Average Frequency", formatMetric(freq.averageFrequency, 4), "Hz"])
  );
  out.push(
    serializeCsvRow(["Median Frequency", formatMetric(freq.medianFrequency, 4), "Hz"])
  );
  out.push(
    serializeCsvRow(["Spikes Per Second", formatMetric(freq.spikesPerSecond, 4), "Hz"])
  );
  out.push(
    serializeCsvRow(["Mean Inter-Spike Interval", formatMetric(freq.meanIsi, 4), "s"])
  );
  out.push(
    serializeCsvRow(["Median Inter-Spike Interval", formatMetric(freq.medianIsi, 4), "s"])
  );
  out.push(serializeCsvRow(["Average Amplitude", formatMetric(amp.average), "units"]));
  out.push(serializeCsvRow(["Median Amplitude", formatMetric(amp.median), "units"]));
  out.push(serializeCsvRow(["Min Amplitude", formatMetric(amp.min), "units"]));
  out.push(serializeCsvRow(["Max Amplitude", formatMetric(amp.max), "units"]));
  out.push(
    serializeCsvRow(["Average Width", formatMetric(width.average), "samples"])
  );
  out.push(
    serializeCsvRow(["Median Width", formatMetric(width.median), "samples"])
  );
  out.push(serializeCsvRow(["Min Width", formatMetric(width.min), "samples"]));
  out.push(serializeCsvRow(["Max Width", formatMetric(width.max), "samples"]));
  out.push(serializeCsvRow(["Average AUC", formatMetric(auc.average), "units"]));
  out.push(serializeCsvRow(["Median AUC", formatMetric(auc.median), "units"]));
  out.push(serializeCsvRow(["Min AUC", formatMetric(auc.min), "units"]));
  out.push(serializeCsvRow(["Max AUC", formatMetric(auc.max), "units"]));
  out.push(serializeCsvRow(["Max Spike Signal", formatMetric(maxY), "units"]));
}

function pushOverallSpikeMetrics(out, spikes, window) {
  out.push("<SPIKE_METRICS>");
  out.push(serializeCsvRow(["Metric", "Value", "Unit"]));
  const freq = calculateSpikeFrequency(spikes, window);
  const amp = calculateSpikeAmplitude(spikes);
  const width = calculateSpikeWidth(spikes);
  const auc = calculateSpikeAUC(spikes);
  const maxY = calculateMaxSpikeSignal(spikes);
  pushSpikeMetricsBody({ out, freq, amp, width, auc, maxY });
  out.push("</SPIKE_METRICS>");
  out.push("");
}

function pushBurstData(out, bursts, spikes) {
  out.push("<BURST_DATA>");
  out.push(
    serializeCsvRow([
      "Burst#",
      "StartTime",
      "EndTime",
      "Duration",
      "SpikeCount",
      "AUC",
      "SpikeIndices",
    ])
  );
  // SpikeIndices: 1-based positions in the well-scope spikes array,
  // joined by `|` so a single CSV cell holds the list without colliding
  // with the outer comma. Avoids the old `"a,b,c"` quoted-comma idiom
  // which is more fragile downstream.
  bursts.forEach((burst, index) => {
    let indices = "";
    if (Array.isArray(burst.spikes) && burst.spikes.length > 0) {
      const ids = burst.spikes.map((spike) => {
        const idx = spikes.findIndex(
          (p) =>
            (p.time ?? p.peakCoords?.x) ===
            (spike.time ?? spike.peakCoords?.x)
        );
        return idx >= 0 ? idx + 1 : "N/A";
      });
      indices = ids.join("|");
    }
    const spikeCount =
      typeof burst.spikeCount === "number"
        ? burst.spikeCount
        : Array.isArray(burst.spikes)
        ? burst.spikes.length
        : "N/A";
    out.push(
      serializeCsvRow([
        index + 1,
        burst.startTime,
        burst.endTime,
        burst.duration,
        spikeCount,
        typeof burst.auc === "number" ? burst.auc : "",
        indices,
      ])
    );
  });
  out.push("</BURST_DATA>");
  out.push("");
}

function pushBurstMetrics(out, bursts, window) {
  out.push("<BURST_METRICS>");
  out.push(serializeCsvRow(["Metric", "Value", "Unit"]));
  const m = calculateBurstMetrics(bursts, window);
  out.push(serializeCsvRow(["Total Bursts", m.total, "count"]));
  out.push(
    serializeCsvRow(["Average Duration", formatMetric(m.duration.average, 4), "s"])
  );
  out.push(
    serializeCsvRow(["Median Duration", formatMetric(m.duration.median, 4), "s"])
  );
  out.push(
    serializeCsvRow([
      "Average Inter-Burst Interval",
      formatMetric(m.interBurstInterval.average, 4),
      "s",
    ])
  );
  out.push(
    serializeCsvRow([
      "Median Inter-Burst Interval",
      formatMetric(m.interBurstInterval.median, 4),
      "s",
    ])
  );
  out.push("</BURST_METRICS>");
  out.push("");
}

function pushRoiAnalysis(out, ctx) {
  const { spikes, bursts, roiList, options } = ctx;
  out.push("<ROI_ANALYSIS>");
  roiList.forEach((roi, index) => {
    if (!roi || roi.xMin === undefined || roi.xMax === undefined) return;
    const roiName = `ROI ${index + 1}`;
    out.push(`<${roiName}, TimeRange: ${roi.xMin}-${roi.xMax}>`);

    const spikesInROI = filterSpikesInROI(spikes, roi);
    const burstsInROI = filterBurstsInROI(bursts, roi);
    const roiWindow = { startTime: roi.xMin, endTime: roi.xMax };

    if (options.includeSpikeData) {
      pushSpikeData(out, spikesInROI);
    }
    if (options.includeOverallMetrics) {
      pushOverallSpikeMetrics(out, spikesInROI, roiWindow);
    }
    if (options.includeBurstData) {
      pushBurstData(out, burstsInROI, spikes);
    }
    if (options.includeBurstMetrics) {
      pushBurstMetrics(out, burstsInROI, roiWindow);
    }

    out.push(`</${roiName}>`);
    out.push("");
  });
  out.push("</ROI_ANALYSIS>");
  out.push("");
}

function pushProcessedSignal(out, processedSignal) {
  out.push("<PROCESSED_SIGNAL>");
  out.push(serializeCsvRow(["Time", "SignalValue"]));
  if (Array.isArray(processedSignal)) {
    for (const point of processedSignal) {
      out.push(serializeCsvRow([point.x, point.y]));
    }
  }
  out.push("</PROCESSED_SIGNAL>");
  out.push("");
}

function pushWellParameters(out, ctx) {
  const { wellKey, processedSignal, processingParams, resolvedParams } = ctx;
  out.push("<WELL_PARAMETERS>");
  out.push(serializeCsvRow(["WellID", wellKey]));
  out.push(serializeCsvRow(["Prominence", resolvedParams?.prominenceForWell]));
  out.push(serializeCsvRow(["Window", resolvedParams?.windowForWell]));
  out.push(
    serializeCsvRow(["ParameterSource", resolvedParams?.parameterSource || ""])
  );

  // Threshold Y values are per-well — they map the user's ratio (0–1)
  // to an absolute Y using THIS well's processed-signal Y range. They
  // can't live in the file-level <PROCESSING_PARAMETERS> block because
  // each well has its own Y range; the ratio alone is meaningless
  // without the Y conversion.
  let yMin = null;
  let yMax = null;
  if (Array.isArray(processedSignal) && processedSignal.length > 0) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const pt of processedSignal) {
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    if (Number.isFinite(minY) && Number.isFinite(maxY)) {
      yMin = minY;
      yMax = maxY;
    }
  }
  const ratioToY = (r) => {
    if (typeof r !== "number" || yMin === null || yMax === null) return "N/A";
    return yMin + r * (yMax - yMin);
  };
  out.push(
    serializeCsvRow([
      "ActivityThresholdY",
      ratioToY(processingParams?.activityThresholdRatio),
    ])
  );
  out.push(
    serializeCsvRow([
      "BaselineThresholdY",
      ratioToY(processingParams?.baselineThresholdRatio),
    ])
  );
  out.push("</WELL_PARAMETERS>");
  out.push("");
}

// ---- Public entry --------------------------------------------------------

/**
 * Build the CSV section block for one well. Stable section presence:
 * every `include*` flag that's truthy adds its `<…>` ... `</…>` block,
 * even when the body is empty.
 *
 * @param {Object} input
 * @param {string} input.wellKey
 * @param {Array} input.processedSignal {x, y}[] post-pipeline signal
 * @param {Array} input.spikes pre-pipeline NeuralPeak[]
 * @param {Array|null} input.bursts pre-pipeline NeuralBurst[] (may be null;
 *                     the builder runs detection itself if
 *                     `shouldComputeBursts(options)` is true and this is
 *                     absent)
 * @param {Array} input.roiList ROI definitions
 * @param {Object} input.processingParams full settings snapshot
 * @param {Object} input.resolvedParams { prominenceForWell, windowForWell,
 *                                       parameterSource,
 *                                       recordingStartTime, recordingEndTime }
 * @param {Object} input.options report-modal options
 * @returns {string[]} CSV lines for this well's block
 */
export function buildWellReportSections({
  wellKey,
  processedSignal,
  spikes,
  bursts,
  roiList,
  processingParams,
  resolvedParams,
  options,
}) {
  const out = [];
  const opts = options || {};
  const spikeArr = Array.isArray(spikes) ? spikes : [];
  const roiArr = Array.isArray(roiList) ? roiList : [];

  // Ensure bursts exist if the options call for them. The builder is
  // the single point that runs report-time burst detection — callers
  // don't need to pre-compute. If the live pipeline already returned
  // burstResults (because showBursts was on), we use them as-is.
  let burstArr = Array.isArray(bursts) ? bursts : null;
  const wantsBursts = shouldComputeBursts(opts);
  if (wantsBursts && burstArr === null) {
    burstArr = runReportBurstDetection(spikeArr, processingParams);
  }
  if (!Array.isArray(burstArr)) burstArr = [];
  // burst.auc isn't computed by the pipeline; annotate centrally so
  // every report's BURST_DATA carries the same field.
  if (wantsBursts && burstArr.length > 0) {
    annotateBurstsWithAuc(burstArr, spikeArr);
  }

  // Well wrapper + parameters
  out.push(`<WELL key=${wellKey}>`);
  out.push("");
  pushWellParameters(out, {
    wellKey,
    processedSignal,
    processingParams,
    resolvedParams,
  });

  // Overall window for rate metrics — the recording's full span. The
  // caller passes `recordingStartTime` / `recordingEndTime`; if absent
  // we fall back to the processed signal's first/last sample x.
  let startTime = resolvedParams?.recordingStartTime;
  let endTime = resolvedParams?.recordingEndTime;
  if (typeof startTime !== "number" || typeof endTime !== "number") {
    if (Array.isArray(processedSignal) && processedSignal.length > 0) {
      startTime = processedSignal[0].x;
      endTime = processedSignal[processedSignal.length - 1].x;
    } else {
      startTime = 0;
      endTime = 0;
    }
  }
  const overallWindow = { startTime, endTime };

  if (opts.includeSpikeData) {
    pushSpikeData(out, spikeArr);
  }
  if (opts.includeOverallMetrics) {
    pushOverallSpikeMetrics(out, spikeArr, overallWindow);
  }
  if (opts.includeBurstData) {
    pushBurstData(out, burstArr, spikeArr);
  }
  if (opts.includeBurstMetrics) {
    pushBurstMetrics(out, burstArr, overallWindow);
  }
  if (opts.includeROIAnalysis && roiArr.length > 0) {
    pushRoiAnalysis(out, {
      spikes: spikeArr,
      bursts: burstArr,
      roiList: roiArr,
      options: opts,
    });
  }
  if (opts.includeProcessedSignal) {
    pushProcessedSignal(out, processedSignal);
  }

  out.push(`</WELL>`);
  out.push("");
  return out;
}
