import { quadraticRegression } from "./Regression";

/**
 * Adjusts the position of a base (left or right) based on the line of best fit.
 * @param {Object} baseCoords - The coordinates of the base to adjust.
 * @param {Array} lineOfBestFit - The line of best fit data points.
 * @param {Array} data - The original data array.
 * @param {boolean} isLeftBase - Whether the base is a left base.
 * @returns {Object} - The adjusted base coordinates.
 */
export function adjustBase(baseCoords, lineOfBestFit, data, isLeftBase) {
  const baseX = baseCoords.x;

  // Find the corresponding y value on the line of best fit using quadratic regression
  const regressionCoefficients = quadraticRegression(lineOfBestFit);

  // Function to calculate y value on the line of best fit for a given x
  const calculateBestFitY = (x) => {
    return (
      regressionCoefficients.a * x ** 2 +
      regressionCoefficients.b * x +
      regressionCoefficients.c
    );
  };

  // Iterate through the data points to find the intersection point
  let adjustedBase = baseCoords;
  if (isLeftBase) {
    for (
      let i = data.findIndex((point) => point.x === baseX);
      i < data.length;
      i++
    ) {
      const bestFitY = calculateBestFitY(data[i].x);
      if (data[i].y >= bestFitY) {
        adjustedBase = { x: data[i].x, y: bestFitY };
        break;
      }
    }
  } else {
    for (let i = data.findIndex((point) => point.x === baseX); i >= 0; i--) {
      const bestFitY = calculateBestFitY(data[i].x);
      if (data[i].y >= bestFitY) {
        adjustedBase = { x: data[i].x, y: bestFitY };
        break;
      }
    }
  }

  return adjustedBase;
}
