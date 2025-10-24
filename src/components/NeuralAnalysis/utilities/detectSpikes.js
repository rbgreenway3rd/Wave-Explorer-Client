import { detectBursts } from "./burstDetection.js";

// Class to encapsulate a detected neural spike (like Cardiac Peak)
export class NeuralPeak {
  constructor(
    peakCoords,
    leftBaseCoords,
    rightBaseCoords,
    prominences,
    data,
    idx,
    leftBaseIdx,
    rightBaseIdx
  ) {
    this.peakCoords = peakCoords; // {x, y}
    this.leftBaseCoords = leftBaseCoords; // {x, y}
    this.rightBaseCoords = rightBaseCoords; // {x, y}
    this.prominences = prominences; // {leftProminence, rightProminence}
    this.data = data; // full signal
    this.index = idx; // index in data
    this.leftBaseIdx = leftBaseIdx;
    this.rightBaseIdx = rightBaseIdx;

    // Calculate additional properties
    this.time = peakCoords.x;
    this.amplitude = Math.max(
      prominences.leftProminence,
      prominences.rightProminence
    );
    this.width = rightBaseIdx - leftBaseIdx; // Width in samples

    // Calculate AUC (Area Under Curve) using trapezoidal integration
    this.auc = this.calculateAUC();
  }

  calculateAUC() {
    const leftIdx = this.leftBaseIdx;
    const rightIdx = this.rightBaseIdx;
    const peakIdx = this.index;

    let auc = 0;
    // Integrate from left base to peak
    for (let i = leftIdx; i < peakIdx; i++) {
      const h1 = this.data[i].y - this.leftBaseCoords.y;
      const h2 = this.data[i + 1].y - this.leftBaseCoords.y;
      auc += (h1 + h2) / 2; // Trapezoidal rule
    }
    // Integrate from peak to right base
    for (let i = peakIdx; i < rightIdx; i++) {
      const h1 = this.data[i].y - this.rightBaseCoords.y;
      const h2 = this.data[i + 1].y - this.rightBaseCoords.y;
      auc += (h1 + h2) / 2; // Trapezoidal rule
    }
    return Math.abs(auc); // Ensure positive area
  }
}

/**
 * Simple k-means clustering for 1D data with k=2.
 * @param {number[]} data - Array of numbers to cluster
 * @param {number} k - Number of clusters (fixed to 2)
 * @returns {Object} {centroids: [number, number], assignments: number[]}
 */
function kMeans(data, k = 2) {
  // k not used, logic hardcoded to always use two centroids and 2 clusters
  if (!Array.isArray(data) || data.length < 2) {
    return { centroids: [0, 0], assignments: data.map(() => 0) };
  }
  // Initialize centroids: min and max
  let centroids = [Math.min(...data), Math.max(...data)];
  let assignments = new Array(data.length).fill(0);
  let changed = true;
  let maxIterations = 1000; // Prevent infinite loop
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Assign points to nearest centroid
    for (let i = 0; i < data.length; i++) {
      let dist0 = Math.abs(data[i] - centroids[0]);
      let dist1 = Math.abs(data[i] - centroids[1]);
      let newAssignment = dist0 < dist1 ? 0 : 1;
      if (newAssignment !== assignments[i]) {
        assignments[i] = newAssignment;
        changed = true;
      }
    }

    // Update centroids
    let sum0 = 0,
      count0 = 0,
      sum1 = 0,
      count1 = 0;
    for (let i = 0; i < data.length; i++) {
      if (assignments[i] === 0) {
        sum0 += data[i];
        count0++;
      } else {
        sum1 += data[i];
        count1++;
      }
    }
    centroids[0] = count0 > 0 ? sum0 / count0 : centroids[0];
    centroids[1] = count1 > 0 ? sum1 / count1 : centroids[1];
  }

  return { centroids, assignments };
}

/**
 * Find left and right bases for a peak using horizontal line extension method (inspired by SciPy peak_prominences).
 * Extends horizontal lines from the peak until they intersect the signal again, then finds bases in those regions.
 *
 * Parameters are passed down from detectSpikes() for consistent configuration.
 *
 * @param {{x: number, y: number}[]} data - The signal data
 * @param {number} peakIdx - Index of the peak
 * @param {number} searchRange - Maximum range to search for bases
 * @param {number} baselineThreshold - Maximum y-value allowed for valid base points
 * @returns {Object} {leftBaseIdx: number, rightBaseIdx: number}
 */
