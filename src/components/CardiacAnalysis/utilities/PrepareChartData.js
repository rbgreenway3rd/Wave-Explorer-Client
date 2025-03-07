// import { useContext, useEffect, useState } from "react";
// import { adjustBase } from "./AdjustBase";
// import { Peak } from "../classes/Peak";
// import { prepareQuadraticData, quadraticRegression } from "./Regression";
// import { AnalysisContext } from "../AnalysisProvider";
// import { calculatePeakAPDs } from "./CalculateAPD";

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
//   const {
//     showVerticalLines,
//     showDataPoints,
//     showAscentPoints,
//     showDescentPoints,
//   } = useContext(AnalysisContext);

//   const [apdResults, setApdResults] = useState([]);
//   const [apdValues, setApdValues] = useState([]);
//   const [apdAscentPoints, setApdAscentPoints] = useState([]);
//   const [apdDescentPoints, setApdDescentPoints] = useState([]);
//   const [lineOfBestFit, setLineOfBestFit] = useState([]);
//   const [magnitudeBaselines, setMagnitudeBaselines] = useState([]);
//   const [adjustedPeaksData, setAdjustedPeaksData] = useState([]);
//   const [leftBaseEntries, setLeftBaseEntries] = useState([]);
//   const [rightBaseEntries, setRightBaseEntries] = useState([]);
//   const [peakEntries, setPeakEntries] = useState([]);

//   useEffect(() => {
//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

//     // Extract peak and baseline coordinates
//     const newPeakEntries = peaksData?.map((peak) => peak.peakCoords) || [];
//     const newLeftBaseEntries =
//       peaksData?.map((peak) => peak.leftBaseCoords) || [];
//     const newRightBaseEntries =
//       peaksData?.map((peak) => peak.rightBaseCoords) || [];

//     setPeakEntries(newPeakEntries);
//     setLeftBaseEntries(newLeftBaseEntries);
//     setRightBaseEntries(newRightBaseEntries);

//     // Filter data and perform quadratic regression
//     const filteredData = prepareQuadraticData(dataToUse, peaksData || []);
//     const regressionCoefficients = quadraticRegression(filteredData);

//     // Generate line-of-best-fit data
//     const newLineOfBestFit = filteredData.map((point) => {
//       const x = point.x;
//       const y =
//         regressionCoefficients.a * x ** 2 +
//         regressionCoefficients.b * x +
//         regressionCoefficients.c;
//       return { x, y };
//     });
//     setLineOfBestFit(newLineOfBestFit);

//     const newAdjustedPeaksData =
//       peaksData?.map((peak) => {
//         const adjustedLeftBase = adjustBase(
//           peak.leftBaseCoords,
//           newLineOfBestFit,
//           dataToUse,
//           true
//         );
//         const adjustedRightBase = adjustBase(
//           peak.rightBaseCoords,
//           newLineOfBestFit,
//           dataToUse,
//           false
//         );
//         return {
//           ...peak,
//           adjustedLeftBaseCoords: adjustedLeftBase,
//           adjustedRightBaseCoords: adjustedRightBase,
//         };
//       }) || [];
//     setAdjustedPeaksData(newAdjustedPeaksData);

//     // Use the adjusted peaks data if the checkbox is checked
//     const finalPeaksData = useAdjustedBases
//       ? newAdjustedPeaksData
//       : peaksData || [];

//     // Recalculate ascent and descent analysis based on the final peaks data
//     const recalculatedPeaksData = finalPeaksData.map((peak) => {
//       return new Peak(
//         peak.peakCoords,
//         peak.leftBaseCoords,
//         peak.rightBaseCoords,
//         peak.prominences,
//         dataToUse,
//         useAdjustedBases,
//         peak.adjustedLeftBaseCoords,
//         peak.adjustedRightBaseCoords
//       );
//     });

//     // Calculate APD values for each peak
//     const newApdResults = recalculatedPeaksData
//       .map((peak, index) => {
//         const peakIndex = dataToUse.findIndex(
//           (point) => point.x === peak.peakCoords.x
//         );
//         if (peakIndex === -1) {
//           console.error("Peak index not found in data");
//           return null;
//         }
//         return calculatePeakAPDs(
//           dataToUse,
//           peakIndex,
//           regressionCoefficients.a,
//           regressionCoefficients.b,
//           regressionCoefficients.c
//         );
//       })
//       .filter((result) => result !== null); // Filter out null results
//     setApdResults(newApdResults);

//     // Extract APD values, ascent points, and descent points
//     const newApdValues = newApdResults.map((result) => result.apdValues);
//     const newApdAscentPoints = newApdResults.flatMap(
//       (result) => result.ascentPoints
//     );
//     const newApdDescentPoints = newApdResults.flatMap(
//       (result) => result.descentPoints
//     );
//     setApdValues(newApdValues);
//     setApdAscentPoints(newApdAscentPoints);
//     setApdDescentPoints(newApdDescentPoints);

