import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
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
import { FilteredGraphOptions } from "../../../config/FilteredGraphOptions";

ChartJS.register(
  ...registerables,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  annotationPlugin
);

export const FilteredGraph = ({
  analysisData,
  wellArrays,
  filteredGraphData,
  extractedIndicatorTimes,
  annotationRangeStart,
  setAnnotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeEnd,
  annotations,
  setAnnotations,
  // options,
}) => {
  const chartRef = useRef(null);
  // const annotationsRef = useRef([]);
  const [isDragging, setIsDragging] = useState(false);
  const [annotationStartPos, setAnnotationStartPos] = useState({ x: 0, y: 0 });
  // const [annotations, setAnnotations] = useState([]); // Store annotations here

  // const filteredGraphConfig = FilteredGraphOptions(
  //   analysisData,
  //   wellArrays,
  //   filteredGraphData,
  //   extractedIndicatorTimes
  // );
  // Memoized options object including annotations
  const options = useMemo(() => {
    return FilteredGraphOptions(
      [],
      wellArrays,
      filteredGraphData,
      extractedIndicatorTimes,
      annotations
    );
  }, [wellArrays, filteredGraphData, extractedIndicatorTimes, annotations]); // Dependencies include annotations

  useEffect(() => {
    console.log("Filtered graph data:", filteredGraphData);
  }, [filteredGraphData, options]);

  // Handle mouse down event to start drawing
  const handleMouseDown = (event) => {
    const chart = chartRef.current;
    const rect = chart.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const annotationRangeStartIndex = chart.scales.x.getValueForPixel(x);

    setAnnotationStartPos({ x, y: 0 });
    setIsDragging(true);
    if (
      annotationRangeStartIndex < 0 ||
      annotationRangeStartIndex > extractedIndicatorTimes.length
    ) {
      setAnnotationRangeStart(0);
    } else {
      setAnnotationRangeStart(annotationRangeStartIndex);
    }

    console.log("Start position:", annotationRangeStartIndex);
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
    const annotationRangeEndIndex = chart.scales.x.getValueForPixel(x);

    if (
      annotationRangeEndIndex > extractedIndicatorTimes.length ||
      annotationRangeEndIndex < 0
    ) {
      setAnnotationRangeEnd(extractedIndicatorTimes.length);
    } else {
      setAnnotationRangeEnd(annotationRangeEndIndex);
    }

    // Get the annotation and store it in state without clearing old annotations
    const newAnnotation = {
      type: "box",
      xMin: chart.scales.x.getValueForPixel(Math.min(annotationStartPos.x, x)),
      xMax: chart.scales.x.getValueForPixel(Math.max(annotationStartPos.x, x)),
      yMin: chart.scales.y.min,
      yMax: chart.scales.y.max,
      backgroundColor: "rgba(0, 255, 0, 0.2)",
      borderColor: "rgba(0, 255, 0, 1)",
      borderWidth: 2,
    };

    // Add the new annotation without clearing old ones
    // setAnnotations((prevAnnotations) => [...prevAnnotations, newAnnotation]);
    setAnnotations([newAnnotation]);

    console.log(
      "Final annotation range:",
      annotationRangeStart,
      annotationRangeEnd
    );
  };

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      chart.options.plugins.annotation.annotations = annotations; // Apply props directly
      chart.update();
    }
  }, [annotations]); // Update chart when annotations change

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
