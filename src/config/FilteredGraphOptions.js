export const FilteredGraphOptions = (minValue, maxValue) => {
  return {
    normalized: true,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: false, // displays dataset label at top of graph
      decimation: {
        enabled: false,
        algorithm: "lttb",
        samples: 50,
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
