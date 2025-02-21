// // // // import { useContext } from "react";
// // // // import { adjustBase } from "./AdjustBase";
// // // // import { Peak } from "../classes/Peak";
// // // // import { prepareQuadraticData, quadraticRegression } from "./Regression";
// // // // import { AnalysisContext } from "../AnalysisProvider";

// // // // export const prepareChartData = (
// // // //   selectedData,
// // // //   peaksData,
// // // //   smoothedData,
// // // //   peakProminence,
// // // //   findPeaksWindowWidth,
// // // //   extractedIndicatorTimes,
// // // //   useAdjustedBases,
// // // //   peakMagnitudes,
// // // //   showVerticalLines
// // // // ) => {

// // // //   const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

// // // //   // Extract peak and baseline coordinates
// // // //   const peakEntries = peaksData.map((peak) => peak.peakCoords);
// // // //   const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
// // // //   const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

// // // //   // Filter data and perform quadratic regression
// // // //   const filteredData = prepareQuadraticData(dataToUse, peaksData);
// // // //   const regressionCoefficients = quadraticRegression(filteredData);

// // // //   // Generate line-of-best-fit data
// // // //   const lineOfBestFit = filteredData.map((point) => {
// // // //     const x = point.x;
// // // //     const y =
// // // //       regressionCoefficients.a * x ** 2 +
// // // //       regressionCoefficients.b * x +
// // // //       regressionCoefficients.c;
// // // //     return { x, y };
// // // //   });

// // // //   const adjustedPeaksData = peaksData.map((peak) => {
// // // //     const adjustedLeftBase = adjustBase(
// // // //       peak.leftBaseCoords,
// // // //       lineOfBestFit,
// // // //       dataToUse,
// // // //       true
// // // //     );
// // // //     const adjustedRightBase = adjustBase(
// // // //       peak.rightBaseCoords,
// // // //       lineOfBestFit,
// // // //       dataToUse,
// // // //       false
// // // //     );
// // // //     return {
// // // //       ...peak,
// // // //       adjustedLeftBaseCoords: adjustedLeftBase,
// // // //       adjustedRightBaseCoords: adjustedRightBase,
// // // //     };
// // // //   });

// // // //   // Use the adjusted peaks data if the checkbox is checked
// // // //   const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

// // // //   // Recalculate ascent and descent analysis based on the final peaks data
// // // //   const recalculatedPeaksData = finalPeaksData.map((peak) => {
// // // //     return new Peak(
// // // //       peak.peakCoords,
// // // //       peak.leftBaseCoords,
// // // //       peak.rightBaseCoords,
// // // //       peak.prominences,
// // // //       dataToUse,
// // // //       useAdjustedBases,
// // // //       peak.adjustedLeftBaseCoords,
// // // //       peak.adjustedRightBaseCoords
// // // //     );
// // // //   });

// // // //   // Extract ascent and descent analysis data
// // // //   const ascentEntries = recalculatedPeaksData.flatMap(
// // // //     (peak) => peak.ascentAnalysis
// // // //   );
// // // //   const descentEntries = recalculatedPeaksData.flatMap(
// // // //     (peak) => peak.descentAnalysis
// // // //   );

// // // //   // Update chart data based on checkbox state
// // // //   const finalLeftBaseEntries = useAdjustedBases
// // // //     ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
// // // //     : leftBaseEntries;
// // // //   const finalRightBaseEntries = useAdjustedBases
// // // //     ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
// // // //     : rightBaseEntries;

// // // //   let indicatorTimes = Object.values(extractedIndicatorTimes);

// // // //   const magnitudeBaselines = peakEntries.map((peak) => {
// // // //     const x = peak.x;
// // // //     const baselineY =
// // // //       regressionCoefficients.a * x ** 2 +
// // // //       regressionCoefficients.b * x +
// // // //       regressionCoefficients.c;
// // // //     return { x: x, y: baselineY };
// // // //   });

