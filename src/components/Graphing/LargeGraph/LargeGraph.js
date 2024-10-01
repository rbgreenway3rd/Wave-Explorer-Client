import React, { useRef, useState } from "react";
import "../../../styles/LargeGraph.css";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { LargeGraphOptions } from "../../../config/LargeGraphOptions";
import { LargeGraphControls } from "./LargeGraphControls";

Chart.register(zoomPlugin);

export const LargeGraph = ({
  rawGraphData,
  analysisData,
  extractedIndicatorTimes,
}) => {
  const chartRef = useRef(null);

  const [zoomState, setZoomState] = useState(true);
  const [zoomMode, setZoomMode] = useState("xy");

  const [panState, setPanState] = useState(true);
  const [panMode, setPanMode] = useState("xy");

  const largeGraphConfig = LargeGraphOptions(
    analysisData,
    extractedIndicatorTimes,
    zoomState,
    zoomMode,
    panState,
    panMode
  );

  // Function to reset zoom
  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const toggleZoomState = () => {
    setZoomState((prev) => !prev);
  };

  const changeZoomMode = (value) => {
    setZoomMode(value);
    return zoomMode;
  };

  const togglePanState = () => {
    setPanState((prev) => !prev);
  };

  const changePanMode = (value) => {
    setPanMode(value);
    return panMode;
  };

  return (
    <div className="large-graph">
      <section className="large-graph-canvas">
        <Line
          // className="large-graph-canvas"
          data={rawGraphData}
          options={largeGraphConfig}
          ref={chartRef}
        />
      </section>
      <section className="large-graph-controls">
        <LargeGraphControls
          resetZoom={resetZoom}
          zoomState={zoomState}
          toggleZoomState={toggleZoomState}
          changeZoomMode={changeZoomMode}
          panState={panState}
          togglePanState={togglePanState}
          changePanMode={changePanMode}
        />
      </section>
      {/* <button onClick={resetZoom}>Reset Zoom</button> */}
    </div>
  );
};
