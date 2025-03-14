// import { useContext } from "react";
// import { DataContext } from "../../../providers/DataProvider";

// // const xlsx = require("xlsx");
// const math = require("mathjs");

// export const ProcessApdData = (fluorescenceData) => {
//   const { extractedRows, extractedColumns, extractedIndicatorTimes } =
//     useContext(DataContext);
//   // const workbook = xlsx.readFile(filePath);
//   // const sheet = workbook.Sheets["150gain_1ms_20min_rest"];
//   // const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

//   // const time = data.slice(1).map((row) => row[0]); // Extract time column
//   // const fluorescenceData = data.slice(1).map((row) => row.slice(1)); // Exclude first column

//   const numRows = extractedRows;
//   const numCols = extractedColumns;
//   const time = extractedIndicatorTimes;

//   // Generate well names
//   let wellNames = [];
//   for (let row = 0; row < numRows; row++) {
//     for (let col = 1; col <= numCols; col++) {
//       wellNames.push(String.fromCharCode(65 + row) + col);
//     }
//   }

//   let APD_metrics = Array(fluorescenceData[0].length)
//     .fill()
//     .map(() => Array(9).fill(0));
//   let num_peaks_detected = Array(fluorescenceData[0].length).fill(0);
//   let num_peaks_analyzed = Array(fluorescenceData[0].length).fill(0);
//   let peak_amplitudes = Array(fluorescenceData[0].length).fill(0);
//   let rr_intervals = Array(fluorescenceData[0].length).fill(0);

//   const pre_AP_window = 20;
//   const num_of_index_after_peak = 20;
//   const windowSize = 100;
//   const numMinimums = 30;

//   for (let i = 0; i < fluorescenceData[0].length; i++) {
//     let selectedWell = fluorescenceData.map((row) => row[i]);
//     let baseline = new Array(selectedWell.length).fill(0);

//     for (let j = 0; j < selectedWell.length; j++) {
//       let startIdx = Math.max(0, j - Math.floor(windowSize / 2));
//       let endIdx = Math.min(
//         selectedWell.length,
//         j + Math.floor(windowSize / 2)
//       );
//       let currentWindow = selectedWell.slice(startIdx, endIdx);
//       let sortedWindow = [...currentWindow].sort((a, b) => a - b);
//       let minPoints = sortedWindow.slice(
//         0,
//         Math.min(numMinimums, currentWindow.length)
//       );
//       baseline[j] = math.median(minPoints);
//     }

//     let filteredData = selectedWell.map((val, idx) => val - baseline[idx]);
//     filteredData = math.median(filteredData, 5); // Applying median filter (approximation)

//     let peaks = [],
//       locs = [];
//     let minPeakHeight = 0.5 * Math.max(...filteredData);
//     for (let j = 1; j < filteredData.length - 1; j++) {
//       if (
//         filteredData[j] > minPeakHeight &&
//         filteredData[j] > filteredData[j - 1] &&
//         filteredData[j] > filteredData[j + 1]
//       ) {
//         if (locs.length === 0 || j - locs[locs.length - 1] > 20) {
//           peaks.push(filteredData[j]);
//           locs.push(j);
//         }
//       }
//     }

//     num_peaks_detected[i] = locs.length;
//     if (peaks.length === 0) continue;

//     peak_amplitudes[i] = math.mean(peaks);
//     rr_intervals[i] =
//       locs.length > 1
//         ? math.mean(
//             locs
//               .map((loc, idx) =>
//                 idx > 0 ? time[loc] - time[locs[idx - 1]] : null
//               )
//               .filter((v) => v !== null)
//           )
//         : NaN;

//     let dVdt = selectedWell.map((val, idx, arr) =>
//       idx < arr.length - 1 ? arr[idx + 1] - val : 0
//     );
//     let dvdt_max_time_idx = locs.map((loc) => {
//       let startIdx = Math.max(0, loc - pre_AP_window);
//       let dvdtSegment = dVdt.slice(startIdx, loc);
//       return startIdx + dvdtSegment.indexOf(Math.max(...dvdtSegment));
//     });

//     let APD_levels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
//     let APD_values = locs.map((loc, j) =>
//       APD_levels.map((apdLevel) => {
//         let thresholdValue = apdLevel * peaks[j];
//         let crossingIdx = filteredData
//           .slice(loc)
//           .findIndex((val) => val <= thresholdValue);
//         return crossingIdx !== -1
//           ? time[loc + crossingIdx] - time[dvdt_max_time_idx[j]]
//           : NaN;
//       })
//     );