// // // //   // Create vertical lines between each peak and its corresponding baseline
// // // //   const verticalLineDatasets = peakEntries.map((peak, index) => {
// // // //     const baseline = magnitudeBaselines[index];
// // // //     return {
// // // //       label: "vertical", // Disabled label for vertical lines in options
// // // //       data: [
// // // //         { x: peak.x, y: peak.y },
// // // //         { x: baseline.x, y: baseline.y },
// // // //       ],
// // // //       borderColor: "rgb(255, 255, 255)",
// // // //       borderWidth: 1,
// // // //       fill: false,
// // // //       type: "line",
// // // //       showLine: showVerticalLines,
// // // //       pointRadius: 0,
// // // //     };
// // // //   });

// // // //   console.log(magnitudeBaselines);
// // // //   return {
// // // //     labels: indicatorTimes[0],
// // // //     datasets: [
// // // //       {
// // // //         label: "Raw Signal",
// // // //         data: selectedData,
// // // //         borderColor: "rgb(153, 102, 255)",
// // // //         tension: 0.1,
// // // //         fill: false,
// // // //         type: "line",
// // // //       },
// // // //       {
// // // //         label: "Line of Best Fit",
// // // //         data: lineOfBestFit,
// // // //         borderColor: "rgb(255, 255, 255)",
// // // //         borderWidth: 2,
// // // //         fill: false,
// // // //         type: "line",
// // // //       },
// // // //       {
// // // //         label: "Magnitude Baseline",
// // // //         data: magnitudeBaselines,
// // // //         borderColor: "rgb(255, 255, 255)",
// // // //         borderWidth: 1,
// // // //         fill: false,
// // // //         pointRadius: 3,
// // // //         pointBackgroundColor: "rgb(255, 0, 0)",
// // // //         type: "scatter",
// // // //       },
// // // //       {
// // // //         label: "Peaks",
// // // //         data: peakEntries,
// // // //         borderColor: "rgb(255, 255, 255)",
// // // //         borderWidth: 1,
// // // //         fill: false,
// // // //         pointRadius: 5,
// // // //         pointBackgroundColor: "rgb(255, 0, 0)",
// // // //         type: "scatter",
// // // //       },
// // // //       {
// // // //         label: "Left Bases",
// // // //         data: finalLeftBaseEntries,
// // // //         borderColor: "rgb(255, 255, 255)",
// // // //         borderWidth: 1,
// // // //         fill: false,
// // // //         pointRadius: 5,
// // // //         pointBackgroundColor: "orange",
// // // //         type: "scatter",
// // // //       },
// // // //       {
// // // //         label: "Right Bases",
// // // //         data: finalRightBaseEntries,
// // // //         borderColor: "rgb(255, 255, 255)",
// // // //         borderWidth: 1,
// // // //         fill: false,
// // // //         pointRadius: 5,
// // // //         pointBackgroundColor: "rgb(0, 135, 0)",
// // // //         type: "scatter",
// // // //       },
// // // //       {
// // // //         label: "Ascent Analysis Points",
// // // //         data: ascentEntries,
// // // //         borderColor: "orange",
// // // //         backgroundColor: "orange",
// // // //         pointRadius: 2,
// // // //         type: "scatter",
// // // //       },
// // // //       {
// // // //         label: "Descent Analysis Points",
// // // //         data: descentEntries,
// // // //         borderColor: "rgb(0, 135, 0)",
// // // //         backgroundColor: "rgb(0, 135, 0)",
// // // //         pointRadius: 2,
// // // //         type: "scatter",
// // // //       },

// // // //       ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
// // // //     ],
// // // //   };
// // // // };
// // // import { useContext } from "react";
// // // import { adjustBase } from "./AdjustBase";
// // // import { Peak } from "../classes/Peak";
// // // import { prepareQuadraticData, quadraticRegression } from "./Regression";
// // // import { AnalysisContext } from "../AnalysisProvider";

// // // export const usePrepareChartData = (
// // //   selectedData,
// // //   peaksData,
// // //   smoothedData,
// // //   peakProminence,
// // //   findPeaksWindowWidth,
// // //   extractedIndicatorTimes,
// // //   useAdjustedBases,
// // //   peakMagnitudes
// // // ) => {
// // //   const { showVerticalLines } = useContext(AnalysisContext);
// // //   const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

