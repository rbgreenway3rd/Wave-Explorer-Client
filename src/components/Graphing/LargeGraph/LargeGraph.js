import React, { Component } from "react";
import { Line } from "react-chartjs-2";
import { FilterControls } from "../FilteredData/FilterControls";
import "./LargeGraph.css";

export const LargeGraph = ({
  graphData,
  options,
  largeCanvasWidth,
  largeCanvasHeight,
  analysisData,
}) => {
  // let newHeight = largeCanvasHeight * 2;

  return (
    // <div className="large-graph-and-controls-container">
    <div className="large-graph">
      <Line
        className="large-graph-canvas"
        data={graphData}
        // width={largeCanvasWidth}
        // height={newHeight}
        options={options}
      />
    </div>
    /* <FilterControls className="large-graph-controls" /> */
    // </div>
  );
};
