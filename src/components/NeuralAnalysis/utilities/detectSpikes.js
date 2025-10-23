// // --- Cardiac-style neural spike detection pipeline ---

// import { detectBursts } from "./burstDetection.js";

// // Class to encapsulate a detected neural spike (like Cardiac Peak)
// export class NeuralPeak {
//   constructor(
//     peakCoords,
//     leftBaseCoords,
//     rightBaseCoords,
//     prominences,
//     data,
//     idx,
//     leftBaseIdx,
//     rightBaseIdx
//   ) {
//     this.peakCoords = peakCoords; // {x, y}
//     this.leftBaseCoords = leftBaseCoords; // {x, y}
//     this.rightBaseCoords = rightBaseCoords; // {x, y}
//     this.prominences = prominences; // {leftProminence, rightProminence}
//     this.data = data; // full signal
//     this.index = idx; // index in data
//     this.leftBaseIdx = leftBaseIdx;
//     this.rightBaseIdx = rightBaseIdx;

//     // Calculate additional properties
//     this.time = peakCoords.x;
//     this.amplitude = Math.max(
//       prominences.leftProminence,
//       prominences.rightProminence
//     );
//     this.width = rightBaseIdx - leftBaseIdx; // Width in samples

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
//  * Simple k-means clustering for 1D data with k=2.
//  * @param {number[]} data - Array of numbers to cluster
//  * @param {number} k - Number of clusters (fixed to 2)
//  * @returns {Object} {centroids: [number, number], assignments: number[]}
//  */
// function kMeans(data, k = 2) {
//   if (!Array.isArray(data) || data.length < 2) {
//     return { centroids: [0, 0], assignments: data.map(() => 0) };
//   }
//   // Initialize centroids: min and max
//   let centroids = [Math.min(...data), Math.max(...data)];
//   let assignments = new Array(data.length).fill(0);
//   let changed = true;
//   let maxIterations = 500; // Prevent infinite loop
//   let iteration = 0;

//   while (changed && iteration < maxIterations) {
//     changed = false;
//     iteration++;

//     // Assign points to nearest centroid
//     for (let i = 0; i < data.length; i++) {
//       let dist0 = Math.abs(data[i] - centroids[0]);
//       let dist1 = Math.abs(data[i] - centroids[1]);
//       let newAssignment = dist0 < dist1 ? 0 : 1;
//       if (newAssignment !== assignments[i]) {
//         assignments[i] = newAssignment;
//         changed = true;
//       }
//     }

//     // Update centroids
//     let sum0 = 0,
//       count0 = 0,
//       sum1 = 0,
//       count1 = 0;
//     for (let i = 0; i < data.length; i++) {
//       if (assignments[i] === 0) {
//         sum0 += data[i];
//         count0++;
//       } else {
//         sum1 += data[i];
//         count1++;
//       }
//     }
//     centroids[0] = count0 > 0 ? sum0 / count0 : centroids[0];
//     centroids[1] = count1 > 0 ? sum1 / count1 : centroids[1];
//   }

//   return { centroids, assignments };
// }

// /**
//  * Find left and right bases for a peak using horizontal line extension method (inspired by SciPy peak_prominences).
//  * Extends horizontal lines from the peak until they intersect the signal again, then finds bases in those regions.
//  *
//  * Parameters are passed down from detectSpikes() for consistent configuration.
//  *
//  * @param {{x: number, y: number}[]} data - The signal data
//  * @param {number} peakIdx - Index of the peak
//  * @param {number} searchRange - Maximum range to search for bases
//  * @param {number} baselineThreshold - Maximum y-value allowed for valid base points
//  * @returns {Object} {leftBaseIdx: number, rightBaseIdx: number}
//  */
// function findBases(data, peakIdx, searchRange, baselineThreshold) {
//   const peakY = data[peakIdx].y;
//   let leftBaseIdx = peakIdx;
//   let rightBaseIdx = peakIdx;

//   // === LEFT BASE FINDING ===
//   // Extend horizontal line from peak to the left until it intersects signal
//   let leftIntersectionIdx = peakIdx;
//   for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
//     if (data[j].y >= peakY) {
//       // Found intersection with signal (higher peak or plateau)
//       leftIntersectionIdx = j;
//       break;
//     }
//     leftIntersectionIdx = j;
//   }

