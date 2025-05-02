// import { useContext } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import { AnalysisContext } from "../../CardiacAnalysis/AnalysisProvider";
// import { findBaseline } from "../../CardiacAnalysis/utilities/FindBaseline";
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

// const findTimeArray = (time) => {
//   for (let key in time) {
//     if (Array.isArray(time[key])) {
//       return time[key];
//     }
//   }
//   throw new Error("No array found in the time object");
// };

// export const ProcessApdData = (fluorescenceData) => {
//   const { extractedIndicatorTimes } = useContext(DataContext);
//   const { peakResults } = useContext(AnalysisContext);
//   const time = findTimeArray(extractedIndicatorTimes);
//   // console.log("time", time);
//   const pre_AP_window = 20;
//   const num_of_index_after_peak = 20;
//   const windowSize = 100;
//   const numMinimums = 30;

//   let baseline = findBaseline(fluorescenceData);
//   let selectedWell = baseline.map((point) => point.y);

//   let peaks = peakResults.map((peak) => peak.peakCoords.y);
//   let locsValues = peakResults.map((peak) => peak.peakCoords.x);
//   let locs = locsValues.map((locValue) => time.indexOf(locValue));

//   // console.log(peaks);
//   // console.log(locs);

//   let num_peaks_detected = locs.length;
//   if (peaks.length === 0) {
//     console.warn("No peaks detected");
//     return null;
//   }

//   let peak_amplitudes = math.mean(peaks);
//   // console.log("peak_amplitudes:", peak_amplitudes);
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
//   // console.log("rr_intervals: ", rr_intervals);

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
//       let crossingIdx = selectedWell
//         .slice(loc)
//         .findIndex((val) => val <= thresholdValue);
//       // console.log(
//       //   `Peak ${j}: thresholdValue = ${thresholdValue}, crossingIdx = ${crossingIdx}`
//       // );
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

//   // console.log("APD_metrics:", APD_metrics);
//   // console.log("APD_values:", APD_values);
//   // console.log("peaks:", peaks);
//   // console.log("locs:", locs);
//   // console.log("filteredData:", filteredData);

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
