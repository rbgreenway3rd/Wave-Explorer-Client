export const calculatePeakProminence = (baseline) => {
  if (!Array.isArray(baseline) || baseline.length === 0) {
    throw new Error("Baseline must be a non-empty array.");
  }

  // Find the maximum and minimum y values in the baseline data
  const maxY = Math.max(...baseline.map((point) => point.y));
  const minY = Math.min(...baseline.map((point) => point.y));

  // Calculate the peak prominence as 75% of the distance between maxY and minY
  //   const peakProminence = 0.5 * (maxY - minY);
  const peakProminence = Math.floor(0.5 * maxY);

  return peakProminence;
};