//   // Within the intersection region, find the lowest point (respecting threshold)
//   for (let j = peakIdx - 1; j >= leftIntersectionIdx; j--) {
//     if (data[j].y <= baselineThreshold && data[j].y < data[leftBaseIdx].y) {
//       leftBaseIdx = j;
//     }
//   }

//   // === RIGHT BASE FINDING ===
//   // Extend horizontal line from peak to the right until it intersects signal
//   let rightIntersectionIdx = peakIdx;
//   for (
//     let j = peakIdx + 1;
//     j <= Math.min(data.length - 1, peakIdx + searchRange);
//     j++
//   ) {
//     if (data[j].y >= peakY) {
//       // Found intersection with signal (higher peak or plateau)
//       rightIntersectionIdx = j;
//       break;
//     }
//     rightIntersectionIdx = j;
//   }

//   // Within the intersection region, find the lowest point (respecting threshold)
//   for (let j = peakIdx + 1; j <= rightIntersectionIdx; j++) {
//     if (data[j].y <= baselineThreshold && data[j].y < data[rightBaseIdx].y) {
//       rightBaseIdx = j;
//     }
//   }

//   return { leftBaseIdx, rightBaseIdx };
// }

// /**
//  * Filter true spikes using k-means clustering on prominence.
//  *
//  * Parameters are passed down from detectSpikes() for consistent configuration.
//  *
//  * @param {NeuralPeak[]} peaks - Detected peaks
//  * @param {number} minWidth - Minimum width in samples to consider a true spike
//  * @param {number} minDistance - Minimum distance in samples between spikes
//  * @param {number} minProminenceRatio - Minimum ratio of min to max prominence for symmetry
//  * @returns {NeuralPeak[]} Filtered true spikes
//  */
// function findTrueSpikes(
//   peaks,
//   minWidth = 5,
//   minDistance = 10,
//   minProminenceRatio = 0.01
// ) {
//   if (!Array.isArray(peaks) || peaks.length < 2) {
//     return peaks.filter((p) => p.width >= minWidth); // Apply width filter even if no clustering
//   }

//   // Extract prominences
//   let prominences = peaks.map((p) =>
//     Math.min(p.prominences.leftProminence, p.prominences.rightProminence)
//   );

//   // Cluster prominences into 2 groups
//   let { centroids, assignments } = kMeans(prominences, 2);

//   // Identify the cluster with higher average prominence (true spikes)
//   let topCluster = centroids[0] > centroids[1] ? 0 : 1;

//   // Filter peaks in the top cluster and with sufficient width
//   let filteredPeaks = peaks.filter(
//     (p, idx) => assignments[idx] === topCluster && p.width >= minWidth
//   );

//   // Apply prominence ratio filter for symmetry
//   if (minProminenceRatio > 0) {
//     filteredPeaks = filteredPeaks.filter((p) => {
//       const left = p.prominences.leftProminence;
//       const right = p.prominences.rightProminence;
//       const ratio = Math.min(left, right) / Math.max(left, right);
//       return ratio >= minProminenceRatio;
//     });
//   }

//   // Apply distance filter: remove peaks too close to others
//   if (minDistance > 0 && filteredPeaks.length > 1) {
//     filteredPeaks.sort((a, b) => a.index - b.index);
//     let result = [filteredPeaks[0]];
//     for (let i = 1; i < filteredPeaks.length; i++) {
//       if (
//         filteredPeaks[i].index - result[result.length - 1].index >=
//         minDistance
//       ) {
//         result.push(filteredPeaks[i]);
//       }
//     }
//     filteredPeaks = result;
//   }

//   return filteredPeaks;
// }

