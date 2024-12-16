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
  analysisData,
  // wellArrays,
  filteredGraphData,
  // extractedIndicatorTimes,
  annotationRangeStart,
  setAnnotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeEnd,
  // annotations,
  // setAnnotations,
  filteredGraphConfig,
}) => {
  // export const FilteredGraph = forwardRef(
  //   (
  //     {
  //       filteredGraphData,
  //       filteredGraphConfig,
  //       annotationRangeStart,
  //       setAnnotationRangeStart,
  //       annotationRangeEnd,
  //       setAnnotationRangeEnd,
  //       annotations,
  //       setAnnotations,
  //     },
  //     ref
  //   ) => {
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

  // useEffect(() => {
  //   if (chartRef.current) {
  //     updateChart(chartRef.current, wellArrays, extractedIndicatorTimes);
  //   }
  // }, [wellArrays, extractedIndicatorTimes]);

  // Recalculate min/max y-values dynamically whenever filteredGraphData changes
  const calculateYMinMax = (data) => {
    const allYValues = data.datasets.flatMap((dataset) =>
      dataset.data.map((point) => point.y)
    );
    const minYValue = Math.min(...allYValues, 0); // Ensure it doesn't go below 0
    const maxYValue = Math.max(...allYValues, 100); // Ensure it doesn't go above 100
    return { minYValue, maxYValue };
  };

  const { minYValue, maxYValue } = useMemo(
    () => calculateYMinMax(filteredGraphData),
    [filteredGraphData]
  );

  // // Generate the chart options with dynamic min/max y-values
  // const options = useMemo(() => {
  //   return FilteredGraphOptions(
  //     [],
  //     wellArrays,
  //     filteredGraphData,
  //     extractedIndicatorTimes,
  //     annotations
  //     // minYValue,
  //     // maxYValue
  //   );
  // }, [wellArrays, extractedIndicatorTimes, annotations, filteredGraphData]);

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

    if (annotationRangeStartIndex === null) {
      annotationRangeStartIndex = 0; // Set to 0 if null
    }

    setAnnotationStartPos({ x, y: 0 });
    setIsDragging(true);

    if (
      annotationRangeStartIndex < 0 ||
      annotationRangeStartIndex > extractedIndicatorTimes.length
    ) {
      setAnnotationRangeStart(0);
    } else if (annotationRangeStartIndex < 0) {
      setAnnotationRangeStart(0);
    } else {
      setAnnotationRangeStart(annotationRangeStartIndex);
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

    if (annotationRangeEnd === null) {
      annotationRangeEndIndex = chart.scales.x.max; // Set to max value if null
    }

    if (
      annotationRangeEndIndex > extractedIndicatorTimes.length ||
      annotationRangeEndIndex < 0
    ) {
      setAnnotationRangeEnd(extractedIndicatorTimes.length);
    } else {
      setAnnotationRangeEnd(annotationRangeEndIndex);
    }

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

    setAnnotations([newAnnotation]);

    console.log(
      "Final annotation range:",
      annotationRangeStart,
      annotationRangeEnd
    );
    console.log("newAnnotation: ", newAnnotation);
    console.log("annotations: ", annotations);
  };

  return (
    <Line
      key={`${largeCanvasWidth}-${largeCanvasHeight}`}
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
