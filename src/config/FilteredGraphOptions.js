export const FilteredGraphOptions = (
  analysisData = [],
  wellArrays = [],
  filteredGraphData,
  extractedIndicatorTimes = [],
  annotations = []
) => {
  // Extract y-values from filteredData in wellArrays
  const allYValues = wellArrays
    .flatMap((well) => well.indicators[0]?.filteredData ?? []) // Access filteredData if it exists
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
        annotations: annotations,
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
