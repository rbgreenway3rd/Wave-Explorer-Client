// import React, { useContext, useEffect, useState } from "react";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { Peak } from "../../classes/Peak";
// import {
//   prepareQuadraticData,
//   quadraticRegression,
// } from "../../utilities/Regression";
// import { adjustBase } from "../../utilities/AdjustBase";

// const PeakMagnitude = (
//   selectedData,
//   peaksData,
//   smoothedData,
//   peakProminence,
//   findPeaksWindowWidth,
//   extractedIndicatorTimes,
//   useAdjustedBases
// ) => {
//   const {
//     peakResults,
//     selectedWell,
//     peakMagnitudes,
//     setPeakMagnitudes,
//     averageMagnitude,
//     setAverageMagnitude,
//   } = useContext(AnalysisContext);
//   //   const [averageMagnitude, setAverageMagnitude] = useState(0);

//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }

//     const dataToUse = selectedWell.indicators[0].filteredData;

//     // Filter data and perform quadratic regression
//     const filteredData = prepareQuadraticData(dataToUse, peakResults);
//     const regressionCoefficients = quadraticRegression(filteredData);
//     console.log(peakResults);

//     // Calculate magnitude for each Peak
//     const magnitudes = peakResults.map((peak) => {
//       const x = peak.peakCoords.x;
//       const baselineY =
//         regressionCoefficients.a * x ** 2 +
//         regressionCoefficients.b * x +
//         regressionCoefficients.c;
//       const magnitude = peak.peakCoords.y - baselineY;
//       console.log(baselineY, peak.peakCoords.y, magnitude);
//       return magnitude;
//     });

//     setPeakMagnitudes(magnitudes);

//     // Calculate average magnitude
//     const totalMagnitude = magnitudes.reduce((acc, curr) => acc + curr, 0);
//     const averageMagnitude =
//       magnitudes.length > 0 ? totalMagnitude / magnitudes.length : 0;
//     setAverageMagnitude(averageMagnitude);
//   }, [selectedWell, peakResults]);

//   return (
//     <div>
//       <ul>
//         {peakMagnitudes.map((magnitude, index) => (
//           <li key={index}>
//             Peak {index + 1} Magnitude: {magnitude}
//           </li>
//         ))}
//       </ul>
//       Average Magnitude: {averageMagnitude}
//     </div>
//   );
// };

// export default PeakMagnitude;