// /**
//  * Detect spikes (peaks) in a 1D signal array, robust to plateaus and noise.
//  * Emulates logic from Cardiac PeakFinder.js with global baseline threshold for accurate base detection.
//  *
//  * All parameters are defined at the top of the function and passed down to helper functions
//  * for better organization and maintainability.
//  *
//  * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
//  * @param {Object} [options] - Configuration object
//  * @param {number} [options.prominence] - Minimum prominence (height above neighbors)
//  * @param {number} [options.window] - Optional window width for grouping peaks (samples)
//  * @param {number} [options.minWidth] - Minimum width in samples for true spikes
//  * @param {number} [options.minDistance] - Minimum distance in samples between spikes
//  * @param {number} [options.minProminenceRatio] - Minimum ratio of min to max prominence for symmetry
//  * @returns {NeuralPeak[]}
//  */
// export function detectSpikes(data, options = {}) {
//   // --- Old logic (commented out) ---
//   // ...existing code...

//   // --- New cardiac-style logic ---
//   if (!Array.isArray(data) || data.length === 0) return [];
//   // Require array of {x, y}
//   if (
//     typeof data[0] !== "object" ||
//     data[0] === null ||
//     !("x" in data[0]) ||
//     !("y" in data[0])
//   ) {
//     throw new Error("detectSpikes expects array of {x, y} objects");
//   }
//   // === PARAMETER DEFINITIONS (All parameters defined at the top) ===

//   // Extracted options
//   const prominence = options.prominence ?? 0;
//   // const wlen = options.window ?? null;
//   const wlen = null;
//   const minWidth = options.minWidth ?? 0;
//   const minDistance = options.minDistance ?? 0;
//   const minProminenceRatio = options.minProminenceRatio ?? 0;

//   // Calculated global statistics for baseline threshold
//   const allYValues = data.map((d) => d.y);
//   const globalMin = Math.min(...allYValues);
//   const globalMax = Math.max(...allYValues);
//   const signalRange = globalMax - globalMin;

//   // Baseline threshold calculations
//   const sortedY = [...allYValues].sort((a, b) => a - b);
//   const percentileIndex = Math.floor(sortedY.length * 0.02); // 2nd percentile
//   const baselineThreshold = sortedY[Math.max(0, percentileIndex)];
//   const alternativeThreshold = globalMin + signalRange * 0.05; // 5% of range
//   const finalBaselineThreshold = Math.min(
//     baselineThreshold,
//     alternativeThreshold
//   );
//   const fallbackThreshold = globalMin + signalRange * 0.02; // 2% of range

//   // === MAIN DETECTION LOGIC ===

//   let peakIndices = [];

//   // Identify local maxima, including plateaus (from findPeaksMedian)
//   for (let i = 1; i < data.length - 1; i++) {
//     if (data[i].y > data[i - 1].y && data[i].y >= data[i + 1].y) {
//       // Strict peak
//       peakIndices.push(i);
//     } else if (data[i].y === data[i + 1].y && data[i].y > data[i - 1].y) {
//       // Start of a plateau
//       let plateauStart = i;
//       let plateauEnd = i;
//       // Find the end of the plateau
//       while (
//         plateauEnd + 1 < data.length &&
//         data[plateauEnd].y === data[plateauEnd + 1].y
//       ) {
//         plateauEnd++;
//       }
//       // Check if the plateau is a peak
//       if (data[plateauStart].y > data[plateauEnd + 1]?.y) {
//         // Add the middle point of the plateau as the peak
//         const plateauPeak = Math.floor((plateauStart + plateauEnd) / 2);
//         peakIndices.push(plateauPeak);
//       }
//       // Skip the rest of the plateau
//       i = plateauEnd;
//     }
//   }

//   // Calculate prominence for each peak and filter based on prominence threshold
//   let filteredPeakIndices = [];
//   for (let peakIdx of peakIndices) {
//     let searchRange = wlen ? Math.floor(wlen / 2) : data.length;

//     // Find bases using threshold-constrained approach
//     let { leftBaseIdx, rightBaseIdx } = findBases(
//       data,
//       peakIdx,
//       searchRange,
//       finalBaselineThreshold
//     );

//     // Fallback: if no valid bases found, try with fallback threshold
//     if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
//       ({ leftBaseIdx, rightBaseIdx } = findBases(
//         data,
//         peakIdx,
//         searchRange,
//         fallbackThreshold
//       ));
//     }

