// import React, {
//   useEffect,
//   useState,
//   useRef,
//   useCallback,
//   useContext,
// } from "react";
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
// import "../../../styles/FilteredGraph.css";
// import { DataContext } from "../../FileHandling/DataProvider";

// ChartJS.register(
//   ...registerables,
//   LineElement,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   annotationPlugin
// );

// export const FilteredGraph = ({
//   wellArrays,
//   extractedIndicatorTimes,
//   filteredGraphData,
//   annotationRangeStart,
//   setAnnotationRangeStart,
//   annotationRangeEnd,
//   setAnnotationRangeEnd,
//   options,
// }) => {
//   const chartRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [annotationStartPos, setAnnotationStartPos] = useState({ x: 0, y: 0 });
//   // const [annotationRangeStart, setAnnotationRangeStart] = useState(0);
//   // const [annotationRangeEnd, setAnnotationRangeEnd] = useState(
//   //   extractedIndicatorTimes.length
//   // );

//   const animationFrameId = useRef(null);

//   useEffect(() => {
//     console.log("Filtered graph data:", filteredGraphData);
//   }, [filteredGraphData, options]);

//   // Handle mouse down event to start drawing
//   const handleMouseDown = (event) => {
//     const chart = chartRef.current;
//     const rect = chart.canvas.getBoundingClientRect();
//     const x = event.clientX - rect.left;
//     let annotationRangeStartIndex = chart.scales.x.getValueForPixel(x);
//     setAnnotationStartPos({ x, y: 0 }); // No need to track y for height control
//     setIsDragging(true);
//     setAnnotationRangeStart(annotationRangeStartIndex);

//     console.log(
//       "annotationRangeStart non-state (Index): ",
//       annotationRangeStartIndex
//     );
//     console.log("annotationRangeStart (Index): ", annotationRangeStart);
//     console.log(
//       "annotationRangeStart value: ",
//       chart.scales.x.getLabelForValue(annotationRangeStartIndex)
//     );
//   };

//   // Handle mouse move event to dynamically update the annotation (with throttling)
//   const handleMouseMove = useCallback(
//     (event) => {
//       if (!isDragging) return;

//       // Use requestAnimationFrame to throttle the chart update
//       if (animationFrameId.current) {
//         cancelAnimationFrame(animationFrameId.current);
//       }

//       animationFrameId.current = requestAnimationFrame(() => {
//         const chart = chartRef.current;
//         const rect = chart.canvas.getBoundingClientRect();
//         const x = event.clientX - rect.left;

//         const xMin = Math.min(annotationStartPos.x, x);
//         const xMax = Math.max(annotationStartPos.x, x);

//         const yMin = chart.scales.y.min; // Define proper y-range
//         const yMax = chart.scales.y.max; // Define proper y-range

//         // Update annotation dynamically
//         chart.options.plugins.annotation.annotations = [
//           {
//             type: "box",
//             xMin: chart.scales.x.getValueForPixel(xMin),
//             xMax: chart.scales.x.getValueForPixel(xMax),
//             yMin: yMin, // Use the full designated y-range
//             yMax: yMax, // Use the full designated y-range
//             backgroundColor: "rgba(0, 255, 0, 0.2)",
//             borderColor: "rgba(0, 255, 0, 1)",
//             borderWidth: 2,
//           },
//         ];
//         chart.update("none"); // "none" ensures no animations for smoother update
//       });
//     },
//     [isDragging, annotationStartPos]
//   );

//   // Handle mouse up to finalize the annotation and log times
//   const handleMouseUp = (event) => {
//     setIsDragging(false);
//     if (animationFrameId.current) {
//       cancelAnimationFrame(animationFrameId.current);
//     }

//     const chart = chartRef.current;
//     const rect = chart.canvas.getBoundingClientRect();
//     const x = event.clientX - rect.left; // end position
//     let annotationRangeEndIndex = chart.scales.x.getValueForPixel(x);
//     setAnnotationRangeEnd(annotationRangeEndIndex);

//     console.log("annotationRangeEnd (Index): ", annotationRangeEndIndex);
//     console.log(
//       "annotationRangeEnd value: ",
//       chart.scales.x.getLabelForValue(annotationRangeEndIndex)
//     );
//   };

//   return (
//     <Line
//       ref={chartRef}
//       className="filtered-graph-canvas"
//       data={filteredGraphData}
//       options={options}
//       onMouseDown={handleMouseDown}
//       onMouseMove={handleMouseMove}
//       onMouseUp={handleMouseUp}
//     />
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

export const FilteredGraph = ({
  filteredGraphData,
  extractedIndicatorTimes,
  annotationRangeStart,
  setAnnotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeEnd,
  options,
}) => {
  const chartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [annotationStartPos, setAnnotationStartPos] = useState({ x: 0, y: 0 });
  const [annotations, setAnnotations] = useState([]); // Store annotations here

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

    // Get the annotation and store it in state, clearing old annotations
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

    // Clear old annotations and add the new one
    setAnnotations([newAnnotation]);

    console.log(
      "Final annotation range:",
      annotationRangeStart,
      annotationRangeEnd
    );
  };

  useEffect(() => {
    // Apply stored annotations to chart
    const chart = chartRef.current;
    if (chart) {
      chart.options.plugins.annotation.annotations = annotations;
      chart.update();
    }
  }, [annotations]);

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
