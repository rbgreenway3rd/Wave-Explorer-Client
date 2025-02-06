// export class Peak {
//   constructor(
//     peakCoords,
//     leftBaseCoords,
//     rightBaseCoords,
//     prominences,
//     data,
//     useAdjustedBases = false,
//     adjustedLeftBaseCoords = null,
//     adjustedRightBaseCoords = null
//   ) {
//     this.peakCoords = peakCoords;
//     this.leftBaseCoords = leftBaseCoords;
//     this.rightBaseCoords = rightBaseCoords;
//     this.prominences = prominences;
//     this.data = data;
//     this.useAdjustedBases = useAdjustedBases;
//     this.adjustedLeftBaseCoords = adjustedLeftBaseCoords;
//     this.adjustedRightBaseCoords = adjustedRightBaseCoords;
//     this.ascentAnalysis = this.analyzeAscent();
//     this.descentAnalysis = this.analyzeDescent();
//   }

//   analyzeAscent() {
//     const ascentPoints = [];
//     const baseCoords =
//       this.useAdjustedBases && this.adjustedLeftBaseCoords
//         ? this.adjustedLeftBaseCoords
//         : this.leftBaseCoords;
//     const yDistance = this.peakCoords.y - baseCoords.y;

//     for (let i = 1; i <= 9; i++) {
//       const percentage = i / 10;
//       const yValue = baseCoords.y + percentage * yDistance;
//       const xValue = this.getXValueAtY(yValue, baseCoords.x, this.peakCoords.x);
//       ascentPoints.push({ x: xValue, y: yValue });
//     }

//     return ascentPoints;
//   }

//   analyzeDescent() {
//     const descentPoints = [];
//     const baseCoords =
//       this.useAdjustedBases && this.adjustedRightBaseCoords
//         ? this.adjustedRightBaseCoords
//         : this.rightBaseCoords;
//     const yDistance = this.peakCoords.y - baseCoords.y;

//     for (let i = 1; i <= 9; i++) {
//       const percentage = i / 10;
//       const yValue = this.peakCoords.y - percentage * yDistance;
//       const xValue = this.getXValueAtY(yValue, this.peakCoords.x, baseCoords.x);
//       descentPoints.push({ x: xValue, y: yValue });
//     }

//     return descentPoints;
//   }

//   getXValueAtY(yValue, xStart, xEnd) {
//     // Find the closest data points with the same y value within the range [xStart, xEnd]
//     const pointsInRange = this.data.filter(
//       (point) => point.x >= xStart && point.x <= xEnd
//     );
//     if (pointsInRange.length === 0) {
//       return null; // No points in range
//     }

//     let closestPoint = pointsInRange.reduce((prev, curr) => {
//       return Math.abs(curr.y - yValue) < Math.abs(prev.y - yValue)
//         ? curr
//         : prev;
//     });

//     // If the exact y value is found, return the corresponding x value
//     if (closestPoint.y === yValue) {
//       return closestPoint.x;
//     }

//     // Find the two closest points for interpolation
//     let lowerPoint = null;
//     let upperPoint = null;
//     for (let point of pointsInRange) {
//       if (point.y <= yValue && (!lowerPoint || point.y > lowerPoint.y)) {
//         lowerPoint = point;
//       }
//       if (point.y >= yValue && (!upperPoint || point.y < upperPoint.y)) {
//         upperPoint = point;
//       }
//     }

//     // If we have both lower and upper points, interpolate to estimate the x value
//     if (lowerPoint && upperPoint && lowerPoint !== upperPoint) {
//       const xDiff = upperPoint.x - lowerPoint.x;
//       const yDiff = upperPoint.y - lowerPoint.y;
//       const yRatio = (yValue - lowerPoint.y) / yDiff;
//       return lowerPoint.x + yRatio * xDiff;
//     }

//     // If we only have one point, return its x value
//     return closestPoint.x;
//   }
// }

import { Peak } from "../../components/CardiacAnalysis/classes/Peak";

