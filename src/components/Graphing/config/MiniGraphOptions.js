import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
Chart.register(...registerables);

export const MiniGraphOptions = (
  analysisData,
  extractedIndicatorTimes,
  wellArrays,
  yValues
) => {
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
    maintainAspectRatio: false,
    responsive: false,
    spanGaps: false,
    events: ["onHover"],
    animation: {
      duration: 0,
    },
    parsing: false,
    plugins: {
      legend: false,
      decimation: {
        enabled: true,
        algorithm: "lttb",
        samples: 20,
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
        borderWidth: 1.2,
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
        type: "time",
        min: Math.min(...extractedIndicatorTimes["Green"]),
        max: Math.max(...extractedIndicatorTimes["Green"]),
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
        min: minYValue,
        max: maxYValue,

        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
  };
};