function findBases(data, peakIdx, searchRange, baselineThreshold) {
  const peakY = data[peakIdx].y;
  let leftBaseIdx = peakIdx;
  let rightBaseIdx = peakIdx;

  // === LEFT BASE FINDING ===
  // Extend horizontal line from peak to the left until it intersects signal
  let leftIntersectionIdx = peakIdx;
  for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
    if (data[j].y >= peakY) {
      // Found intersection with signal (higher peak or plateau)
      leftIntersectionIdx = j;
      break;
    }
    leftIntersectionIdx = j;
  }

  // Within the intersection region, find the lowest point (respecting threshold)
  for (let j = peakIdx - 1; j >= leftIntersectionIdx; j--) {
    if (data[j].y <= baselineThreshold && data[j].y < data[leftBaseIdx].y) {
      leftBaseIdx = j;
    }
  }

  // === RIGHT BASE FINDING ===
  // Extend horizontal line from peak to the right until it intersects signal
  let rightIntersectionIdx = peakIdx;
  for (
    let j = peakIdx + 1;
    j <= Math.min(data.length - 1, peakIdx + searchRange);
    j++
  ) {
    if (data[j].y >= peakY) {
      // Found intersection with signal (higher peak or plateau)
      rightIntersectionIdx = j;
      break;
    }
    rightIntersectionIdx = j;
  }

  // Within the intersection region, find the lowest point (respecting threshold)
  for (let j = peakIdx + 1; j <= rightIntersectionIdx; j++) {
    if (data[j].y <= baselineThreshold && data[j].y < data[rightBaseIdx].y) {
      rightBaseIdx = j;
    }
  }

  return { leftBaseIdx, rightBaseIdx };
}

/**
 * Filter true spikes using k-means clustering on prominence.
 *
 * Parameters are passed down from detectSpikes() for consistent configuration.
 *
 * @param {NeuralPeak[]} peaks - Detected peaks
 * @param {number} minWidth - Minimum width in samples to consider a true spike
 * @param {number} minDistance - Minimum distance in samples between spikes
 * @param {number} minProminenceRatio - Minimum ratio of min to max prominence for symmetry
 * @returns {NeuralPeak[]} Filtered true spikes
 */
