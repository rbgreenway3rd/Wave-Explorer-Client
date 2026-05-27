/**
 * outlierRemoval.js
 * Identifies "outlier" spikes — peaks whose prominence is well above the
 * typical spike in the signal. These are the user's biggest events and,
 * after the 2026-05-26 pipeline restructure, are the ones we most want
 * to measure correctly. The current production pipeline uses three
 * exported helpers from this file:
 *
 *   - identifyOutlierSpikes(signal, options)
 *       Runs the outlier-classification logic and returns
 *       { outlierSpikes } — the merged spike-structure list. Used
 *       before Savitzky-Golay smoothing so we know which sample
 *       regions to protect from the smoother.
 *
 *   - preserveOutliersInSmoothed(smoothed, original, outlierSpikes)
 *       Returns a copy of `smoothed` with each outlier spike's sample
 *       region restored from `original`. Used immediately after the
 *       smoothing pass so outlier amplitudes survive.
 *
 *   - flagOutliersOnDetectedPeaks(detectedSpikes, outlierSpikes)
 *       Post-detection: walks the spike list and flips `isOutlier`
 *       to true on peaks whose `index` matches an outlier's peakIdx.
 *       Pure visual classification — every peak still has full
 *       NeuralPeak metrics (AUC, width, amplitude) computed by
 *       detectSpikes' regular code path.
 *
 * --- Deprecated (kept for tests; not on the production hot path) ---
 *
 *   - removeOutliers(signal, options) → { cleanedSignal, outlierSpikes,
 *       removedIndices }: previously the only entry point; *excised*
 *       outliers from the signal so detectSpikes never measured them.
 *       Wraps identifyOutlierSpikes and builds the cleaned signal.
 *       Existing tests still target this. New code should not call it.
 *
 *   - readdOutliersAsSpikes(spikes, outlierSpikes): previously
 *       re-injected excised outliers as glue-on spike objects with
 *       hardcoded metric values (auc: 0, width: spike.numPoints).
 *       Obsolete now — outliers come from detectSpikes naturally.
 */

/**
 * Identify outlier spikes (no excision).
 *
 * Returns just the `outlierSpikes` array — each entry has `startIdx`,
 * `peakIdx`, `endIdx`, `peakValue`, `points` (array of {index, x, y}),
 * `numPoints`. Same shape `removeOutliers` produces.
 *
 * @param {Array<{x: number, y: number}>} signal
 * @param {Object} options
 * @param {number} options.percentile - 50-99, default 95
 * @param {number} options.multiplier - 0.5-5.0, default 2.0
 * @param {number} options.slopeThreshold - default 0.1
 * @returns {{outlierSpikes: Array}}
 */
