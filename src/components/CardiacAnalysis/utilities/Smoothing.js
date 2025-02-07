/**
 * Apply moving average smoothing to the data.
 * @param {{x: number, y: number}[]} data - The signal data.
 * @param {number} windowWidth - The width of the moving average window.
 * @returns {{x: number, y: number}[]} Smoothed data.
 */
export function smoothing(data, windowWidth) {
  // Ensure there's enough data for the moving average
  if (data.length < windowWidth) {
    console.error(
      `Insufficient data points for moving average. Required: ${windowWidth}, Available: ${data.length}`
    );
    return data; // Return original data if not enough points
  }

  const smoothedData = data.map((point, index) => {
    let windowSum = 0;
    const windowStart = Math.max(Math.floor(index - windowWidth / 2), 0);
    const windowEnd = Math.min(data.length - 1, index + windowWidth / 2);

    for (let k = windowStart; k <= windowEnd; k++) {
      windowSum += data[k].y;
    }

    return {
      x: point.x,
      y: windowSum / (windowEnd - windowStart + 1),
    };
  });

  return smoothedData;
}

/**
 * Apply median smoothing to the data.
 * @param {{x: number, y: number}[]} data - The signal data.
 * @param {number} windowWidth - The width of the moving average window.
 * @returns {{x: number, y: number}[]} Smoothed data.
 */
export function smoothingMedian(data, windowWidth) {
  // Ensure there's enough data for the moving average
  if (data.length < windowWidth) {
    console.error(
      `Insufficient data points for median smoothing. Required: ${windowWidth}, Available: ${data.length}`
    );
    return data; // Return original data if not enough points
  }

  const smoothedData = data.map((point, index) => {
    const windowStart = Math.max(Math.floor(index - windowWidth / 2), 0);
    const windowEnd = Math.min(data.length - 1, index + windowWidth / 2);

    const windowValues = [];
    for (let k = windowStart; k <= windowEnd; k++) {
      windowValues.push(data[k].y);
    }

    windowValues.sort((a, b) => a - b);
    const median = windowValues[Math.floor(windowValues.length / 2)];

    return {
      x: point.x,
      y: median,
    };
  });

  return smoothedData;
}