//     // Final fallback: if still no valid bases, use original method
//     if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
//       ({ leftBaseIdx, rightBaseIdx } = findBases(
//         data,
//         peakIdx,
//         searchRange,
//         globalMax
//       )); // Remove threshold constraint
//     }

//     let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
//     let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
//     let prominenceValue = Math.min(leftProminence, rightProminence);

//     if (prominenceValue >= prominence) {
//       filteredPeakIndices.push(peakIdx);
//     }
//   }

//   // Group peaks within the same window width and keep the peak with the highest y value
//   let finalFilteredPeakIndices = [];
//   if (wlen && filteredPeakIndices.length > 1) {
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
//         (maxIdx, idx) => (data[idx].y > data[maxIdx].y ? idx : maxIdx),
//         group[0]
//       );
//       finalFilteredPeakIndices.push(highestPeakIdx);

//       // Move to the next group
//       i += group.length;
//     }
//   } else {
//     finalFilteredPeakIndices = filteredPeakIndices;
//   }

//   // Create NeuralPeak instances for the final filtered peaks
//   let peaks = [];
//   for (let peakIdx of finalFilteredPeakIndices) {
//     let searchRange = wlen ? Math.floor(wlen / 2) : data.length;

//     // Find bases using threshold-constrained approach
//     let { leftBaseIdx, rightBaseIdx } = findBases(
//       data,
//       peakIdx,
//       searchRange,
//       finalBaselineThreshold
//     );

//     // Fallback: if no valid bases found, try with fallback threshold
//     if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
//       ({ leftBaseIdx, rightBaseIdx } = findBases(
//         data,
//         peakIdx,
//         searchRange,
//         fallbackThreshold
//       ));
//     }

//     // Final fallback: if still no valid bases, use original method
//     if (leftBaseIdx === peakIdx || rightBaseIdx === peakIdx) {
//       ({ leftBaseIdx, rightBaseIdx } = findBases(
//         data,
//         peakIdx,
//         searchRange,
//         globalMax
//       )); // Remove threshold constraint
//     }

//     let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
//     let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
//     let prominences = {
//       leftProminence: leftProminence,
//       rightProminence: rightProminence,
//     };

//     let leftBaseCoords = data[leftBaseIdx];
//     let peakCoords = data[peakIdx];
//     let rightBaseCoords = data[rightBaseIdx];

//     peaks.push(
//       new NeuralPeak(
//         peakCoords,
//         leftBaseCoords,
//         rightBaseCoords,
//         prominences,
//         data,
//         peakIdx,
//         leftBaseIdx,
//         rightBaseIdx
//       )
//     );
//   }

//   return findTrueSpikes(peaks, minWidth, minDistance, minProminenceRatio);
// }

