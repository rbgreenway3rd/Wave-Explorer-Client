import React, { useRef, forwardRef, useImperativeHandle } from "react";
import "../../../styles/LargeGraph.css";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";

Chart.register(zoomPlugin);

export const LargeGraph = forwardRef(
  ({ rawGraphData, largeGraphConfig }, ref) => {
    const chartRef = useRef(null);

    // Expose resetZoom function to parent via ref
    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (chartRef.current) {
          chartRef.current.resetZoom();
        }
      },
    }));

    return (
      <div className="large-graph">
        <section className="large-graph-canvas">
          <Line data={rawGraphData} options={largeGraphConfig} ref={chartRef} />
        </section>
      </div>
    );
  }
);

export default LargeGraph;
