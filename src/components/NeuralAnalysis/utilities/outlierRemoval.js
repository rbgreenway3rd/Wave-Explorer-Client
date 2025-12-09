/**
 * outlierRemoval.js
 * Identifies and removes complete outlier spikes from neural signals
 * An outlier spike includes the peak and surrounding points (ascent and descent)
 */

/**
 * Remove outlier spikes from signal data
 * Identifies tall outliers and removes the complete spike structure (ascent, peak, descent)
 *
 * @param {Array<{x: number, y: number}>} signal - The input signal
 * @param {Object} options - Configuration options
 * @param {number} options.percentile - Percentile threshold (50-99, default: 95)
 * @param {number} options.multiplier - Multiplier for median prominence (0.5-5.0, default: 2.0)
 * @param {number} options.slopeThreshold - Minimum slope change to detect spike boundaries (default: 0.1)
 * @returns {Object} {cleanedSignal, outlierSpikes, removedIndices}
 */
export function removeOutliers(signal, options = {}) {
  const { percentile = 95, multiplier = 2.0, slopeThreshold = 0.1 } = options;

  console.log("[Outlier Removal] === START ===");
  console.log("[Outlier Removal] Signal length:", signal?.length);
  console.log("[Outlier Removal] Options:", {
    percentile,
    multiplier,
    slopeThreshold,
  });

  if (!Array.isArray(signal) || signal.length === 0) {
    console.warn("removeOutliers: Invalid signal input");
    return { cleanedSignal: signal, outlierSpikes: [], removedIndices: [] };
  }

  // Strategy: Find significant local maxima with high prominence
  // Use percentile-based approach to identify only extreme outliers

  const yValues = signal.map((pt) => pt.y);
  const maxY = Math.max(...yValues);
  const minY = Math.min(...yValues);
  const range = maxY - minY;

  // Calculate signal statistics for baseline filtering
  const sortedY = [...yValues].sort((a, b) => a - b);
  const median = sortedY[Math.floor(sortedY.length / 2)];
  const deviations = yValues.map((y) => Math.abs(y - median));
  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)];

  console.log("[Outlier Removal] Signal statistics:");
  console.log("  - Median Y:", median.toFixed(2));
  console.log("  - MAD:", mad.toFixed(2));
  console.log("  - Range:", range.toFixed(2));
  console.log("  - Min Y:", minY.toFixed(2));
  console.log("  - Max Y:", maxY.toFixed(2));

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

  console.log(
    "[Outlier Removal] Found " + peaks.length + " significant local maxima"
  );

  if (peaks.length === 0) {
    console.log("[Outlier Removal] No peaks found");
    return { cleanedSignal: signal, outlierSpikes: [], removedIndices: [] };
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

  console.log("[Outlier Removal] Percentile-based outlier detection:");
  console.log("  - Total significant peaks:", peaks.length);
  console.log("  - Median prominence:", medianProminence.toFixed(2));
  console.log(
    `  - ${percentile}th percentile prominence:`,
    percentileProminence.toFixed(2)
  );
  console.log(
    "  - Final threshold (max of both):",
    outlierThreshold.toFixed(2)
  );

  // Find outlier peaks exceeding threshold
  const outlierPeakIndices = [];
  for (const peak of peaks) {
    if (peak.prominence > outlierThreshold) {
      outlierPeakIndices.push(peak.idx);
      console.log(
        "  - Found outlier peak at index " +
          peak.idx +
          ", y=" +
          peak.y.toFixed(2) +
          ", prominence=" +
          peak.prominence.toFixed(2)
      );
    }
  }

  console.log(
    "[Outlier Removal] Found " + outlierPeakIndices.length + " outlier peaks"
  );

  if (outlierPeakIndices.length === 0) {
    console.log(
      "[Outlier Removal] No outliers found, returning original signal"
    );
    return { cleanedSignal: signal, outlierSpikes: [], removedIndices: [] };
  }

  // For each outlier peak, find the complete spike structure
  const outlierSpikes = [];
  const allRemovedIndices = new Set();

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

    // Mark all indices in this spike for removal
    for (let i = spike.startIdx; i <= spike.endIdx; i++) {
      allRemovedIndices.add(i);
    }
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
      console.log(
        "[Outlier Removal] Merged overlapping spikes at indices " +
          currentSpike.startIdx +
          "-" +
          currentSpike.endIdx
      );
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

  console.log(
    "[Outlier Removal] After merging: " +
      mergedSpikes.length +
      " distinct outlier spike(s)"
  );

  // Create cleaned signal by filtering out removed indices
  const cleanedSignal = signal.filter((_, idx) => !allRemovedIndices.has(idx));
  const removedIndices = Array.from(allRemovedIndices).sort((a, b) => a - b);

  console.log(
    "[Outlier Removal] Removed " +
      removedIndices.length +
      " points across " +
      mergedSpikes.length +
      " spike(s)"
  );

  return {
    cleanedSignal: cleanedSignal,
    outlierSpikes: mergedSpikes, // Return merged spikes instead of raw spikes
    removedIndices: removedIndices,
  };
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

  console.log(
    "[Spike Structure] Peak at index " +
      peakIdx +
      ", span [" +
      startIdx +
      " - " +
      endIdx +
      "] (" +
      (endIdx - startIdx + 1) +
      " points)"
  );

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
 * Re-add outlier spikes back to the signal as spike markers
 * This is called after spike detection to mark outliers as spikes
 *
 * @param {Array} spikes - Array of detected spikes (NeuralPeak objects)
 * @param {Array} outlierSpikes - Array of outlier spike structures from removeOutliers
 * @returns {Array} Combined array of regular spikes and outlier spikes
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
      auc: 0, // Not calculated for outliers
      isOutlier: true,
      outlierSpike: true,
    };
  });

  console.log(
    "[Outlier Re-addition] Adding " +
      outlierSpikeObjects.length +
      " outlier spike(s) back"
  );

  return [...spikes, ...outlierSpikeObjects];
}