//     // Calculate magnitude baselines
//     const newMagnitudeBaselines = newPeakEntries.map((peak) => {
//       const x = peak.x;
//       const baselineY =
//         regressionCoefficients.a * x ** 2 +
//         regressionCoefficients.b * x +
//         regressionCoefficients.c;
//       return { x: x, y: baselineY };
//     });
//     setMagnitudeBaselines(newMagnitudeBaselines);
//   }, [
//     selectedData,
//     peaksData,
//     smoothedData,
//     useAdjustedBases,
//     extractedIndicatorTimes,
//   ]);

//   // Update chart data based on checkbox state
//   const finalLeftBaseEntries = useAdjustedBases
//     ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
//     : leftBaseEntries;
//   const finalRightBaseEntries = useAdjustedBases
//     ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
//     : rightBaseEntries;

//   let indicatorTimes = Object.values(extractedIndicatorTimes);

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

//   return {
//     labels: indicatorTimes[0],
//     datasets: [
//       {
//         label: "Raw Signal",
//         data: selectedData,
//         borderColor: "rgb(153, 102, 255)",
//         tension: 0.1,
//         borderWidth: 1,
//         fill: false,
//         type: "line",
//       },
//       {
//         label: "Raw Points",
//         data: selectedData,
//         borderColor: "rgb(170, 170, 170)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: showDataPoints ? 3 : 0, // Conditionally set pointRadius
//         pointBackgroundColor: "rgba(255, 255, 255, 10)",
//         type: "scatter",
//       },
//       {
//         label: "Line of Best Fit",
//         data: lineOfBestFit,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1.5,
//         fill: false,
//         showLine: useAdjustedBases,
//         type: "line",
//       },
//       {
//         label: "Amplitude Baseline",
//         data: magnitudeBaselines,
//         borderColor: "rgb(255, 255, 255)",
//         borderWidth: 1,
//         fill: false,
//         pointRadius: showVerticalLines ? 3 : 0, // Conditionally set pointRadius
//         pointBackgroundColor: "rgb(255, 0, 0)",
//         type: "scatter",
//       },
//       {
//         label: "Peak",
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
//         data: apdAscentPoints,
//         borderColor: "orange",
//         backgroundColor: "orange",
//         pointRadius: showAscentPoints ? 2 : 0,
//         type: "scatter",
//       },
//       {
//         label: "Descent Analysis Points",
//         data: apdDescentPoints,
//         borderColor: "rgb(0, 135, 0)",
//         backgroundColor: "rgb(0, 135, 0)",
//         pointRadius: showDescentPoints ? 2 : 0,
//         type: "scatter",
//       },
//       ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
//     ],
//   };
// };

// export default usePrepareChartData;
import { useContext } from "react";
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
  const {
    showVerticalLines,
    showDataPoints,
    showAscentPoints,
    showDescentPoints,
    apdAscentPoints,
    apdDescentPoints,
    lineOfBestFit,
    magnitudeBaselines,
    adjustedPeaksData,
    leftBaseEntries,
    rightBaseEntries,
    peakEntries,
  } = useContext(AnalysisContext);

  // Update chart data based on checkbox state
  const finalLeftBaseEntries = useAdjustedBases
    ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
    : leftBaseEntries;
  const finalRightBaseEntries = useAdjustedBases
    ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
    : rightBaseEntries;

  let indicatorTimes = Object.values(extractedIndicatorTimes);

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

  return {
    labels: indicatorTimes[0],
    datasets: [
      {
        label: "Raw Signal",
        data: selectedData,
        borderColor: "rgb(153, 102, 255)",
        tension: 0.1,
        borderWidth: 1,
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
        type: "scatter",
      },
      {
        label: "Line of Best Fit",
        data: lineOfBestFit,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1.5,
        fill: false,
        showLine: useAdjustedBases,
        type: "line",
      },
      {
        label: "Amplitude Baseline",
        data: magnitudeBaselines,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: showVerticalLines ? 3 : 0, // Conditionally set pointRadius
        pointBackgroundColor: "rgb(255, 0, 0)",
        type: "scatter",
      },
      {
        label: "Peak",
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
        data: apdAscentPoints,
        borderColor: "orange",
        backgroundColor: "orange",
        pointRadius: showAscentPoints ? 2 : 0,
        type: "scatter",
      },
      {
        label: "Descent Analysis Points",
        data: apdDescentPoints,
        borderColor: "rgb(0, 135, 0)",
        backgroundColor: "rgb(0, 135, 0)",
        pointRadius: showDescentPoints ? 2 : 0,
        type: "scatter",
      },
      ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
    ],
  };
};

export default usePrepareChartData;
