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
  selectedWellArray,
  filteredGraphData,
  options,
}) => {
  const { extractedIndicatorTimes, project, setProject } =
    useContext(DataContext);

  useEffect(() => {
    console.log("FilteredGraph data updated:", filteredGraphData);
  }, [filteredGraphData]);

  return (
    <div className="filtered-graph">
      <Line
        className="filtered-graph-canvas"
        data={filteredGraphData}
        options={options}
      />
    </div>
  );
};
