// // Here's a JavaScript function to determine whether a given
// // point (x,y)(x,y) is above or below a quadratic curve
// // defined by f(x)=ax2+bx+cf(x)=ax2+bx+c:
// function isPointAboveQuadraticCurve(a, b, c, x, y) {
//   // Calculate the y-value of the quadratic curve at x
//   let yCurve = a * Math.pow(x, 2) + b * x + c;

//   // Compare the given y with the curve's y-value
//   if (y > yCurve) {
//     return "above";
//   } else if (y < yCurve) {
//     return "below";
//   } else {
//     return "on the curve";
//   }
// }

// // Example usage:
// // console.log(isPointAboveQuadraticCurve(1, -2, 1, 3, 5)); // "above", "below", or "on the curve"

// // find intersection between a quadratic curve defined as: y = ax^2 + bx +c
// // and a line defined as: y = mx + lineB
// function findLineQuadraticIntersections(a, b, c, m, lineB) {
//   // inputs:
//   //  	a,b,c - coeffiencts of quadratic curve (2nd-order polynomial)
//   //		m - slope of line
//   //		lineB - y intercept of line
//   // outputs:
//   //		list of points on line y = mx + lineB that intersect
//   //		the quadratic curve defined by y = ax^2 + bx + c

//   // Compute quadratic coefficients
//   let A = a;
//   let B = b - m;
//   let C = c - lineB;

//   // Compute the discriminant
//   let discriminant = B * B - 4 * A * C;

//   // No intersection if discriminant is negative
//   if (discriminant < 0) {
//     return [];
//   }

//   // Compute intersection points
//   let sqrtDiscriminant = Math.sqrt(discriminant);
//   let x1 = (-B + sqrtDiscriminant) / (2 * A);
//   let x2 = (-B - sqrtDiscriminant) / (2 * A);

//   // Compute corresponding y values
//   let y1 = m * x1 + lineB;
//   let y2 = m * x2 + lineB;

//   // If only one solution, return a single intersection point
//   if (discriminant === 0) {
//     return [{ x: x1, y: y1 }];
//   }

//   // Return both intersection points
//   return [
//     { x: x1, y: y1 },
//     { x: x2, y: y2 },
//   ];
// }

// // given:
// //   series of points [(x1,y1), (x2,y2), ...., (xn,yn)], with the first point
// //   having the minimum y value in the series and the last point having the
// //   maximum y value in the series.  The function should calculate the
// //   deltaY = (maximum y) - (minimum y) = yn - y1.
// //   Then function should generate a new series of nine points (to be output of this function)
// //   whose y values are
// //      y1 + 0.1*deltaY, y1 + 0.2*deltaY, y1 + 0.3*deltaY,
// //      y1 + 0.4*deltaY, y1 + 0.5*deltaY, y1 + 0.6*deltaY, y1 + 0.7*deltaY,
// //      y1 + 0.8*deltaY,  and y1 + 0.9*deltaY.
// //   The x value for each of the nine previous y values, find the corresponding x values
// //   using the following procedure:
// //	1 - find the pair of adjacent points in the original series of points,
// //	where the given y value falls between.  Linearly interpolate, on a line between
// //	these two points, to find the x value on that line that corresponds to the given y value.
// //	2 - create a point from the given y value and the calculated x value from step 1.
// //	3 - update the appropriate point in the output series.
// //	4 - repeat steps 1-3 for each of the nine output points.
// //   The function should return the nine-point series
// function generateInterpolatedPoints(points) {
//   if (points.length < 2) {
//     // throw new Error("At least two points are required.");
//     console.error("At least two points are required.");
//   }

//   // Extract minimum and maximum y values
//   let yMin = points[0].y;
//   let yMax = points[points.length - 2].y;
//   let deltaY = yMax - yMin;

//   // Generate the nine target y-values
//   let targetYValues = Array.from(
//     { length: 9 },
//     (_, i) => yMin + (i + 1) * 0.1 * deltaY
//   );

//   let outputPoints = targetYValues.map((targetY) => {
//     // Find two adjacent points that bound the target y-value
//     for (let i = 0; i < points.length - 1; i++) {
//       let p1 = points[i];
//       let p2 = points[i + 1];

