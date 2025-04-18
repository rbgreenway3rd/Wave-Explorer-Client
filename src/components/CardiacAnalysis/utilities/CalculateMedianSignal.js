const findPeakIndices = (baselineData, peakResults) => {
  let peakIndices = [];
  for (let i = 0; i < peakResults.length; i++) {
    peakIndices.push(
      baselineData.findIndex((peak) => peak.x === peakResults[i].peakCoords.x)
    );
  }
  return peakIndices;
};

export const calculateAverageSignal = (
  baselineData,
  peakResults,
  windowWidth
) => {
  let filteredPeakData = [];

  // Use findPeakIndices to get the indices of all peaks in baselineData
  let peakIndices = findPeakIndices(baselineData, peakResults);

  const halfWindowWidth = Math.floor(windowWidth / 2); // Ensure it's an integer
  const offsetMin = -halfWindowWidth;
  const offsetMax = halfWindowWidth;

  for (let i = offsetMin; i <= offsetMax; i++) {
    // Initialize pointData for this offset
    let pointData = { x: null, y: [] };

    // Ensure the index for x is valid
    const xIndex = peakIndices[0] - i;
    if (xIndex >= 0 && xIndex < baselineData.length) {
      pointData.x = baselineData[xIndex].x; // Assign the x value
    } else {
      console.warn(`Index out of bounds for x value: ${xIndex}`);
      continue;
    }

    // Populate the y array
    for (let j = 0; j < peakIndices.length; j++) {
      const yIndex = peakIndices[j] - i;

      // Ensure the index for y is valid
      if (yIndex >= 0 && yIndex < baselineData.length) {
        pointData.y.push(baselineData[yIndex].y); // Push the y value
      } else {
        console.warn(`Index out of bounds for y value: ${yIndex}`);
      }
    }

    filteredPeakData.push(pointData);
  }

  console.log(filteredPeakData);
  // Calculate the average y values
  const averagedSignal = filteredPeakData.map((point) => {
    const sumY = point.y.reduce((acc, val) => acc + val, 0);
    return {
      x: point.x,
      y: sumY / point.y.length,
    };
  });
  return averagedSignal;
};

// export const calculateMedianSignal = (
//   baselineData,
//   peakResults,
//   windowWidth
// ) => {
//   let filteredPeakData = [];

//   // Use findPeakIndices to get the indices of all peaks in baselineData
//   let peakIndices = findPeakIndices(baselineData, peakResults);

//   const halfWindowWidth = Math.floor(windowWidth / 2); // Ensure it's an integer
//   const offsetMin = -halfWindowWidth;
//   const offsetMax = halfWindowWidth;

//   for (let i = offsetMin; i <= offsetMax; i++) {
//     // Initialize pointData for this offset
//     let pointData = { x: null, y: [] };

//     // Ensure the index for x is valid
//     const xIndex = peakIndices[0] - i;
//     if (xIndex >= 0 && xIndex < baselineData.length) {
//       pointData.x = baselineData[xIndex].x; // Assign the x value
//     } else {
//       console.warn(`Index out of bounds for x value: ${xIndex}`);
//       continue;
//     }

//     // Populate the y array
//     for (let j = 0; j < peakIndices.length; j++) {
//       const yIndex = peakIndices[j] - i;

//       // Ensure the index for y is valid
//       if (yIndex >= 0 && yIndex < baselineData.length) {
//         pointData.y.push(baselineData[yIndex].y); // Push the y value
//       } else {
//         console.warn(`Index out of bounds for y value: ${yIndex}`);
//       }
//     }

//     filteredPeakData.push(pointData);
//   }

//   console.log(filteredPeakData);

//   // Calculate the median y values
//   const medianSignal = filteredPeakData.map((point) => {
//     if (point.y.length === 0) {
//       return { x: point.x, y: null }; // Handle cases with no y values
//     }

//     // Sort the y values to calculate the median
//     const sortedY = [...point.y].sort((a, b) => a - b);
//     const mid = Math.floor(sortedY.length / 2);

//     let median;
//     if (sortedY.length % 2 === 0) {
//       // Even number of elements: average the two middle values
//       median = (sortedY[mid - 1] + sortedY[mid]) / 2;
//     } else {
//       // Odd number of elements: take the middle value
//       median = sortedY[mid];
//     }

//     return {
//       x: point.x,
//       y: median,
//     };
//   });

//   return medianSignal;
// };

const interpolateSignal = (signal, factor) => {
  const interpolatedSignal = [];

  for (let i = 0; i < signal.length - 1; i++) {
    const currentPoint = signal[i];
    const nextPoint = signal[i + 1];

    interpolatedSignal.push(currentPoint); // Add the current point

    // Interpolate additional points between currentPoint and nextPoint
    for (let j = 1; j <= factor; j++) {
      const t = j / (factor + 1); // Interpolation factor (e.g., 1/3, 2/3 for factor = 2)
      const interpolatedX = currentPoint.x + t * (nextPoint.x - currentPoint.x);
      const interpolatedY = currentPoint.y + t * (nextPoint.y - currentPoint.y);

      interpolatedSignal.push({ x: interpolatedX, y: interpolatedY });
    }
  }

  // Add the last point
  interpolatedSignal.push(signal[signal.length - 1]);

  return interpolatedSignal;
};

// export const calculateMedianSignal = (
//   baselineData,
//   peakResults,
//   windowWidth,
//   interpolationFactor = 2 // Number of points to interpolate between each pair of points
// ) => {
//   let filteredPeakData = [];

