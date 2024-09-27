// import React, { useEffect, useState, useRef } from "react";
// import { Line } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   LineElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   registerables,
// } from "chart.js";
// import annotationPlugin from "chartjs-plugin-annotation";

// ChartJS.register(
//   ...registerables,
//   LineElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   annotationPlugin
// );

// export const FilteredGraph = ({ filteredGraphData, options }) => {
//   const chartRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [startPos, setStartPos] = useState({ x: 0, y: 0 });
//   const [endPos, setEndPos] = useState({ x: 0, y: 0 });

//   useEffect(() => {
//     console.log("Filtered graph data:", filteredGraphData);
//   }, [filteredGraphData, options]);

//   // Handle mouse down event to start drawing
//   const handleMouseDown = (event) => {
//     const chart = chartRef.current;
//     const rect = chart.canvas.getBoundingClientRect();
//     const x = event.clientX - rect.left;
//     setStartPos({ x, y: 0 }); // No need to track y for height control
//     setIsDragging(true);
//   };

//   // Handle mouse move event to dynamically update the annotation
//   const handleMouseMove = (event) => {
//     if (!isDragging) return;
//     const chart = chartRef.current;
//     const rect = chart.canvas.getBoundingClientRect();
//     const x = event.clientX - rect.left;

//     const xMin = Math.min(startPos.x, x);
//     const xMax = Math.max(startPos.x, x);

//     const yMin = chart.scales.y.min; // Use the entire y-range
//     const yMax = chart.scales.y.max; // Use the entire y-range

//     // Update annotation dynamically
//     chart.options.plugins.annotation.annotations = [
//       {
//         type: "box",
//         xMin: chart.scales.x.getValueForPixel(xMin),
//         xMax: chart.scales.x.getValueForPixel(xMax),
//         yMin: yMin, // Use the full y-range
//         yMax: yMax, // Use the full y-range
//         backgroundColor: "rgba(0, 255, 0, 0.2)",
//         borderColor: "rgba(0, 255, 0, 1)",
//         borderWidth: 2,
//       },
//     ];
//     chart.update();
//   };

//   // Handle mouse up to finalize the annotation
//   const handleMouseUp = () => {
//     setIsDragging(false);
//   };

//   return (
//     <div className="filtered-graph">
//       <Line
//         ref={chartRef}
//         className="filtered-graph-canvas"
//         data={filteredGraphData}
//         options={options}
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//       />
//     </div>
//   );
// };
import React, { useEffect, useState, useRef, useCallback } from "react";
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
import "../../../styles/FilteredGraph.css";

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
  const animationFrameId = useRef(null);

  useEffect(() => {
    console.log("Filtered graph data:", filteredGraphData);
  }, [filteredGraphData, options]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (event) => {
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    setStartPos({ x, y: 0 }); // No need to track y for height control
    setIsDragging(true);
  };

  // Handle mouse move event to dynamically update the annotation (with throttling)
  const handleMouseMove = useCallback(
    (event) => {
      if (!isDragging) return;

      // Use requestAnimationFrame to throttle the chart update
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }

      animationFrameId.current = requestAnimationFrame(() => {
        const chart = chartRef.current;
        const rect = chart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;

        const xMin = Math.min(startPos.x, x);
        const xMax = Math.max(startPos.x, x);

        const yMin = chart.scales.y.min; // Use the entire y-range
        const yMax = chart.scales.y.max; // Use the entire y-range

        // Update annotation dynamically
        chart.options.plugins.annotation.annotations = [
          {
            type: "box",
            xMin: chart.scales.x.getValueForPixel(xMin),
            xMax: chart.scales.x.getValueForPixel(xMax),
            yMin: yMin, // Use the full y-range
            yMax: yMax, // Use the full y-range
            backgroundColor: "rgba(0, 255, 0, 0.2)",
            borderColor: "rgba(0, 255, 0, 1)",
            borderWidth: 2,
          },
        ];
        chart.update("none"); // "none" ensures no animations, for smoother update
      });
    },
    [isDragging, startPos]
  );

  // Handle mouse up to finalize the annotation
  const handleMouseUp = () => {
    setIsDragging(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
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
