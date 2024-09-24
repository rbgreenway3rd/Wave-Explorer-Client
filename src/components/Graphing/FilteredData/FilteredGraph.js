import React, { useEffect } from "react";
import { Line } from "react-chartjs-2";

export const FilteredGraph = ({ filteredGraphData, options }) => {
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
