export const FilteredGraphOptions = (
  // minValue,
  // maxValue,
  analysisData = [],
  extractedIndicatorTimes = []
) => {
  const minYValue =
    analysisData.length > 0
      ? analysisData.reduce((min, val) => (val < min ? val : min), Infinity)
      : 0;
  const maxYValue =
    analysisData.length > 0
      ? analysisData.reduce((max, val) => (val > max ? val : max), -Infinity)
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
      annotation: {
        annotations: [],
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
        min: minXValue,
        max: maxXValue,
      },
      y: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        min: minYValue,
        max: maxYValue,
        // min: minValue,
        // max: maxValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };
};
