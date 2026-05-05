import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useContext,
} from "react";
import "../../../styles/LargeGraph.css";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { DataContext } from "../../../providers/DataProvider";
import html2canvas from "html2canvas";

Chart.register(zoomPlugin);

export const LargeGraph = forwardRef(
  ({ rawGraphData, filteredGraphData, largeGraphConfig }, ref) => {
    const { wellArrays, overlayRawAndFiltered } = useContext(DataContext);

    const componentRef = useRef(null);
    const chartRef = useRef(null);

    // Chart.js Line is sized by its parent when `responsive: true` +
    // `maintainAspectRatio: false`. The wrapper below fills the chart
    // panel; we don't pass explicit width/height props anymore (those
    // were `window.innerWidth / 2.3` heuristics that mismatched the
    // real container with the new symmetric grid).

    // Expose resetZoom function to parent via ref
    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (chartRef.current) {
          chartRef.current.resetZoom();
        }
      },
    }));

    const handleDownload = async () => {
      if (componentRef.current) {
        const canvas = await html2canvas(componentRef.current);
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "component.png";
        link.click();
      }
    };

    const combinedGraphData = {
      ...rawGraphData,
      datasets: overlayRawAndFiltered
        ? [
            ...filteredGraphData.datasets.map((dataset) => ({
              ...dataset,
              borderColor: "rgba(255, 99, 132, 1)", // Red for filtered data
              backgroundColor: "rgba(255, 99, 132, 0.2)", // Light red for fill
            })),
            ...rawGraphData.datasets.map((dataset) => ({
              ...dataset,
              borderColor: "rgba(75, 192, 192, 1)", // Teal for raw data
              backgroundColor: "rgba(75, 192, 192, 0.2)", // Light teal for fill
            })),
          ]
        : rawGraphData.datasets,
    };

    return (
      <div className="large-graph-wrapper" ref={componentRef}>
        <Line
          key={JSON.stringify(rawGraphData)}
          className="large-graph-canvas"
          data={combinedGraphData}
          options={largeGraphConfig}
          ref={chartRef}
        />
      </div>
    );
  }
);

export default LargeGraph;
