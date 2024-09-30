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

export const FilteredGraph = ({
  wellArrays,
  extractedIndicatorTimes,
  filteredGraphData,
  options,
}) => {
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const animationFrameId = useRef(null);

  useEffect(() => {
    console.log("Filtered graph data:", filteredGraphData);
  }, [filteredGraphData, options]);

  console.log(wellArrays);

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
        chart.update("none"); // "none" ensures no animations for smoother update
      });
    },
    [isDragging, startPos]
  );

  // Handle mouse up to finalize the annotation and log times
  // Handle mouse up to finalize the annotation and log times
  // Handle mouse up to finalize the annotation and log times
  const handleMouseUp = (event) => {
    setIsDragging(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();

    // Get the pixel positions of the mouse at the time of mouse up
    const xMinPixel = startPos.x; // starting position
    const xMaxPixel = event.clientX - rect.left; // ending position

    // Get the ticks array from the x scale
    const ticks = chart.scales.x.getTicks(); // Use getTicks() to obtain ticks

    // Determine min and max indices from the ticks
    const minIndex = ticks.findIndex((tick) => tick && tick.value >= xMinPixel);
    const maxIndex = ticks.findIndex((tick) => tick && tick.value >= xMaxPixel);

    // Ensure that indices are valid
    const validMinIndex = minIndex === -1 ? 0 : minIndex; // Fallback to 0 if not found
    const validMaxIndex = maxIndex === -1 ? ticks.length - 1 : maxIndex; // Fallback to last index if not found

    // Extract the corresponding labels (indicator times) based on the indices
    const filteredTimes = extractedIndicatorTimes.slice(
      validMinIndex,
      validMaxIndex + 1
    );

    console.log(
      "Filtered extractedIndicatorTimes within bounds:",
      filteredTimes
    );
    const matchingWells = wellArrays.filter((well) =>
      well.indicators[0]?.filteredData.some((dataPoint) =>
        filteredTimes.includes(dataPoint.x)
      )
    );

    console.log("Matching wells:", matchingWells);
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
