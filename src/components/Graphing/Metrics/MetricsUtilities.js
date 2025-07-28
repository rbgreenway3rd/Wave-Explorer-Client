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
  // console.log(heatmapData);
  return heatmapData.length > 0 ? linearRegression(heatmapData) : 0;
};

export const calculateRange = (heatmapData) => {
  if (heatmapData.length === 0) return 0; // If no data, return 0

  const maxY = d3.max(heatmapData, (d) => d.y);
  const minY = d3.min(heatmapData, (d) => d.y);
  // console.log(maxY - minY);
  return maxY - minY; // Return the range (difference between max and min)
};

export const getAllValues = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.flatMap((well) => {
    const filteredData = well.indicators[metricIndicator]?.filteredData || [];
    if (annotationRange.start !== null && annotationRange.end !== null) {
      return filteredData
        .filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        )
        .map((d) => d.y);
    } else {
      return filteredData.map((d) => d.y);
    }
  });
};

export const getAllSlopes = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.flatMap((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];

    if (annotationRange.start !== null && annotationRange.end !== null) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }
    return calculateSlope(heatmapData);
  });
};

export const getAllRanges = (wellArrays, annotationRange, metricIndicator) => {
  return wellArrays.map((well) => {
    let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
    if (annotationRange.start !== null && annotationRange.end !== null) {
      heatmapData = heatmapData.filter(
        (_, i) => i >= annotationRange.start && i <= annotationRange.end
      );
    }

    return calculateRange(heatmapData);
  });
};
