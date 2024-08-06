import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const GraphGrid = ({ data }) => {
  // data needs to be an array containing data for each graph
  return (
    <div className="graph-grid">
      {data.map((graphData, index) => (
        <div key={index} className="graph-cell">
          <LineChart width={200} height={200} data={graphData}>
            <XAxis dataKey="x" />
            <YAxis />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="graphData" stroke="#8884d8" />
          </LineChart>
        </div>
      ))}
    </div>
  );
};

export default GraphGrid;