export function identifyOutlierSpikes(signal, options = {}) {
  const { percentile = 95, multiplier = 2.0, slopeThreshold = 0.1 } = options;

  if (!Array.isArray(signal) || signal.length === 0) {
    return { outlierSpikes: [] };
  }

  // Strategy: Find significant local maxima with high prominence
  // Use percentile-based approach to identify only extreme outliers

  const yValues = signal.map((pt) => pt.y);

  // Calculate signal statistics for baseline filtering
  const sortedY = [...yValues].sort((a, b) => a - b);
  const median = sortedY[Math.floor(sortedY.length / 2)];
  const deviations = yValues.map((y) => Math.abs(y - median));
  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  // Find all local maxima and calculate their prominence
  // Use smaller window (100 points) for more localized prominence
  const peaks = [];
  const windowSize = 100; // Reduced from 500 to focus on local context

  for (let i = 1; i < signal.length - 1; i++) {
    const prev = signal[i - 1].y;
    const curr = signal[i].y;
    const next = signal[i + 1].y;

    if (curr > prev && curr > next) {
      // Calculate prominence (height above surrounding minima)
      let leftMin = curr;
      let rightMin = curr;

      // Search left for minimum
      for (let j = Math.max(0, i - windowSize); j < i; j++) {
        if (signal[j].y < leftMin) leftMin = signal[j].y;
      }

      // Search right for minimum
      for (let j = i + 1; j < Math.min(signal.length, i + windowSize); j++) {
        if (signal[j].y < rightMin) rightMin = signal[j].y;
      }

      const prominence = curr - Math.max(leftMin, rightMin);

      // Only consider peaks with significant prominence (> 10% of MAD)
      // This filters out noise peaks in flat regions
      if (prominence > mad * 0.1) {
        peaks.push({ idx: i, y: curr, prominence });
      }
    }
  }

  if (peaks.length === 0) {
    return { outlierSpikes: [] };
  }

  // Sort peaks by prominence to find the top outliers
  const sortedPeaks = [...peaks].sort((a, b) => b.prominence - a.prominence);

  // Use configurable percentile approach
  // Convert percentile (90-99) to fraction (0.10-0.01 for top X%)
  const percentileFraction = (100 - percentile) / 100;
  const percentileIdx = Math.floor(peaks.length * percentileFraction);
  const percentileProminence =
    sortedPeaks[Math.max(0, percentileIdx)].prominence;

  // Additionally require outliers to be at least multiplier× the median prominence
  const prominences = peaks.map((p) => p.prominence);
  const sortedProminences = [...prominences].sort((a, b) => a - b);
  const medianProminence =
    sortedProminences[Math.floor(sortedProminences.length / 2)];

  const outlierThreshold = Math.max(
    percentileProminence,
    medianProminence * multiplier
  );

  // Find outlier peaks exceeding threshold
  const outlierPeakIndices = [];
  for (const peak of peaks) {
    if (peak.prominence > outlierThreshold) {
      outlierPeakIndices.push(peak.idx);
    }
  }

  if (outlierPeakIndices.length === 0) {
    return { outlierSpikes: [] };
  }

  // Sanity cap: if more than half of detected peaks pass the outlier
  // criteria, the percentile/multiplier configuration is mis-tuned
  // for this signal (legitimate outliers should be a small minority,
  // typically <5%). Flagging "most" peaks as outliers would mean the
  // SG-preservation step preserves nearly the entire signal — which
  // defeats the purpose of smoothing — and the visual flag becomes
  // meaningless. Bail out: report no outliers so the pipeline treats
  // the signal uniformly.
  const OUTLIER_RATIO_CAP = 0.5;
  if (outlierPeakIndices.length > peaks.length * OUTLIER_RATIO_CAP) {
    return { outlierSpikes: [] };
  }

  // For each outlier peak, find the complete spike structure
  const outlierSpikes = [];

  // Use baseline already calculated above
  const baseline = median;

  for (const peakIdx of outlierPeakIndices) {
    const spike = detectSpikeStructure(
      signal,
      peakIdx,
      baseline,
      slopeThreshold
    );
    outlierSpikes.push(spike);
  }

  // CRITICAL FIX: Merge overlapping spike structures
  // If multiple outlier peaks detected on the same spike, combine them
  const mergedSpikes = [];
  const sortedSpikes = [...outlierSpikes].sort(
    (a, b) => a.startIdx - b.startIdx
  );

  let currentSpike = sortedSpikes[0];
  for (let i = 1; i < sortedSpikes.length; i++) {
    const nextSpike = sortedSpikes[i];

    // Check if spikes overlap or are adjacent
    if (nextSpike.startIdx <= currentSpike.endIdx + 1) {
      // Merge: extend current spike to include next spike
      currentSpike = {
        startIdx: currentSpike.startIdx,
        peakIdx:
          currentSpike.peakValue > nextSpike.peakValue
            ? currentSpike.peakIdx
            : nextSpike.peakIdx,
        endIdx: Math.max(currentSpike.endIdx, nextSpike.endIdx),
        peakValue: Math.max(currentSpike.peakValue, nextSpike.peakValue),
        points: [], // Will be recalculated below
        numPoints: 0, // Will be recalculated below
      };
    } else {
      // No overlap, save current and move to next
      mergedSpikes.push(currentSpike);
      currentSpike = nextSpike;
    }
  }
  mergedSpikes.push(currentSpike); // Add the last spike

  // Recalculate points for merged spikes
  for (const spike of mergedSpikes) {
    spike.points = [];
    for (let i = spike.startIdx; i <= spike.endIdx; i++) {
      spike.points.push({
        index: i,
        x: signal[i].x,
        y: signal[i].y,
      });
    }
    spike.numPoints = spike.points.length;
  }

  return { outlierSpikes: mergedSpikes };
}

