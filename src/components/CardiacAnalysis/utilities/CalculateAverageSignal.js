// export const calculateAverageSignal = (
//   baselineData,
//   peakResults,
//   windowWidth
// ) => {
//   const averagedSignal = [];
//   const halfWindowWidth = windowWidth / 2;
//   const offsetMin = -halfWindowWidth;
//   const offsetMax = halfWindowWidth;

//   for (let i = offsetMin; i <= offsetMax; i++) {
//     let averageValue = { x: 0, y: 0 };
//     for (let j = 0; j < peakResults.length; j++) {
//       let peak = peakResults[j].peakCoords;
//       let ndx = baselineData.findIndex(
//         (point) => point.x === peak.x && point.y === peak.y
//       );
//       ndx += i;
//       averageValue = {
//         x: averageValue.x,
//         y: averageValue.y + baselineData[ndx].y,
//       };
//     }
//     averageValue.y /= peakResults.length;
//     averagedSignal.push(averageValue);
//   }
//   return averagedSignal;
// };

export const calculateAverageSignal = (
  baselineData,
  peakResults,
  windowWidth
) => {
  const averagedSignal = [];
  const halfWindowWidth = Math.floor(windowWidth / 2); // Ensure it's an integer
  const offsetMin = -halfWindowWidth;
  const offsetMax = halfWindowWidth;

  for (let i = offsetMin; i <= offsetMax; i++) {
    let averageValue = { x: 0, y: 0 };
    let validPeakCount = 0; // Track the number of valid peaks contributing to this point

    for (let j = 0; j < peakResults.length; j++) {
      const peak = peakResults[j].peakCoords;

      // Find the index of the peak in baselineData
      const peakIndex = baselineData.findIndex(
        (point) => point.x === peak.x && point.y === peak.y
      );

      // Skip if the peak is not found
      if (peakIndex === -1) {
        console.warn(`Peak not found in baselineData:`, peak);
        continue;
      }

      // Calculate the adjusted index
      const ndx = peakIndex + i;

      // Skip if the adjusted index is out of bounds
      if (ndx < 0 || ndx >= baselineData.length) {
        continue;
      }

      // Accumulate the y-value and count valid peaks
      averageValue = {
        x: baselineData[ndx].x, // Use the x-coordinate of the valid point
        y: averageValue.y + baselineData[ndx].y,
      };
      validPeakCount++;
    }

    // Calculate the average y-value if there are valid peaks
    if (validPeakCount > 0) {
      averageValue.y /= validPeakCount;
      averagedSignal.push(averageValue);
    }
  }

  return averagedSignal;
};
