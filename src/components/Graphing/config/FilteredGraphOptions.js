import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";

export const FilteredGraphOptions = (
  analysisData = [],
  wellArrays = [],
  filteredGraphData,
  extractedIndicatorTimes = [],
  annotations = []
) => {
  // const { wellArrays, extractedIndicatorTimes } = useContext(DataContext);
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  let minYValue = Infinity;
  let maxYValue = -Infinity;
  for (const well of wellArrays) {
    for (const indicator of well.indicators) {
      if (!indicator.isDisplayed) continue;
      const data = indicator.filteredData ?? [];
      for (const point of data) {
        if (point.y < minYValue) minYValue = point.y;
        if (point.y > maxYValue) maxYValue = point.y;
      }
    }
  }
  if (!isFinite(minYValue)) minYValue = 0;
  if (!isFinite(maxYValue)) maxYValue = 100;

  // Efficient min/max calculation for x-values
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

  return {
    normalized: true,
    animation: {
      duration: 0,
    },
    parsing: false,
    plugins: {
      legend: false, // displays dataset label at top of graph
      decimation: {
        enabled: true,
        algorithm: "lttb",

        samples: 250,
        threshold: 300,
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
        type: "linear",
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
      line: {
        borderWidth: 1.75, // <-- Set this to your desired thickness (e.g., 2, 3, etc.)
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
