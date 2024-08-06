export const MiniGraphOptions = (analysisData) => {
  return {
    normalized: true,
    maintainAspectRatio: false,
    responsive: false,
    spanGaps: true,
    animation: false,
    plugins: {
      legend: false,
      decimation: { enabled: false, algorithm: "lttb", samples: 50 },
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
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },

      y: {
        min: Math.min(...analysisData),
        max: Math.max(...analysisData),
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
