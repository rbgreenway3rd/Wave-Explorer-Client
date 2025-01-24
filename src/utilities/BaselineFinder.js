import { minimal_find_peaks } from "./PeakFinder";

/**
 * Find the index where the data stops trending downward after a peak.
 * The return-to-baseline point is detected when the trend changes from decreasing to stable or increasing.
 * @param {number[]} xs - The signal data.
 * @param {number[]} peaks - Indices of detected peaks.
 * @param {number} window - Number of points to check for stability.
 * @param {number} tolerance - Allowed fluctuation range for stability.
 * @returns {number[]} Indices where signal stabilizes after peaks.
 */
export function find_return_to_baseline(
  xs,
  peaks,
  window = 3,
  tolerance = 0.1
) {
  let return_indices = [];

  for (let peak of peaks) {
    let return_index = peak; // Start search after the peak
    let found = false;

    for (let i = peak + 1; i < xs.length - window; i++) {
      // Check if the next 'window' values remain stable or increase
      let subset = xs.slice(i, i + window);
      let min_value = Math.min(...subset);
      let max_value = Math.max(...subset);

      if (max_value - min_value <= tolerance) {
        return_index = i;
        found = true;
        break;
      }
    }

    if (!found) {
      return_index = xs.length - 1; // Default to last index if no stable point found
    }

    return_indices.push(return_index);
  }

  return return_indices;
}

// Example Usage
let data = [1, 3, 7, 1, 2, 6, 4, 5, 9, 3, 2, 1, 1, 1, 1, 2, 2];
let peaks = minimal_find_peaks(data, 2, 5); // Find peaks
let return_points = find_return_to_baseline(data, peaks, 3, 0.5);

console.log("Peaks at indices:", peaks);
console.log("Return-to-baseline at indices:", return_points);
