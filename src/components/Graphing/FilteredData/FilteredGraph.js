import React, { useEffect, useState, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  registerables,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  ...registerables,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin
);

export const FilteredGraph = ({ filteredGraphData, options }) => {
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.log("Filtered graph data:", filteredGraphData);
  }, [filteredGraphData, options]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (event) => {
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setStartPos({ x, y });
    setIsDragging(true);
  };
  // Handle mouse move event to dynamically update the annotation
  const handleMouseMove = (event) => {
    if (!isDragging) return;
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setEndPos({ x, y });
    const xMin = Math.min(startPos.x, x);
    const xMax = Math.max(startPos.x, x);
    const yMin = Math.min(startPos.y, y);
    const yMax = Math.max(startPos.y, y);
    // Update annotation dynamically
    chart.options.plugins.annotation.annotations = [
      {
        type: "box",
        xMin: chart.scales.x.getValueForPixel(xMin),
        xMax: chart.scales.x.getValueForPixel(xMax),
        yMin: chart.scales.y.getValueForPixel(yMin),
        yMax: chart.scales.y.getValueForPixel(yMax),
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      },
    ];
    chart.update();
  };
  // Handle mouse up to finalize the annotation
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="filtered-graph">
      <Line
        ref={chartRef}
        className="filtered-graph-canvas"
        data={filteredGraphData}
        options={options}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};
