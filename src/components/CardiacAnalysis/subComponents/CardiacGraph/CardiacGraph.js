// import React, { useEffect, useState, useContext } from "react";
// import { Line } from "react-chartjs-2";
// import { Peak } from "../../classes/Peak";
// import { Chart, registerables } from "chart.js";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { DataContext } from "../../../../providers/DataProvider";
// import { findPeaks } from "../../utilities/PeakFinder";
// import {
//   prepareQuadraticData,
//   quadraticRegression,
// } from "../../utilities/Regression";
// import { adjustBase } from "../../utilities/AdjustBase";

// Chart.register(...registerables);

// export const CardiacGraph = () => {
//   const { selectedWell } = useContext(AnalysisContext);
//   const { extractedIndicatorTimes } = useContext(DataContext);
//   const [chartData, setChartData] = useState(null);
//   const [peakResults, setPeakResults] = useState([]);
//   const [smoothedData, setSmoothedData] = useState([]);
//   const [peakProminence, setPeakProminence] = useState(25000); // State for peak prominence
//   const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80); // State for peak prominence
//   const [useAdjustedBases, setUseAdjustedBases] = useState(true); // State to track checkbox
//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }

//     const selectedData = selectedWell.indicators[0].filteredData;

//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

//     // Detect peaks using the new findPeaks function
//     const peaksData = findPeaks(
//       dataToUse, // Data
//       peakProminence, // Prominence
//       findPeaksWindowWidth // Window Width
//     );
//     console.log(selectedData);
//     // Extract peak and baseline coordinates
//     const peakEntries = peaksData.map((peak) => peak.peakCoords);
//     const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
//     const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

//     setPeakResults(peaksData);

//     // Filter data and perform quadratic regression
//     const filteredData = prepareQuadraticData(dataToUse, peaksData);
//     console.log(filteredData);
//     const regressionCoefficients = quadraticRegression(filteredData);

//     console.log("regress coeff", regressionCoefficients);

//     // Adjust the positions of the left and right bases for each peak

//     // Generate line-of-best-fit data
//     const lineOfBestFit = filteredData.map((point) => {
//       const x = point.x;
//       const y =
//         regressionCoefficients.a * x ** 2 +
//         regressionCoefficients.b * x +
//         regressionCoefficients.c;
//       return { x, y };
//     });

//     console.log(lineOfBestFit);
//     let indicatorTimes = Object.values(extractedIndicatorTimes);
//     const adjustedPeaksData = peaksData.map((peak) => {
//       const adjustedLeftBase = adjustBase(
//         peak.leftBaseCoords,
//         lineOfBestFit,
//         dataToUse,
//         true
//       );
//       const adjustedRightBase = adjustBase(
//         peak.rightBaseCoords,
//         lineOfBestFit,
//         dataToUse,
//         false
//       );
//       return {
//         ...peak,
//         adjustedLeftBaseCoords: adjustedLeftBase,
//         adjustedRightBaseCoords: adjustedRightBase,
//       };
//     });

//     // Use the adjusted peaks data if the checkbox is checked
//     const finalPeaksData = useAdjustedBases ? adjustedPeaksData : peaksData;

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

//     // Extract ascent and descent analysis data
//     const ascentEntries = recalculatedPeaksData.flatMap(
//       (peak) => peak.ascentAnalysis
//     );
//     const descentEntries = recalculatedPeaksData.flatMap(
//       (peak) => peak.descentAnalysis
//     );

//     // Update chart data based on checkbox state
//     const finalLeftBaseEntries = useAdjustedBases
//       ? adjustedPeaksData.map((peak) => peak.adjustedLeftBaseCoords)
//       : leftBaseEntries;
//     const finalRightBaseEntries = useAdjustedBases
//       ? adjustedPeaksData.map((peak) => peak.adjustedRightBaseCoords)
//       : rightBaseEntries;

