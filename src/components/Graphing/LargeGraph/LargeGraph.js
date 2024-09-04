import React from "react";
import { Line } from "react-chartjs-2";

import "../../../styles/LargeGraph.css";

export const LargeGraph = ({ graphData, options }) => {
  return (
    <div className="large-graph">
      <Line className="large-graph-canvas" data={graphData} options={options} />
    </div>
  );
};
