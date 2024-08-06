import React, { Component } from "react";
import { Line } from "react-chartjs-2";
import { FilteredGraphOptions } from "./Configuration/FilteredGraphOptions";
// import "./LargeGraph.css";
import { FilterControls } from "./FilterControls";
import "./Configuration/FilteredGraph.css";

export const FilteredGraph = ({
  graphData,
  options,
  largeCanvasWidth,
  largeCanvasHeight,
  analysisData,
  project,
  extractedIndicatorTimes,
  selectedWellArray,
}) => {
  return (
    <div className="filtered-graph">
      <Line
        className="filtered-graph-canvas"
        data={graphData}
        // width={largeCanvasWidth}
        // height={largeCanvasHeight}
        options={options}
      />
    </div>
  );
};
