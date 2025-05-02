export const generateCardiacReport = async ({
  allWells,
  calculateMedianSignal,
  calculateAPDValues,
  findBaselineAndPeak,
  setSelectedWell,
}) => {
  if (!allWells || allWells.length === 0) {
    console.error("No wells available for analysis.");
    return;
  }

  const csvRows = [];
  const headers = [
    "Well",
    "Number of Peaks",
    "Average Time Between Peaks (ms)",
    "Window Width",
    "Peak Prominence",
    "Prominence Factor",
    "Amplitude",
    "APD Values",
  ];
  csvRows.push(headers.join(","));

  for (const well of allWells) {
    // Set the selected well to perform analysis
    setSelectedWell(well);

    // Wait for the analysis to complete (if asynchronous)
    const baselineData = well.indicators[0]?.filteredData;
    const medianSignal = calculateMedianSignal(
      baselineData,
      well.peakResults,
      well.findPeaksWindowWidth
    );

    const { baseline, peak } = findBaselineAndPeak(medianSignal);
    const amplitude = peak && baseline ? peak.y - baseline.y : "N/A";

    const apdResults = calculateAPDValues(
      medianSignal,
      baseline,
      peak,
      [10, 20, 30, 40, 50, 60, 70, 80, 90]
    );

    const apdValues = apdResults
      ? Object.entries(apdResults)
          .map(([key, apd]) => `${key}: ${apd.value?.toFixed(2)}ms`)
          .join("; ")
      : "N/A";

    const row = [
      well.key,
      well.peakResults.length,
      well.avgPTPTime?.toFixed(2) || "N/A",
      well.findPeaksWindowWidth,
      well.peakProminence,
      well.prominenceFactor,
      amplitude.toFixed(2),
      apdValues,
    ];
    csvRows.push(row.join(","));
  }

  // Create a downloadable CSV file
  const csvContent = csvRows.join("\n");
  console.log("CSV Content:", csvContent); // Debugging line
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  // Create a temporary link and trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = "WellAnalysisReport.csv";
  link.click();

  // Clean up the URL object
  URL.revokeObjectURL(url);
};
