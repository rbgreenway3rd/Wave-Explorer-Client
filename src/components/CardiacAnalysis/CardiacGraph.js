import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Decimation,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { calculateStandardDeviation } from "./PeakFinder";
import { smoothing, smoothingMedian } from "./Smoothing";
import { cardiacData } from "./CardiacData";
import { cardiacData2 } from "./CardiacData2";
import { findPeaks } from "./utilities/PeakFinder";
import {
  prepareQuadraticData,
  quadraticRegression,
} from "./utilities/Regression";
import { Peak } from "./classes/Peak";
import { adjustBase } from "./utilities/AdjustBase";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Decimation, // Ensure Decimation plugin is registered
  annotationPlugin
);

// Function to format data as {x, y} objects
const formatData = (data) => {
  return data.map((value, index) => ({ x: index * 1000, y: value }));
};

const calculateMAD = (data) => {
  const median = data.sort((a, b) => a - b)[Math.floor(data.length / 2)];
  const deviations = data.map((value) => Math.abs(value - median));
  return deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
};

// Function to suggest initial window width
const suggestWindowWidth = (data) => {
  if (!data || data.length === 0) {
    console.error("Data array is empty or undefined");
    return 5; // Default value
  }
  const stdDev = calculateStandardDeviation(data);
  return Math.max(1, Math.min(100, Math.round(stdDev))); // Example heuristic
};

const PeakFinderChart = ({ data }) => {
  const [decimationEnabled, setDecimationEnabled] = useState(false);
  const [useCardiacData, setUseCardiacData] = useState(true); // Default to using cardiacData
  const [smoothedData, setSmoothedData] = useState([]);
  const [windowWidth, setWindowWidth] = useState(
    suggestWindowWidth(cardiacData)
  ); // Initial window width suggestion
  const [chartData, setChartData] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [useAdjustedBases, setUseAdjustedBases] = useState(true); // State to track checkbox
  const [peakProminence, setPeakProminence] = useState(25000); // State for peak prominence
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80); // State for peak prominence

  useEffect(() => {
    const selectedData = useCardiacData ? formatData(cardiacData2) : data;

    if (!selectedData || selectedData.length === 0) {
      console.error("Selected data is empty or undefined");
      return;
    }

    const dataToUse = smoothedData.length > 0 ? smoothedData : selectedData;

    // Detect peaks using the new findPeaksClass function
    const peaksData = findPeaks(
      dataToUse, // Data
      peakProminence, // Prominence
      findPeaksWindowWidth // Window Width
    );

    // Extract peak and baseline coordinates
    const peakEntries = peaksData.map((peak) => peak.peakCoords);
    const leftBaseEntries = peaksData.map((peak) => peak.leftBaseCoords);
    const rightBaseEntries = peaksData.map((peak) => peak.rightBaseCoords);

    setPeakResults(peaksData);

    // Filter data and perform quadratic regression
    const filteredData = prepareQuadraticData(dataToUse, peaksData);
    const regressionCoefficients = quadraticRegression(filteredData);

    // Generate line-of-best-fit data
    const lineOfBestFit = filteredData.map((point) => {
      const x = point.x;
      const y =
        regressionCoefficients.a * x * x +
        regressionCoefficients.b * x +
        regressionCoefficients.c;
      return { x, y };
    });

    // Adjust the positions of the left and right bases for each peak
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

    const peakProminenceLine = {
      label: "Peak Prominence",
      data: [
        { x: lineOfBestFit[0].x, y: lineOfBestFit[0].y + peakProminence },
        {
          x: lineOfBestFit[lineOfBestFit.length - 1].x,
          y: lineOfBestFit[lineOfBestFit.length - 1].y + peakProminence,
        },
      ],
      borderColor: "rgba(255, 99, 132, 0.5)",
      borderWidth: 2,
      pointRadius: 0,
      type: "line",
    };

    setChartData({
      datasets: [
        {
          label: "Raw Signal",
          data: dataToUse, // Already in {x, y} format
          borderColor: "blue",
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: "Line of Best Fit",
          data: lineOfBestFit, // Line of best fit data points
          borderColor: "black",
          borderWidth: 2,
          pointRadius: 0,
          type: "line",
        },
        {
          label: "Peaks",
          data: peakEntries, // Peaks in { x, y } format
          borderColor: "red",
          backgroundColor: "red",
          pointRadius: 5,
          type: "scatter",
        },
        {
          label: "Left Bases",
          data: finalLeftBaseEntries, // Left bases in { x, y } format
          borderColor: "purple",
          backgroundColor: "purple",
          pointRadius: 5,
          type: "scatter",
        },
        {
          label: "Right Bases",
          data: finalRightBaseEntries, // Right bases in { x, y } format
          borderColor: "green",
          backgroundColor: "green",
          pointRadius: 5,
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
          borderColor: "cyan",
          backgroundColor: "cyan",
          pointRadius: 3,
          type: "scatter",
        },
        peakProminenceLine,
      ],
    });
  }, [
    data,
    decimationEnabled,
    useCardiacData,
    smoothedData,
    useAdjustedBases, // Add useAdjustedBases to dependencies
    peakProminence, // Add peakProminence to dependencies
    findPeaksWindowWidth, // Add findPeaksWindowWidth to dependencies
  ]);

  const chartOptions = {
    responsive: true,
    parsing: false, // Ensures Chart.js properly reads { x, y } format
    scales: {
      x: {
        type: "linear", // Ensures x-axis is scaled correctly
        position: "bottom",
      },
      y: {
        beginAtZero: false, // Prevents unnecessary scaling issues
      },
    },
    plugins: {
      decimation: {
        enabled: decimationEnabled,
        algorithm: "lttb", // Uses Largest Triangle Three Buckets for downsampling
        samples: cardiacData.length / 4, // Adjust this number for performance vs. accuracy
        threshold: 100, // Minimum number of points required to enable decimation
      },
    },
  };

  return (
    <div>
      {chartData ? (
        <Line data={chartData} options={chartOptions} />
      ) : (
        <p>Loading chart...</p>
      )}
    </div>
  );
};

export default PeakFinderChart;
