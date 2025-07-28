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
  // Efficient min/max calculation for indicatorTimes
  let indicatorTimes = Object.values(extractedIndicatorTimes);
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

  // Use all wells for min/max calculation
  const wellsToUse = wellArrays;

  // Efficient min/max calculation for allYValues
  let minYValue = Infinity;
  let maxYValue = -Infinity;
  for (const well of wellsToUse) {
    for (const indicator of well.indicators) {
      if (!indicator.isDisplayed) continue;
      const data = showFiltered
        ? indicator.filteredData
        : indicator.rawData ?? [];
      for (const point of data) {
        if (point.y < minYValue) minYValue = point.y;
        if (point.y > maxYValue) maxYValue = point.y;
      }
    }
  }
  if (!isFinite(minYValue)) minYValue = 0;
  if (!isFinite(maxYValue)) maxYValue = 100;

  // Use static values for decimation
  const samples = 20;
  const threshold = 80;

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
        samples: samples,
        threshold: threshold,
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
        min: minXValue,
        max: maxXValue,
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
