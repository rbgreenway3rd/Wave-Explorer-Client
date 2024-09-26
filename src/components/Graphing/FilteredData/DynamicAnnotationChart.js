import React, { useRef, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
// Register required Chart.js components
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin
);
const DynamicAnnotationChart = () => {
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [endPos, setEndPos] = useState({ x: 0, y: 0 });
  // Sample chart data
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 3, 5, 2, 3],
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };
  // Chart options including the annotation plugin
  const options = {
    plugins: {
      annotation: {
        annotations: [],
      },
    },
    scales: {
      x: { beginAtZero: true },
      y: { beginAtZero: true },
    },
  };
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
    <div>
      <Line
        ref={chartRef}
        data={data}
        options={options}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};
export default DynamicAnnotationChart;