//   // Use findPeakIndices to get the indices of all peaks in baselineData
//   let peakIndices = findPeakIndices(baselineData, peakResults);

//   const halfWindowWidth = Math.floor(windowWidth / 2); // Ensure it's an integer
//   const offsetMin = -halfWindowWidth;
//   const offsetMax = halfWindowWidth;

//   for (let i = offsetMin; i <= offsetMax; i++) {
//     // Initialize pointData for this offset
//     let pointData = { x: null, y: [] };

//     // Ensure the index for x is valid
//     const xIndex = peakIndices[0] - i;
//     if (xIndex >= 0 && xIndex < baselineData.length) {
//       pointData.x = baselineData[xIndex].x; // Assign the x value
//     } else {
//       console.warn(`Index out of bounds for x value: ${xIndex}`);
//       continue;
//     }

//     // Populate the y array
//     for (let j = 0; j < peakIndices.length; j++) {
//       const yIndex = peakIndices[j] - i;

//       // Ensure the index for y is valid
//       if (yIndex >= 0 && yIndex < baselineData.length) {
//         pointData.y.push(baselineData[yIndex].y); // Push the y value
//       } else {
//         console.warn(`Index out of bounds for y value: ${yIndex}`);
//       }
//     }

//     filteredPeakData.push(pointData);
//   }

//   console.log(filteredPeakData);

//   // Calculate the median y values
//   let medianSignal = filteredPeakData.map((point) => {
//     if (point.y.length === 0) {
//       return { x: point.x, y: null }; // Handle cases with no y values
//     }

//     // Sort the y values to calculate the median
//     const sortedY = [...point.y].sort((a, b) => a - b);
//     const mid = Math.floor(sortedY.length / 2);

//     let median;
//     if (sortedY.length % 2 === 0) {
//       // Even number of elements: average the two middle values
//       median = (sortedY[mid - 1] + sortedY[mid]) / 2;
//     } else {
//       // Odd number of elements: take the middle value
//       median = sortedY[mid];
//     }

//     return {
//       x: point.x,
//       y: median,
//     };
//   });

//   // Interpolate additional points between the calculated points
//   // medianSignal = interpolateSignal(medianSignal, interpolationFactor);
//   console.log(medianSignal);
//   return medianSignal;
// };

// EXPERIMENTAL - OMITS FIRST PEAK IF NOT ENOUGH DATA PRECEDES IT, SAME LOGIC FOR FINAL PEAK
export const calculateMedianSignal = (
  baselineData,
  peakResults,
  windowWidth,
  interpolationFactor = 1 // Number of points to interpolate between each pair of points
) => {
  let filteredPeakData = [];

  // Use findPeakIndices to get the indices of all peaks in baselineData
  let peakIndices = findPeakIndices(baselineData, peakResults);

  const halfWindowWidth = Math.floor(windowWidth / 2); // Ensure it's an integer
  const offsetMin = -halfWindowWidth;
  const offsetMax = halfWindowWidth;

  // Check if there are enough data points preceding the left baseline of the first peak
  const firstPeakIndex = peakIndices[0];
  if (firstPeakIndex < halfWindowWidth) {
    console.warn(
      "Not enough data points preceding the left baseline of the first peak. Omitting the first peak."
    );
    // Remove the first peak from the calculations
    peakIndices.shift();
  }

  // Check if there are enough data points following the right baseline of the last peak
  const lastPeakIndex = peakIndices[peakIndices.length - 1];
  if (lastPeakIndex + halfWindowWidth >= baselineData.length) {
    console.warn(
      "Not enough data points following the right baseline of the last peak. Omitting the last peak."
    );
    // Remove the last peak from the calculations
    peakIndices.pop();
  }

  for (let i = offsetMin; i <= offsetMax; i++) {
    // Initialize pointData for this offset
    let pointData = { x: null, y: [] };

    // Ensure the index for x is valid
    const xIndex = peakIndices[0] - i;
    if (xIndex >= 0 && xIndex < baselineData.length) {
      pointData.x = baselineData[xIndex].x; // Assign the x value
    } else {
      console.warn(`Index out of bounds for x value: ${xIndex}`);
      continue;
    }

    // Populate the y array
    for (let j = 0; j < peakIndices.length; j++) {
      const yIndex = peakIndices[j] - i;

      // Ensure the index for y is valid
      if (yIndex >= 0 && yIndex < baselineData.length) {
        pointData.y.push(baselineData[yIndex].y); // Push the y value
      } else {
        console.warn(`Index out of bounds for y value: ${yIndex}`);
      }
    }

    filteredPeakData.push(pointData);
  }

  console.log(filteredPeakData);

  // Calculate the median y values
  let medianSignal = filteredPeakData.map((point) => {
    if (point.y.length === 0) {
      return { x: point.x, y: null }; // Handle cases with no y values
    }

    // Sort the y values to calculate the median
    const sortedY = [...point.y].sort((a, b) => a - b);
    const mid = Math.floor(sortedY.length / 2);

    let median;
    if (sortedY.length % 2 === 0) {
      // Even number of elements: average the two middle values
      median = (sortedY[mid - 1] + sortedY[mid]) / 2;
    } else {
      // Odd number of elements: take the middle value
      median = sortedY[mid];
    }

    return {
      x: point.x,
      y: median,
    };
  });

  // Interpolate additional points between the calculated points
  // medianSignal = interpolateSignal(medianSignal, interpolationFactor);
  console.log(medianSignal);
  return medianSignal;
};