function findTrueSpikes(
  peaks,
  minWidth = 5,
  minDistance = 10,
  minProminenceRatio = 0.01,
  robustStd = 0, // New param (robust noise estimate)
  stdMultiplier = 1.5 // New: tunable multiplier
) {
  console.log("[findTrueSpikes] Function entry");
  console.log("  - Input peaks count:", peaks.length);
  console.log("  - minWidth:", minWidth);
  console.log("  - minDistance:", minDistance);
  console.log("  - minProminenceRatio:", minProminenceRatio);
  console.log("  - robustStd:", robustStd.toFixed(2));
  console.log("  - stdMultiplier:", stdMultiplier);

  if (!Array.isArray(peaks) || peaks.length < 2) {
    console.log(
      "[findTrueSpikes] Less than 2 peaks, applying width filter only"
    );
    const filtered = peaks.filter((p) => p.width >= minWidth);
    console.log("  - Returning", filtered.length, "peaks after width filter");
    return filtered;
  }

  // Extract prominences
  let prominences = peaks.map((p) =>
    Math.min(p.prominences.leftProminence, p.prominences.rightProminence)
  );

  console.log("[findTrueSpikes] Extracted prominences:");
  console.log("  - Count:", prominences.length);
  console.log(
    "  - First 10 values:",
    prominences.slice(0, 10).map((p) => p.toFixed(2))
  );
  console.log("  - Min prominence:", Math.min(...prominences).toFixed(2));
  console.log("  - Max prominence:", Math.max(...prominences).toFixed(2));
  console.log(
    "  - Mean prominence:",
    (prominences.reduce((a, b) => a + b, 0) / prominences.length).toFixed(2)
  );

  // Cluster prominences into 2 groups
  console.log("[findTrueSpikes] Running k-means clustering (k=2)...");
  let { centroids, assignments } = kMeans(prominences, 2);

  console.log(
    "  - Centroids:",
    centroids.map((c) => c.toFixed(2))
  );
  console.log(
    "  - Cluster 0 count:",
    assignments.filter((a) => a === 0).length
  );
  console.log(
    "  - Cluster 1 count:",
    assignments.filter((a) => a === 1).length
  );

  // Identify the cluster with higher average prominence
  let topCluster = centroids[0] > centroids[1] ? 0 : 1;
  let lowerCluster = topCluster === 0 ? 1 : 0;
  let higherCentroid = Math.max(...centroids);
  let lowerCentroid = Math.min(...centroids);
  let clusterSeparation = higherCentroid - lowerCentroid;

  // Debug: Show sample peaks from each cluster
  const cluster0Peaks = prominences.filter((_, idx) => assignments[idx] === 0);
  const cluster1Peaks = prominences.filter((_, idx) => assignments[idx] === 1);
  console.log(
    "  - Cluster 0 prominence range:",
    cluster0Peaks.length > 0
      ? `${Math.min(...cluster0Peaks).toFixed(2)} - ${Math.max(
          ...cluster0Peaks
        ).toFixed(2)}`
      : "N/A"
  );
  console.log(
    "  - Cluster 1 prominence range:",
    cluster1Peaks.length > 0
      ? `${Math.min(...cluster1Peaks).toFixed(2)} - ${Math.max(
          ...cluster1Peaks
        ).toFixed(2)}`
      : "N/A"
  );
  let noiseThreshold = stdMultiplier * robustStd;

  console.log("[findTrueSpikes] Cluster analysis:");
  console.log("  - Top cluster (signal):", topCluster);
  console.log("  - Lower cluster (noise):", lowerCluster);
  console.log("  - Higher centroid value:", higherCentroid.toFixed(2));
  console.log("  - Lower centroid value:", lowerCentroid.toFixed(2));
  console.log("  - Cluster separation:", clusterSeparation.toFixed(2));
  console.log(
    "  - Noise threshold (stdMultiplier × robustStd):",
    noiseThreshold.toFixed(2)
  );

  // NEW APPROACH: Use k-means clustering for separation, optionally apply threshold
  // Only discard all peaks if BOTH clusters are below noise threshold (very noisy signal)
  if (
    higherCentroid < noiseThreshold &&
    clusterSeparation < noiseThreshold * 0.5
  ) {
    console.log(
      "[findTrueSpikes] ⚠️ DISCARDING ALL PEAKS - both clusters too close to noise floor"
    );
    console.log(
      "  - Higher centroid:",
      higherCentroid.toFixed(2),
      "< threshold:",
      noiseThreshold.toFixed(2)
    );
    console.log(
      "  - Cluster separation:",
      clusterSeparation.toFixed(2),
      "< 50% of threshold:",
      (noiseThreshold * 0.5).toFixed(2)
    );
    return [];
  }

  console.log(
    "[findTrueSpikes] ✓ Clusters are sufficiently separated, using k-means filtering..."
  );
  console.log("  - Keeping peaks from cluster:", topCluster);
  console.log("  - Discarding peaks from cluster:", lowerCluster);

  // Filter peaks: keep ONLY those in the top cluster (signal) with sufficient width
  // This explicitly removes ALL peaks in the lower cluster (noise)
  let filteredPeaks = peaks.filter((p, idx) => {
    const inTopCluster = assignments[idx] === topCluster;
    const hasMinWidth = p.width >= minWidth;
    return inTopCluster && hasMinWidth;
  });

  console.log("[findTrueSpikes] After cluster + width filtering:");
  console.log("  - Peaks in top cluster (signal):", filteredPeaks.length);
  console.log(
    "  - Removed from lower cluster (noise):",
    peaks.filter((p, idx) => assignments[idx] === lowerCluster).length
  );
  console.log(
    "  - Removed for insufficient width:",
    peaks.filter(
      (p, idx) => assignments[idx] === topCluster && p.width < minWidth
    ).length
  );
  console.log(
    "  - Total removed:",
    peaks.length - filteredPeaks.length,
    "peaks"
  );

  // Apply prominence ratio filter for symmetry
  if (minProminenceRatio > 0) {
    const beforeRatioFilter = filteredPeaks.length;
    filteredPeaks = filteredPeaks.filter((p) => {
      const left = p.prominences.leftProminence;
      const right = p.prominences.rightProminence;
      const ratio = Math.min(left, right) / Math.max(left, right);
      return ratio >= minProminenceRatio;
    });
    console.log("[findTrueSpikes] After prominence ratio filter:");
    console.log("  - Remaining peaks:", filteredPeaks.length);
    console.log(
      "  - Removed",
      beforeRatioFilter - filteredPeaks.length,
      "asymmetric peaks"
    );
  }

  // Apply distance filter: remove peaks too close to others
  if (minDistance > 0 && filteredPeaks.length > 1) {
    const beforeDistanceFilter = filteredPeaks.length;
    filteredPeaks.sort((a, b) => a.index - b.index);
    let result = [filteredPeaks[0]];
    for (let i = 1; i < filteredPeaks.length; i++) {
      if (
        filteredPeaks[i].index - result[result.length - 1].index >=
        minDistance
      ) {
        result.push(filteredPeaks[i]);
      }
    }
    filteredPeaks = result;
    console.log("[findTrueSpikes] After distance filter:");
    console.log("  - Remaining peaks:", filteredPeaks.length);
    console.log(
      "  - Removed",
      beforeDistanceFilter - filteredPeaks.length,
      "too-close peaks"
    );
  }

  console.log(
    "[findTrueSpikes] Function exit - returning",
    filteredPeaks.length,
    "final spikes"
  );
  return filteredPeaks;
}

