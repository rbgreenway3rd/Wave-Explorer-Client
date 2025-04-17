/**
 * Applies a median filter to the y-values of an array of {x, y} coordinate objects.
 * The x-values remain unchanged.
 * @param {Array} data - Array of {x, y} objects.
 * @param {number} windowSize - Size of the sliding window (must be an odd number).
 * @returns {Array} - New array with filtered y-values.
 */
export const applyMedianFilter = (data, windowSize) => {
  if (windowSize % 2 === 0) {
    throw new Error("Window size must be an odd number.");
  }

  const halfWindow = Math.floor(windowSize / 2);
  const filteredData = [];

  for (let i = 0; i < data.length; i++) {
    // Collect y-values within the sliding window
    const window = [];
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const index = i + j;
      if (index >= 0 && index < data.length) {
        window.push(data[index].y);
      }
    }

    // Sort the window and calculate the median
    const sortedWindow = window.sort((a, b) => a - b);
    const mid = Math.floor(sortedWindow.length / 2);
    const median =
      sortedWindow.length % 2 === 0
        ? (sortedWindow[mid - 1] + sortedWindow[mid]) / 2
        : sortedWindow[mid];

    // Add the filtered point to the result
    filteredData.push({ x: data[i].x, y: median });
  }
  console.log(filteredData.length);
  return filteredData;
};
