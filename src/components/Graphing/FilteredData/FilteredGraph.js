import React from "react";
import { Line } from "react-chartjs-2";
import "../../../styles/FilteredGraph.css";

export const FilteredGraph = ({ filteredData, options }) => {
  return (
    <div className="filtered-graph">
      <Line
        className="filtered-graph-canvas"
        data={filteredData}
        options={options}
      />
    </div>
  );
};