//     // Set chart data
//     setChartData({
//       labels: indicatorTimes[0],
//       datasets: [
//         {
//           label: "Raw Signal",
//           data: selectedData,
//           borderColor: "rgba(75, 192, 192, 1)",
//           tension: 0.1,
//           fill: false,
//           type: "line",
//         },
//         {
//           label: "Line of Best Fit",
//           data: lineOfBestFit,
//           borderColor: "rgb(0, 0, 0)",
//           borderWidth: 1,
//           fill: false,
//           type: "line",
//         },
//         {
//           label: "Peaks",
//           data: peakEntries,
//           borderColor: "rgb(255, 0, 0)",
//           borderWidth: 1,
//           fill: false,
//           pointRadius: 5,
//           pointBackgroundColor: "rgb(255, 0, 0)",
//           type: "scatter",
//         },
//         {
//           label: "Left Bases",
//           data: finalLeftBaseEntries,
//           borderColor: "rgb(195, 0, 255)",
//           borderWidth: 1,
//           fill: false,
//           pointRadius: 5,
//           pointBackgroundColor: "rgb(195, 0, 255)",
//           type: "scatter",
//         },
//         {
//           label: "Right Bases",
//           data: finalRightBaseEntries,
//           borderColor: "rgb(2, 107, 2)",
//           borderWidth: 1,
//           fill: false,
//           pointRadius: 5,
//           pointBackgroundColor: "rgb(0, 93, 0)",
//           type: "scatter",
//         },
//         {
//           label: "Ascent Analysis",
//           data: ascentEntries, // Ascent analysis points in { x, y } format
//           borderColor: "orange",
//           backgroundColor: "orange",
//           pointRadius: 3,
//           type: "scatter",
//         },
//         {
//           label: "Descent Analysis",
//           data: descentEntries, // Descent analysis points in { x, y } format
//           borderColor: "rgb(0, 6, 115)",
//           backgroundColor: "rgb(0, 6, 115)",
//           pointRadius: 3,
//           type: "scatter",
//         },
//       ],
//     });
//   }, [
//     selectedWell,
//     smoothedData,
//     peakProminence,
//     findPeaksWindowWidth,
//     extractedIndicatorTimes,
//     useAdjustedBases,
//   ]);

//   const chartOptions = {
//     normalized: true,
//     maintainAspectRatio: true,
//     responsive: true,
//     devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

//     spanGaps: false,
//     events: ["onHover"],
//     animation: {
//       duration: 0,
//     },
//     parsing: false,
//     plugins: {
//       legend: true,
//       decimation: {
//         enabled: false,
//         algorithm: "lttb",
//         samples: 40,
//         threshold: 80,
//       },
//       tooltip: {
//         enabled: true, // set to FALSE if using an external function for tooltip
//         mode: "nearest",
//         intersect: false,
//       },
//     },
//     elements: {
//       point: {
//         radius: 0,
//       },
//       line: {
//         borderWidth: 1.5,
//       },
//     },
//     // layout: {
//     //   autoPadding: false,
//     //   padding: {
//     //     left: -30,
//     //     bottom: -30,
//     //   },
//     // },
//     scales: {
//       x: {
//         type: "linear",
//         position: "bottom",
//         min: Math.min(extractedIndicatorTimes[0]),
//         max: Math.max(extractedIndicatorTimes[0]),
//         // min: Math.min(...extractedIndicatorTimes[0]),
//         // max: Math.max(...extractedIndicatorTimes[0]),
//         // min: minXValue,
//         // max: maxXValue,
//         ticks: {
//           display: true,
//         },
//         grid: {
//           display: false,
//         },
//       },
//       y: {
//         // min: minYValue,
//         // max: maxYValue,
//         ticks: {
//           display: true,
//         },
//         grid: {
//           display: false,
//         },
//       },
//     },
//   };

//   console.log("cardiacGraph", chartData);