export function detectSpikes(data, options = {}) {
  console.log("=== [detectSpikes] FUNCTION START ===");
  console.log("[detectSpikes] Input data length:", data?.length);
  console.log("[detectSpikes] Input data sample (first 3):", data?.slice(0, 3));
  console.log("[detectSpikes] Options received:", options);

  if (!Array.isArray(data) || data.length === 0) {
    console.log("[detectSpikes] ❌ Empty or invalid data, returning []");
    return [];
  }
  if (
    typeof data[0] !== "object" ||
    data[0] === null ||
    !("x" in data[0]) ||
    !("y" in data[0])
  ) {
    console.error("[detectSpikes] ❌ Invalid data format:", data[0]);
    throw new Error("detectSpikes expects array of {x, y} objects");
  }

  // Extracted options with adjusted defaults
  let prominence = options.prominence ?? 0;
  const wlen = options.window ?? null; // Disable grouping by default
  const minWidth = options.minWidth ?? 5;
  const minDistance = options.minDistance ?? 10;
  const minProminenceRatio = options.minProminenceRatio ?? 10;
  const stdMultiplier = options.stdMultiplier ?? 3; // Used for cluster separation check (not individual peak filtering)

  console.log("[detectSpikes] Step 1: Parameters extracted");
  console.log("  - prominence:", prominence);
  console.log("  - wlen (window):", wlen);
  console.log("  - minWidth:", minWidth);
  console.log("  - minDistance:", minDistance);
  console.log("  - minProminenceRatio:", minProminenceRatio);
  console.log("  - stdMultiplier:", stdMultiplier);

  // Calculated global statistics
  const allYValues = data.map((d) => d.y);
  const n = allYValues.length;
  const globalMin = Math.min(...allYValues);
  const globalMax = Math.max(...allYValues);
  const signalRange = globalMax - globalMin;

  console.log("[detectSpikes] Step 2: Global statistics calculated");
  console.log("  - n (data length):", n);
  console.log("  - globalMin:", globalMin.toFixed(2));
  console.log("  - globalMax:", globalMax.toFixed(2));
  console.log("  - signalRange:", signalRange.toFixed(2));

  // New: Compute robust std (MAD) for noise estimate
  const medianY = allYValues.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  const absDevs = allYValues.map((y) => Math.abs(y - medianY));
  const medianAbsDev = absDevs.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  const robustStd = medianAbsDev / 0.6745; // Normalize to std equiv

  console.log("[detectSpikes] Step 3: Robust noise estimate (MAD method)");
  console.log("  - medianY:", medianY.toFixed(2));
  console.log("  - medianAbsDev:", medianAbsDev.toFixed(2));
  console.log("  - robustStd (noise estimate):", robustStd.toFixed(2));
  console.log(
    "  - Noise threshold (stdMultiplier × robustStd):",
    (stdMultiplier * robustStd).toFixed(2)
  );

  // Auto-set prominence if 'auto'
  if (prominence === "auto") {
    prominence = 2 * robustStd;
    console.log(
      "[detectSpikes] Auto-set prominence to 2×robustStd:",
      prominence.toFixed(2)
    );
  }
  console.log("  - Final prominence threshold:", prominence);

  // Baseline threshold calculations (unchanged)
  const sortedY = [...allYValues].sort((a, b) => a - b);
  const percentileIndex = Math.floor(sortedY.length * 0.02);
  const baselineThreshold = sortedY[Math.max(0, percentileIndex)];
  const alternativeThreshold = globalMin + signalRange * 0.05;
  const finalBaselineThreshold = Math.min(
    baselineThreshold,
    alternativeThreshold
  );
  const fallbackThreshold = globalMin + signalRange * 0.02;

  console.log("[detectSpikes] Step 4: Baseline thresholds calculated");
  console.log(
    "  - baselineThreshold (2nd percentile):",
    baselineThreshold.toFixed(2)
  );
  console.log(
    "  - alternativeThreshold (min + 5% range):",
    alternativeThreshold.toFixed(2)
  );
  console.log("  - finalBaselineThreshold:", finalBaselineThreshold.toFixed(2));
  console.log(
    "  - fallbackThreshold (min + 2% range):",
    fallbackThreshold.toFixed(2)
  );

  // === MAIN DETECTION LOGIC === (unchanged from previous)

  let peakIndices = [];

  console.log("[detectSpikes] Step 5: Finding initial peaks (local maxima)...");

  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].y > data[i - 1].y && data[i].y >= data[i + 1].y) {
      peakIndices.push(i);
    } else if (data[i].y === data[i + 1].y && data[i].y > data[i - 1].y) {
      let plateauStart = i;
      let plateauEnd = i;
      while (
        plateauEnd + 1 < data.length &&
        data[plateauEnd].y === data[plateauEnd + 1].y
      ) {
        plateauEnd++;
      }
      if (data[plateauStart].y > data[plateauEnd + 1]?.y) {
        const plateauPeak = Math.floor((plateauStart + plateauEnd) / 2);
        peakIndices.push(plateauPeak);
      }
      i = plateauEnd;
    }
  }

  console.log(
    "[detectSpikes] Step 5 Complete: Found",
    peakIndices.length,
    "initial peaks"
  );
  console.log("  - Peak indices sample (first 10):", peakIndices.slice(0, 10));

  let filteredPeakIndices = [];
  console.log("[detectSpikes] Step 6: Filtering peaks by prominence...");
  for (let peakIdx of peakIndices) {
    let searchRange = wlen ? Math.floor(wlen / 2) : data.length;
    let { leftBaseIdx, rightBaseIdx } = findBases(
      data,
      peakIdx,
      searchRange,
      finalBaselineThreshold
    );
    if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
      ({ leftBaseIdx, rightBaseIdx } = findBases(
        data,
        peakIdx,
        searchRange,
        fallbackThreshold
      ));
    }
    if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
      ({ leftBaseIdx, rightBaseIdx } = findBases(
        data,
        peakIdx,
        searchRange,
        globalMax
      ));
    }
    let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    let prominenceValue = Math.min(leftProminence, rightProminence);
    if (prominenceValue >= prominence) {
      filteredPeakIndices.push(peakIdx);
    }
  }

  console.log(
    "[detectSpikes] Step 6 Complete: Filtered to",
    filteredPeakIndices.length,
    "peaks by prominence"
  );
  console.log("  - Prominence threshold was:", prominence);
  console.log(
    "  - Filtered peak indices sample (first 10):",
    filteredPeakIndices.slice(0, 10)
  );

  let finalFilteredPeakIndices = [];
  console.log(
    "[detectSpikes] Step 7: Grouping nearby peaks (if window enabled)..."
  );
  console.log("  - Window (wlen):", wlen);
  if (wlen && filteredPeakIndices.length > 1) {
    let i = 0;
    while (i < filteredPeakIndices.length) {
      let group = [];
      let currentPeakIdx = filteredPeakIndices[i];
      group.push(currentPeakIdx);
      for (let j = i + 1; j < filteredPeakIndices.length; j++) {
        if (filteredPeakIndices[j] <= currentPeakIdx + wlen / 2) {
          group.push(filteredPeakIndices[j]);
        } else {
          break;
        }
      }
      let highestPeakIdx = group.reduce(
        (maxIdx, idx) => (data[idx].y > data[maxIdx].y ? idx : maxIdx),
        group[0]
      );
      finalFilteredPeakIndices.push(highestPeakIdx);
      i += group.length;
    }
  } else {
    finalFilteredPeakIndices = filteredPeakIndices;
  }

  console.log(
    "[detectSpikes] Step 7 Complete: After grouping, have",
    finalFilteredPeakIndices.length,
    "peaks"
  );
  console.log(
    "  - Final peak indices sample (first 10):",
    finalFilteredPeakIndices.slice(0, 10)
  );

  let peaks = [];
  console.log("[detectSpikes] Step 8: Creating NeuralPeak objects...");
  for (let peakIdx of finalFilteredPeakIndices) {
    let searchRange = wlen ? Math.floor(wlen / 2) : data.length;
    let { leftBaseIdx, rightBaseIdx } = findBases(
      data,
      peakIdx,
      searchRange,
      finalBaselineThreshold
    );
    if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
      ({ leftBaseIdx, rightBaseIdx } = findBases(
        data,
        peakIdx,
        searchRange,
        fallbackThreshold
      ));
    }
    if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
      ({ leftBaseIdx, rightBaseIdx } = findBases(
        data,
        peakIdx,
        searchRange,
        globalMax
      ));
    }
    let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    let prominences = { leftProminence, rightProminence };
    let leftBaseCoords = data[leftBaseIdx];
    let peakCoords = data[peakIdx];
    let rightBaseCoords = data[rightBaseIdx];
    peaks.push(
      new NeuralPeak(
        peakCoords,
        leftBaseCoords,
        rightBaseCoords,
        prominences,
        data,
        peakIdx,
        leftBaseIdx,
        rightBaseIdx
      )
    );
  }

  console.log(
    "[detectSpikes] Step 8 Complete: Created",
    peaks.length,
    "NeuralPeak objects"
  );
  if (peaks.length > 0) {
    console.log("  - Sample peak 0:", {
      peakIdx: peaks[0].index,
      peakY: peaks[0].peakCoords.y.toFixed(2),
      leftProminence: peaks[0].prominences.leftProminence.toFixed(2),
      rightProminence: peaks[0].prominences.rightProminence.toFixed(2),
      width: peaks[0].width,
    });
  }

  console.log(
    "[detectSpikes] Step 9: Calling findTrueSpikes() for k-means filtering..."
  );
  console.log("  - Passing robustStd:", robustStd.toFixed(2));
  console.log("  - Passing stdMultiplier:", stdMultiplier);

  const finalSpikes = findTrueSpikes(
    peaks,
    minWidth,
    minDistance,
    minProminenceRatio,
    robustStd,
    stdMultiplier
  );

  console.log("=== [detectSpikes] FUNCTION END ===");
  console.log(
    "[detectSpikes] Final result:",
    finalSpikes.length,
    "spikes detected"
  );
  if (finalSpikes.length > 0) {
    console.log("  - First spike index:", finalSpikes[0].index);
    console.log(
      "  - Last spike index:",
      finalSpikes[finalSpikes.length - 1].index
    );
  }

  return finalSpikes;
}