// // //   // Extract peak and baseline coordinates
// // //   const peakEntries = peaksData.map((peak) => peak.peakCoords);
// // //   const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
// // //   const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

// // //   // Filter data and perform quadratic regression
// // //   const filteredData = prepareQuadraticData(dataToUse, peaksData);
// // //   const regressionCoefficients = quadraticRegression(filteredData);

// // //   // Generate line-of-best-fit data
// // //   const lineOfBestFit = filteredData.map((point) => {
// // //     const x = point.x;
// // //     const y =
// // //       regressionCoefficients.a * x ** 2 +
// // //       regressionCoefficients.b * x +
// // //       regressionCoefficients.c;
// // //     return { x, y };
// // //   });

// // //   const adjustedPeaksData = peaksData.map((peak) => {
// // //     const adjustedLeftBase = adjustBase(
// // //       peak.leftBaseCoords,
// // //       lineOfBestFit,
// // //       dataToUse,
// // //       true
// // //     );
// // //     const adjustedRightBase = adjustBase(
// // //       peak.rightBaseCoords,
// // //       lineOfBestFit,
// // //       dataToUse,
// // //       false
// // //     );
// // //     return {
// // //       ...peak,
// // //       adjustedLeftBaseCoords: adjustedLeftBase,
// // //       adjustedRightBaseCoords: adjustedRightBase,
// // //     };
// // //   });

// // //   // Use the adjusted peaks data if the checkbox is checked
// // //   const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

// // //   // Recalculate ascent and descent analysis based on the final peaks data
// // //   const recalculatedPeaksData = finalPeaksData.map((peak) => {
// // //     return new Peak(
// // //       peak.peakCoords,
// // //       peak.leftBaseCoords,
// // //       peak.rightBaseCoords,
// // //       peak.prominences,
// // //       dataToUse,
// // //       useAdjustedBases,
// // //       peak.adjustedLeftBaseCoords,
// // //       peak.adjustedRightBaseCoords
// // //     );
// // //   });

// // //   // Extract ascent and descent analysis data
// // //   const ascentEntries = recalculatedPeaksData.flatMap(
// // //     (peak) => peak.ascentAnalysis
// // //   );
// // //   const descentEntries = recalculatedPeaksData.flatMap(
// // //     (peak) => peak.descentAnalysis
// // //   );

// // //   // Update chart data based on checkbox state
// // //   const finalLeftBaseEntries = useAdjustedBases
// // //     ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
// // //     : leftBaseEntries;
// // //   const finalRightBaseEntries = useAdjustedBases
// // //     ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
// // //     : rightBaseEntries;

// // //   let indicatorTimes = Object.values(extractedIndicatorTimes);

// // //   const magnitudeBaselines = peakEntries.map((peak) => {
// // //     const x = peak.x;
// // //     const baselineY =
// // //       regressionCoefficients.a * x ** 2 +
// // //       regressionCoefficients.b * x +
// // //       regressionCoefficients.c;
// // //     return { x: x, y: baselineY };
// // //   });

// // //   // Create vertical lines between each peak and its corresponding baseline
// // //   const verticalLineDatasets = peakEntries.map((peak, index) => {
// // //     const baseline = magnitudeBaselines[index];
// // //     return {
// // //       label: "vertical", // Disabled label for vertical lines in options
// // //       data: [
// // //         { x: peak.x, y: peak.y },
// // //         { x: baseline.x, y: baseline.y },
// // //       ],
// // //       borderColor: "rgb(255, 255, 255)",
// // //       borderWidth: 1,
// // //       fill: false,
// // //       type: "line",
// // //       showLine: showVerticalLines,
// // //       pointRadius: 0,
// // //     };
// // //   });

