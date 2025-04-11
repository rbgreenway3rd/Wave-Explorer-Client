/**
 * Interpolates points between the left base and the peak of each peak entry.
 * Takes into account all existing points between the left base and the peak.
 * @param {Array} peakResults - Array of peak objects, each containing `leftBaseCoords`, `peakCoords`, and `data`.
 * @returns {Array} - Array of interpolated points for all peaks.
 */
export function interpolatePoints(peakResults) {
  if (!Array.isArray(peakResults) || peakResults.length === 0) {
    throw new Error("peakResults must be a non-empty array.");
  }
  //   console.log("peakResults:", peakResults); // Log the input

  const interpolatedPoints = [];

  peakResults.forEach((peak) => {
    const { leftBaseCoords, peakCoords, data } = peak;

    if (!leftBaseCoords || !peakCoords || !Array.isArray(data)) {
      throw new Error(
        "Each peak must have `leftBaseCoords`, `peakCoords`, and `data`."
      );
    }

    const { x: x1, y: y1 } = leftBaseCoords;
    const { x: x2, y: y2 } = peakCoords;

    // Ensure the left base is actually to the left of the peak
    if (x1 >= x2) {
      throw new Error(
        "Left base x-coordinate must be less than peak x-coordinate."
      );
    }

    // Find all points between the left base and the peak
    const pointsBetween = data.filter(
      (point) => point.x >= x1 && point.x <= x2
    );

    // Ensure the left base is included as the starting point
    pointsBetween.unshift(leftBaseCoords);

    // Ensure the peak is included as the ending point
    pointsBetween.push(peakCoords);

    // Interpolate 9 points at 10%, 20%, ..., 90% of the distance from left base to peak
    for (let percentage = 10; percentage <= 90; percentage += 10) {
      const targetX = x1 + (percentage / 100) * (x2 - x1);

      // Find the segment of the line that contains the targetX
      for (let i = 0; i < pointsBetween.length - 1; i++) {
        const { x: xStart, y: yStart } = pointsBetween[i];
        const { x: xEnd, y: yEnd } = pointsBetween[i + 1];

        if (targetX >= xStart && targetX <= xEnd) {
          // Interpolate within this segment
          const t = (targetX - xStart) / (xEnd - xStart);
          const interpolatedY = yStart + t * (yEnd - yStart);

          interpolatedPoints.push({ x: targetX, y: interpolatedY });
          break;
        }
      }
    }
  });

  //   console.log(interpolatedPoints);
  return interpolatedPoints;
}