//   return (
//     <div>
//       <label>
//         <input
//           type="checkbox"
//           checked={useAdjustedBases}
//           onChange={(e) => setUseAdjustedBases(e.target.checked)}
//         />
//         Use Adjusted Bases
//       </label>
//       {selectedWell ? (
//         <div>
//           <h2>Cardiac Graph for Well {selectedWell.label}</h2>
//           {chartData && <Line data={chartData} options={chartOptions} />}
//         </div>
//       ) : (
//         <p>No well selected</p>
//       )}
//     </div>
//   );
// };

// export default CardiacGraph;
// import React, { useEffect, useState, useContext } from "react";
// import { Line } from "react-chartjs-2";
// import { Chart, registerables } from "chart.js";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { DataContext } from "../../../../providers/DataProvider";
// import { findPeaks } from "../../utilities/PeakFinder";
// import { prepareChartData } from "../../utilities/PrepareChartData";
// import { getChartOptions } from "./ChartOptions";

// Chart.register(...registerables);

// export const CardiacGraph = () => {
//   const { selectedWell } = useContext(AnalysisContext);
//   const { extractedIndicatorTimes } = useContext(DataContext);
//   const [chartData, setChartData] = useState(null);
//   const [peakResults, setPeakResults] = useState([]);
//   const [smoothedData, setSmoothedData] = useState([]);
//   const [peakProminence, setPeakProminence] = useState(25000); // State for peak prominence
//   const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80); // State for peak prominence
//   const [useAdjustedBases, setUseAdjustedBases] = useState(true); // State to track checkbox

//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }

//     const selectedData = selectedWell.indicators[0].filteredData;

//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     // Detect peaks using the new findPeaks function
//     const peaksData = findPeaks(
//       selectedData, // Data
//       peakProminence, // Prominence
//       findPeaksWindowWidth // Window Width
//     );

//     setPeakResults(peaksData);

//     // Prepare chart data
//     const chartData = prepareChartData(
//       selectedData,
//       peaksData,
//       smoothedData,
//       peakProminence,
//       findPeaksWindowWidth,
//       extractedIndicatorTimes,
//       useAdjustedBases
//     );

//     setChartData(chartData);
//     // console.log(peakResults);
//   }, [
//     selectedWell,
//     smoothedData,
//     peakProminence,
//     findPeaksWindowWidth,
//     extractedIndicatorTimes,
//     useAdjustedBases,
//   ]);

//   const chartOptions = getChartOptions(extractedIndicatorTimes);

//   // Calculate average descent at each percentage
//   const averageDescent = Array.from({ length: 9 }, (_, i) => {
//     // const percentage = (i + 1) * 10;
//     const totalDescent = peakResults.reduce((sum, peak) => {
//       const descent = peak.descentAnalysis[i];
//       return sum + (descent ? descent.x - peak.peakCoords.x : 0);
//     }, 0);
//     return totalDescent / peakResults.length;
//   });