/**
 * Detect spikes and bursts in a 1D signal array, robust to plateaus and noise.
 * Emulates logic from Cardiac PeakFinder.js with global baseline threshold for accurate base detection.
 *
 * All parameters are defined at the top of the function and passed down to helper functions
 * for better organization and maintainability.
 *
 * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
 * @param {Object} [options] - Configuration object
 * @param {number} [options.prominence] - Minimum prominence (height above neighbors)
 * @param {number} [options.window] - Optional window width for grouping peaks (samples)
 * @param {number} [options.minWidth] - Minimum width in samples for true spikes
 * @param {number} [options.minDistance] - Minimum distance in samples between spikes
 * @param {number} [options.minProminenceRatio] - Minimum ratio of min to max prominence for symmetry
 * @param {number} [options.maxInterSpikeInterval] - Maximum time between spikes for burst detection
 * @param {number} [options.minSpikesPerBurst] - Minimum spikes per burst
 * @returns {Object} {peaks: NeuralPeak[], bursts: NeuralBurst[]}
 */
export function detectSpikesAndBursts(data, options = {}) {
  const spikeResults = detectSpikes(data, options);
  const burstResults = detectBursts(spikeResults, options);

  return { peaks: spikeResults, bursts: burstResults };
}

// Simplified spike detection based on CardiacAnalysis PeakFinder.js
// with added Savitzky-Golay filtering for noise reduction