// // //   console.log(magnitudeBaselines);
// // //   return {
// // //     labels: indicatorTimes[0],
// // //     datasets: [
// // //       {
// // //         label: "Raw Signal",
// // //         data: selectedData,
// // //         borderColor: "rgb(153, 102, 255)",
// // //         tension: 0.1,
// // //         fill: false,
// // //         type: "line",
// // //       },
// // //       {
// // //         label: "Line of Best Fit",
// // //         data: lineOfBestFit,
// // //         borderColor: "rgb(255, 255, 255)",
// // //         borderWidth: 2,
// // //         fill: false,
// // //         type: "line",
// // //       },
// // //       {
// // //         label: "Magnitude Baseline",
// // //         data: magnitudeBaselines,
// // //         borderColor: "rgb(255, 255, 255)",
// // //         borderWidth: 1,
// // //         fill: false,
// // //         pointRadius: 3,
// // //         pointBackgroundColor: "rgb(255, 0, 0)",
// // //         type: "scatter",
// // //       },
// // //       {
// // //         label: "Peaks",
// // //         data: peakEntries,
// // //         borderColor: "rgb(255, 255, 255)",
// // //         borderWidth: 1,
// // //         fill: false,
// // //         pointRadius: 5,
// // //         pointBackgroundColor: "rgb(255, 0, 0)",
// // //         type: "scatter",
// // //       },
// // //       {
// // //         label: "Left Bases",
// // //         data: finalLeftBaseEntries,
// // //         borderColor: "rgb(255, 255, 255)",
// // //         borderWidth: 1,
// // //         fill: false,
// // //         pointRadius: 5,
// // //         pointBackgroundColor: "orange",
// // //         type: "scatter",
// // //       },
// // //       {
// // //         label: "Right Bases",
// // //         data: finalRightBaseEntries,
// // //         borderColor: "rgb(255, 255, 255)",
// // //         borderWidth: 1,
// // //         fill: false,
// // //         pointRadius: 5,
// // //         pointBackgroundColor: "rgb(0, 135, 0)",
// // //         type: "scatter",
// // //       },
// // //       {
// // //         label: "Ascent Analysis Points",
// // //         data: ascentEntries,
// // //         borderColor: "orange",
// // //         backgroundColor: "orange",
// // //         pointRadius: 2,
// // //         type: "scatter",
// // //       },
// // //       {
// // //         label: "Descent Analysis Points",
// // //         data: descentEntries,
// // //         borderColor: "rgb(0, 135, 0)",
// // //         backgroundColor: "rgb(0, 135, 0)",
// // //         pointRadius: 2,
// // //         type: "scatter",
// // //       },
// // //       ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
// // //     ],
// // //   };
// // // };

// // // export default usePrepareChartData;
// // import { useContext } from "react";
// // import { adjustBase } from "./AdjustBase";
// // import { Peak } from "../classes/Peak";
// // import { prepareQuadraticData, quadraticRegression } from "./Regression";
// // import { AnalysisContext } from "../AnalysisProvider";

// // export const usePrepareChartData = (
// //   selectedData,
// //   peaksData,
// //   smoothedData,
// //   peakProminence,
// //   findPeaksWindowWidth,
// //   extractedIndicatorTimes,
// //   useAdjustedBases,
// //   peakMagnitudes
// // ) => {
// //   const { showVerticalLines } = useContext(AnalysisContext);
// //   const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

// //   // Extract peak and baseline coordinates
// //   const peakEntries = peaksData.map((peak) => peak.peakCoords);
// //   const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
// //   const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

// //   // Filter data and perform quadratic regression
// //   const filteredData = prepareQuadraticData(dataToUse, peaksData);
// //   const regressionCoefficients = quadraticRegression(filteredData);

// //   // Generate line-of-best-fit data
// //   const lineOfBestFit = filteredData.map((point) => {
// //     const x = point.x;
// //     const y =
// //       regressionCoefficients.a * x ** 2 +
// //       regressionCoefficients.b * x +
// //       regressionCoefficients.c;
// //     return { x, y };
// //   });

// //   const adjustedPeaksData = peaksData.map((peak) => {
// //     const adjustedLeftBase = adjustBase(
// //       peak.leftBaseCoords,
// //       lineOfBestFit,
// //       dataToUse,
// //       true
// //     );
// //     const adjustedRightBase = adjustBase(
// //       peak.rightBaseCoords,
// //       lineOfBestFit,
// //       dataToUse,
// //       false
// //     );
// //     return {
// //       ...peak,
// //       adjustedLeftBaseCoords: adjustedLeftBase,
// //       adjustedRightBaseCoords: adjustedRightBase,
// //     };
// //   });

