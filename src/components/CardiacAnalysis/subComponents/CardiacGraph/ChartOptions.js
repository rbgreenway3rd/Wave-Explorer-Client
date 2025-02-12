export const getChartOptions = (extractedIndicatorTimes) => ({
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
    legend: true,
    decimation: {
      enabled: false,
      algorithm: "lttb",
      samples: 40,
      threshold: 80,
    },
    tooltip: {
      enabled: true, // set to FALSE if using an external function for tooltip
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
  scales: {
    x: {
      type: "linear",
      position: "bottom",
      min: Math.min(extractedIndicatorTimes[0]),
      max: Math.max(extractedIndicatorTimes[0]),
      ticks: {
        display: true,
      },
      grid: {
        display: false,
      },
    },
    y: {
      ticks: {
        display: true,
      },
      grid: {
        display: false,
      },
    },
  },
});
