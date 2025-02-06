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
  const baseY = baseCoords.y;

  // Find the corresponding y value on the line of best fit
  const bestFitPoint = lineOfBestFit.find((point) => point.x === baseX);
  if (!bestFitPoint) {
    console.warn(
      `No corresponding point found on the line of best fit for x=${baseX}`
    );
    return baseCoords; // No adjustment needed if no corresponding point is found
  }

  const bestFitY = bestFitPoint.y;

  if (baseY < bestFitY) {
    // Iterate forward (or backward for right base) until data point y is greater than or equal to the line of best fit y
    let adjustedBase = baseCoords;
    if (isLeftBase) {
      for (
        let i = data.findIndex((point) => point.x === baseX);
        i < data.length;
        i++
      ) {
        if (data[i].y >= bestFitY) {
          adjustedBase = data[i];
          break;
        }
      }
    } else {
      for (let i = data.findIndex((point) => point.x === baseX); i >= 0; i--) {
        if (data[i].y >= bestFitY) {
          adjustedBase = data[i];
          break;
        }
      }
    }
    return adjustedBase;
  }

  return baseCoords; // No adjustment needed if base y is already above the line of best fit
}
