// // import React, { useEffect, useState, useContext } from "react";
// // import { Line } from "react-chartjs-2";
// // import { Chart, registerables } from "chart.js";
// // import { AnalysisContext } from "../../AnalysisProvider";
// // import { DataContext } from "../../../../providers/DataProvider";
// // import { findPeaks } from "../../utilities/PeakFinder";
// // import { prepareChartData } from "../../utilities/PrepareChartData";
// // import usePrepareChartData from "../../utilities/PrepareChartData";
// // import { getChartOptions } from "./ChartOptions";
// // import AnalysisResults from "../AnalysisResults/AnalysisResults";
// // import "../../styles/CardiacGraph.css";

// // Chart.register(...registerables);

// // export const CardiacGraph = ({
// //   useAdjustedBases,
// //   findPeaksWindowWidth,
// //   peakProminence,
// // }) => {
// //   const { selectedWell, peakResults, setPeakResults, peakMagnitudes } =
// //     useContext(AnalysisContext);
// //   const { extractedIndicatorTimes } = useContext(DataContext);
// //   const [chartData, setChartData] = useState(null);
// //   // const [peakResults, setPeakResults] = useState([]);
// //   const [smoothedData, setSmoothedData] = useState([]);

// //   // Detect peaks using the new findPeaks function
// //   const selectedData = selectedWell.indicators[0].filteredData;
// //   const peaksData = findPeaks(
// //     selectedData, // Data
// //     peakProminence, // Prominence
// //     findPeaksWindowWidth // Window Width
// //   );
// //   const preparedChartData = usePrepareChartData(
// //     selectedData,
// //     peaksData,
// //     smoothedData,
// //     peakProminence,
// //     findPeaksWindowWidth,
// //     extractedIndicatorTimes,
// //     useAdjustedBases,
// //     peakMagnitudes
// //   );
// //   useEffect(() => {
// //     if (!selectedWell) {
// //       console.error("No well selected");
// //       return;
// //     }

// //     if (!selectedData || selectedData.length === 0) {
// //       console.error("Selected data is empty or undefined");
// //       return;
// //     }

// //     setPeakResults(peaksData);

// //     // Prepare chart data
// //     // const chartData = prepareChartData(
// //     //   selectedData,
// //     //   peaksData,
// //     //   smoothedData,
// //     //   peakProminence,
// //     //   findPeaksWindowWidth,
// //     //   extractedIndicatorTimes,
// //     //   useAdjustedBases,
// //     //   peakMagnitudes,
// //     // );

// //     setChartData(preparedChartData);
// //     // console.log(peakResults);
// //   }, [
// //     selectedWell,
// //     smoothedData,
// //     peakProminence,
// //     findPeaksWindowWidth,
// //     extractedIndicatorTimes,
// //     useAdjustedBases,
// //   ]);

// //   const chartOptions = getChartOptions(extractedIndicatorTimes, chartData);

// //   // // Calculate average descent at each percentage
// //   // const averageDescent = Array.from({ length: 9 }, (_, i) => {
// //   //   // const percentage = (i + 1) * 10;
// //   //   const totalDescent = peakResults.reduce((sum, peak) => {
// //   //     const descent = peak.descentAnalysis[i];
// //   //     return sum + (descent ? descent.x - peak.peakCoords.x : 0);
// //   //   }, 0);
// //   //   return totalDescent / peakResults.length;
// //   // });

// //   return (
// //     <>
// //       {selectedWell ? (
// //         <div className="cardiac-graph">
// //           {chartData && (
// //             <Line
// //               data={chartData}
// //               options={chartOptions}
// //               style={{
// //                 background: "rgb(0, 0, 0)",
// //                 // maxHeight: "100vh",
// //                 width: "100%",
// //                 // width: "75vw",
// //                 // height: "50%",
// //               }}
// //             />
// //           )}
// //         </div>
// //       ) : (
// //         <p>No well selected</p>
// //       )}
// //     </>
// //   );
// // };

// // export default CardiacGraph;
// import React, { useEffect, useState, useContext } from "react";
// import { Line } from "react-chartjs-2";
// import { Chart, registerables } from "chart.js";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { DataContext } from "../../../../providers/DataProvider";
// import usePrepareChartData from "../../utilities/PrepareChartData";
// import { getChartOptions } from "./ChartOptions";
// import "../../styles/CardiacGraph.css";

// Chart.register(...registerables);

// export const CardiacGraph = ({
//   useAdjustedBases,
//   findPeaksWindowWidth,
//   peakProminence,
// }) => {
//   const { selectedWell, peakResults, peakMagnitudes, showVerticalLines } =
//     useContext(AnalysisContext);
//   const { extractedIndicatorTimes } = useContext(DataContext);
//   const [chartData, setChartData] = useState(null);
//   const [smoothedData, setSmoothedData] = useState([]);