// /**
//  * Detect spikes and bursts in a 1D signal array, robust to plateaus and noise.
//  * Emulates logic from Cardiac PeakFinder.js with global baseline threshold for accurate base detection.
//  *
//  * All parameters are defined at the top of the function and passed down to helper functions
//  * for better organization and maintainability.
//  *
//  * @param {{x: number, y: number}[]} data - Array of {x, y} objects (signal data)
//  * @param {Object} [options] - Configuration object
//  * @param {number} [options.prominence] - Minimum prominence (height above neighbors)
//  * @param {number} [options.window] - Optional window width for grouping peaks (samples)
//  * @param {number} [options.minWidth] - Minimum width in samples for true spikes
//  * @param {number} [options.minDistance] - Minimum distance in samples between spikes
//  * @param {number} [options.minProminenceRatio] - Minimum ratio of min to max prominence for symmetry
//  * @param {number} [options.maxInterSpikeInterval] - Maximum time between spikes for burst detection
//  * @param {number} [options.minSpikesPerBurst] - Minimum spikes per burst
//  * @returns {Object} {peaks: NeuralPeak[], bursts: NeuralBurst[]}
//  */
// export function detectSpikesAndBursts(data, options = {}) {
//   const spikeResults = detectSpikes(data, options);
//   const burstResults = detectBursts(spikeResults, options);
//   return { peaks: spikeResults, bursts: burstResults };
// }
// --- Cardiac-style neural spike detection pipeline ---

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
  if (!Array.isArray(data) || data.length < 2) {
    return { centroids: [0, 0], assignments: data.map(() => 0) };
  }
  // Initialize centroids: min and max
  let centroids = [Math.min(...data), Math.max(...data)];
  let assignments = new Array(data.length).fill(0);
  let changed = true;
  let maxIterations = 500; // Prevent infinite loop
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
  stdMultiplier = 3 // New: tunable multiplier
) {
  if (!Array.isArray(peaks) || peaks.length < 2) {
    return peaks.filter((p) => p.width >= minWidth);
  }

  // Extract prominences
  let prominences = peaks.map((p) =>
    Math.min(p.prominences.leftProminence, p.prominences.rightProminence)
  );

  // Cluster prominences into 2 groups
  let { centroids, assignments } = kMeans(prominences, 2);

  // Identify the cluster with higher average prominence
  let topCluster = centroids[0] > centroids[1] ? 0 : 1;
  let higherCentroid = Math.max(...centroids);

  // Log for debugging
  console.log(
    `[findTrueSpikes] Higher centroid: ${higherCentroid}, threshold: ${
      stdMultiplier * robustStd
    }`
  );

  // If higher centroid isn't sufficiently above noise level, discard all
  if (higherCentroid < stdMultiplier * robustStd) {
    console.log(
      "[findTrueSpikes] Discarding all peaks (below noise threshold)"
    );
    return [];
  }

  // Filter peaks in the top cluster and with sufficient width
  let filteredPeaks = peaks.filter(
    (p, idx) => assignments[idx] === topCluster && p.width >= minWidth
  );

  // Apply prominence ratio filter for symmetry
  if (minProminenceRatio > 0) {
    filteredPeaks = filteredPeaks.filter((p) => {
      const left = p.prominences.leftProminence;
      const right = p.prominences.rightProminence;
      const ratio = Math.min(left, right) / Math.max(left, right);
      return ratio >= minProminenceRatio;
    });
  }

  // Apply distance filter: remove peaks too close to others
  if (minDistance > 0 && filteredPeaks.length > 1) {
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
  }

  return filteredPeaks;
}

export function detectSpikes(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) return [];
  if (
    typeof data[0] !== "object" ||
    data[0] === null ||
    !("x" in data[0]) ||
    !("y" in data[0])
  ) {
    throw new Error("detectSpikes expects array of {x, y} objects");
  }

  // Extracted options with adjusted defaults
  let prominence = options.prominence ?? 0;
  const wlen = options.window ?? null; // Disable grouping by default
  const minWidth = options.minWidth ?? 5;
  const minDistance = options.minDistance ?? 10;
  const minProminenceRatio = options.minProminenceRatio ?? 0.01;
  const stdMultiplier = options.stdMultiplier ?? 3; // New: tunable

  // Calculated global statistics
  const allYValues = data.map((d) => d.y);
  const n = allYValues.length;
  const globalMin = Math.min(...allYValues);
  const globalMax = Math.max(...allYValues);
  const signalRange = globalMax - globalMin;

  // New: Compute robust std (MAD) for noise estimate
  const medianY = allYValues.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  const absDevs = allYValues.map((y) => Math.abs(y - medianY));
  const medianAbsDev = absDevs.slice().sort((a, b) => a - b)[Math.floor(n / 2)];
  const robustStd = medianAbsDev / 0.6745; // Normalize to std equiv
  console.log("[detectSpikes] Robust std:", robustStd);

  // Auto-set prominence if 'auto'
  if (prominence === "auto") {
    prominence = 2 * robustStd;
    console.log("[detectSpikes] Auto-set prominence:", prominence);
  }

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

  // === MAIN DETECTION LOGIC === (unchanged from previous)

  let peakIndices = [];

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

  let filteredPeakIndices = [];
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

  let finalFilteredPeakIndices = [];
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

  let peaks = [];
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

  return findTrueSpikes(
    peaks,
    minWidth,
    minDistance,
    minProminenceRatio,
    robustStd,
    stdMultiplier
  );
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
