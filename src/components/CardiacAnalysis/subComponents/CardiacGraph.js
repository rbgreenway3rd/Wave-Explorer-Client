// import React, { useState, useEffect } from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Decimation,
// } from "chart.js";
// import annotationPlugin from "chartjs-plugin-annotation";
// import { smoothing, smoothingMedian } from "../utilities/Smoothing";
// import { findPeaks } from "../utilities/PeakFinder";
// import {
//   prepareQuadraticData,
//   quadraticRegression,
// } from "../utilities/Regression";
// import { Peak } from "../classes/Peak";
// import { adjustBase } from "../utilities/AdjustBase";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
//   Decimation,
//   annotationPlugin
// );

// // Function to format data as {x, y} objects
// const formatData = (data) => {
//   return data.map((value, index) => ({ x: index * 1000, y: value }));
// };

// // Function to suggest initial window width

// export const CardiacGraph = ({ data }) => {
//   const [decimationEnabled, setDecimationEnabled] = useState(false);
//   const [useCardiacData, setUseCardiacData] = useState(true); // Default to using cardiacData
//   const [smoothedData, setSmoothedData] = useState([]);

//   const [chartData, setChartData] = useState(null);
//   const [peakResults, setPeakResults] = useState([]);
//   const [useAdjustedBases, setUseAdjustedBases] = useState(true); // State to track checkbox
//   const [peakProminence, setPeakProminence] = useState(25000); // State for peak prominence
//   const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80); // State for peak prominence

//   useEffect(() => {
//     // const selectedData = useCardiacData ? formatData(cardiacData2) : data;

//     if (!selectedData || selectedData.length === 0) {
//       console.error("Selected data is empty or undefined");
//       return;
//     }

//     const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

//     // Detect peaks using the new findPeaksClass function
//     const peaksData = findPeaks(
//       dataToUse, // Data
//       peakProminence, // Prominence
//       findPeaksWindowWidth // Window Width
//     );

//     // Extract peak and baseline coordinates
//     const peakEntries = peaksData.map((peak) => peak.peakCoords);
//     const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
//     const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

//     setPeakResults(peaksData);

//     // Filter data and perform quadratic regression
//     const filteredData = prepareQuadraticData(dataToUse, peaksData);
//     const regressionCoefficients = quadraticRegression(filteredData);

//     // Generate line-of-best-fit data
//     const lineOfBestFit = filteredData.map((point) => {
//       const x = point.x;
//       const y =
//         regressionCoefficients.a * x * x +
//         regressionCoefficients.b * x +
//         regressionCoefficients.c;
//       return { x, y };
//     });

//     // Adjust the positions of the left and right bases for each peak
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

//     const peakProminenceLine = {
//       label: "Peak Prominence",
//       data: [
//         { x: lineOfBestFit[0].x, y: lineOfBestFit[0].y + peakProminence },
//         {
//           x: lineOfBestFit[lineOfBestFit.length - 1].x,
//           y: lineOfBestFit[lineOfBestFit.length - 1].y + peakProminence,
//         },
//       ],
//       borderColor: "rgba(255, 99, 132, 0.5)",
//       borderWidth: 2,
//       pointRadius: 0,
//       type: "line",
//     };

//     setChartData({
//       datasets: [
//         {
//           label: "Raw Signal",
//           data: dataToUse, // Already in {x, y} format
//           borderColor: "blue",
//           borderWidth: 2,
//           pointRadius: 0,
//         },
//         {
//           label: "Line of Best Fit",
//           data: lineOfBestFit, // Line of best fit data points
//           borderColor: "black",
//           borderWidth: 2,
//           pointRadius: 0,
//           type: "line",
//         },
//         {
//           label: "Peaks",
//           data: peakEntries, // Peaks in { x, y } format
//           borderColor: "red",
//           backgroundColor: "red",
//           pointRadius: 5,
//           type: "scatter",
//         },
//         {
//           label: "Left Bases",
//           data: finalLeftBaseEntries, // Left bases in { x, y } format
//           borderColor: "purple",
//           backgroundColor: "purple",
//           pointRadius: 5,
//           type: "scatter",
//         },
//         {
//           label: "Right Bases",
//           data: finalRightBaseEntries, // Right bases in { x, y } format
//           borderColor: "green",
//           backgroundColor: "green",
//           pointRadius: 5,
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
//           borderColor: "cyan",
//           backgroundColor: "cyan",
//           pointRadius: 3,
//           type: "scatter",
//         },
//         peakProminenceLine,
//       ],
//     });
//   }, [
//     data,
//     decimationEnabled,
//     useCardiacData,
//     smoothedData,
//     useAdjustedBases, // Add useAdjustedBases to dependencies
//     peakProminence, // Add peakProminence to dependencies
//     findPeaksWindowWidth, // Add findPeaksWindowWidth to dependencies
//   ]);

//   const chartOptions = {
//     responsive: true,
//     parsing: false, // Ensures Chart.js properly reads { x, y } format
//     scales: {
//       x: {
//         type: "linear", // Ensures x-axis is scaled correctly
//         position: "bottom",
//       },
//       y: {
//         beginAtZero: false, // Prevents unnecessary scaling issues
//       },
//     },
//     plugins: {
//       decimation: {
//         enabled: decimationEnabled,
//         algorithm: "lttb", // Uses Largest Triangle Three Buckets for downsampling
//         samples: cardiacData.length / 4, // Adjust this number for performance vs. accuracy
//         threshold: 100, // Minimum number of points required to enable decimation
//       },
//     },
//   };