//       if (
//         (p1.y <= targetY && p2.y >= targetY) ||
//         (p1.y >= targetY && p2.y <= targetY)
//       ) {
//         // Linearly interpolate x using the equation of a line: x = x1 + (y - y1) * ((x2 - x1) / (y2 - y1))
//         let xInterpolated =
//           p1.x + (targetY - p1.y) * ((p2.x - p1.x) / (p2.y - p1.y));

//         return { x: xInterpolated, y: targetY };
//       }
//     }
//     return null; // This should never happen if y-values are continuous
//   });

//   return outputPoints;
// }

// // Example usage:
// let inputPoints = [
//   { x: 1, y: 2 }, // Min y
//   { x: 3, y: 5 },
//   { x: 5, y: 8 },
//   { x: 7, y: 12 },
//   { x: 9, y: 15 }, // Max y
// ];

// // console.log(generateInterpolatedPoints(inputPoints));

// function findAscentAPDPoints(points, peak_index, a, b, c) {
//   // inputs:
//   //	points - complete cardiac data array of points
//   //	peak_index - index into points of the peak to be analyzed
//   //	a,b,c - coefficients of the 2nd-order polynomial (regressed baseline curve)
//   // output:
//   //	series of 9 points defining the ascent side of the peak, starting with
//   //	10% rise point and ending with 90% rise point.

//   if (peak_index <= 0 || peak_index >= points.length) {
//     // throw new Error("Invalid peak_index value.");
//     console.error("Invalid peak_index value.");
//   }

//   // Step 1: Find index_base (first point below the quadratic curve)
//   let index_base = peak_index;
//   while (index_base > 0) {
//     let { x, y } = points[index_base];
//     if (isPointAboveQuadraticCurve(a, b, c, x, y) === "below") {
//       break;
//     }
//     index_base--;
//   }

//   // Step 2: Find intersection point between line (index_base, index_base+1) and the quadratic curve
//   let linePoint1 = points[index_base];
//   let linePoint2 = points[index_base + 1];

//   let intersections = findLineQuadraticIntersections(
//     a,
//     b,
//     c,
//     (linePoint2.y - linePoint1.y) / (linePoint2.x - linePoint1.x), // slope (m)
//     linePoint1.y -
//       ((linePoint2.y - linePoint1.y) / (linePoint2.x - linePoint1.x)) *
//         linePoint1.x // y-intercept (b)
//   );

//   // Choose the intersection point that is between linePoint1.x and linePoint2.x
//   let start_point = intersections.find(
//     (p) =>
//       p.x >= Math.min(linePoint1.x, linePoint2.x) &&
//       p.x <= Math.max(linePoint1.x, linePoint2.x)
//   );

//   if (!start_point) {
//     // throw new Error("No valid intersection found.");
//     console.error("No valid intersection found.");
//   }

//   // Step 3: Create new point series
//   let newSeries = [
//     start_point,
//     ...points.slice(index_base + 1, peak_index + 1),
//   ];

//   // Step 4: Generate interpolated points
//   return generateInterpolatedPoints(newSeries);
// }

// function findDescentAPDPoints(points, peak_index, a, b, c) {
//   // inputs:
//   //	points - complete cardiac data array of points
//   //	peak_index - index into points of the peak to be analyzed
//   //	a,b,c - coefficients of the 2nd-order polynomial (regressed baseline curve)
//   // output:
//   //	series of 9 points defining the descent side of the peak, starting with
//   //	10% descent point and ending with 90% descent point.
//   if (peak_index < 0 || peak_index >= points.length - 1) {
//     // throw new Error("Invalid peak_index value.");
//     console.error("Invalid peak_index value.");
//   }

//   // Step 1: Find index_base (first point below the quadratic curve while moving forward)
//   let index_base = peak_index;
//   while (index_base < points.length - 1) {
//     let { x, y } = points[index_base];
//     if (isPointAboveQuadraticCurve(a, b, c, x, y) === "below") {
//       break;
//     }
//     index_base++;
//   }

//   // Step 2: Find intersection point between line (index_base, index_base-1) and the quadratic curve
//   let linePoint1 = points[index_base];
//   let linePoint2 = points[index_base - 1];

//   let intersections = findLineQuadraticIntersections(
//     a,
//     b,
//     c,
//     (linePoint2.y - linePoint1.y) / (linePoint2.x - linePoint1.x), // slope (m)
//     linePoint1.y -
//       ((linePoint2.y - linePoint1.y) / (linePoint2.x - linePoint1.x)) *
//         linePoint1.x // y-intercept (b)
//   );

