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
  const [annotationStartPos, setAnnotationStartPos] = useState({ x: 0, y: 0 });
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(extractedIndicatorTimes.length);

  const animationFrameId = useRef(null);

  useEffect(() => {
    console.log("Filtered graph data:", filteredGraphData);
  }, [filteredGraphData, options]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (event) => {
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let rangeStartIndex = chart.scales.x.getValueForPixel(x);
    setAnnotationStartPos({ x, y: 0 }); // No need to track y for height control
    setIsDragging(true);

    console.log("rangeStart (Index): ", rangeStartIndex);
    console.log(
      "rangeStart value: ",
      chart.scales.x.getLabelForValue(rangeStartIndex)
    );
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

        const xMin = Math.min(annotationStartPos.x, x);
        const xMax = Math.max(annotationStartPos.x, x);

        const yMin = chart.scales.y.min; // Define proper y-range
        const yMax = chart.scales.y.max; // Define proper y-range

        // Update annotation dynamically
        chart.options.plugins.annotation.annotations = [
          {
            type: "box",
            xMin: chart.scales.x.getValueForPixel(xMin),
            xMax: chart.scales.x.getValueForPixel(xMax),
            yMin: yMin, // Use the full designated y-range
            yMax: yMax, // Use the full designated y-range
            backgroundColor: "rgba(0, 255, 0, 0.2)",
            borderColor: "rgba(0, 255, 0, 1)",
            borderWidth: 2,
          },
        ];
        chart.update("none"); // "none" ensures no animations for smoother update
      });
    },
    [isDragging, annotationStartPos]
  );

  // Handle mouse up to finalize the annotation and log times
  const handleMouseUp = (event) => {
    setIsDragging(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }

    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left; // end position
    let rangeEndIndex = chart.scales.x.getValueForPixel(x);

    console.log("rangeEnd (Index): ", rangeEndIndex);
    console.log(
      "rangeEnd value: ",
      chart.scales.x.getLabelForValue(rangeEndIndex)
    );

    // // Get the pixel positions of the mouse at the time of mouse up
    // const xMinPixel = annotationStartPos.x; // starting position
    // const xMaxPixel = event.clientX - rect.left; // ending position

    // // Get the ticks array from the x scale
    // const ticks = chart.scales.x.getTicks(); // Use getTicks() to obtain ticks

    // // Determine min and max indices from the ticks
    // const minIndex = ticks.findIndex((tick) => tick && tick.value >= xMinPixel);
    // const maxIndex = ticks.findIndex((tick) => tick && tick.value >= xMaxPixel);

    // // Ensure that indices are valid
    // const validMinIndex = minIndex === -1 ? 0 : minIndex; // Fallback to 0 if not found
    // const validMaxIndex = maxIndex === -1 ? ticks.length - 1 : maxIndex; // Fallback to last index if not found

    // // Extract the corresponding labels (indicator times) based on the indices
    // const filteredTimes = extractedIndicatorTimes.slice(
    //   validMinIndex,
    //   validMaxIndex + 1
    // );
  };

  return (
    <Line
      ref={chartRef}
      className="filtered-graph-canvas"
      data={filteredGraphData}
      options={options}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};