/**
 * Return a copy of `smoothed` with each outlier spike's sample region
 * restored from `original`. Whole spike region (startIdx → endIdx) is
 * preserved, not just the apex — keeps both amplitude and width intact
 * through Savitzky-Golay smoothing. One-sample discontinuity at the
 * boundary between smoothed and preserved regions is intentional and
 * acceptable.
 *
 * Both `smoothed` and `original` must be the same length and share
 * x-axis indices (SG smoothing doesn't change array length).
 *
 * @param {Array<{x: number, y: number}>} smoothed
 * @param {Array<{x: number, y: number}>} original
 * @param {Array<{startIdx: number, endIdx: number}>} outlierSpikes
 * @returns {Array<{x: number, y: number}>}
 */
export function preserveOutliersInSmoothed(smoothed, original, outlierSpikes) {
  if (!outlierSpikes || outlierSpikes.length === 0) return smoothed;
  if (!Array.isArray(smoothed) || !Array.isArray(original)) return smoothed;
  const out = smoothed.slice();
  for (const spike of outlierSpikes) {
    const start = Math.max(0, spike.startIdx);
    const end = Math.min(out.length - 1, spike.endIdx);
    for (let i = start; i <= end; i++) {
      out[i] = original[i];
    }
  }
  return out;
}

/**
 * Walk a list of detected spikes (NeuralPeak instances from
 * detectSpikes) and set `isOutlier = true` on any whose `index`
 * matches the `peakIdx` of an identified outlier. Mutates spike
 * objects in place. Pure visual / classification flag — every spike's
 * metric values (auc, width, amplitude) come from NeuralPeak's
 * constructor and are not touched here.
 *
 * Peak indices match exactly because outlier identification ran on
 * the pre-smoothing signal at sample indices, the SG-preservation
 * step restored those same sample values into the smoothed signal,
 * and detectSpikes finds local maxima at integer sample indices in
 * that signal.
 *
 * @param {Array} detectedSpikes - NeuralPeak instances
 * @param {Array<{peakIdx: number}>} outlierSpikes
 * @returns {Array} the same `detectedSpikes` reference (mutated)
 */
export function flagOutliersOnDetectedPeaks(detectedSpikes, outlierSpikes) {
  if (!outlierSpikes || outlierSpikes.length === 0) return detectedSpikes;
  const outlierIndices = new Set(outlierSpikes.map((s) => s.peakIdx));
  for (const spike of detectedSpikes) {
    if (outlierIndices.has(spike.index)) {
      spike.isOutlier = true;
    }
  }
  return detectedSpikes;
}

/**
 * @deprecated 2026-05-26 — production pipeline no longer calls this.
 * Use `identifyOutlierSpikes` + `preserveOutliersInSmoothed` +
 * `flagOutliersOnDetectedPeaks` instead so outliers stay in the
 * signal for detectSpikes to measure properly. Kept here for the
 * existing `outlierRoundTrip.test.js` to keep passing during the
 * test-suite migration.
 *
 * Thin wrapper: identifies outliers, then builds a cleaned signal by
 * excising every sample in any outlier's region.
 */
export function removeOutliers(signal, options = {}) {
  if (!Array.isArray(signal) || signal.length === 0) {
    return { cleanedSignal: signal, outlierSpikes: [], removedIndices: [] };
  }
  const { outlierSpikes } = identifyOutlierSpikes(signal, options);
  if (outlierSpikes.length === 0) {
    return { cleanedSignal: signal, outlierSpikes: [], removedIndices: [] };
  }
  const removed = new Set();
  for (const spike of outlierSpikes) {
    for (let i = spike.startIdx; i <= spike.endIdx; i++) removed.add(i);
  }
  const cleanedSignal = signal.filter((_, idx) => !removed.has(idx));
  const removedIndices = Array.from(removed).sort((a, b) => a - b);
  return { cleanedSignal, outlierSpikes, removedIndices };
}

/**
 * Detect the complete structure of a spike (start, peak, end)
 * Traces backwards and forwards from peak to find where spike begins and ends
 *
 * @param {Array<{x: number, y: number}>} signal - The signal data
 * @param {number} peakIdx - Index of the peak
 * @param {number} baseline - The baseline y-value (median)
 * @param {number} slopeThreshold - Minimum slope change to detect boundaries
 * @returns {Object} Spike structure with startIdx, peakIdx, endIdx, and points
 */
