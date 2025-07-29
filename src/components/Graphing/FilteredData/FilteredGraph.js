import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useContext,
  forwardRef,
} from "react";
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
import { FilteredGraphOptions } from "../config/FilteredGraphOptions";
import { updateChart } from "../config/FilteredGraphOptions";
import { DataContext } from "../../../providers/DataProvider";

ChartJS.register(
  ...registerables,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin
);

export const FilteredGraph = ({
  filteredGraphData,
  annotationRangeStart,
  setAnnotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeEnd,
  filteredGraphConfig,
}) => {
  const { wellArrays, extractedIndicatorTimes, annotations, setAnnotations } =
    useContext(DataContext);
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [annotationStartPos, setAnnotationStartPos] = useState({
    x: 0,
    y: 0,
  });

  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
  );

  const [smallCanvasWidth, setSmallCanvasWidth] = useState(
    window.innerWidth / 64.4
  );
  const [smallCanvasHeight, setSmallCanvasHeight] = useState(
    window.innerHeight / 46
  );

  const handleResize = () => {
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
    setSmallCanvasWidth(window.innerWidth / 64.4);
    setSmallCanvasHeight(window.innerHeight / 46);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update chart when annotations change
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.options.plugins.annotation.annotations = annotations; // Apply props directly
      chart.update();
    }
  }, [annotations]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (event) => {
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let annotationRangeStartIndex = chart.scales.x.getValueForPixel(x);

    // Always ensure annotationRangeStartIndex is a valid number
    if (
      typeof annotationRangeStartIndex !== "number" ||
      isNaN(annotationRangeStartIndex)
    ) {
      annotationRangeStartIndex = 0;
    }

    setAnnotationStartPos({ x: x, y: 0 });
    setIsDragging(true);

    // Clamp to valid range
    if (annotationRangeStartIndex < 0) {
      setAnnotationRangeStart(0);
    } else if (annotationRangeStartIndex > extractedIndicatorTimes.length) {
      setAnnotationRangeStart(extractedIndicatorTimes.length);
    } else {
      setAnnotationRangeStart(
        chart.scales.x.getValueForPixel(Math.min(annotationStartPos.x, x))
      );
    }
  };

  // Handle mouse move to dynamically update the annotation
  const handleMouseMove = useCallback(
    (event) => {
      if (!isDragging) return;

      const chart = chartRef.current;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;

      const xMin = Math.min(annotationStartPos.x, x);
      const xMax = Math.max(annotationStartPos.x, x);

      const yMin = chart.scales.y.min;
      const yMax = chart.scales.y.max;

      // Update annotation dynamically (without requestAnimationFrame)
      chart.options.plugins.annotation.annotations = [
        {
          type: "box",
          xMin: chart.scales.x.getValueForPixel(xMin),
          xMax: chart.scales.x.getValueForPixel(xMax),
          yMin: yMin,
          yMax: yMax,
          backgroundColor: "rgba(0, 255, 0, 0.2)",
          borderColor: "rgba(0, 255, 0, 1)",
          borderWidth: 2,
        },
      ];
      chart.update("none"); // Immediate update
    },
    [isDragging, annotationStartPos]
  );

  // Handle mouse up to finalize the annotation and persist it
  const handleMouseUp = (event) => {
    setIsDragging(false);

    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let annotationRangeEndIndex = chart.scales.x.getValueForPixel(x);

    // Always ensure annotationRangeEndIndex is a valid number
    if (
      typeof annotationRangeEndIndex !== "number" ||
      isNaN(annotationRangeEndIndex)
    ) {
      annotationRangeEndIndex = chart.scales.x.max;
    }

    // Always create annotation with valid numbers
    let xMin = chart.scales.x.getValueForPixel(
      Math.min(annotationStartPos.x, x)
    );
    let xMax = chart.scales.x.getValueForPixel(
      Math.max(annotationStartPos.x, x)
    );
    const yMin = chart.scales.y.min;
    const yMax = chart.scales.y.max;

    // Snap xMin and xMax to nearest available x values in the data
    // Use extractedIndicatorTimes for robust x values
    let xs = [];
    if (
      extractedIndicatorTimes &&
      Object.values(extractedIndicatorTimes).length > 0
    ) {
      xs = Object.values(extractedIndicatorTimes)[0];
    }

    if (xs.length > 0) {
      // Snap xMin
      xMin = xs.reduce(
        (prev, curr) =>
          Math.abs(curr - xMin) < Math.abs(prev - xMin) ? curr : prev,
        xs[0]
      );
      // Snap xMax
      xMax = xs.reduce(
        (prev, curr) =>
          Math.abs(curr - xMax) < Math.abs(prev - xMax) ? curr : prev,
        xs[0]
      );
    }

    // Ensure xMin <= xMax
    const snappedStart = Math.min(xMin, xMax);
    const snappedEnd = Math.max(xMin, xMax);

    // Set annotation range in parent state (if provided)
    if (typeof setAnnotationRangeStart === "function") {
      setAnnotationRangeStart(snappedStart);
    }
    if (typeof setAnnotationRangeEnd === "function") {
      setAnnotationRangeEnd(snappedEnd);
    }

    const newAnnotation = {
      type: "box",
      xMin: snappedStart,
      xMax: snappedEnd,
      yMin,
      yMax,
      backgroundColor: "rgba(0, 255, 0, 0.2)",
      borderColor: "rgba(0, 255, 0, 1)",
      borderWidth: 2,
    };

    // Always create a new array/object for setAnnotations to ensure reactivity
    setAnnotations([{ ...newAnnotation }]);
  };

  return (
    <Line
      key={JSON.stringify(filteredGraphData)}
      ref={chartRef}
      className="filtered-graph-canvas"
      data={filteredGraphData}
      options={filteredGraphConfig}
      width={largeCanvasWidth}
      height={largeCanvasHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};
// );
export default FilteredGraph;
