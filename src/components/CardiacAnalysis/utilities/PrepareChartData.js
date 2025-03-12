import { useContext, useEffect } from "react";
import { AnalysisContext } from "../AnalysisProvider";
import { processExcelData } from "../../FileHandling/Matlab/MatlabClone";
import { findBaseline } from "./FindBaseline";
import { borderColor } from "@mui/system";
import { findPeaks } from "./PeakFinder";

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
    // apdAscentPoints,
    // apdDescentPoints,
    lineOfBestFit,
    magnitudeBaselines,
    adjustedPeaksData,
    leftBaseEntries,
    rightBaseEntries,
    peakEntries,
    ApdData, // Add ApdData to context
    baselineData,
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

  // const baseline = selectedData ? findBaseline(selectedData) : null;
  // console.log(baseline);

  // const peaksData = baseline
  //   ? findPeaks(
  //       baseline, // Data
  //       peakProminence, // Prominence
  //       findPeaksWindowWidth // Window Width
  //     )
  //   : null;

  return {
    labels: indicatorTimes[0],
    datasets: [
      {
        label: "adjusted signal",
        data: baselineData,
        borderColor: "rgb(153, 102, 255)",
        tension: 0.1,
        borderWidth: 1,
        fill: false,
        type: "line",
      },
      // {
      //   label: "Raw Signal",
      //   data: selectedData,
      //   borderColor: "rgb(153, 102, 255)",
      //   tension: 0.1,
      //   borderWidth: 1,
      //   fill: false,
      //   type: "line",
      // },
      // {
      //   label: "Raw Points",
      //   data: selectedData,
      //   borderColor: "rgb(170, 170, 170)",
      //   borderWidth: 1,
      //   fill: false,
      //   pointRadius: showDataPoints ? 3 : 0, // Conditionally set pointRadius
      //   pointBackgroundColor: "rgba(255, 255, 255, 10)",
      //   type: "scatter",
      // },
      // {
      //   label: "Line of Best Fit",
      //   data: lineOfBestFit,
      //   borderColor: "rgb(255, 255, 255)",
      //   borderWidth: 1.5,
      //   fill: false,
      //   showLine: useAdjustedBases,
      //   type: "line",
      // },
      // {
      //   label: "Amplitude Baseline",
      //   data: magnitudeBaselines,
      //   borderColor: "rgb(255, 255, 255)",
      //   borderWidth: 1,
      //   fill: false,
      //   pointRadius: showVerticalLines ? 3 : 0, // Conditionally set pointRadius
      //   pointBackgroundColor: "rgb(255, 0, 0)",
      //   type: "scatter",
      // },
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
      // {
      //   label: "Peak",
      //   data: peakEntries,
      //   borderColor: "rgb(255, 255, 255)",
      //   borderWidth: 1,
      //   fill: false,
      //   pointRadius: 5,
      //   pointBackgroundColor: "rgb(255, 0, 0)",
      //   type: "scatter",
      // },
      {
        label: "Left Bases",
        data: leftBaseEntries,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "orange",
        type: "scatter",
      },
      {
        label: "Right Bases",
        data: rightBaseEntries,
        borderColor: "rgb(255, 255, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(0, 135, 0)",
        type: "scatter",
      },
      // {
      //   label: "Ascent Analysis Points",
      //   data: apdAscentPoints,
      //   borderColor: "orange",
      //   backgroundColor: "orange",
      //   pointRadius: showAscentPoints ? 2 : 0,
      //   type: "scatter",
      // },
      // {
      //   label: "Descent Analysis Points",
      //   data: apdDescentPoints,
      //   borderColor: "rgb(0, 135, 0)",
      //   backgroundColor: "rgb(0, 135, 0)",
      //   pointRadius: showDescentPoints ? 2 : 0,
      //   type: "scatter",
      // },
      ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
    ],
  };
};

export default usePrepareChartData;
