/**
 * Interpolates the x-value for a given y-value between two points.
 * @param {Object} point1 - The first point {x, y}.
 * @param {Object} point2 - The second point {x, y}.
 * @param {number} targetY - The y-value to interpolate for.
 * @returns {number} - The interpolated x-value.
 */
const interpolateX = (point1, point2, targetY) => {
  const slope = (point2.y - point1.y) / (point2.x - point1.x);
  return point1.x + (targetY - point1.y) / slope;
};

/**
 * Calculates the Action Potential Duration (APD) values (e.g., ADP10, ADP50, ADP90)
 * for a given set of data and returns the coordinates of the start and end points.
 * @param {Array} signal - Array of {x, y} objects representing the signal.
 * @param {Object} baseline - The baseline point {x, y}.
 * @param {Object} peak - The peak point {x, y}.
 * @param {Array<number>} percentages - Array of percentages (e.g., [10, 50, 90]) for which to calculate APD.
 * @returns {Object} - An object containing the calculated APD values and their coordinates.
 * Example: { ADP10: { value: 120, start: {x, y}, end: {x, y} }, ... }
 */
// export const calculateAPDValues = (
//   signal,
//   baseline,
//   peak,
//   percentages = [10, 50, 90]
// ) => {
//   const apdResults = {};

//   // Calculate the threshold y-values for each percentage
//   const thresholds = percentages.map((percent) => ({
//     percent,
//     // threshold: baseline.y + (percent / 100) * (peak.y - baseline.y),
//     threshold: peak.y - (percent / 100) * (peak.y - baseline.y),
//   }));

//   // Iterate over each threshold to calculate the corresponding APD
//   thresholds.forEach(({ percent, threshold }) => {
//     let startPoint = null;
//     let endPoint = null;

//     for (let i = 0; i < signal.length - 1; i++) {
//       const currentPoint = signal[i];
//       const nextPoint = signal[i + 1];

//       // Check if the threshold is crossed between the current and next points
//       if (
//         currentPoint.y <= threshold &&
//         nextPoint.y >= threshold &&
//         startPoint === null
//       ) {
//         // Interpolate the start point
//         const interpolatedX = interpolateX(currentPoint, nextPoint, threshold);
//         startPoint = { x: interpolatedX, y: threshold };
//       }

//       if (
//         currentPoint.y >= threshold &&
//         nextPoint.y <= threshold &&
//         startPoint !== null
//       ) {
//         // Interpolate the end point
//         const interpolatedX = interpolateX(currentPoint, nextPoint, threshold);
//         endPoint = { x: interpolatedX, y: threshold };
//         break;
//       }
//     }

//     if (startPoint !== null && endPoint !== null) {
//       apdResults[`APD${percent}`] = {
//         // value: endPoint.x - startPoint.x, // Calculate the duration
//         value: startPoint.x - endPoint.x, // Calculate the duration
//         start: startPoint,
//         end: endPoint,
//       };
//     } else {
//       apdResults[`APD${percent}`] = {
//         value: null, // Handle cases where the threshold is not crossed
//         start: null,
//         end: null,
//       };
//     }
//   });

//   return apdResults;
// };
export const calculateAPDValues = (
  signal,
  baseline,
  peak,
  percentages = [10, 50, 90]
) => {
  const apdResults = {};

  // Calculate the y midpoint between the baseline and peak
  const midpointY = (baseline.y + peak.y) / 2;

  // Interpolate the shared x-value for the midpoint y, ensuring it's on the left side of the peak
  const midpointX = (() => {
    for (let i = 0; i < signal.length - 1; i++) {
      const currentPoint = signal[i];
      const nextPoint = signal[i + 1];

      // Ensure we only consider points on the left side of the peak
      if (
        currentPoint.x <= peak.x &&
        nextPoint.x <= peak.x &&
        ((currentPoint.y <= midpointY && nextPoint.y >= midpointY) ||
          (currentPoint.y >= midpointY && nextPoint.y <= midpointY))
      ) {
        return interpolateX(currentPoint, nextPoint, midpointY);
      }
    }
    return null; // Handle cases where interpolation fails
  })();

  if (midpointX === null) {
    throw new Error("Unable to calculate midpoint x-value.");
  }

  // Calculate the threshold y-values for each percentage
  const thresholds = percentages.map((percent) => ({
    percent,
    threshold: peak.y - (percent / 100) * (peak.y - baseline.y),
  }));

  // Iterate over each threshold to calculate the corresponding APD
  thresholds.forEach(({ percent, threshold }) => {
    let startPoint = null;

    for (let i = 0; i < signal.length - 1; i++) {
      const currentPoint = signal[i];
      const nextPoint = signal[i + 1];

      // Check if the threshold is crossed between the current and next points
      if (
        currentPoint.y <= threshold &&
        nextPoint.y >= threshold &&
        startPoint === null
      ) {
        // Interpolate the start point
        const interpolatedX = interpolateX(currentPoint, nextPoint, threshold);
        startPoint = { x: interpolatedX, y: threshold };
        break;
      }
    }

    if (startPoint !== null) {
      apdResults[`APD${percent}`] = {
        value: startPoint.x - midpointX, // Calculate the duration
        start: startPoint,
        end: { x: midpointX, y: threshold }, // Use the shared x-value and the threshold y
      };
    } else {
      apdResults[`APD${percent}`] = {
        value: null, // Handle cases where the threshold is not crossed
        start: null,
        end: null,
      };
    }
  });

  return apdResults;
};
// /**
//  * Utility function to determine the baseline and peak y-values from the signal.
//  * @param {Array} signal - Array of {x, y} objects representing the signal.
//  * @returns {Object} - An object containing the baseline and peak y-values.
//  */
// export const findBaselineAndPeak = (signal) => {
//   const yValues = signal.map((point) => point.y);
//   const baseline = Math.min(...yValues); // Minimum y-value
//   const peak = Math.max(...yValues); // Maximum y-value
//   return { baseline, peak };
// };

/**
 * Utility function to determine the baseline and peak y-values from the signal,
 * along with their corresponding x-values.
 * @param {Array} signal - Array of {x, y} objects representing the signal.
 * @returns {Object} - An object containing the baseline and peak as {x, y} coordinates.
 */
// export const findBaselineAndPeak = (signal) => {
//   if (!signal || signal.length === 0) {
//     return { baseline: null, peak: null };
//   }

//   let baseline = signal[0];
//   let peak = signal[0];

//   signal.forEach((point) => {
//     if (point.y < baseline.y) {
//       baseline = point; // Update baseline to the point with the lowest y-value
//     }
//     if (point.y > peak.y) {
//       peak = point; // Update peak to the point with the highest y-value
//     }
//   });

//   return { baseline, peak };
// };

export const findBaselineAndPeak = (signal) => {
  if (!signal || signal.length === 0) {
    return { baseline: null, peak: null };
  }

  let baseline = null;
  let peak = signal[0];

  // Find the peak (point with the highest y-value)
  signal.forEach((point) => {
    if (point.y > peak.y) {
      peak = point; // Update peak to the point with the highest y-value
    }
  });

  // Find the baseline (point with the lowest y-value before the peak)
  signal.forEach((point) => {
    if (point.x <= peak.x && (baseline === null || point.y < baseline.y)) {
      baseline = point; // Update baseline to the lowest y-value before the peak
    }
  });

  return { baseline, peak };
};