// //   // Use the adjusted peaks data if the checkbox is checked
// //   const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

// //   // Recalculate ascent and descent analysis based on the final peaks data
// //   const recalculatedPeaksData = finalPeaksData.map((peak) => {
// //     return new Peak(
// //       peak.peakCoords,
// //       peak.leftBaseCoords,
// //       peak.rightBaseCoords,
// //       peak.prominences,
// //       dataToUse,
// //       useAdjustedBases,
// //       peak.adjustedLeftBaseCoords,
// //       peak.adjustedRightBaseCoords
// //     );
// //   });

// //   // Extract ascent and descent analysis data
// //   const ascentEntries = recalculatedPeaksData.flatMap(
// //     (peak) => peak.ascentAnalysis
// //   );
// //   const descentEntries = recalculatedPeaksData.flatMap(
// //     (peak) => peak.descentAnalysis
// //   );

// //   // Update chart data based on checkbox state
// //   const finalLeftBaseEntries = useAdjustedBases
// //     ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
// //     : leftBaseEntries;
// //   const finalRightBaseEntries = useAdjustedBases
// //     ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
// //     : rightBaseEntries;

// //   let indicatorTimes = Object.values(extractedIndicatorTimes);

// //   const magnitudeBaselines = peakEntries.map((peak) => {
// //     const x = peak.x;
// //     const baselineY =
// //       regressionCoefficients.a * x ** 2 +
// //       regressionCoefficients.b * x +
// //       regressionCoefficients.c;
// //     return { x: x, y: baselineY };
// //   });

// //   // Create vertical lines between each peak and its corresponding baseline
// //   const verticalLineDatasets = peakEntries.map((peak, index) => {
// //     const baseline = magnitudeBaselines[index];
// //     return {
// //       label: "vertical", // Disabled label for vertical lines in options
// //       data: [
// //         { x: peak.x, y: peak.y },
// //         { x: baseline.x, y: baseline.y },
// //       ],
// //       borderColor: "rgb(255, 255, 255)",
// //       borderWidth: 1,
// //       fill: false,
// //       type: "line",
// //       showLine: showVerticalLines,
// //       pointRadius: 0,
// //     };
// //   });

// //   console.log(magnitudeBaselines);
// //   return {
// //     labels: indicatorTimes[0],
// //     datasets: [
// //       {
// //         label: "Raw Signal",
// //         data: selectedData,
// //         borderColor: "rgb(153, 102, 255)",
// //         tension: 0.1,
// //         fill: false,
// //         type: "line",
// //       },
// //       {
// //         label: "Line of Best Fit",
// //         data: lineOfBestFit,
// //         borderColor: "rgb(255, 255, 255)",
// //         borderWidth: 2,
// //         fill: false,
// //         type: "line",
// //       },
// //       {
// //         label: "Magnitude Baseline",
// //         data: magnitudeBaselines,
// //         borderColor: "rgb(255, 255, 255)",
// //         borderWidth: 1,
// //         fill: false,
// //         pointRadius: 3,
// //         pointBackgroundColor: "rgb(255, 0, 0)",
// //         type: "scatter",
// //       },
// //       {
// //         label: "Peaks",
// //         data: peakEntries,
// //         borderColor: "rgb(255, 255, 255)",
// //         borderWidth: 1,
// //         fill: false,
// //         pointRadius: 5,
// //         pointBackgroundColor: "rgb(255, 0, 0)",
// //         type: "scatter",
// //       },
// //       {
// //         label: "Left Bases",
// //         data: finalLeftBaseEntries,
// //         borderColor: "rgb(255, 255, 255)",
// //         borderWidth: 1,
// //         fill: false,
// //         pointRadius: 5,
// //         pointBackgroundColor: "orange",
// //         type: "scatter",
// //       },
// //       {
// //         label: "Right Bases",
// //         data: finalRightBaseEntries,
// //         borderColor: "rgb(255, 255, 255)",
// //         borderWidth: 1,
// //         fill: false,
// //         pointRadius: 5,
// //         pointBackgroundColor: "rgb(0, 135, 0)",
// //         type: "scatter",
// //       },
// //       {
// //         label: "Ascent Analysis Points",
// //         data: ascentEntries,
// //         borderColor: "orange",
// //         backgroundColor: "orange",
// //         pointRadius: 2,
// //         type: "scatter",
// //       },
// //       {
// //         label: "Descent Analysis Points",
// //         data: descentEntries,
// //         borderColor: "rgb(0, 135, 0)",
// //         backgroundColor: "rgb(0, 135, 0)",
// //         pointRadius: 2,
// //         type: "scatter",
// //       },
// //       ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
// //     ],
// //   };
// // };

