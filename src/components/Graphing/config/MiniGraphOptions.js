import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
Chart.register(...registerables);

export const MiniGraphOptions = (
  analysisData,
  extractedIndicatorTimes,
  wellArrays,
  yValues,
  showFiltered
) => {
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  const allYValues = wellArrays
    .flatMap(
      (well) =>
        well.indicators
          .filter((indicator) => indicator.isDisplayed) // Only include displayed indicators
          .flatMap((indicator) =>
            showFiltered ? indicator.filteredData : indicator.rawData ?? []
          ) // Access rawData for each displayed indicator
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
        enabled: true,
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
        type: "time",
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
