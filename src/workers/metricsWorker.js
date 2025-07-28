// src/workers/metricsWorker.js
// Web Worker for metrics utilities

// No d3 dependency: implement min/max manually for worker portability
function linearRegression(data) {
  let xsum = 0;
  let ysum = 0;
  for (let i = 0; i < data.length; i++) {
    xsum += data[i].x;
    ysum += data[i].y;
  }
  const xmean = xsum / data.length;
  const ymean = ysum / data.length;
  let num = 0;
  let denom = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i].x;
    const y = data[i].y;
    num += (x - xmean) * (y - ymean);
    denom += (x - xmean) * (x - xmean);
  }
  return num / denom;
}

function calculateSlope(heatmapData) {
  return heatmapData.length > 0 ? linearRegression(heatmapData) : 0;
}

function calculateRange(heatmapData) {
  if (heatmapData.length === 0) return 0;
  let minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < heatmapData.length; i++) {
    const y = heatmapData[i].y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxY - minY;
}

function getAllValues(
  wellArrays,
  annotationRange,
  metricIndicator,
  metricType
) {
  return wellArrays.map((well) => {
    const indicators = well.indicators;
    if (!indicators || !indicators[metricIndicator]) return null;
    const filteredData = indicators[metricIndicator].filteredData || [];
    let start = 0;
    let end = filteredData.length - 1;
    if (
      annotationRange &&
      annotationRange.start !== null &&
      annotationRange.end !== null
    ) {
      start = Math.max(0, annotationRange.start);
      end = Math.min(filteredData.length - 1, annotationRange.end);
    }
    const yValues = [];
    for (let i = start; i <= end; i++) {
      yValues.push(filteredData[i].y);
    }
    if (yValues.length === 0) return null;
    if (metricType === "Max") return Math.max(...yValues);
    if (metricType === "Min") return Math.min(...yValues);
    // fallback: return mean
    return yValues.reduce((a, b) => a + b, 0) / yValues.length;
  });
}

function getAllSlopes(wellArrays, annotationRange, metricIndicator) {
  return wellArrays.map((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
    if (
      annotationRange &&
      annotationRange.start !== null &&
      annotationRange.end !== null
    ) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }
    return calculateSlope(heatmapData);
  });
}

function getAllRanges(wellArrays, annotationRange, metricIndicator) {
  return wellArrays.map((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
    if (
      annotationRange &&
      annotationRange.start !== null &&
      annotationRange.end !== null
    ) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }
    return calculateRange(heatmapData);
  });
}

// Message API: { type, args }
// type: 'getAllValues', 'getAllSlopes', 'getAllRanges', 'calculateSlope', 'calculateRange', 'linearRegression'
// args: array of arguments for the function
// eslint-disable-next-line no-restricted-globals
self.onmessage = function (e) {
  const { type, args } = e.data;
  let result;
  switch (type) {
    case "getAllValues":
      result = getAllValues(...args); // now expects metricType as 4th arg
      break;
    case "getAllSlopes":
      result = getAllSlopes(...args);
      break;
    case "getAllRanges":
      result = getAllRanges(...args);
      break;
    case "calculateSlope":
      result = calculateSlope(...args);
      break;
    case "calculateRange":
      result = calculateRange(...args);
      break;
    case "linearRegression":
      result = linearRegression(...args);
      break;
    default:
      result = [];
  }
  // Always return an array for getAllValues, getAllSlopes, getAllRanges
  if (["getAllValues", "getAllSlopes", "getAllRanges"].includes(type)) {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage(Array.isArray(result) ? result : []);
  } else {
    // eslint-disable-next-line no-restricted-globals
    self.postMessage(result);
  }
};
