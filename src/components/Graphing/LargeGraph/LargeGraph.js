import React from "react";
import { Line } from "react-chartjs-2";

import "../../../styles/LargeGraph.css";

export const LargeGraph = ({ rawGraphData, options }) => {
  return (
    <div className="large-graph">
      <Line
        className="large-graph-canvas"
        data={rawGraphData}
        options={options}
      />
    </div>
  );
};
