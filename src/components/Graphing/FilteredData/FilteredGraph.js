import React from "react";
import { Line } from "react-chartjs-2";
import "../../../styles/FilteredGraph.css";
import { useFilters } from "./FilterContext";
import { useContext } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import { listOfFilters } from "./FilterFunctions";

export const FilteredGraph = ({ filteredWellArray, options }) => {
  const { activeFilters } = useFilters();
  const { extractedIndicatorTimes } = useContext(DataContext);

  const applyFilters = (data) => {
    if (!Array.isArray(data)) {
      console.error("Expected data to be an array, but received:", data); // error handling
      return [];
    }

    return activeFilters.reduce((filteredData, filterName) => {
      const filter = listOfFilters.find((f) => f.name === filterName);
      return filter ? filter.apply(filteredData) : filteredData;
    }, data);
  };

  const filteredWells = applyFilters(filteredWellArray) || [];

  const chartData = {
    labels: extractedIndicatorTimes,
    datasets: filteredWells.map((well) => ({
      label: well.label,
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
