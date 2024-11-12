import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
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
  const allYValues = wellArrays
    .flatMap((well) => well.indicators[0]?.rawData ?? []) // Access filteredData if it exists
    .map((point) => point.y); // Extract the y values from each point

  // Calculate min and max y-values from all wells' filtered data
  const minYValue =
    allYValues.length > 0
      ? allYValues.reduce((min, val) => (val < min ? val : min), Infinity)
      : 0;

  const maxYValue =
    allYValues.length > 0
      ? allYValues.reduce((max, val) => (val > max ? val : max), -Infinity)
      : 100;

  const minXValue =
    extractedIndicatorTimes.length > 0
      ? extractedIndicatorTimes.reduce(
          (min, val) => (val < min ? val : min),
          Infinity
        )
      : 0;
  const maxXValue =
    extractedIndicatorTimes.length > 0
      ? extractedIndicatorTimes.reduce(
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
        enabled: true,
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
        min: minXValue,
        max: maxXValue,
      },
      y: {
        display: false, // Completely hides the y axis
        ticks: {
          display: false, // Hides y-axis labels
        },
        grid: {
          display: false, // Hides y-axis grid lines
        },
        min: minYValue,
        max: maxYValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };
};