//   return (
//     <div>
//       {selectedWell ? (
//         <div>
//           <h2>Cardiac Graph for Well {selectedWell.label}</h2>
//           <div
//             className="chart-controls"
//             style={{ display: "flex", flexDirection: "column" }}
//           >
//             <label>
//               Use Normalized Bases{" "}
//               <input
//                 type="checkbox"
//                 checked={useAdjustedBases}
//                 onChange={(e) => setUseAdjustedBases(e.target.checked)}
//               />
//             </label>
//             <label>
//               Window width:{" "}
//               <input
//                 type="number"
//                 step={10}
//                 value={findPeaksWindowWidth}
//                 onChange={(e) => setFindPeaksWindowWidth(e.target.value)}
//               />
//             </label>
//             <label>
//               Peak Prominence:{" "}
//               <input
//                 type="number"
//                 step={1000}
//                 value={peakProminence}
//                 onChange={(e) => setPeakProminence(e.target.value)}
//               />
//             </label>
//           </div>
//           {chartData && (
//             <Line
//               data={chartData}
//               options={chartOptions}
//               style={{
//                 background: "rgb(0, 0, 0)",
//               }}
//             />
//           )}
//           <div>
//             <ul>
//               {peakResults.map((peak, index) => (
//                 <li key={index}>
//                   Peak {index + 1}: {peak.peakCoords.x.toFixed(2)}
//                   <section>
//                     Descent Time:
//                     {peak.descentAnalysis.map((descent, index) => (
//                       <div key={index}>
//                         at {(index + 1) * 10}%:{" "}
//                         {(descent.x - peak.peakCoords.x).toFixed(2)}
//                       </div>
//                     ))}
//                     <div>
//                       at baseline: {peak.rightBaseCoords.x - peak.peakCoords.x}
//                     </div>
//                   </section>
//                 </li>
//               ))}
//             </ul>
//           </div>
//           <div>
//             <h3>Average Descent Times</h3>
//             <ul>
//               {averageDescent.map((descent, index) => (
//                 <li key={index}>
//                   {(index + 1) * 10}%: {descent.toFixed(2)}
//                 </li>
//               ))}
//             </ul>
//           </div>
//         </div>
//       ) : (
//         <p>No well selected</p>
//       )}
//     </div>
//   );
// };

// export default CardiacGraph;

// import React, { useEffect, useState, useContext } from "react";
// import { Line } from "react-chartjs-2";
// import { Chart, registerables } from "chart.js";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { DataContext } from "../../../../providers/DataProvider";
// import { findPeaks } from "../../utilities/PeakFinder";
// import { prepareChartData } from "../../utilities/PrepareChartData";
// import { getChartOptions } from "./ChartOptions";
// import "../../styles/CardiacGraph.css";

// Chart.register(...registerables);

// export const CardiacGraph = ({
//   useAdjustedBases,
//   findPeaksWindowWidth,
//   peakProminence,
// }) => {
//   const { selectedWell } = useContext(AnalysisContext);
//   const { extractedIndicatorTimes } = useContext(DataContext);
//   const [chartData, setChartData] = useState(null);
//   const [peakResults, setPeakResults] = useState([]);
//   const [smoothedData, setSmoothedData] = useState([]);

//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }

//     const selectedData = selectedWell.indicators[0].filteredData;

//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     // Detect peaks using the new findPeaks function
//     const peaksData = findPeaks(
//       selectedData, // Data
//       peakProminence, // Prominence
//       findPeaksWindowWidth // Window Width
//     );

//     setPeakResults(peaksData);

//     // Prepare chart data
//     const chartData = prepareChartData(
//       selectedData,
//       peaksData,
//       smoothedData,
//       peakProminence,
//       findPeaksWindowWidth,
//       extractedIndicatorTimes,
//       useAdjustedBases
//     );

//     setChartData(chartData);
//     // console.log(peakResults);
//   }, [
//     selectedWell,
//     smoothedData,
//     peakProminence,
//     findPeaksWindowWidth,
//     extractedIndicatorTimes,
//     useAdjustedBases,
//   ]);

//   const chartOptions = getChartOptions(extractedIndicatorTimes);

//   // Calculate average descent at each percentage
//   const averageDescent = Array.from({ length: 9 }, (_, i) => {
//     // const percentage = (i + 1) * 10;
//     const totalDescent = peakResults.reduce((sum, peak) => {
//       const descent = peak.descentAnalysis[i];
//       return sum + (descent ? descent.x - peak.peakCoords.x : 0);
//     }, 0);
//     return totalDescent / peakResults.length;
//   });