/**
 * NeuralPeak class - similar to Cardiac Peak class
 */
// export class NeuralPeak {
//   constructor(peakCoords, leftBaseCoords, rightBaseCoords, prominences, data) {
//     this.peakCoords = peakCoords; // {x, y}
//     this.leftBaseCoords = leftBaseCoords; // {x, y}
//     this.rightBaseCoords = rightBaseCoords; // {x, y}
//     this.prominences = prominences; // {leftProminence, rightProminence}
//     this.data = data; // full signal

//     // Calculate index from x coordinate
//     this.index = data.findIndex((pt) => pt.x === peakCoords.x);
//     this.leftBaseIdx = data.findIndex((pt) => pt.x === leftBaseCoords.x);
//     this.rightBaseIdx = data.findIndex((pt) => pt.x === rightBaseCoords.x);

//     // Calculate additional properties
//     this.time = peakCoords.x;
//     this.amplitude = Math.max(
//       prominences.leftProminence,
//       prominences.rightProminence
//     );
//     this.width = this.rightBaseIdx - this.leftBaseIdx; // Width in samples

//     // Calculate AUC (Area Under Curve) using trapezoidal integration
//     this.auc = this.calculateAUC();
//   }

//   calculateAUC() {
//     const leftIdx = this.leftBaseIdx;
//     const rightIdx = this.rightBaseIdx;
//     const peakIdx = this.index;

//     let auc = 0;
//     // Integrate from left base to peak
//     for (let i = leftIdx; i < peakIdx; i++) {
//       const h1 = this.data[i].y - this.leftBaseCoords.y;
//       const h2 = this.data[i + 1].y - this.leftBaseCoords.y;
//       auc += (h1 + h2) / 2; // Trapezoidal rule
//     }
//     // Integrate from peak to right base
//     for (let i = peakIdx; i < rightIdx; i++) {
//       const h1 = this.data[i].y - this.rightBaseCoords.y;
//       const h2 = this.data[i + 1].y - this.rightBaseCoords.y;
//       auc += (h1 + h2) / 2; // Trapezoidal rule
//     }
//     return Math.abs(auc); // Ensure positive area
//   }
// }

// /**
//  * Savitzky-Golay filter coefficients for window size 5, polynomial order 2
//  * Pre-computed for efficiency
//  */
// const SG_COEFFICIENTS = {
//   5: [-3, 12, 17, 12, -3], // window=5, order=2, normalized by 35
//   7: [-2, 3, 6, 7, 6, 3, -2], // window=7, order=2, normalized by 21
//   9: [-21, 14, 39, 54, 59, 54, 39, 14, -21], // window=9, order=2, normalized by 231
// };

// /**
//  * Apply Savitzky-Golay smoothing filter to signal
//  * Preserves peak shapes better than simple moving average
//  *
//  * @param {{x: number, y: number}[]} data - Input signal
//  * @param {number} windowSize - Must be odd (5, 7, or 9)
//  * @returns {{x: number, y: number}[]} Smoothed signal
//  */
// function savitzkyGolayFilter(data, windowSize = 5) {
//   if (!Array.isArray(data) || data.length === 0) return data;

//   // Validate window size
//   if (![5, 7, 9].includes(windowSize)) {
//     console.warn(
//       `[savitzkyGolayFilter] Invalid window size ${windowSize}, using 5`
//     );
//     windowSize = 5;
//   }

//   const coeffs = SG_COEFFICIENTS[windowSize];
//   const halfWindow = Math.floor(windowSize / 2);
//   const normalizer = coeffs.reduce((sum, c) => sum + Math.abs(c), 0);

//   const smoothed = [];

//   for (let i = 0; i < data.length; i++) {
//     let sum = 0;
//     let count = 0;

