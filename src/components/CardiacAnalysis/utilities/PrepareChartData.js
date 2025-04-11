import { useContext, useEffect } from "react";
import { AnalysisContext } from "../AnalysisProvider";
import { processExcelData } from "../../FileHandling/Matlab/MatlabClone";
import { findBaseline } from "./FindBaseline";
import { borderColor } from "@mui/system";
import { findPeaks } from "./PeakFinder";
import { interpolatePoints } from "./InterpolatePoints";

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
    showBaselineData,
    showSelectedData,
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
    peakResults,
  } = useContext(AnalysisContext);

  let indicatorTimes = Object.values(extractedIndicatorTimes);

  let interpolatedRisePoints =
    Array.isArray(peakResults) && peakResults.length > 0
      ? interpolatePoints(peakResults)
      : [];

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
        showLine: showBaselineData,
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
      //   label: "interpolated rise points",
      //   data: interpolatedRisePoints,
      //   borderColor: "rgb(255, 255, 255)",
      //   borderWidth: 1,
      //   fill: false,
      //   pointRadius: 2.5,
      //   pointBackgroundColor: "rgb(200, 202, 133)",
      //   type: "scatter",
      // },
      // ...verticalLineDatasets, // Spread the vertical line datasets into the main datasets array
    ],
  };
};

export default usePrepareChartData;
