export const LargeGraphOptions = (analysisData = []) => {
  // const minValue = analysisData.length > 0 ? Math.min(...analysisData) : 0;
  // const maxValue = analysisData.length > 0 ? Math.max(...analysisData) : 100; // Adjust default max value as needed
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
    animation: {
      duration: 0,
    },
    // animation: false,
    plugins: {
      legend: false, // displays dataset label at top of graph
      decimation: {
        enabled: true,
        algorithm: "lttb",
        samples: 50,
        threshold: 100,
      },
      tooltip: {
        enabled: false, // set to FALSE if using an external function for tooltip
        mode: "nearest",
        intersect: false,
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: {
        display: false,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        min: minValue,
        max: maxValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };
};
