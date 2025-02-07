import { adjustBase } from "./AdjustBase";
import { Peak } from "../classes/Peak";
import { prepareQuadraticData, quadraticRegression } from "./Regression";

export const prepareChartData = (
  selectedData,
  peaksData,
  smoothedData,
  peakProminence,
  findPeaksWindowWidth,
  extractedIndicatorTimes,
  useAdjustedBases
) => {
  const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

  // Extract peak and baseline coordinates
  const peakEntries = peaksData.map((peak) => peak.peakCoords);
  const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
  const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

  // Filter data and perform quadratic regression
  const filteredData = prepareQuadraticData(dataToUse, peaksData);
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

  const adjustedPeaksData = peaksData.map((peak) => {
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
  });

  // Use the adjusted peaks data if the checkbox is checked
  const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

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

  return {
    labels: indicatorTimes[0],
    datasets: [
      {
        label: "Raw Signal",
        data: selectedData,
        borderColor: "rgba(75, 192, 192, 1)",
        tension: 0.1,
        fill: false,
        type: "line",
      },
      {
        label: "Line of Best Fit",
        data: lineOfBestFit,
        borderColor: "rgb(0, 0, 0)",
        borderWidth: 1,
        fill: false,
        type: "line",
      },
      {
        label: "Peaks",
        data: peakEntries,
        borderColor: "rgb(255, 0, 0)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(255, 0, 0)",
        type: "scatter",
      },
      {
        label: "Left Bases",
        data: finalLeftBaseEntries,
        borderColor: "rgb(195, 0, 255)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(195, 0, 255)",
        type: "scatter",
      },
      {
        label: "Right Bases",
        data: finalRightBaseEntries,
        borderColor: "rgb(2, 107, 2)",
        borderWidth: 1,
        fill: false,
        pointRadius: 5,
        pointBackgroundColor: "rgb(0, 93, 0)",
        type: "scatter",
      },
      {
        label: "Ascent Analysis",
        data: ascentEntries, // Ascent analysis points in { x, y } format
        borderColor: "orange",
        backgroundColor: "orange",
        pointRadius: 3,
        type: "scatter",
      },
      {
        label: "Descent Analysis",
        data: descentEntries, // Descent analysis points in { x, y } format
        borderColor: "rgb(0, 6, 115)",
        backgroundColor: "rgb(0, 6, 115)",
        pointRadius: 3,
        type: "scatter",
      },
    ],
  };
};
