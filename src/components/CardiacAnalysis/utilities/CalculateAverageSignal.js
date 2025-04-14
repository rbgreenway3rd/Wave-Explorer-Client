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

export const calculateMedianSignal = (
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

  // Calculate the median y values
  const medianSignal = filteredPeakData.map((point) => {
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

  return medianSignal;
};