//   // Choose the intersection point that is between linePoint1.x and linePoint2.x
//   let end_point = intersections.find(
//     (p) =>
//       p.x >= Math.min(linePoint1.x, linePoint2.x) &&
//       p.x <= Math.max(linePoint1.x, linePoint2.x)
//   );

//   if (!end_point) {
//     // throw new Error("No valid intersection found.");
//     console.error("No valid intersection found.");
//   }

//   // Step 3: Create new point series
//   let newSeries = [...points.slice(peak_index, index_base), end_point];

//   // Step 4: Generate interpolated points
//   return generateInterpolatedPoints(newSeries);
// }

// // Example usage:
// let samplePoints = [
//   { x: 1, y: 2 },
//   { x: 2, y: 5 },
//   { x: 3, y: 9 },
//   { x: 4, y: 14 },
//   { x: 5, y: 20 },
//   { x: 6, y: 27 },
//   { x: 7, y: 33 },
//   { x: 8, y: 38 },
// ];

// // console.log(findDescentAPDPoints(samplePoints, 3, 0.5, -2, 1));

// export function calculatePeakAPDs(points, peak_index, a, b, c) {
//   // inputs:
//   //	points - complete cardiac data array of points
//   //	peak_index - index into points of the peak to be analyzed
//   //	a,b,c - coefficients of the 2nd-order polynomial (regressed baseline curve)
//   // outputs:
//   //	outputArray - array of nine APD values, starting with 10% APD and ending with 90% APD
//   //	ascentPoints - array of the points on the ascent side of peak used for APD calculation
//   //	descentPoints - array of the points on the descent side of peak used for APD calculation

//   // Step 1: Calculate ascent points
//   let ascent = findAscentAPDPoints(points, peak_index, a, b, c);

//   // Step 2: Calculate descent points
//   let descent = findDescentAPDPoints(points, peak_index, a, b, c);

//   // Ensure both ascent and descent arrays contain exactly 9 points
//   if (ascent.length !== 9 || descent.length !== 9) {
//     // throw new Error(
//     //   "Ascent and descent point arrays must each contain exactly 9 points."
//     // );
//     console.error(
//       "Ascent and descent point arrays must each contain exactly 9 points."
//     );
//   }

//   // Step 3: Compute the output array by subtracting corresponding x-values
//   let outputArray = [];
//   for (let i = 0; i < 9; i++) {
//     outputArray.push(descent[i].x - ascent[8 - i].x);
//   }

//   // Step 4: Return the output array along with ascent and descent arrays
//   return {
//     apdValues: outputArray,
//     ascentPoints: ascent,
//     descentPoints: descent,
//   };
// }

// // // Example usage:
// // let samplePoints = [
// //   { x: 1, y: 2 },
// //   { x: 2, y: 5 },
// //   { x: 3, y: 9 },
// //   { x: 4, y: 14 },
// //   { x: 5, y: 20 },
// //   { x: 6, y: 27 },
// //   { x: 7, y: 33 },
// //   { x: 8, y: 38 },
// // ];

// // console.log(calculatePeakAPDs(samplePoints, 3, 0.5, -2, 1));

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
export const calculateAPDValues = (
  signal,
  baseline,
  peak,
  percentages = [10, 50, 90]
) => {
  const apdResults = {};

  // Calculate the threshold y-values for each percentage
  const thresholds = percentages.map((percent) => ({
    percent,
    // threshold: baseline.y + (percent / 100) * (peak.y - baseline.y),
    threshold: peak.y - (percent / 100) * (peak.y - baseline.y),
  }));

  // Iterate over each threshold to calculate the corresponding APD
  thresholds.forEach(({ percent, threshold }) => {
    let startPoint = null;
    let endPoint = null;

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
      }

      if (
        currentPoint.y >= threshold &&
        nextPoint.y <= threshold &&
        startPoint !== null
      ) {
        // Interpolate the end point
        const interpolatedX = interpolateX(currentPoint, nextPoint, threshold);
        endPoint = { x: interpolatedX, y: threshold };
        break;
      }
    }

    if (startPoint !== null && endPoint !== null) {
      apdResults[`APD${percent}`] = {
        // value: endPoint.x - startPoint.x, // Calculate the duration
        value: startPoint.x - endPoint.x, // Calculate the duration
        start: startPoint,
        end: endPoint,
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