// // export default usePrepareChartData;
// import { useContext } from "react";
// import { adjustBase } from "./AdjustBase";
// import { Peak } from "../classes/Peak";
// import { prepareQuadraticData, quadraticRegression } from "./Regression";
// import { AnalysisContext } from "../AnalysisProvider";

// export const usePrepareChartData = (
//   selectedData,
//   peaksData,
//   smoothedData,
//   peakProminence,
//   findPeaksWindowWidth,
//   extractedIndicatorTimes,
//   useAdjustedBases,
//   peakMagnitudes
// ) => {
//   const { showVerticalLines } = useContext(AnalysisContext);

//   if (!selectedData || selectedData.length === 0) {
//     console.error("Selected data is empty or undefined");
//     return null;
//   }

//   if (!peaksData || peaksData.length === 0) {
//     console.error("Peaks data is empty or undefined");
//     return null;
//   }

//   const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

//   // Extract peak and baseline coordinates
//   const peakEntries = peaksData.map((peak) => peak.peakCoords);
//   const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
//   const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

//   // Filter data and perform quadratic regression
//   const filteredData = prepareQuadraticData(dataToUse, peaksData);
//   const regressionCoefficients = quadraticRegression(filteredData);

//   // Generate line-of-best-fit data
//   const lineOfBestFit = filteredData.map((point) => {
//     const x = point.x;
//     const y =
//       regressionCoefficients.a * x ** 2 +
//       regressionCoefficients.b * x +
//       regressionCoefficients.c;
//     return { x, y };
//   });

//   const adjustedPeaksData = peaksData.map((peak) => {
//     const adjustedLeftBase = adjustBase(
//       peak.leftBaseCoords,
//       lineOfBestFit,
//       dataToUse,
//       true
//     );
//     const adjustedRightBase = adjustBase(
//       peak.rightBaseCoords,
//       lineOfBestFit,
//       dataToUse,
//       false
//     );
//     return {
//       ...peak,
//       adjustedLeftBaseCoords: adjustedLeftBase,
//       adjustedRightBaseCoords: adjustedRightBase,
//     };
//   });

//   // Use the adjusted peaks data if the checkbox is checked
//   const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

//   // Recalculate ascent and descent analysis based on the final peaks data
//   const recalculatedPeaksData = finalPeaksData.map((peak) => {
//     return new Peak(
//       peak.peakCoords,
//       peak.leftBaseCoords,
//       peak.rightBaseCoords,
//       peak.prominences,
//       dataToUse,
//       useAdjustedBases,
//       peak.adjustedLeftBaseCoords,
//       peak.adjustedRightBaseCoords
//     );
//   });

//   // Extract ascent and descent analysis data
//   const ascentEntries = recalculatedPeaksData.flatMap(
//     (peak) => peak.ascentAnalysis
//   );
//   const descentEntries = recalculatedPeaksData.flatMap(
//     (peak) => peak.descentAnalysis
//   );

//   // Update chart data based on checkbox state
//   const finalLeftBaseEntries = useAdjustedBases
//     ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
//     : leftBaseEntries;
//   const finalRightBaseEntries = useAdjustedBases
//     ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
//     : rightBaseEntries;

//   let indicatorTimes = Object.values(extractedIndicatorTimes);

//   const magnitudeBaselines = peakEntries.map((peak) => {
//     const x = peak.x;
//     const baselineY =
//       regressionCoefficients.a * x ** 2 +
//       regressionCoefficients.b * x +
//       regressionCoefficients.c;
//     return { x: x, y: baselineY };
//   });