//     APD_metrics[i] =
//       APD_values.length > 0
//         ? APD_levels.map((_, idx) =>
//             math.median(
//               APD_values.map((row) => row[idx]).filter((v) => !isNaN(v))
//             )
//           )
//         : Array(9).fill(NaN);
//     num_peaks_analyzed[i] = APD_values.filter((row) => !isNaN(row[0])).length;
//   }
//   console.log(APD_metrics);
//   // Prepare output
//   let output = wellNames.map((well, idx) => {
//     return {
//       Well: well,
//       APD90: APD_metrics[idx][0],
//       APD80: APD_metrics[idx][1],
//       APD70: APD_metrics[idx][2],
//       APD60: APD_metrics[idx][3],
//       APD50: APD_metrics[idx][4],
//       APD40: APD_metrics[idx][5],
//       APD30: APD_metrics[idx][6],
//       APD20: APD_metrics[idx][7],
//       APD10: APD_metrics[idx][8],
//       Num_Peaks_Detected: num_peaks_detected[idx],
//       Num_Peaks_Analyzed: num_peaks_analyzed[idx],
//       Peak_Amplitude: peak_amplitudes[idx],
//       RR_Interval: rr_intervals[idx],
//     };
//   });

//   return output;
// };

// export default ProcessApdData;

// import { useContext } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import { AnalysisContext } from "../../CardiacAnalysis/AnalysisProvider";
// const math = require("mathjs");

// const applyMedianFilter = (data, windowSize) => {
//   let filteredData = [];
//   let halfWindow = Math.floor(windowSize / 2);
//   for (let i = 0; i < data.length; i++) {
//     let startIdx = Math.max(0, i - halfWindow);
//     let endIdx = Math.min(data.length, i + halfWindow + 1);
//     let window = data.slice(startIdx, endIdx);
//     filteredData.push(math.median(window));
//   }
//   return filteredData;
// };

// export const ProcessApdData = (fluorescenceData) => {
//   const { extractedIndicatorTimes: time } = useContext(DataContext);
//   const { peakResults } = useContext(AnalysisContext);

//   const pre_AP_window = 20;
//   const num_of_index_after_peak = 20;
//   const windowSize = 100;
//   const numMinimums = 30;

//   let selectedWell = fluorescenceData.map((point) => point.y);
//   let baseline = new Array(selectedWell.length).fill(0);

//   for (let j = 0; j < selectedWell.length; j++) {
//     let startIdx = Math.max(0, j - Math.floor(windowSize / 2));
//     let endIdx = Math.min(selectedWell.length, j + Math.floor(windowSize / 2));
//     let currentWindow = selectedWell.slice(startIdx, endIdx);
//     let sortedWindow = [...currentWindow].sort((a, b) => a - b);
//     let minPoints = sortedWindow.slice(
//       0,
//       Math.min(numMinimums, currentWindow.length)
//     );
//     baseline[j] = math.median(minPoints);
//   }

//   let filteredData = selectedWell.map((val, idx) => val - baseline[idx]);
//   filteredData = applyMedianFilter(filteredData, 5); // Applying median filter

//   let peaks = [],
//     locs = [];
//   let minPeakHeight = 0.5 * Math.max(...filteredData);
//   for (let j = 1; j < filteredData.length - 1; j++) {
//     if (
//       filteredData[j] > minPeakHeight &&
//       filteredData[j] > filteredData[j - 1] &&
//       filteredData[j] > filteredData[j + 1]
//     ) {
//       if (locs.length === 0 || j - locs[locs.length - 1] > 20) {
//         peaks.push(filteredData[j]);
//         locs.push(j);
//       }
//     }
//   }

//   let num_peaks_detected = locs.length;
//   if (peaks.length === 0) {
//     console.warn("No peaks detected");
//     return null;
//   }

//   let peak_amplitudes = math.mean(peaks);
//   let rr_intervals =
//     locs.length > 1
//       ? math.mean(
//           locs
//             .map((loc, idx) =>
//               idx > 0 ? time[loc] - time[locs[idx - 1]] : null
//             )
//             .filter((v) => v !== null)
//         )
//       : NaN;

//   let dVdt = selectedWell.map((val, idx, arr) =>
//     idx < arr.length - 1 ? arr[idx + 1] - val : 0
//   );
//   let dvdt_max_time_idx = locs.map((loc) => {
//     let startIdx = Math.max(0, loc - pre_AP_window);
//     let dvdtSegment = dVdt.slice(startIdx, loc);
//     return startIdx + dvdtSegment.indexOf(Math.max(...dvdtSegment));
//   });

//   let APD_levels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
//   let APD_values = locs.map((loc, j) =>
//     APD_levels.map((apdLevel) => {
//       let thresholdValue = apdLevel * peaks[j];
//       let crossingIdx = filteredData
//         .slice(loc)
//         .findIndex((val) => val <= thresholdValue);
//       return crossingIdx !== -1
//         ? time[loc + crossingIdx] - time[dvdt_max_time_idx[j]]
//         : NaN;
//     })
//   );

//   let APD_metrics =
//     APD_values.length > 0
//       ? APD_levels.map((_, idx) => {
//           let values = APD_values.map((row) => row[idx]).filter(
//             (v) => !isNaN(v)
//           );
//           return values.length > 0 ? math.median(values) : NaN;
//         })
//       : Array(9).fill(NaN);
//   let num_peaks_analyzed = APD_values.filter((row) => !isNaN(row[0])).length;

//   console.log("APD_metrics:", APD_metrics);
//   console.log("APD_values:", APD_values);
//   console.log("peaks:", peaks);
//   console.log("locs:", locs);
//   console.log("filteredData:", filteredData);