//     for (let j = -halfWindow; j <= halfWindow; j++) {
//       const idx = i + j;
//       if (idx >= 0 && idx < data.length) {
//         sum += data[idx].y * coeffs[j + halfWindow];
//         count++;
//       }
//     }

//     // Normalize
//     const smoothedY = count === windowSize ? sum / normalizer : data[i].y;
//     smoothed.push({ x: data[i].x, y: smoothedY });
//   }

//   return smoothed;
// }

// /**
//  * Detect spikes in neural data using PeakFinder.js logic
//  *
//  * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
//  * @param {Object} options - Configuration object
//  * @param {number} [options.prominence=0] - Minimum prominence (height above neighbors)
//  * @param {number} [options.window=null] - Window width for grouping peaks (samples)
//  * @param {number} [options.minWidth=5] - Minimum width in samples for valid spikes
//  * @param {number} [options.minDistance=10] - Minimum distance in samples between spikes
//  * @param {boolean} [options.applySGFilter=true] - Apply Savitzky-Golay smoothing
//  * @param {number} [options.sgWindowSize=5] - Savitzky-Golay window size (5, 7, or 9)
//  * @returns {NeuralPeak[]} Array of detected neural spikes
//  */
// export function detectSpikes(data, options = {}) {
//   console.log("=== [detectSpikes] SIMPLIFIED APPROACH (PeakFinder Logic) ===");
//   console.log("[detectSpikes] Input data length:", data?.length);
//   console.log("[detectSpikes] Options:", options);

//   if (!Array.isArray(data) || data.length === 0) {
//     console.log("[detectSpikes] ❌ Empty or invalid data, returning []");
//     return [];
//   }

//   // Extract options
//   const prominence = options.prominence ?? 0;
//   const wlen = options.window ?? null;
//   const minWidth = options.minWidth ?? 25;
//   const minDistance = options.minDistance ?? 1;
//   const applySGFilter = options.applySGFilter ?? true;
//   const sgWindowSize = options.sgWindowSize ?? 5;

//   console.log("[detectSpikes] Parameters:");
//   console.log("  - prominence:", prominence);
//   console.log("  - window (wlen):", wlen);
//   console.log("  - minWidth:", minWidth);
//   console.log("  - minDistance:", minDistance);
//   console.log("  - applySGFilter:", applySGFilter);
//   console.log("  - sgWindowSize:", sgWindowSize);

//   // Step 1: Apply Savitzky-Golay filter if enabled
//   let processedData = data;
//   if (applySGFilter) {
//     console.log("[detectSpikes] Step 1: Applying Savitzky-Golay filter...");
//     processedData = savitzkyGolayFilter(data, sgWindowSize);
//     console.log("  - Smoothed data length:", processedData.length);
//   } else {
//     console.log("[detectSpikes] Step 1: Skipping SG filter (disabled)");
//   }

//   // Step 2: Find local maxima
//   console.log("[detectSpikes] Step 2: Finding local maxima...");
//   let peakIndices = [];
//   for (let i = 1; i < processedData.length - 1; i++) {
//     if (
//       processedData[i].y > processedData[i - 1].y &&
//       processedData[i].y > processedData[i + 1].y
//     ) {
//       peakIndices.push(i);
//     }
//   }
//   console.log("  - Found", peakIndices.length, "local maxima");

//   // Step 3: Calculate prominence and filter by threshold
//   console.log("[detectSpikes] Step 3: Calculating prominence and filtering...");
//   let filteredPeakIndices = [];
//   const searchRange = wlen ? Math.floor(wlen / 2) : processedData.length;

//   for (let peakIdx of peakIndices) {
//     let leftBaseIdx = peakIdx;
//     let rightBaseIdx = peakIdx;

//     // Find left base (lowest point in search range)
//     for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
//       if (processedData[j].y < processedData[leftBaseIdx].y) {
//         leftBaseIdx = j;
//       }
//     }

//     // Find right base (lowest point in search range)
//     for (
//       let j = peakIdx + 1;
//       j <= Math.min(processedData.length - 1, peakIdx + searchRange);
//       j++
//     ) {
//       if (processedData[j].y < processedData[rightBaseIdx].y) {
//         rightBaseIdx = j;
//       }
//     }

//     let leftProminence =
//       processedData[peakIdx].y - processedData[leftBaseIdx].y;
//     let rightProminence =
//       processedData[peakIdx].y - processedData[rightBaseIdx].y;
//     let prominenceValue = Math.min(leftProminence, rightProminence);

//     if (prominenceValue >= prominence) {
//       filteredPeakIndices.push(peakIdx);
//     }
//   }
//   console.log(
//     "  - Filtered to",
//     filteredPeakIndices.length,
//     "peaks with prominence >=",
//     prominence
//   );

