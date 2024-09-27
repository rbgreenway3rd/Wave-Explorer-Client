import { Chart, registerables } from "chart.js";
import "chartjs-adapter-date-fns";
Chart.register(...registerables);

export const MiniGraphOptions = (
  analysisData,
  timeData,
  wellArrays,
  yValues
) => {
  const minValue =
    analysisData.length > 0
      ? analysisData.reduce((min, val) => (val < min ? val : min), Infinity)
      : 0;
  const maxValue =
    analysisData.length > 0
      ? analysisData.reduce((max, val) => (val > max ? val : max), -Infinity)
      : 100;
  return {
    normalized: true,
    maintainAspectRatio: true,
    responsive: false,
    spanGaps: true,
    // animation: false,
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
        min: Math.min(...timeData),
        max: Math.max(...timeData),
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        // min: Math.min(...yValues),
        // max: Math.max(...yValues),
        min: minValue,
        max: maxValue,

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
