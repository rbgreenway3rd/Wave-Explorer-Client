// // MetricsUtilities.js

// // Setup metricsWorker
// const metricsWorker = new Worker(
//   new URL("../../../workers/metricsWorker.js", import.meta.url)
// );

// // Helper to call the worker and return a Promise
// function callMetricsWorker(type, args) {
//   return new Promise((resolve) => {
//     metricsWorker.onmessage = (e) => resolve(e.data);
//     metricsWorker.postMessage({ type, args });
//   });
// }

// // Exported async wrappers for each function
// export async function getAllValuesWorker(
//   wellArrays,
//   annotationRange,
//   metricIndicator
// ) {
//   return await callMetricsWorker("getAllValues", [
//     wellArrays,
//     annotationRange,
//     metricIndicator,
//   ]);
// }
// export async function getAllSlopesWorker(
//   wellArrays,
//   annotationRange,
//   metricIndicator
// ) {
//   return await callMetricsWorker("getAllSlopes", [
//     wellArrays,
//     annotationRange,
//     metricIndicator,
//   ]);
// }
// export async function getAllRangesWorker(
//   wellArrays,
//   annotationRange,
//   metricIndicator
// ) {
//   return await callMetricsWorker("getAllRanges", [
//     wellArrays,
//     annotationRange,
//     metricIndicator,
//   ]);
// }
// export async function calculateSlopeWorker(heatmapData) {
//   return await callMetricsWorker("calculateSlope", [heatmapData]);
// }
// export async function calculateRangeWorker(heatmapData) {
//   return await callMetricsWorker("calculateRange", [heatmapData]);
// }
// export async function linearRegressionWorker(data) {
//   return await callMetricsWorker("linearRegression", [data]);
// }

// // REMOVE: import * as d3 from "d3";

// // REMOVE: all synchronous exports below, keep only the async worker-based API

// // Optionally, you can keep the original synchronous functions for small data or testing
// // (Removed for production: use worker-based functions for all heavy calculations)

// // export const getAllValues = (wellArrays, annotationRange, metricIndicator) => {
// //   return wellArrays.flatMap((well) => {
// //     const filteredData = well.indicators[metricIndicator]?.filteredData || [];
// //     if (annotationRange.start !== null && annotationRange.end !== null) {
// //       return filteredData
// //         .filter(
// //           (_, i) => i >= annotationRange.start && i <= annotationRange.end
// //         )
// //         .map((d) => d.y);
// //     } else {
// //       return filteredData.map((d) => d.y);
// //     }
// //   });
// // };

// // Example: ensure all usages of worker-based metrics functions are awaited inside async functions
// // If you see 'await calculateSlopeWorker(...)', the parent function must be async
// // (No changes needed in this file, but update all call sites in your app to use 'await' and mark their parent functions as async)

// MetricsUtilities.js
import * as d3 from "d3";

// Existing API kept for callers that already work with {x,y}[] arrays.
export const linearRegression = (data) => {
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
};

export const calculateSlope = (heatmapData) => {
  return heatmapData.length > 0 ? linearRegression(heatmapData) : 0;
};

export const calculateRange = (heatmapData) => {
  if (heatmapData.length === 0) return 0;
  const maxY = d3.max(heatmapData, (d) => d.y);
  const minY = d3.min(heatmapData, (d) => d.y);
  return maxY - minY;
};

// ---- typed-array-aware helpers ----------------------------------------
// Reads filtered xs/ys for an indicator without forcing a {x,y}[] build.
// Original semantics filtered by index — preserved here.
function indicatorXsYs(indicator) {
  if (!indicator) return null;
  if (indicator.filteredXs && indicator.filteredYs) {
    return { xs: indicator.filteredXs, ys: indicator.filteredYs };
  }
  const fd = indicator.filteredData;
  if (Array.isArray(fd) && fd.length > 0) {
    const n = fd.length;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = fd[i].x;
      ys[i] = fd[i].y;
    }
    return { xs, ys };
  }
  return null;
}

function applyIndexRange(xs, ys, annotationRange) {
  if (annotationRange.start == null || annotationRange.end == null) {
    return { xs, ys };
  }
  const start = Math.max(0, Math.floor(annotationRange.start));
  const end = Math.min(ys.length - 1, Math.floor(annotationRange.end));
  if (end < start) return { xs: new Float64Array(0), ys: new Float64Array(0) };
  return {
    xs: xs.subarray ? xs.subarray(start, end + 1) : xs.slice(start, end + 1),
    ys: ys.subarray ? ys.subarray(start, end + 1) : ys.slice(start, end + 1),
  };
}

function slopeFromXsYs(xs, ys) {
  const n = ys.length;
  if (n === 0) return 0;
  let xsum = 0;
  let ysum = 0;
  for (let i = 0; i < n; i++) {
    xsum += xs[i];
    ysum += ys[i];
  }
  const xmean = xsum / n;
  const ymean = ysum / n;
  let num = 0;
  let denom = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    num += (x - xmean) * (y - ymean);
    denom += (x - xmean) * (x - xmean);
  }
  return denom === 0 ? 0 : num / denom;
}

function rangeFromYs(ys) {
  if (ys.length === 0) return 0;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return maxY - minY;
}

export const getAllValues = (wellArrays, annotationRange, metricIndicator) => {
  // Preserve the flat-array contract callers rely on (d3.extent, etc.).
  const out = [];
  for (let w = 0; w < wellArrays.length; w++) {
    const xy = indicatorXsYs(wellArrays[w].indicators?.[metricIndicator]);
    if (!xy) continue;
    const { ys } = applyIndexRange(xy.xs, xy.ys, annotationRange);
    for (let i = 0; i < ys.length; i++) out.push(ys[i]);
  }
  return out;
};

export const getAllSlopes = (wellArrays, annotationRange, metricIndicator) => {
  const out = new Array(wellArrays.length);
  for (let w = 0; w < wellArrays.length; w++) {
    const xy = indicatorXsYs(wellArrays[w].indicators?.[metricIndicator]);
    if (!xy) {
      out[w] = 0;
      continue;
    }
    const { xs, ys } = applyIndexRange(xy.xs, xy.ys, annotationRange);
    out[w] = slopeFromXsYs(xs, ys);
  }
  return out;
};

export const getAllRanges = (wellArrays, annotationRange, metricIndicator) => {
  const out = new Array(wellArrays.length);
  for (let w = 0; w < wellArrays.length; w++) {
    const xy = indicatorXsYs(wellArrays[w].indicators?.[metricIndicator]);
    if (!xy) {
      out[w] = 0;
      continue;
    }
    const { ys } = applyIndexRange(xy.xs, xy.ys, annotationRange);
    out[w] = rangeFromYs(ys);
  }
  return out;
};
