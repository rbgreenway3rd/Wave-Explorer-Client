import React, {
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Line } from "react-chartjs-2";
import "../../../styles/FilteredGraph.css";
import { FilterContext } from "./FilterContext";
import { DataContext } from "../../FileHandling/DataProvider";
// import { listOfFilters } from "./FilterFunctions";
import deepEqual from "fast-deep-equal"; // Use deep-equal to avoid shallow comparison issues

export const FilteredGraph = ({
  wellArrays,
  filteredWellArray = [],
  options,
}) => {
  // const { activeFilters } = useContext(FilterContext);
  const { extractedIndicatorTimes, project, setProject } =
    useContext(DataContext);

  // Reference to store previous filteredWells
  const prevFilteredWellsRef = useRef([]);

  const chartData = {
    labels: extractedIndicatorTimes || [],
    datasets: filteredWellArray.map((well) => ({
      label: well.label || "No Label",
      data: well.indicators[0]?.filteredData || [],
      fill: false,
      borderColor: "rgb(75, 192, 192)",
      tension: 0.1,
    })),
  };

  return (
    <div className="filtered-graph">
      <Line
        className="filtered-graph-canvas"
        data={chartData}
        options={options}
      />
    </div>
  );
};