//   const selectedData = selectedWell?.indicators?.[0]?.filteredData;

//   const preparedChartData = usePrepareChartData(
//     selectedData,
//     peakResults,
//     smoothedData,
//     peakProminence,
//     findPeaksWindowWidth,
//     extractedIndicatorTimes,
//     useAdjustedBases,
//     peakMagnitudes
//   );

//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }

//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     setChartData(preparedChartData);
//   }, [
//     selectedWell,
//     peakResults,
//     smoothedData,
//     peakProminence,
//     findPeaksWindowWidth,
//     extractedIndicatorTimes,
//     useAdjustedBases,
//     showVerticalLines,
//   ]);

//   const chartOptions = getChartOptions(extractedIndicatorTimes, chartData);

//   return (
//     <>
//       {selectedWell ? (
//         <div className="cardiac-graph">
//           {chartData && (
//             <Line
//               data={chartData}
//               options={chartOptions}
//               style={{
//                 background: "rgb(0, 0, 0)",
//                 width: "100%",
//               }}
//             />
//           )}
//         </div>
//       ) : (
//         <p>No well selected</p>
//       )}
//     </>
//   );
// };

// export default CardiacGraph;
import React, { useEffect, useState, useContext, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables, Tooltip } from "chart.js";
import { AnalysisContext } from "../../AnalysisProvider";
import { DataContext } from "../../../../providers/DataProvider";
import usePrepareChartData from "../../utilities/PrepareChartData";
import { getChartOptions } from "./ChartOptions";
import zoomPlugin from "chartjs-plugin-zoom";

import "../../styles/CardiacGraph.css";

Chart.register(...registerables, Tooltip, zoomPlugin);

export const CardiacGraph = ({
  useAdjustedBases,
  findPeaksWindowWidth,
  peakProminence,
}) => {
  const {
    selectedWell,
    peakResults,
    peakMagnitudes,
    showVerticalLines,
    showDataPoints,
  } = useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);
  const [chartData, setChartData] = useState(null);
  const [smoothedData, setSmoothedData] = useState([]);
  // Zoom and Pan state for Cardiac Graph
  const [zoomState, setZoomState] = useState(true);
  const [zoomMode, setZoomMode] = useState("xy");
  const [panState, setPanState] = useState(true);
  const [panMode, setPanMode] = useState("xy");
  // Ref to access Cardiac Graph's chart instance
  const cardiacGraphRef = useRef(null);

  const selectedData = selectedWell?.indicators?.[0]?.filteredData;

  const preparedChartData = usePrepareChartData(
    selectedData,
    peakResults,
    smoothedData,
    peakProminence,
    findPeaksWindowWidth,
    extractedIndicatorTimes,
    useAdjustedBases,
    peakMagnitudes
  );

  // Functions to handle zoom state changes
  const toggleZoomState = (currentZoomState) => {
    setZoomState(!currentZoomState);
  };
  const changeZoomMode = (mode) => {
    setZoomMode(mode);
  };
  // Functions to handle pan state changes
  const togglePanState = (currentPanState) => {
    setPanState(!currentPanState);
  };
  const changePanMode = (mode) => {
    setPanMode(mode);
  };

  // Reset zoom handler
  const resetZoom = () => {
    if (cardiacGraphRef.current) {
      cardiacGraphRef.current.resetZoom(); // Call resetZoom on the chart instance
    }
  };

  // console.log(selectedData);

  useEffect(() => {
    if (!selectedWell) {
      console.error("No well selected");
      return;
    }

    if (!selectedData || selectedData.length === 0) {
      console.error("Selected data is empty or undefined");
      return;
    }

    setChartData(preparedChartData);
  }, [
    selectedWell,
    peakResults,
    smoothedData,
    peakProminence,
    findPeaksWindowWidth,
    extractedIndicatorTimes,
    useAdjustedBases,
    showVerticalLines,
    showDataPoints,
    // preparedChartData,
    // selectedData,
  ]);

  const chartOptions = getChartOptions(
    extractedIndicatorTimes,
    chartData,
    zoomState,
    zoomMode,
    panState,
    panMode
  );

  return (
    <>
      {selectedWell && chartData ? (
        <Line
          className="cardiac-graph"
          data={chartData}
          options={chartOptions}
          style={{
            background: "rgb(0, 0, 0)",
            width: "100%",
          }}
        />
      ) : (
        <p>No well selected or no chart data available</p>
      )}
    </>
  );
};

export default CardiacGraph;