//   // Create vertical lines between each peak and its corresponding baseline
//   const verticalLineDatasets = peakEntries.map((peak, index) => {
//     const baseline = magnitudeBaselines[index];
//     return {
//       label: "vertical", // Disabled label for vertical lines in options
//       data: [
//         { x: peak.x, y: peak.y },
//         { x: baseline.x, y: baseline.y },
//       ],
//       borderColor: "rgb(255, 255, 255)",
//       borderWidth: 1,
//       fill: false,
//       type: "line",
//       showLine: showVerticalLines,
//       pointRadius: 0,
//     };
//   });

//   console.log(magnitudeBaselines);
//   return {
//     labels: indicatorTimes[0],
//     datasets: [
//       {
//         label: "Raw Signal",
//         data: selectedData,
//         borderColor: "rgb(153, 102, 255)",
//         tension: 0.1,
//         fill: false,
//         type: "line",
//       },
//       {
//         label: "Line of Best Fit",
//         data: lineOfBestFit,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 2,
//         fill: false,
//         type: "line",
//       },
//       {
//         label: "Magnitude Baseline",
//         data: magnitudeBaselines,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 3,
//         showPoint: showVerticalLines,
//         pointBackgroundColor: "rgb(255, 0, 0)",
//         type: "scatter",
//       },
//       {
//         label: "Peaks",
//         data: peakEntries,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 5,
//         pointBackgroundColor: "rgb(255, 0, 0)",
//         type: "scatter",
//       },
//       {
//         label: "Left Bases",
//         data: finalLeftBaseEntries,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 5,
//         pointBackgroundColor: "orange",
//         type: "scatter",
//       },
//       {
//         label: "Right Bases",
//         data: finalRightBaseEntries,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: 5,
//         pointBackgroundColor: "rgb(0, 135, 0)",
//         type: "scatter",
//       },
//       {
//         label: "Ascent Analysis Points",
//         data: ascentEntries,
//         borderColor: "orange",
//         backgroundColor: "orange",
//         pointRadius: 2,
//         type: "scatter",
//       },
//       {
//         label: "Descent Analysis Points",
//         data: descentEntries,
//         borderColor: "rgb(0, 135, 0)",
//         backgroundColor: "rgb(0, 135, 0)",
//         pointRadius: 2,
//         type: "scatter",
//       },
//       ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
//     ],
//   };
// };

// export default usePrepareChartData;
import { useContext } from "react";
import { adjustBase } from "./AdjustBase";
import { Peak } from "../classes/Peak";
import { prepareQuadraticData, quadraticRegression } from "./Regression";
import { AnalysisContext } from "../AnalysisProvider";

