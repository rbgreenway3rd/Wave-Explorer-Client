import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";
Chart.register(zoomPlugin);

export const LargeGraphOptions = (
  analysisData = [],
  wellArrays = [],
  extractedIndicatorTimes = [],
  zoomState,
  zoomMode,
  panState,
  panMode
) => {
  // const { wellArrays, extractedIndicatorTimes } = useContext(DataContext);
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  const allYValues = wellArrays
    .flatMap(
      (well) =>
        well.indicators
          .filter((indicator) => indicator.isDisplayed) // Only include displayed indicators
          .flatMap((indicator) => indicator.rawData ?? []) // Access rawData for each displayed indicator
    )
    .map((point) => point.y); // Extract the y values from each point

  // Calculate min and max y-values from all wells' displayed indicators' data
  const minYValue =
    allYValues.length > 0
      ? allYValues.reduce((min, val) => (val < min ? val : min), Infinity)
      : 0;

  const maxYValue =
    allYValues.length > 0
      ? allYValues.reduce((max, val) => (val > max ? val : max), -Infinity)
      : 100;

  const minXValue =
    indicatorTimes[0]?.length > 0
      ? indicatorTimes[0].reduce(
          (min, val) => (val < min ? val : min),
          Infinity
        )
      : 0;
  const maxXValue =
    indicatorTimes[0]?.length > 0
      ? indicatorTimes[0].reduce(
          (max, val) => (val > max ? val : max),
          -Infinity
        )
      : 100;

  return {
    normalized: true,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: false,
      decimation: {
        enabled: false,
        algorithm: "lttb",
        samples: 50,
        threshold: 100,
      },
      tooltip: {
        enabled: false,
        mode: "nearest",
        intersect: false,
      },
      zoom: {
        pan: {
          enabled: panState,
          mode: panMode,
          threshold: 50,
        },
        zoom: {
          wheel: {
            enabled: zoomState,
          },
          pinch: {
            enabled: false,
          },
          drag: {
            enabled: false,
            modifierKey: "shift",
          },
          mode: zoomMode,
          rangeMin: {
            x: minXValue,
            y: minYValue,
          },
          rangeMax: {
            x: maxXValue,
            y: maxYValue,
          },
        },
      },
    },
    maintainAspectRatio: true,
    // responsive: true,
    responsive: true,

    scales: {
      x: {
        display: false, // Completely hides the x axis
        ticks: {
          display: false, // Hides x-axis labels
        },
        grid: {
          display: false, // Hides x-axis grid lines
        },
        // min: minXValue,
        // max: maxXValue,
        min: Math.min(extractedIndicatorTimes[0]),
        max: Math.max(extractedIndicatorTimes[0]),
      },
      y: {
        display: false, // Completely hides the y axis
        ticks: {
          display: false, // Hides y-axis labels
        },
        grid: {
          display: false, // Hides y-axis grid lines
        },
        suggestedMin: minYValue,
        suggestedMax: maxYValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };
};

// Function to update chart when wellArrays change
export const updateChart = (
  chartInstance,
  wellArrays,
  extractedIndicatorTimes
) => {
  const updatedOptions = LargeGraphOptions(
    [],
    wellArrays,
    extractedIndicatorTimes,
    chartInstance.options.plugins.zoom.zoom.wheel.enabled,
    chartInstance.options.plugins.zoom.zoom.mode,
    chartInstance.options.plugins.zoom.pan.enabled,
    chartInstance.options.plugins.zoom.pan.mode
  );

  // Update chart options
  chartInstance.options = updatedOptions;

  // Re-render the chart with the new options
  chartInstance.update();
};
