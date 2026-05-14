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
import { readWellXyInRange } from "../../../utilities/filterPack";

// Normalize a {start, end} time range so consumers don't accidentally invert
// it. readWellXyInRange treats reversed ranges as "no range" and returns the
// full signal, which is silently wrong for aggregate metrics.
function normalizedRange(annotationRange) {
  const a = annotationRange ? annotationRange.start : null;
  const b = annotationRange ? annotationRange.end : null;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { startX: null, endX: null };
  return { startX: Math.min(a, b), endX: Math.max(a, b) };
}

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

// annotationRange is {start, end} in time-domain x values (matching the
// {xMin, xMax} stored by FilteredGraph). Walks the same typed-array-first
// priority chain as the CSV report so the heatmap's color scale stays
// consistent with its draw pass and with the exported metric values.
export const getAllValues = (wellArrays, annotationRange, metricIndicator) => {
  const { startX, endX } = normalizedRange(annotationRange);
  // Preserve the flat-array contract callers rely on (d3.extent, etc.).
  const out = [];
  for (let w = 0; w < wellArrays.length; w++) {
    const ind = wellArrays[w].indicators?.[metricIndicator];
    const { ys } = readWellXyInRange(ind, startX, endX);
    for (let i = 0; i < ys.length; i++) out.push(ys[i]);
  }
  return out;
};

export const getAllSlopes = (wellArrays, annotationRange, metricIndicator) => {
  const { startX, endX } = normalizedRange(annotationRange);
  const out = new Array(wellArrays.length);
  for (let w = 0; w < wellArrays.length; w++) {
    const ind = wellArrays[w].indicators?.[metricIndicator];
    const { xs, ys } = readWellXyInRange(ind, startX, endX);
    out[w] = ys.length > 0 ? slopeFromXsYs(xs, ys) : 0;
  }
  return out;
};

export const getAllRanges = (wellArrays, annotationRange, metricIndicator) => {
  const { startX, endX } = normalizedRange(annotationRange);
  const out = new Array(wellArrays.length);
  for (let w = 0; w < wellArrays.length; w++) {
    const ind = wellArrays[w].indicators?.[metricIndicator];
    const { ys } = readWellXyInRange(ind, startX, endX);
    out[w] = ys.length > 0 ? rangeFromYs(ys) : 0;
  }
  return out;
};
