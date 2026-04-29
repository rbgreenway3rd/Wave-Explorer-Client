import { useContext } from "react";
import { DataContext } from "../../../providers/DataProvider";

export const FilteredGraphOptions = (
  wellArrays = [],
  filteredGraphData,
  extractedIndicatorTimes = [],
  annotations = [],
  // Wells to include in the y-range computation. Defaults to wellArrays
  // (whole-plate scale). Pass selectedWellArray to auto-zoom to the
  // selected wells' range instead.
  yScaleWells = null
) => {
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  const wellsForRange = yScaleWells || wellArrays;

  // Compute filtered y-range across the chosen well set. Reads typed-array
  // filtered values directly when present so we don't force {x,y}[]
  // materialization across every well (would OOM on huge files).
  let minYValue = Infinity;
  let maxYValue = -Infinity;
  for (const well of wellsForRange) {
    for (const indicator of well.indicators) {
      if (!indicator.isDisplayed) continue;
      if (indicator.filteredYs) {
        const ys = indicator.filteredYs;
        for (let i = 0; i < ys.length; i++) {
          const y = ys[i];
          if (y < minYValue) minYValue = y;
          if (y > maxYValue) maxYValue = y;
        }
        continue;
      }
      const data = indicator.filteredData ?? [];
      if (Array.isArray(data)) {
        for (const point of data) {
          if (!point) continue;
          if (point.y < minYValue) minYValue = point.y;
          if (point.y > maxYValue) maxYValue = point.y;
        }
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
