import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";

export const FilteredGraphOptions = (
  analysisData = [],
  wellArrays = [],
  filteredGraphData,
  extractedIndicatorTimes = [],
  annotations = []
  // minYValue,
  // maxYValue
) => {
  // const { wellArrays, extractedIndicatorTimes } = useContext(DataContext);
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  const allYValues = wellArrays
    .flatMap((well) =>
      well.indicators
        .filter((indicator) => indicator.isDisplayed) // Only include displayed indicators
        .flatMap((indicator) => indicator.filteredData ?? [])
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
    maintainAspectRatio: true,
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
        display: false,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
        suggestedMin: minYValue,
        suggestedMax: maxYValue,
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

// Function to update chart when wellArrays change
export const updateChart = (
  chartInstance,
  wellArrays,
  extractedIndicatorTimes
) => {
  const updatedOptions = FilteredGraphOptions(
    [],
    wellArrays,
    extractedIndicatorTimes
  );

  // Update chart options
  chartInstance.options = updatedOptions;

  // Re-render the chart with the new options
  chartInstance.update();
};
