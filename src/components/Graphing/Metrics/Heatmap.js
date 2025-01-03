import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import * as d3 from "d3";
import { DataContext } from "../../../providers/DataProvider";
import { ColormapValues } from "../config/HeatmapConfig";
import {
  linearRegression,
  calculateSlope,
  calculateRange,
  getAllValues,
  getAllSlopes,
  getAllRanges,
} from "./MetricsUtilities";
import "./Heatmap.css";
const Heatmap = ({
  rowLabels,
  columnLabels,
  annotationRangeStart,
  annotationRangeEnd,
  metricType,
  metricIndicator,
}) => {
  const { wellArrays, extractedIndicators, annotations } =
    useContext(DataContext);
  const heatmapRef = useRef(null);
  const colorScaleRef = useRef(null); // Canvas for color scale

  const [gradientState, setGradientState] = useState(false);

  // const [currentCellColors, setCurrentCellColors] = useState([]);

  // let currentCellColors = [];

  const [minMin, setMinMin] = useState(null);
  const [maxMin, setMaxMin] = useState(null);

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  const numColumns = columnLabels.length;
  const numRows = rowLabels.length;

  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
  );

  const handleResize = () => {
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleGradientState = (gradientState) => {
    setGradientState(!gradientState);
  };

  const annotationRange = useMemo(() => {
    if (!annotations || annotations.length === 0)
      return { start: null, end: null };
    return annotations[0].xMin > annotations[0].xMax
      ? { start: annotations[0].xMax, end: annotations[0].xMin }
      : { start: annotations[0].xMin, end: annotations[0].xMax };
  }, [annotations]);

  const allValues = useMemo(
    () => getAllValues(wellArrays, annotationRange, metricIndicator),
    [wellArrays, annotationRange, metricIndicator]
  );

  const minSlope = d3.min(
    getAllSlopes(wellArrays, annotationRange, metricIndicator)
  );
  const maxSlope = d3.max(
    getAllSlopes(wellArrays, annotationRange, metricIndicator)
  );
  const rangeExtent = d3.extent(
    getAllRanges(wellArrays, annotationRange, metricIndicator)
  );

  const handleMouseMove = (e) => {
    const rect = heatmapRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    const col = Math.floor(mouseX / cellWidth);
    const row = Math.floor(mouseY / cellHeight);
    const index = row * numColumns + col;

    if (index >= 0 && index < wellArrays.length) {
      const well = wellArrays[index];
      let heatmapData = well.indicators[metricIndicator]?.filteredData || [];

      // Only include filteredData within the annotationRange if it's set
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }

      const max = heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
      const min = heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const slope = heatmapData.length > 0 ? linearRegression(heatmapData) : 0;

      const rangeOfYValues = max - min;

      // Determine the active metric for the tooltip based on metricType
      const activeMetric =
        metricType === "Max"
          ? max
          : metricType === "Min"
          ? min
          : metricType === "Slope"
          ? slope
          : rangeOfYValues;

      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        label: well.label || "",
        value: activeMetric,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  // Mouse leave handler to hide tooltip
  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const isDataReady = useMemo(() => {
    return (
      wellArrays?.length > 0 &&
      allValues?.length > 0 &&
      !isNaN(minSlope) &&
      !isNaN(maxSlope) &&
      rangeExtent?.length === 2 &&
      !isNaN(rangeExtent[0]) &&
      !isNaN(rangeExtent[1])
    );
  }, [wellArrays, allValues, minSlope, maxSlope, rangeExtent]);

  // const colorScale = useMemo(() => {
  //   const extent = d3.extent(allValues);
  //   if (!isDataReady) {
  //     console.warn("Data not ready for color scale. Using fallback domain.");
  //     return d3
  //       .scaleSequential()
  //       .interpolator(d3.interpolateGreys) // Fallback color scheme
  //       .domain([0, 1]); // Default domain
  //   } else if (metricType === "Slope") {
  //     const midpoint = (minSlope + maxSlope) / 2;
  //     return d3
  //       .scaleDiverging()
  //       .interpolator(d3.interpolateRgbBasis(ColormapValues))
  //       .domain([minSlope, midpoint, maxSlope]);
  //   } else if (metricType === "Range") {
  //     const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
  //     return d3
  //       .scaleDiverging()
  //       .interpolator(d3.interpolateRgbBasis(ColormapValues))
  //       .domain([rangeExtent[0], midpoint, rangeExtent[1]]);
  //   } else {
  //     return d3
  //       .scaleSequential()
  //       .interpolator(d3.interpolateRgbBasis(ColormapValues))
  //       .domain(extent);
  //   }
  // }, [isDataReady, minSlope, maxSlope, rangeExtent, allValues, metricType]);

  // Calculate minMin and maxMin values
  useEffect(() => {
    const minValues = wellArrays.map((well) => {
      let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }
      return heatmapData.length > 0
        ? d3.min(heatmapData, (d) => d.y)
        : Infinity;
    });

    setMinMin(d3.min(minValues));
    setMaxMin(d3.max(minValues));
    console.log(d3.min(minValues), d3.max(minValues));
  }, [wellArrays, metricIndicator, annotationRange]);

  const colorScale = useMemo(() => {
    const extent = d3.extent(allValues);

    // if (!gradientState) {
    //   // Locked color scale when gradientState is false
    //   return d3
    //     .scaleSequential()
    //     .interpolator(d3.interpolateRgbBasis(ColormapValues))
    //     .domain(extent);
    // }

    if (!isDataReady) {
      console.warn("Data not ready for color scale. Using fallback domain.");
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateGreys)
        .domain([0, 1]);
    } else if (metricType === "Slope") {
      const midpoint = (minSlope + maxSlope) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([minSlope, midpoint, maxSlope]);
    } else if (metricType === "Range") {
      const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([rangeExtent[0], midpoint, rangeExtent[1]]);
    } else {
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain(extent);
    }
  }, [isDataReady, minSlope, maxSlope, rangeExtent, allValues, metricType]);

  const gradientColorScale = useMemo(() => {
    const extent = d3.extent(allValues);

    if (!gradientState) {
      // Locked color scale when gradientState is false
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain(extent);
    }

    if (!isDataReady) {
      console.warn("Data not ready for color scale. Using fallback domain.");
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateGreys)
        .domain([0, 1]);
    } else if (metricType === "Min") {
      const midpoint = (minMin + maxMin) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([minMin, midpoint, maxMin]);
    } else if (metricType === "Slope") {
      const midpoint = (minSlope + maxSlope) / 2;
      return (
        d3
          .scaleDiverging()
          // .scaleSequential()
          .interpolator(d3.interpolateRgbBasis(ColormapValues))
          .domain([minSlope, midpoint, maxSlope])
      );
    } else if (metricType === "Range") {
      console.log(rangeExtent);
      const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([rangeExtent[0], midpoint, rangeExtent[1]]);
    } else {
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain(extent);
    }
  }, [
    gradientState,
    isDataReady,
    minSlope,
    maxSlope,
    rangeExtent,
    allValues,
    metricType,
    maxMin,
    minMin,
  ]);

  // useEffect(() => {
  //   if (!colorScaleRef.current) {
  //     console.warn("Color scale canvas ref is not yet initialized.");
  //     return;
  //   }

  //   const canvas = colorScaleRef.current;
  //   const context = canvas.getContext("2d");

  //   if (!context) {
  //     console.error("Failed to get 2D context for the color scale canvas.");
  //     return;
  //   }

  //   const gradient = context.createLinearGradient(0, canvas.height, 0, 0);

  //   for (let i = 0; i <= 1; i += 0.01) {
  //     const value =
  //       gradientColorScale.domain()[0] +
  //       i * (gradientColorScale.domain()[1] - gradientColorScale.domain()[0]);
  //     gradient.addColorStop(i, gradientColorScale(value));
  //   }

  //   context.clearRect(0, 0, canvas.width, canvas.height);
  //   context.fillStyle = gradient;
  //   context.fillRect(0, 0, canvas.width, canvas.height);
  // }, [colorScaleRef, largeCanvasHeight, gradientColorScale]);
  useEffect(() => {
    if (!colorScaleRef.current) {
      console.warn("Color scale canvas ref is not yet initialized.");
      return;
    }

    const canvas = colorScaleRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("Failed to get 2D context for the color scale canvas.");
      return;
    }

    const domain = gradientColorScale.domain();

    if (!domain || domain.some((d) => d == null || isNaN(d))) {
      console.error("Invalid colorScale domain:", domain);
      return;
    }

    const gradient = context.createLinearGradient(0, canvas.height, 0, 0);

    // Ensure values align with the domain
    for (let i = 0; i <= 1; i += 0.01) {
      const value = domain[0] + i * (domain[domain.length - 1] - domain[0]);
      const color = gradientColorScale(value);

      if (!color) {
        console.error(
          "Invalid color for value:",
          value,
          "with colorScale:",
          gradientColorScale
        );
        continue; // Skip invalid color stops
      }

      gradient.addColorStop(i, color);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, [colorScaleRef, largeCanvasHeight, gradientColorScale, gradientState]);

  useEffect(() => {
    if (!heatmapRef.current) {
      console.warn("Heatmap canvas ref is not yet initialized.");
      return;
    }

    const canvas = heatmapRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      console.error("Failed to get 2D context for the heatmap canvas.");
      return;
    }

    const gradientWidth = 20; // Fixed width of the gradient canvas
    const adjustedCanvasWidth = largeCanvasWidth - gradientWidth; // Subtract the gradient width
    const cellWidth = adjustedCanvasWidth / numColumns; // Adjust cell width
    const cellHeight = largeCanvasHeight / numRows;

    context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

    // let newCellColors = [];
    // currentCellColors = [];

    wellArrays.forEach((well, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;

      let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }

      const max = heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
      const min = heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const rangeOfYValues = max - min;
      const slope = calculateSlope(heatmapData);

      const activeMetric =
        metricType === "Max"
          ? max
          : metricType === "Min"
          ? min
          : metricType === "Slope"
          ? slope
          : rangeOfYValues;

      context.fillStyle = colorScale(activeMetric);
      // newCellColors.push(colorScale(activeMetric));

      context.fillRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      // Add cell borders
      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.strokeRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      // Draw well labels
      context.fillStyle = "black";
      context.font = "12px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";

      const textX = col * cellWidth + cellWidth / 2;
      const textY = row * cellHeight + cellHeight / 2;
      context.fillText(well.label || "", textX, textY);
    });
    // setCurrentCellColors(newCellColors);
    // console.log(newCellColors);
    // currentCellColors = newCellColors;
  }, [
    wellArrays,
    allValues,
    largeCanvasWidth,
    largeCanvasHeight,
    numColumns,
    numRows,
    annotationRange,
    metricType,
    colorScale,
    metricIndicator,
  ]);
  return (
    <>
      {isDataReady ? (
        <div className="heatmap-container" style={{ position: "relative" }}>
          {/* Color Scale Gradient */}
          <section className="color-scale" height="100%">
            {/* Checkbox in the top-left corner */}
            <div className="color-scale-toggle">
              <input
                type="checkbox"
                checked={gradientState}
                onChange={() => toggleGradientState(gradientState)}
              />
            </div>
            <canvas
              className="color-scale-canvas"
              ref={colorScaleRef}
              width={20}
            />
          </section>
          {/* Heatmap Canvas */}
          <canvas
            className="heatmap-canvas"
            ref={heatmapRef}
            width={largeCanvasWidth - 20}
            height={largeCanvasHeight}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          />
          {/* Tooltip */}
        </div>
      ) : (
        <div>Loading heatmap data...</div>
      )}
      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 20,
            top: tooltip.y - 40,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "5px",
            borderRadius: "5px",
            pointerEvents: "none",
            zIndex: 99999,
          }}
        >
          <div>
            <strong>{tooltip.label}</strong>
          </div>
          <div>{tooltip.value}</div>
        </div>
      )}
    </>
  );
};

export default Heatmap;