export const usePrepareChartData = (
  selectedData,
  peaksData,
  smoothedData,
  peakProminence,
  findPeaksWindowWidth,
  extractedIndicatorTimes,
  useAdjustedBases,
  peakMagnitudes
) => {
  const { showVerticalLines, showDataPoints } = useContext(AnalysisContext);

  if (!selectedData || selectedData.length === 0) {
    console.error("Selected data is empty or undefined");
    return null;
  }

  const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

  // Extract peak and baseline coordinates
  const peakEntries = peaksData?.map((peak) => peak.peakCoords) || [];
  const leftBaseEntries = peaksData?.map((peak) => peak.leftBaseCoords) || [];
  const rightBaseEntries = peaksData?.map((peak) => peak.rightBaseCoords) || [];

  // Filter data and perform quadratic regression
  const filteredData = prepareQuadraticData(dataToUse, peaksData || []);
  const regressionCoefficients = quadraticRegression(filteredData);

  // Generate line-of-best-fit data
  const lineOfBestFit = filteredData.map((point) => {
    const x = point.x;
    const y =
      regressionCoefficients.a * x ** 2 +
      regressionCoefficients.b * x +
      regressionCoefficients.c;
    return { x, y };
  });

  const adjustedPeaksData =
    peaksData?.map((peak) => {
      const adjustedLeftBase = adjustBase(
        peak.leftBaseCoords,
        lineOfBestFit,
        dataToUse,
        true
      );
      const adjustedRightBase = adjustBase(
        peak.rightBaseCoords,
        lineOfBestFit,
        dataToUse,
        false
      );
      return {
        ...peak,
        adjustedLeftBaseCoords: adjustedLeftBase,
        adjustedRightBaseCoords: adjustedRightBase,
      };
    }) || [];

  // Use the adjusted peaks data if the checkbox is checked
  const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData || [];

  // Recalculate ascent and descent analysis based on the final peaks data
  const recalculatedPeaksData = finalPeaksData.map((peak) => {
    return new Peak(
      peak.peakCoords,
      peak.leftBaseCoords,
      peak.rightBaseCoords,
      peak.prominences,
      dataToUse,
      useAdjustedBases,
      peak.adjustedLeftBaseCoords,
      peak.adjustedRightBaseCoords
    );
  });

  // Extract ascent and descent analysis data
  const ascentEntries = recalculatedPeaksData.flatMap(
    (peak) => peak.ascentAnalysis
  );
  const descentEntries = recalculatedPeaksData.flatMap(
    (peak) => peak.descentAnalysis
  );

  // Update chart data based on checkbox state
  const finalLeftBaseEntries = useAdjustedBases
    ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
    : leftBaseEntries;
  const finalRightBaseEntries = useAdjustedBases
    ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
    : rightBaseEntries;

  let indicatorTimes = Object.values(extractedIndicatorTimes);

  const magnitudeBaselines = peakEntries.map((peak) => {
    const x = peak.x;
    const baselineY =
      regressionCoefficients.a * x ** 2 +
      regressionCoefficients.b * x +
      regressionCoefficients.c;
    return { x: x, y: baselineY };
  });

  // Create vertical lines between each peak and its corresponding baseline
  const verticalLineDatasets = peakEntries.map((peak, index) => {
    const baseline = magnitudeBaselines[index];
    return {
      label: "vertical", // Disabled label for vertical lines in options
      data: [
        { x: peak.x, y: peak.y },
        { x: baseline.x, y: baseline.y },
      ],
      borderColor: "rgb(255, 255, 255)",
      borderWidth: 1,
      fill: false,
      type: "line",
      showLine: showVerticalLines,
      pointRadius: 0,
    };
  });
  // const dataPointScatterPlot = {

  // }

  // console.log(magnitudeBaselines);
  return {
    labels: indicatorTimes[0],
    datasets: [
      {
        label: "Raw Signal",
        data: selectedData,
        borderColor: "rgb(153, 102, 255)",
        tension: 0.1,
        fill: false,
        type: "line",
      },
      {
        label: "Raw Points",
        data: selectedData,
        borderColor: "rgb(170, 170, 170)",
        borderWidth: 1,
        fill: false,
        pointRadius: showDataPoints ? 3 : 0, // Conditionally set pointRadius
        pointBackgroundColor: "rgba(255, 255, 255, 10)",
      },
      {
        label: "Line of Best Fit",
        data: lineOfBestFit,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 2,
        fill: false,
        type: "line",
      },
      {
        label: "Magnitude Baseline",
        data: magnitudeBaselines,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: showVerticalLines ? 3 : 0, // Conditionally set pointRadius
        pointBackgroundColor: "rgb(255, 0, 0)",
        type: "scatter",
      },
      {
        label: "Peaks",
        data: peakEntries,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(255, 0, 0)",
        type: "scatter",
      },
      {
        label: "Left Bases",
        data: finalLeftBaseEntries,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "orange",
        type: "scatter",
      },
      {
        label: "Right Bases",
        data: finalRightBaseEntries,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(0, 135, 0)",
        type: "scatter",
      },
      {
        label: "Ascent Analysis Points",
        data: ascentEntries,
        borderColor: "orange",
        backgroundColor: "orange",
        pointRadius: 2,
        type: "scatter",
      },
      {
        label: "Descent Analysis Points",
        data: descentEntries,
        borderColor: "rgb(0, 135, 0)",
        backgroundColor: "rgb(0, 135, 0)",
        pointRadius: 2,
        type: "scatter",
      },
      ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
    ],
  };
};

export default usePrepareChartData;