export function findPeaks(
  data,
  prominence = 0,
  wlen = null,
  useAdjustedBases = false,
  adjustedPeaksData = []
) {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Data must be a non-empty array.");
  }
  let peakIndices = [];
  let peaks = [];

  // Identify local maxima
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i].y > data[i - 1].y && data[i].y > data[i + 1].y) {
      peakIndices.push(i);
    }
  }

  // Calculate prominence for each peak and filter based on prominence threshold
  let filteredPeakIndices = [];
  for (let peakIdx of peakIndices) {
    let leftBaseIdx = peakIdx;
    let rightBaseIdx = peakIdx;
    let searchRange = wlen ? Math.floor(wlen / 2) : data.length;

    // Find left base
    for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
      if (data[j].y < data[leftBaseIdx].y) {
        leftBaseIdx = j;
      }
    }

    // Find right base
    for (
      let j = peakIdx + 1;
      j <= Math.min(data.length - 1, peakIdx + searchRange);
      j++
    ) {
      if (data[j].y < data[rightBaseIdx].y) {
        rightBaseIdx = j;
      }
    }

    let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    let prominenceValue = Math.min(leftProminence, rightProminence);

    if (prominenceValue >= prominence) {
      filteredPeakIndices.push(peakIdx);
    }
  }

  // Group peaks within the same window width and keep the peak with the highest y value
  let finalFilteredPeakIndices = [];
  let i = 0;
  while (i < filteredPeakIndices.length) {
    let group = [];
    let currentPeakIdx = filteredPeakIndices[i];
    group.push(currentPeakIdx);

    // Find all peaks within the window width
    for (let j = i + 1; j < filteredPeakIndices.length; j++) {
      if (filteredPeakIndices[j] <= currentPeakIdx + wlen / 2) {
        group.push(filteredPeakIndices[j]);
      } else {
        break;
      }
    }

    // Find the peak with the highest y value in the group
    let highestPeakIdx = group.reduce(
      (maxIdx, idx) => (data[idx].y > data[maxIdx].y ? idx : maxIdx),
      group[0]
    );
    finalFilteredPeakIndices.push(highestPeakIdx);

    // Move to the next group
    i += group.length;
  }

  // Create Peak instances for the final filtered peaks
  for (let peakIdx of finalFilteredPeakIndices) {
    let leftBaseIdx = peakIdx;
    let rightBaseIdx = peakIdx;
    let searchRange = wlen ? Math.floor(wlen / 2) : data.length;

    // Find left base
    for (let j = peakIdx - 1; j >= Math.max(0, peakIdx - searchRange); j--) {
      if (data[j].y < data[leftBaseIdx].y) {
        leftBaseIdx = j;
      }
    }

    // Find right base
    for (
      let j = peakIdx + 1;
      j <= Math.min(data.length - 1, peakIdx + searchRange);
      j++
    ) {
      if (data[j].y < data[rightBaseIdx].y) {
        rightBaseIdx = j;
      }
    }

    let leftProminence = data[peakIdx].y - data[leftBaseIdx].y;
    let rightProminence = data[peakIdx].y - data[rightBaseIdx].y;
    let prominences = {
      leftProminence: leftProminence,
      rightProminence: rightProminence,
    };

    let leftBaseCoords = data[leftBaseIdx];
    let peakCoords = data[peakIdx];
    let rightBaseCoords = data[rightBaseIdx];

    let adjustedLeftBaseCoords = null;
    let adjustedRightBaseCoords = null;

    if (useAdjustedBases) {
      const adjustedPeak = adjustedPeaksData.find(
        (adjustedPeak) => adjustedPeak.peakCoords.x === peakCoords.x
      );
      if (adjustedPeak) {
        adjustedLeftBaseCoords = adjustedPeak.adjustedLeftBaseCoords;
        adjustedRightBaseCoords = adjustedPeak.adjustedRightBaseCoords;
      }
    }

    peaks.push(
      new Peak(
        peakCoords,
        leftBaseCoords,
        rightBaseCoords,
        prominences,
        data,
        useAdjustedBases,
        adjustedLeftBaseCoords,
        adjustedRightBaseCoords
      )
    );
  }

  return peaks;
}