//   return (
//     <div>
//       {chartData ? (
//         <Line data={chartData} options={chartOptions} />
//       ) : (
//         <p>Loading chart...</p>
//       )}
//     </div>
//   );
// };

// export default CardiacGraph;
import React, { useEffect, useState, useContext } from "react";
import { Line } from "react-chartjs-2";
import { Peak } from "../classes/Peak";
import { Chart, registerables } from "chart.js";
import { AnalysisContext } from "../AnalysisProvider";
import { DataContext } from "../../../providers/DataProvider";
import { findPeaks } from "../utilities/PeakFinder";
import {
  prepareQuadraticData,
  quadraticRegression,
} from "../utilities/Regression";
import { adjustBase } from "../utilities/AdjustBase";

Chart.register(...registerables);

// Function to format data as {x, y} objects
const formatData = (data) => {
  return data.map((value, index) => ({ x: index * 1000, y: value }));
};

export const CardiacGraph = () => {
  const { selectedWell } = useContext(AnalysisContext);
  const { extractedIndicatorTimes } = useContext(DataContext);
  const [chartData, setChartData] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [smoothedData, setSmoothedData] = useState([]);
  const [peakProminence, setPeakProminence] = useState(25000); // State for peak prominence
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80); // State for peak prominence
  const [useAdjustedBases, setUseAdjustedBases] = useState(true); // State to track checkbox
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

    const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

    // Detect peaks using the new findPeaks function
    const peaksData = findPeaks(
      dataToUse, // Data
      peakProminence, // Prominence
      findPeaksWindowWidth // Window Width
    );
    console.log(selectedData);
    // Extract peak and baseline coordinates
    const peakEntries = peaksData.map((peak) => peak.peakCoords);
    const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
    const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

    setPeakResults(peaksData);

    // Filter data and perform quadratic regression
    const filteredData = prepareQuadraticData(dataToUse, peaksData);
    console.log(filteredData);
    const regressionCoefficients = quadraticRegression(filteredData);

    console.log("regress coeff", regressionCoefficients);

    // Adjust the positions of the left and right bases for each peak

    // Generate line-of-best-fit data
    const lineOfBestFit = filteredData.map((point) => {
      const x = point.x;
      const y =
        regressionCoefficients.a * x ** 2 +
        regressionCoefficients.b * x +
        regressionCoefficients.c;
      return { x, y };
    });

    console.log(lineOfBestFit);
    let indicatorTimes = Object.values(extractedIndicatorTimes);
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
    // Set chart data
    setChartData({
      labels: indicatorTimes[0],
      datasets: [
        {
          label: "Raw Data",
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
        },
        {
          label: "Left Bases",
          data: finalLeftBaseEntries,
          borderColor: "rgb(195, 0, 255)",
          borderWidth: 1,
          fill: false,
          pointRadius: 5,
          pointBackgroundColor: "rgb(195, 0, 255)",
        },
        {
          label: "Right Bases",
          data: finalRightBaseEntries,
          borderColor: "rgb(0, 255, 0)",
          borderWidth: 1,
          fill: false,
          pointRadius: 5,
          pointBackgroundColor: "rgb(0, 255, 0)",
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
          borderColor: "cyan",
          backgroundColor: "cyan",
          pointRadius: 3,
          type: "scatter",
        },
      ],
    });
  }, [
    selectedWell,
    smoothedData,
    peakProminence,
    findPeaksWindowWidth,
    extractedIndicatorTimes,
    useAdjustedBases,
  ]);

  const chartOptions = {
    normalized: true,
    maintainAspectRatio: true,
    responsive: true,
    devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

    spanGaps: false,
    events: ["onHover"],
    animation: {
      duration: 0,
    },
    parsing: false,
    plugins: {
      legend: false,
      decimation: {
        enabled: false,
        algorithm: "lttb",
        samples: 40,
        threshold: 80,
      },
      tooltip: {
        enabled: false, // set to FALSE if using an external function for tooltip
        mode: "nearest",
        intersect: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        borderWidth: 1.5,
      },
    },
    layout: {
      autoPadding: false,
      padding: {
        left: -30,
        bottom: -30,
      },
    },
    scales: {
      x: {
        type: "linear",
        position: "bottom",
        min: Math.min(extractedIndicatorTimes[0]),
        max: Math.max(extractedIndicatorTimes[0]),
        // min: Math.min(...extractedIndicatorTimes[0]),
        // max: Math.max(...extractedIndicatorTimes[0]),
        // min: minXValue,
        // max: maxXValue,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        // min: minYValue,
        // max: maxYValue,

        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  console.log("cardiacGraph", chartData);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={useAdjustedBases}
          onChange={(e) => setUseAdjustedBases(e.target.checked)}
        />
        Use Adjusted Bases
      </label>
      {selectedWell ? (
        <div>
          <h2>Cardiac Graph for Well {selectedWell.label}</h2>
          {chartData && <Line data={chartData} options={chartOptions} />}
        </div>
      ) : (
        <p>No well selected</p>
      )}
    </div>
  );
};

export default CardiacGraph;
