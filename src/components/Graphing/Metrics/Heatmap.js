import React, { useRef, useEffect, useState, useMemo, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "../../../providers/DataProvider";
import { ColormapValues } from "../config/HeatmapConfig";
import {
  getAllValues,
  getAllSlopes,
  getAllRanges,
} from "./MetricsUtilities";
import { filteredXyInRange } from "../../../utilities/filterPack";
import { useContainerSize } from "../../../utilities/useContainerSize";
import "./Heatmap.css";

const Heatmap = ({ rowLabels, columnLabels, metricType, metricIndicator }) => {
  const { wellArrays, annotations, selectedWellArray } =
    useContext(DataContext);

  const heatmapRef = useRef(null);
  const colorScaleRef = useRef(null); // Canvas for color scale
  const [gradientState, setGradientState] = useState(false);
  const [minMin, setMinMin] = useState(null);
  const [maxMin, setMaxMin] = useState(null);

  const [currentCellColors, setCurrentCellColors] = useState([]);

  // Track the actual container size via ResizeObserver — replaces the
  // old `window.innerWidth / 2.3` heuristic, which over-sized the
  // canvas (overflowed right) and under-fit the height (left empty
  // space below) once the four-quadrant grid was made symmetric.
  const [containerRef, containerSize] = useContainerSize();
  const largeCanvasWidth = Math.max(0, Math.floor(containerSize.width));
  const largeCanvasHeight = Math.max(0, Math.floor(containerSize.height));

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  const numColumns = columnLabels.length;
  const numRows = rowLabels.length;

  const toggleGradientState = (gradientState) => {
    setGradientState(!gradientState);
  };

  // Always derive annotationRange from the annotation object (snapped)
  const annotationRange = useMemo(() => {
    if (!annotations || annotations.length === 0)
      return { start: null, end: null };
    // Log the annotation object for debugging

    // Always use the snapped xMin/xMax from the annotation object
    const xMin = annotations[0].xMin;
    const xMax = annotations[0].xMax;
    const range =
      xMin > xMax ? { start: xMax, end: xMin } : { start: xMin, end: xMax };
    // Log the computed annotationRange for debugging

    return range;
  }, [annotations]);

  // Remove async state for metrics and useMemo for allValues, allSlopes, allRanges
  const allValues = useMemo(
    () => getAllValues(wellArrays, annotationRange, metricIndicator),
    [wellArrays, annotationRange, metricIndicator]
  );
  const allSlopes = useMemo(
    () => getAllSlopes(wellArrays, annotationRange, metricIndicator),
    [wellArrays, annotationRange, metricIndicator]
  );
  const allRanges = useMemo(
    () => getAllRanges(wellArrays, annotationRange, metricIndicator),
    [wellArrays, annotationRange, metricIndicator]
  );

  const minSlope = useMemo(() => d3.min(allSlopes), [allSlopes]);
  const maxSlope = useMemo(() => d3.max(allSlopes), [allSlopes]);
  const rangeExtent = useMemo(() => d3.extent(allRanges), [allRanges]);

  // Calculate minMin and maxMin values. Reads typed-array filtered data
  // directly so we never trigger {x,y}[] materialization across all wells.
  useEffect(() => {
    let minMinV = Infinity;
    let maxMinV = -Infinity;
    for (let w = 0; w < wellArrays.length; w++) {
      const ind = wellArrays[w].indicators?.[metricIndicator];
      const { ys } = filteredXyInRange(
        ind,
        annotationRange.start,
        annotationRange.end
      );
      if (!ys || ys.length === 0) continue;
      let localMin = Infinity;
      for (let i = 0; i < ys.length; i++) if (ys[i] < localMin) localMin = ys[i];
      if (localMin < minMinV) minMinV = localMin;
      if (localMin > maxMinV) maxMinV = localMin;
    }
    setMinMin(minMinV === Infinity ? undefined : minMinV);
    setMaxMin(maxMinV === -Infinity ? undefined : maxMinV);
  }, [wellArrays, metricIndicator, annotationRange]);

  const colorScale = useMemo(() => {
    const extent = d3.extent(allValues);
    if (metricType === "Slope") {
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
  }, [minSlope, maxSlope, rangeExtent, allValues, metricType]);

  const sortRGBColors = (colors) => {
    return colors.sort((colorA, colorB) => {
      // Extract RGB values from the "rgb(r, g, b)" format
      const rgbA = colorA.match(/\d+/g).map(Number); // [r, g, b]
      const rgbB = colorB.match(/\d+/g).map(Number); // [r, g, b]

      // Get dominant color
      const dominantA = getDominantColor(rgbA);
      const dominantB = getDominantColor(rgbB);

      // Define order of dominant colors (Blues → Greens → Yellows → Oranges → Reds)
      const order = { blue: 1, green: 2, yellow: 3, orange: 4, red: 5 };

      if (order[dominantA] !== order[dominantB]) {
        return order[dominantA] - order[dominantB]; // Primary sort by dominant color
      }

      // Sorting within each color group:
      return refineSortWithinGroup(rgbA, rgbB, dominantA);
    });
  };

  // COLOR SORTING
  // Function to determine dominant color category
  const getDominantColor = ([r, g, b]) => {
    if (b > g && b > r) return "blue";
    if (g > r && g > b) return "green";
    if (r > g && g > b) return "orange";
    if (r > g && b < g) return "yellow";
    return "red";
  };

  // Function to refine sorting within each color category
  const refineSortWithinGroup = (rgbA, rgbB, category) => {
    const [rA, gA, bA] = rgbA;
    const [rB, gB, bB] = rgbB;

    if (category === "blue") {
      return bA - bB || gA - gB; // Sort by blue, then green
    }
    if (category === "green") {
      return gA - gB || rA - rB; // Sort by green, then red
    }
    if (category === "yellow") {
      return rA - rB; // Sort by red
    }
    if (category === "orange") {
      return rA - rB; // Sort by red
    }
    return rA - rB; // Reds sorted by red intensity
  };

  useEffect(() => {
    if (!heatmapRef.current) return;

    const canvas = heatmapRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    const adjustedCanvasWidth = largeCanvasWidth;
    const cellWidth = adjustedCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

    let newColors = [];

    // First pass: draw all cells and their default borders. Reads filtered
    // typed arrays directly via filteredXyInRange — never materializes the
    // {x,y}[] form, which would OOM for every-well iteration on large data.
    const isValidRange =
      typeof annotationRange.start === "number" &&
      typeof annotationRange.end === "number" &&
      !isNaN(annotationRange.start) &&
      !isNaN(annotationRange.end) &&
      annotationRange.start < annotationRange.end;
    wellArrays.forEach((well, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;

      const ind = well.indicators?.[metricIndicator];
      const { xs, ys } = filteredXyInRange(
        ind,
        isValidRange ? annotationRange.start : null,
        isValidRange ? annotationRange.end : null
      );

      let max = 0;
      let min = 0;
      if (ys.length > 0) {
        max = -Infinity;
        min = Infinity;
        for (let k = 0; k < ys.length; k++) {
          const y = ys[k];
          if (y < min) min = y;
          if (y > max) max = y;
        }
      }
      const rangeOfYValues = ys.length > 0 ? max - min : 0;
      let slope = 0;
      if (ys.length > 0) {
        let xsum = 0;
        let ysum = 0;
        for (let k = 0; k < ys.length; k++) {
          xsum += xs[k];
          ysum += ys[k];
        }
        const xmean = xsum / ys.length;
        const ymean = ysum / ys.length;
        let num = 0;
        let denom = 0;
        for (let k = 0; k < ys.length; k++) {
          const dx = xs[k] - xmean;
          num += dx * (ys[k] - ymean);
          denom += dx * dx;
        }
        slope = denom === 0 ? 0 : num / denom;
      }

      const activeMetric =
        metricType === "Max"
          ? max
          : metricType === "Min"
          ? min
          : metricType === "Slope"
          ? slope
          : rangeOfYValues;

      const color = colorScale(activeMetric);
      newColors.push(color);

      context.fillStyle = color;
      context.fillRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      // Draw default border (black, thin)
      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.strokeRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      context.fillStyle = "black";
      context.font = "12px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";

      const textX = col * cellWidth + cellWidth / 2;
      const textY = row * cellHeight + cellHeight / 2;
      context.fillText(well.label || "", textX, textY);
    });

    // Draw gradient inset borders for selected wells on top (always, after cells drawn)
    if (selectedWellArray && selectedWellArray.length > 0) {
      selectedWellArray.forEach((sel) => {
        const index = wellArrays.findIndex((well) => well.label === sel.label);
        if (index !== -1) {
          const row = Math.floor(index / numColumns);
          const col = index % numColumns;
          context.save();
          context.strokeStyle = "white";
          context.lineWidth = 2.5;
          // Inset border: draw a smaller rectangle inside the cell
          // const inset = 4; // px inset from each edge
          // context.strokeRect(
          //   col * cellWidth + inset,
          //   row * cellHeight + inset,
          //   cellWidth - 2 * inset,
          //   cellHeight - 2 * inset
          // );
          // Gradient border implementation:
          const inset = 4;
          const x = col * cellWidth + inset;
          const y = row * cellHeight + inset;
          const w = cellWidth - 2 * inset;
          const h = cellHeight - 2 * inset;
          // Create a diagonal linear gradient for the border
          const grad = context.createLinearGradient(x, y, x + w, y + h);
          grad.addColorStop(0, "darkgray");
          grad.addColorStop(0.25, "black");
          grad.addColorStop(0.75, "black");
          grad.addColorStop(1, "darkgray");
          context.strokeStyle = grad;
          context.lineWidth = 2.5;
          context.strokeRect(x, y, w, h);
          context.restore();
        }
      });
    }

    setCurrentCellColors((prevColors) => {
      if (
        prevColors.length === newColors.length &&
        prevColors.every((color, i) => color === newColors[i])
      ) {
        return prevColors; // No change, prevent update
      }
      return newColors; // Update only if different
    });
  }, [
    wellArrays,
    largeCanvasWidth,
    largeCanvasHeight,
    numColumns,
    numRows,
    annotationRange,
    metricType,
    metricIndicator,
    colorScale,
    selectedWellArray, // add as dependency
  ]);

  // Mouse move handler for tooltip
  const handleMouseMove = (e) => {
    if (!heatmapRef.current) return;
    const rect = heatmapRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (largeCanvasWidth / rect.width);
    const mouseY = (e.clientY - rect.top) * (largeCanvasHeight / rect.height);

    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    const col = Math.floor(mouseX / cellWidth);
    const row = Math.floor(mouseY / cellHeight);
    const index = row * numColumns + col;

    if (index >= 0 && index < wellArrays.length) {
      const well = wellArrays[index];
      const ind = well.indicators?.[metricIndicator];
      const { ys } = filteredXyInRange(
        ind,
        annotationRange.start,
        annotationRange.end
      );
      let max = 0;
      let min = 0;
      if (ys.length > 0) {
        max = -Infinity;
        min = Infinity;
        for (let i = 0; i < ys.length; i++) {
          const y = ys[i];
          if (y < min) min = y;
          if (y > max) max = y;
        }
      }
      const rangeOfYValues = ys.length > 0 ? max - min : 0;
      // Tooltip only shows static values (not async slope)
      const activeMetric =
        metricType === "Max"
          ? max
          : metricType === "Min"
          ? min
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

  return (
    <>
      {wellArrays && wellArrays.length > 0 ? (
        <div className="heatmap-container" ref={containerRef}>
          <canvas
            className="heatmap-canvas"
            ref={heatmapRef}
            width={largeCanvasWidth}
            height={largeCanvasHeight}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          />
        </div>
      ) : (
        <div>No well data to display.</div>
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
          <div>{tooltip.value.toFixed(2)}</div>
        </div>
      )}
    </>
  );
};

export default Heatmap;