//   // Step 4: Group nearby peaks within window and keep highest
//   if (wlen) {
//     console.log(
//       "[detectSpikes] Step 4: Grouping nearby peaks (window:",
//       wlen,
//       ")..."
//     );
//     let finalFilteredPeakIndices = [];
//     let i = 0;
//     while (i < filteredPeakIndices.length) {
//       let group = [];
//       let currentPeakIdx = filteredPeakIndices[i];
//       group.push(currentPeakIdx);

//       // Find all peaks within the window width
//       for (let j = i + 1; j < filteredPeakIndices.length; j++) {
//         if (filteredPeakIndices[j] <= currentPeakIdx + wlen / 2) {
//           group.push(filteredPeakIndices[j]);
//         } else {
//           break;
//         }
//       }

//       // Find the peak with the highest y value in the group
//       let highestPeakIdx = group.reduce(
//         (maxIdx, idx) =>
//           processedData[idx].y > processedData[maxIdx].y ? idx : maxIdx,
//         group[0]
//       );
//       finalFilteredPeakIndices.push(highestPeakIdx);

//       // Move to the next group
//       i += group.length;
//     }
//     filteredPeakIndices = finalFilteredPeakIndices;
//     console.log("  - After grouping:", filteredPeakIndices.length, "peaks");
//   } else {
//     console.log("[detectSpikes] Step 4: Skipping grouping (window disabled)");
//   }

//   // Step 5: Create NeuralPeak instances
//   console.log("[detectSpikes] Step 5: Creating NeuralPeak objects...");
//   console.log(
//     "  - Using",
//     applySGFilter ? "ORIGINAL" : "processed",
//     "data for peak coordinates"
//   );
//   let peaks = [];

//   // CRITICAL: Use original data for peak values to preserve true peak positions
//   // Detection happens on processedData (smoothed), but coordinates come from original
//   const dataForCoordinates = data; // Always use original unsmoothed data

//   for (let peakIdx of filteredPeakIndices) {
//     let leftBaseIdx = peakIdx;
//     let rightBaseIdx = peakIdx;
//     const searchRange = wlen ? Math.floor(wlen / 2) : dataForCoordinates.length;

//     // Recalculate bases on ORIGINAL data
//     for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
//       if (dataForCoordinates[j].y < dataForCoordinates[leftBaseIdx].y) {
//         leftBaseIdx = j;
//       }
//     }

//     for (
//       let j = peakIdx + 1;
//       j <= Math.min(dataForCoordinates.length - 1, peakIdx + searchRange);
//       j++
//     ) {
//       if (dataForCoordinates[j].y < dataForCoordinates[rightBaseIdx].y) {
//         rightBaseIdx = j;
//       }
//     }

//     let leftProminence =
//       dataForCoordinates[peakIdx].y - dataForCoordinates[leftBaseIdx].y;
//     let rightProminence =
//       dataForCoordinates[peakIdx].y - dataForCoordinates[rightBaseIdx].y;
//     let prominences = {
//       leftProminence: leftProminence,
//       rightProminence: rightProminence,
//     };

//     let leftBaseCoords = dataForCoordinates[leftBaseIdx];
//     let peakCoords = dataForCoordinates[peakIdx];
//     let rightBaseCoords = dataForCoordinates[rightBaseIdx];

//     peaks.push(
//       new NeuralPeak(
//         peakCoords,
//         leftBaseCoords,
//         rightBaseCoords,
//         prominences,
//         dataForCoordinates // Use original data for AUC calculation too
//       )
//     );
//   }
//   console.log("  - Created", peaks.length, "NeuralPeak objects");

//   // Step 6: Apply width filter
//   console.log(
//     "[detectSpikes] Step 6: Filtering by width (min:",
//     minWidth,
//     ")..."
//   );
//   const widthFilteredPeaks = peaks.filter((p) => p.width >= minWidth);
//   console.log("  - After width filter:", widthFilteredPeaks.length, "peaks");

//   // Step 7: Apply distance filter
//   if (minDistance > 0 && widthFilteredPeaks.length > 1) {
//     console.log(
//       "[detectSpikes] Step 7: Filtering by distance (min:",
//       minDistance,
//       ")..."
//     );
//     widthFilteredPeaks.sort((a, b) => a.index - b.index);
//     let result = [widthFilteredPeaks[0]];
//     for (let i = 1; i < widthFilteredPeaks.length; i++) {
//       if (
//         widthFilteredPeaks[i].index - result[result.length - 1].index >=
//         minDistance
//       ) {
//         result.push(widthFilteredPeaks[i]);
//       }
//     }
//     console.log("  - After distance filter:", result.length, "peaks");
//     console.log("=== [detectSpikes] COMPLETE ===");
//     return result;
//   }

//   console.log("=== [detectSpikes] COMPLETE ===");
//   return widthFilteredPeaks;
// }

// /**
//  * Detect spikes and bursts (kept for compatibility)
//  */
// export function detectSpikesAndBursts(data, options = {}) {
//   const spikes = detectSpikes(data, options);
//   return { spikes, bursts: [] }; // Burst detection can be handled separately
// }
