import { findBaseline } from "./utilities/FindBaseline";
import { calculatePeakProminence } from "./utilities/CalculatePeakProminence";
import { calculateWindowWidth } from "./utilities/CalculateWindowWidth";
import { findPeaks } from "./utilities/PeakFinder";
import { calculateMedianSignal } from "./utilities/CalculateMedianSignal";
import { applyMedianFilter } from "./utilities/MedianFilter";
import { findBaselineAndPeak } from "./utilities/CalculateAPD";
import { calculateAPDValues } from "./utilities/CalculateAPD";

export const generateCardiacReport = (wellsArray) => {
  // Access the actual array of wells
  const wells = wellsArray.allWells;

  if (!Array.isArray(wells)) {
    console.error(
      "Invalid wellsArray structure. Expected an array in 'allWells'."
    );
    return;
  }

  const apdPercentages = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const allResults = [];

  wells.forEach((well) => {
    try {
      // Step 1: Find baseline data
      const baselineData = findBaseline(well.indicators[0].filteredData);

      // Step 2: Calculate peak prominence
      const peakProminence = calculatePeakProminence(baselineData, 0.5);

      // Step 3: Calculate window width
      const windowWidth = calculateWindowWidth(baselineData, peakProminence, 3);

      // Step 4: Find peaks
      const peaks = findPeaks(baselineData, peakProminence, windowWidth);

      // Step 5: Calculate median signal
      const medianSignal = calculateMedianSignal(
        baselineData,
        peaks,
        windowWidth
      );

      // Step 6: Apply median filter
      const filteredMedianSignal = applyMedianFilter(medianSignal, 3);

      // Step 7: Find baseline and peak
      const { baseline, peak } = findBaselineAndPeak(filteredMedianSignal);

      // Step 8: Calculate APD values
      const apdResults = calculateAPDValues(
        filteredMedianSignal,
        baseline,
        peak,
        apdPercentages
      );

      // Step 9: Calculate amplitude
      const amplitude =
        peak && baseline ? (peak.y - baseline.y).toFixed(2) : "Not available";

      // Step 10: Calculate average time between peaks
      const averageTimeBetweenPeaks =
        peaks.length > 1
          ? peaks
              .slice(1)
              .reduce(
                (sum, peak, index) =>
                  sum + (peak.peakCoords.x - peaks[index].peakCoords.x),
                0
              ) /
            (peaks.length - 1)
          : 0;

      // Store results for this well
      allResults.push({
        wellKey: well.key,
        baselineData,
        peakProminence,
        windowWidth,
        numberOfPeaks: peaks.length,
        averageTimeBetweenPeaks: averageTimeBetweenPeaks.toFixed(2), // Include calculated value
        peaks,
        medianSignal,
        filteredMedianSignal,
        amplitude,
        baseline,
        peak,
        apdResults,
      });
    } catch (error) {
      console.error(`Error processing well ${well.key}:`, error);
    }
  });

  // Log the final results for all wells
  console.log("Final Results for All Wells:", allResults);

  // Return results if needed for further processing
  return allResults;
};

// filepath: /home/rbgreenway/workspace/WaveExplorer/frontend/src/components/CardiacAnalysis/CardiacReport.js
export const generateCardiacReportCSV = (wellsArray) => {
  const allResults = generateCardiacReport(wellsArray);

  if (!allResults || allResults.length === 0) {
    console.error("No results available to generate CSV.");
    return;
  }

  const headers = [
    "Well",
    "numberOfPeaks",
    "Amplitude",
    "avg PTP Time",
    "APD10",
    "APD20",
    "APD30",
    "APD40",
    "APD50",
    "APD60",
    "APD70",
    "APD80",
    "APD90",
  ];

  const csvRows = [headers.join(",")];

  allResults.forEach((result) => {
    const {
      wellKey,
      numberOfPeaks,
      amplitude,
      averageTimeBetweenPeaks,
      apdResults = {},
    } = result;

    const apdValues = [
      apdResults.APD10?.value?.toFixed(2) || "N/A",
      apdResults.APD20?.value?.toFixed(2) || "N/A",
      apdResults.APD30?.value?.toFixed(2) || "N/A",
      apdResults.APD40?.value?.toFixed(2) || "N/A",
      apdResults.APD50?.value?.toFixed(2) || "N/A",
      apdResults.APD60?.value?.toFixed(2) || "N/A",
      apdResults.APD70?.value?.toFixed(2) || "N/A",
      apdResults.APD80?.value?.toFixed(2) || "N/A",
      apdResults.APD90?.value?.toFixed(2) || "N/A",
    ];

    const row = [
      wellKey,
      numberOfPeaks,
      amplitude,
      averageTimeBetweenPeaks, // Include avgPTPTime in the CSV
      ...apdValues,
    ];

    csvRows.push(row.join(","));
  });

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "CardiacAnalysisReport.csv";
  link.click();

  URL.revokeObjectURL(url);
  console.log("CSV file generated and download triggered.");
};