//   return (
//     <div>
//       {selectedWell ? (
//         <div className="cardiac-graph-container">
//           <h2>Cardiac Graph for Well {selectedWell.label}</h2>
//           {chartData && (
//             <Line
//               data={chartData}
//               options={chartOptions}
//               style={{
//                 background: "rgb(0, 0, 0)",
//               }}
//             />
//           )}
//           <section className="cardiac-graph-results">
//             <div>
//               <ul>
//                 {peakResults.map((peak, index) => (
//                   <li key={index}>
//                     Peak {index + 1}: {peak.peakCoords.x.toFixed(2)}
//                     <section>
//                       Descent Time:
//                       {peak.descentAnalysis.map((descent, index) => (
//                         <div key={index}>
//                           at {(index + 1) * 10}%:{" "}
//                           {(descent.x - peak.peakCoords.x).toFixed(2)}
//                         </div>
//                       ))}
//                       <div>
//                         at baseline:{" "}
//                         {(peak.rightBaseCoords.x - peak.peakCoords.x).toFixed(
//                           2
//                         )}
//                       </div>
//                     </section>
//                   </li>
//                 ))}
//               </ul>
//             </div>
//             <div>
//               <h3>Average Descent Times</h3>
//               <ul>
//                 {averageDescent.map((descent, index) => (
//                   <li key={index}>
//                     {(index + 1) * 10}%: {descent.toFixed(2)}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           </section>
//         </div>
//       ) : (
//         <p>No well selected</p>
//       )}
//     </div>
//   );
// };

// export default CardiacGraph;

import React, { useEffect, useState, useContext } from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { AnalysisContext } from "../../AnalysisProvider";
import { DataContext } from "../../../../providers/DataProvider";
import { findPeaks } from "../../utilities/PeakFinder";
import { prepareChartData } from "../../utilities/PrepareChartData";
import { getChartOptions } from "./ChartOptions";
import AnalysisResults from "../AnalysisResults/AnalysisResults";
import "../../styles/CardiacGraph.css";

Chart.register(...registerables);

export const CardiacGraph = ({
  useAdjustedBases,
  findPeaksWindowWidth,
  peakProminence,
}) => {
  const { selectedWell } = useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);
  const [chartData, setChartData] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [smoothedData, setSmoothedData] = useState([]);

  useEffect(() => {
    if (!selectedWell) {
      console.error("No well selected");
      return;
    }

    const selectedData = selectedWell.indicators[0].filteredData;

    if (!selectedData || selectedData.length === 0) {
      console.error("Selected data is empty or undefined");
      return;
    }

    // Detect peaks using the new findPeaks function
    const peaksData = findPeaks(
      selectedData, // Data
      peakProminence, // Prominence
      findPeaksWindowWidth // Window Width
    );

    setPeakResults(peaksData);

    // Prepare chart data
    const chartData = prepareChartData(
      selectedData,
      peaksData,
      smoothedData,
      peakProminence,
      findPeaksWindowWidth,
      extractedIndicatorTimes,
      useAdjustedBases
    );

    setChartData(chartData);
    // console.log(peakResults);
  }, [
    selectedWell,
    smoothedData,
    peakProminence,
    findPeaksWindowWidth,
    extractedIndicatorTimes,
    useAdjustedBases,
  ]);

  const chartOptions = getChartOptions(extractedIndicatorTimes);

  // Calculate average descent at each percentage
  const averageDescent = Array.from({ length: 9 }, (_, i) => {
    // const percentage = (i + 1) * 10;
    const totalDescent = peakResults.reduce((sum, peak) => {
      const descent = peak.descentAnalysis[i];
      return sum + (descent ? descent.x - peak.peakCoords.x : 0);
    }, 0);
    return totalDescent / peakResults.length;
  });

  return (
    <div>
      {selectedWell ? (
        <div className="cardiac-graph-container">
          <h2>Cardiac Graph for Well {selectedWell.label}</h2>
          {chartData && (
            <Line
              data={chartData}
              options={chartOptions}
              style={{
                background: "rgb(0, 0, 0)",
              }}
            />
          )}
          <AnalysisResults
            peakResults={peakResults}
            averageDescent={averageDescent}
          />
        </div>
      ) : (
        <p>No well selected</p>
      )}
    </div>
  );
};

export default CardiacGraph;
