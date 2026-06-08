// Canonical ROI filtering rules for the neural report builder.
//
// One source of truth — both reports and the live UI's ROI metrics
// block must agree on what "in this ROI" means, or the same well shows
// different numbers in three places.
//
// The contained-fully rule (NeuralAnalysisModal.js#L132-L140) is the
// canonical one because it matches what the user sees in the live UI.
// Full-Plate's prior "overlap" rule was the divergence bug, not the
// spec.

/**
 * Spikes whose time falls inside the ROI's [xMin, xMax] (inclusive on
 * both ends to match the live UI's ROI metric block).
 *
 * @param {Array<{time?: number, peakCoords?: {x: number}}>} spikes
 * @param {{xMin: number, xMax: number}} roi
 * @returns {Array} filtered subset (does not mutate input)
 */
export function filterSpikesInROI(spikes, roi) {
  if (
    !Array.isArray(spikes) ||
    !roi ||
    typeof roi.xMin !== "number" ||
    typeof roi.xMax !== "number"
  ) {
    return [];
  }
  return spikes.filter((spike) => {
    // `spike.time` is set on NeuralPeak; `peakCoords.x` is the fallback
    // for raw / re-injected outlier spikes that don't carry `.time`.
    const t =
      typeof spike?.time === "number" ? spike.time : spike?.peakCoords?.x;
    return typeof t === "number" && t >= roi.xMin && t <= roi.xMax;
  });
}

/**
 * Bursts FULLY CONTAINED in the ROI — both endpoints inside the
 * [xMin, xMax] window. Matches NeuralAnalysisModal.js#L132-L140
 * exactly. The prior Full-Plate "overlap" rule (any endpoint inside)
 * produced different burst counts at ROI boundaries.
 *
 * @param {Array<{startTime: number, endTime: number}>} bursts
 * @param {{xMin: number, xMax: number}} roi
 * @returns {Array} filtered subset (does not mutate input)
 */
export function filterBurstsInROI(bursts, roi) {
  if (
    !Array.isArray(bursts) ||
    !roi ||
    typeof roi.xMin !== "number" ||
    typeof roi.xMax !== "number"
  ) {
    return [];
  }
  return bursts.filter(
    (burst) =>
      typeof burst?.startTime === "number" &&
      typeof burst?.endTime === "number" &&
      burst.startTime >= roi.xMin &&
      burst.endTime <= roi.xMax
  );
}
