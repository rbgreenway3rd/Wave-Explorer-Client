// Burst-handling utilities used by the report builder.
//
// Three concerns that used to be tangled with the report writers:
//   1. Whether to run burst detection for the report at all (decoupled
//      from the chart's `showBursts` toggle).
//   2. The actual detection call when needed.
//   3. Annotating each burst with `burst.auc` — Full-Plate did this
//      inline, Single-Well didn't, so the same burst showed different
//      AUC across reports.

import { detectBursts } from "../burstDetection";

/**
 * Decides whether the report needs burst results computed.
 *
 * Decoupled from the live chart's `showBursts` toggle: report
 * checkboxes drive report content. A user who unchecks "Show Bursts"
 * on the graph but checks "Burst Metrics" in the report modal still
 * gets burst sections in their CSV — anything else makes report
 * checkboxes silently lie.
 *
 * @param {Object} options
 * @param {boolean} [options.includeBurstData]
 * @param {boolean} [options.includeBurstMetrics]
 * @param {boolean} [options.includeROIAnalysis] (ROI block emits per-
 *   ROI burst metrics)
 * @returns {boolean}
 */
export function shouldComputeBursts(options) {
  if (!options) return false;
  return !!(
    options.includeBurstData ||
    options.includeBurstMetrics ||
    options.includeROIAnalysis
  );
}

/**
 * Run burst detection with the report's parameter snapshot. Wraps
 * `detectBursts` so callers don't reach into burstDetection directly.
 *
 * @param {Array} spikes
 * @param {{maxInterSpikeInterval?: number, minSpikesPerBurst?: number}} params
 * @returns {Array}
 */
export function runReportBurstDetection(spikes, params) {
  if (!Array.isArray(spikes) || spikes.length === 0) return [];
  return detectBursts(spikes, {
    maxInterSpikeInterval: params?.maxInterSpikeInterval ?? 0.05,
    minSpikesPerBurst: params?.minSpikesPerBurst ?? 3,
  });
}

/**
 * Annotate each burst with `burst.auc = sum(spike.auc)` for spikes
 * whose time falls inside the burst. Mirrors the previous in-line
 * computation at NeuralFullPlateReport.js#L607-L619 so Single-Well now
 * exposes the same field. Mutates the burst objects in place to match
 * the existing convention.
 *
 * @param {Array<{startTime: number, endTime: number, auc?: number}>} bursts
 * @param {Array<{time?: number, peakCoords?: {x: number}, auc?: number}>} spikes
 * @returns {Array} the (now-annotated) bursts array, for chaining.
 */
export function annotateBurstsWithAuc(bursts, spikes) {
  if (!Array.isArray(bursts) || bursts.length === 0) return bursts;
  if (!Array.isArray(spikes) || spikes.length === 0) {
    for (const burst of bursts) {
      if (typeof burst.auc !== "number") burst.auc = 0;
    }
    return bursts;
  }
  for (const burst of bursts) {
    let burstAuc = 0;
    for (const spike of spikes) {
      const spikeTime =
        typeof spike?.time === "number" ? spike.time : spike?.peakCoords?.x;
      if (
        typeof spikeTime === "number" &&
        spikeTime >= burst.startTime &&
        spikeTime <= burst.endTime
      ) {
        if (typeof spike.auc === "number") burstAuc += spike.auc;
      }
    }
    burst.auc = burstAuc;
  }
  return bursts;
}
