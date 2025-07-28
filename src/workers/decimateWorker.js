/* eslint-disable no-restricted-globals */

// LTTB decimation for {x, y} arrays
function lttb(data, threshold) {
  if (!Array.isArray(data) || threshold >= data.length || threshold < 3) {
    return data;
  }

  const sampled = [];
  // Bucket size. Leave room for first and last point
  const every = (data.length - 2) / (threshold - 2);

  let a = 0; // Initially a is the first point in the triangle
  sampled.push(data[a]); // Always add the first point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate range for this bucket
    const rangeStart = Math.floor((i + 1) * every) + 1;
    const rangeEnd = Math.floor((i + 2) * every) + 1;
    const range = data.slice(rangeStart, rangeEnd);

    // Point a
    const pointA = data[a];

    // Calculate average for next bucket
    let avgX = 0,
      avgY = 0;
    for (let j = rangeStart; j < rangeEnd; j++) {
      avgX += data[j]?.x || 0;
      avgY += data[j]?.y || 0;
    }
    const rangeLength = rangeEnd - rangeStart;
    avgX /= rangeLength || 1;
    avgY /= rangeLength || 1;

    // Find the point in this bucket that forms the largest triangle
    let maxArea = -1;
    let maxAreaPoint;
    let nextA = rangeStart;

    for (
      let j = Math.floor(i * every) + 1;
      j < Math.floor((i + 1) * every) + 1;
      j++
    ) {
      // Calculate area
      const area = Math.abs(
        (pointA.x - data[j].x) * (avgY - pointA.y) -
          (pointA.x - avgX) * (data[j].y - pointA.y)
      );
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[j];
        nextA = j;
      }
    }
    sampled.push(maxAreaPoint);
    a = nextA;
  }

  sampled.push(data[data.length - 1]); // Always add the last point
  return sampled;
}

self.onmessage = function (e) {
  const { data, samples } = e.data;
  // Use LTTB for decimation
  const decimated = lttb(data, samples || 500);
  self.postMessage({ decimated });

  console.log(decimated);
};