function detectSpikeStructure(signal, peakIdx, baseline, slopeThreshold) {
  const peakValue = signal[peakIdx].y;

  // Calculate a local baseline from nearby non-spike regions
  // const searchRadius = 20; // Look 20 points before and after
  // const beforeIdx = Math.max(0, peakIdx - searchRadius);
  // const afterIdx = Math.min(signal.length - 1, peakIdx + searchRadius);

  // Find start of spike - trace backwards from peak
  let startIdx = peakIdx;
  let prevSlope = null;

  for (let i = peakIdx - 1; i >= 0; i--) {
    const currentY = signal[i].y;
    const nextY = signal[i + 1].y;
    const slope = nextY - currentY; // Positive slope going up to peak

    // Stop if we've reached baseline level
    if (currentY <= baseline * 1.2) {
      startIdx = i;
      break;
    }

    // Stop if slope changes dramatically (was going up, now flat or down)
    if (prevSlope !== null && slope > 0 && prevSlope < -slopeThreshold) {
      startIdx = i + 1;
      break;
    }

    // Stop if we're at the beginning
    if (i === 0) {
      startIdx = 0;
      break;
    }

    prevSlope = slope;
    startIdx = i;
  }

  // Find end of spike - trace forwards from peak
  let endIdx = peakIdx;
  prevSlope = null;

  for (let i = peakIdx + 1; i < signal.length; i++) {
    const prevY = signal[i - 1].y;
    const currentY = signal[i].y;
    const slope = currentY - prevY; // Negative slope going down from peak

    // Stop if we've reached baseline level
    if (currentY <= baseline * 1.2) {
      endIdx = i;
      break;
    }

    // Stop if slope changes dramatically (was going down, now flat or up)
    if (prevSlope !== null && slope < 0 && prevSlope > slopeThreshold) {
      endIdx = i - 1;
      break;
    }

    // Stop if we're at the end
    if (i === signal.length - 1) {
      endIdx = signal.length - 1;
      break;
    }

    prevSlope = slope;
    endIdx = i;
  }

  // Extract the spike points
  const spikePoints = [];
  for (let i = startIdx; i <= endIdx; i++) {
    spikePoints.push({
      index: i,
      x: signal[i].x,
      y: signal[i].y,
    });
  }

  return {
    startIdx,
    peakIdx,
    endIdx,
    peakValue,
    points: spikePoints,
    numPoints: endIdx - startIdx + 1,
  };
}

/**
 * @deprecated 2026-05-26 — production pipeline no longer calls this.
 * The previous "excise then re-add as glue-on" pattern is gone;
 * outliers now go through detectSpikes like every other peak and
 * carry real metrics computed by NeuralPeak. Kept here for the
 * existing `outlierRoundTrip.test.js` to keep passing during the
 * test-suite migration. AUC is the old hardcoded 0 — don't read
 * AUC values from this function's output in any new code.
 *
 * @param {Array} spikes - Array of detected spikes (NeuralPeak objects)
 * @param {Array} outlierSpikes - Array of outlier spike structures
 * @returns {Array} Combined array of regular spikes and outlier markers
 */
export function readdOutliersAsSpikes(spikes, outlierSpikes) {
  if (!outlierSpikes || outlierSpikes.length === 0) {
    return spikes;
  }

  const outlierSpikeObjects = outlierSpikes.map((spike) => {
    // Find the peak point in the points array - it's at index (peakIdx - startIdx)
    const peakPointIdx = spike.peakIdx - spike.startIdx;
    const peakPoint = spike.points[peakPointIdx];
    const leftPoint = spike.points[0];
    const rightPoint = spike.points[spike.points.length - 1];

    // (Deprecated path) `auc` stays 0 here — the production pipeline
    // no longer relies on this function for AUC. Spikes that come
    // through detectSpikes get real AUC values via NeuralPeak.
    const auc = 0;

    // Create an object that matches NeuralPeak structure
    return {
      peakCoords: { x: peakPoint.x, y: peakPoint.y },
      leftBaseCoords: { x: leftPoint.x, y: leftPoint.y },
      rightBaseCoords: { x: rightPoint.x, y: rightPoint.y },
      prominences: {
        leftProminence: spike.peakValue - leftPoint.y,
        rightProminence: spike.peakValue - rightPoint.y,
      },
      index: spike.peakIdx,
      leftBaseIdx: spike.startIdx,
      rightBaseIdx: spike.endIdx,
      time: peakPoint.x,
      amplitude: spike.peakValue,
      width: spike.numPoints,
      auc,
      isOutlier: true,
      outlierSpike: true,
    };
  });

  return [...spikes, ...outlierSpikeObjects];
}