//   return {
//     APD90: APD_metrics[0],
//     APD80: APD_metrics[1],
//     APD70: APD_metrics[2],
//     APD60: APD_metrics[3],
//     APD50: APD_metrics[4],
//     APD40: APD_metrics[5],
//     APD30: APD_metrics[6],
//     APD20: APD_metrics[7],
//     APD10: APD_metrics[8],
//     Num_Peaks_Detected: num_peaks_detected,
//     Num_Peaks_Analyzed: num_peaks_analyzed,
//     Peak_Amplitude: peak_amplitudes,
//     RR_Interval: rr_intervals,
//   };
// };

// export default ProcessApdData;

import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";
import { AnalysisContext } from "../../CardiacAnalysis/AnalysisProvider";
import { findBaseline } from "../../CardiacAnalysis/utilities/FindBaseline";
const math = require("mathjs");

const applyMedianFilter = (data, windowSize) => {
  let filteredData = [];
  let halfWindow = Math.floor(windowSize / 2);
  for (let i = 0; i < data.length; i++) {
    let startIdx = Math.max(0, i - halfWindow);
    let endIdx = Math.min(data.length, i + halfWindow + 1);
    let window = data.slice(startIdx, endIdx);
    filteredData.push(math.median(window));
  }
  return filteredData;
};

const findTimeArray = (time) => {
  for (let key in time) {
    if (Array.isArray(time[key])) {
      return time[key];
    }
  }
  throw new Error("No array found in the time object");
};

export const ProcessApdData = (fluorescenceData) => {
  const { extractedIndicatorTimes } = useContext(DataContext);
  const { peakResults } = useContext(AnalysisContext);
  const time = findTimeArray(extractedIndicatorTimes);
  console.log("time", time);
  const pre_AP_window = 20;
  const num_of_index_after_peak = 20;
  const windowSize = 100;
  const numMinimums = 30;

  let baseline = findBaseline(fluorescenceData);
  let selectedWell = baseline.map((point) => point.y);

  let peaks = peakResults.map((peak) => peak.peakCoords.y);
  let locsValues = peakResults.map((peak) => peak.peakCoords.x);
  let locs = locsValues.map((locValue) => time.indexOf(locValue));

  console.log(peaks);
  console.log(locs);

  let num_peaks_detected = locs.length;
  if (peaks.length === 0) {
    console.warn("No peaks detected");
    return null;
  }

  let peak_amplitudes = math.mean(peaks);
  console.log("peak_amplitudes:", peak_amplitudes);
  let rr_intervals =
    locs.length > 1
      ? math.mean(
          locs
            .map((loc, idx) =>
              idx > 0 ? time[loc] - time[locs[idx - 1]] : null
            )
            .filter((v) => v !== null)
        )
      : NaN;
  console.log("rr_intervals: ", rr_intervals);

  let dVdt = selectedWell.map((val, idx, arr) =>
    idx < arr.length - 1 ? arr[idx + 1] - val : 0
  );
  let dvdt_max_time_idx = locs.map((loc) => {
    let startIdx = Math.max(0, loc - pre_AP_window);
    let dvdtSegment = dVdt.slice(startIdx, loc);
    return startIdx + dvdtSegment.indexOf(Math.max(...dvdtSegment));
  });

  let APD_levels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  let APD_values = locs.map((loc, j) =>
    APD_levels.map((apdLevel) => {
      let thresholdValue = apdLevel * peaks[j];
      let crossingIdx = selectedWell
        .slice(loc)
        .findIndex((val) => val <= thresholdValue);
      console.log(
        `Peak ${j}: thresholdValue = ${thresholdValue}, crossingIdx = ${crossingIdx}`
      );
      return crossingIdx !== -1
        ? time[loc + crossingIdx] - time[dvdt_max_time_idx[j]]
        : NaN;
    })
  );

  let APD_metrics =
    APD_values.length > 0
      ? APD_levels.map((_, idx) => {
          let values = APD_values.map((row) => row[idx]).filter(
            (v) => !isNaN(v)
          );
          return values.length > 0 ? math.median(values) : NaN;
        })
      : Array(9).fill(NaN);
  let num_peaks_analyzed = APD_values.filter((row) => !isNaN(row[0])).length;

  console.log("APD_metrics:", APD_metrics);
  console.log("APD_values:", APD_values);
  console.log("peaks:", peaks);
  console.log("locs:", locs);
  // console.log("filteredData:", filteredData);

  return {
    APD90: APD_metrics[0],
    APD80: APD_metrics[1],
    APD70: APD_metrics[2],
    APD60: APD_metrics[3],
    APD50: APD_metrics[4],
    APD40: APD_metrics[5],
    APD30: APD_metrics[6],
    APD20: APD_metrics[7],
    APD10: APD_metrics[8],
    Num_Peaks_Detected: num_peaks_detected,
    Num_Peaks_Analyzed: num_peaks_analyzed,
    Peak_Amplitude: peak_amplitudes,
    RR_Interval: rr_intervals,
  };
};

export default ProcessApdData;
