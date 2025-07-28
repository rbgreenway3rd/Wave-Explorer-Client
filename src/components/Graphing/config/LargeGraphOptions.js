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

  // Efficient min/max calculation for y-values
  let minYValue = Infinity;
  let maxYValue = -Infinity;
  for (const well of wellArrays) {
    for (const indicator of well.indicators) {
      if (!indicator.isDisplayed) continue;
      const data = indicator.rawData ?? [];
      for (const point of data) {
        if (point.y < minYValue) minYValue = point.y;
        if (point.y > maxYValue) maxYValue = point.y;
      }
    }
  }
  if (!isFinite(minYValue)) minYValue = 0;
  if (!isFinite(maxYValue)) maxYValue = 100;

  // Efficient min/max calculation for x-values
  let minXValue = Infinity;
  let maxXValue = -Infinity;
  for (const arr of indicatorTimes) {
    for (const t of arr) {
      if (t < minXValue) minXValue = t;
      if (t > maxXValue) maxXValue = t;
    }
  }
  if (!isFinite(minXValue)) minXValue = 0;
  if (!isFinite(maxXValue)) maxXValue = 100;

  return {
    normalized: true,
    animation: {
      duration: 0,
    },
    parsing: false,
    plugins: {
      legend: false,
      decimation: {
        enabled: true,
        algorithm: "lttb",
        // samples: decimationSamples,
        // threshold: decimationThreshold,
        samples: 250,
        threshold: 300,
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
    responsive: true,
    scales: {
      x: {
        type: "linear",
        display: false,
        ticks: { display: false },
        grid: { display: false },
        min: Math.min(extractedIndicatorTimes[0]),
        max: Math.max(extractedIndicatorTimes[0]),
      },
      y: {
        display: false,
        ticks: { display: false },
        grid: { display: false },
        suggestedMin: minYValue,
        suggestedMax: maxYValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        borderWidth: 1.75, // <-- Set this to your desired thickness (e.g., 2, 3, etc.)
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
