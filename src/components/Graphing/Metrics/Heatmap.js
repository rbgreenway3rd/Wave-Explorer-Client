import React, { useRef, useEffect, useState, useMemo } from "react";
import * as d3 from "d3";

const Heatmap = ({
  wellArrays,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  rowLabels,
  columnLabels,
  annotationRangeStart,
  annotationRangeEnd,
}) => {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  const numColumns = columnLabels.length;
  const numRows = rowLabels.length;

  // Memoize annotationRange to prevent unnecessary recalculations and re-renders
  const annotationRange = useMemo(() => {
    return annotationRangeStart > annotationRangeEnd
      ? { start: annotationRangeEnd, end: annotationRangeStart }
      : { start: annotationRangeStart, end: annotationRangeEnd };
  }, [annotationRangeStart, annotationRangeEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Calculate exact width and height for cells so they fill up the entire canvas
    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    // Clear the entire canvas before drawing
    context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

    // Flatten all y-values from the filteredData arrays inside wellArrays
    const allValues = wellArrays.flatMap((well) => {
      const filteredData = well.indicators[0]?.filteredData || [];

      // Only include values within the annotationRange
      if (annotationRangeStart !== null && annotationRangeEnd !== null) {
        return filteredData
          .filter(
            (_, i) => i >= annotationRange.start && i <= annotationRange.end
          )
          .map((d) => d.y);
      } else {
        return filteredData.map((d) => d.y); // No filtering if annotationRange is not set
      }
    });

    // Create a color scale based on data
    const colorScale = d3
      .scaleQuantize()
      .domain(d3.extent(allValues)) // Domain based on the min and max values
      .range([
        "black",
        "#00008B",
        "blue",
        "#007d5b",
        "green",
        "#9ce237",
        "yellow",
        "#ffb600",
        "#ff9000",
        "#ff6100",
        "red",
      ]);

    // Draw each well as a cell in the heatmap
    wellArrays.forEach((well, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;

      let heatmapData = well.indicators[0]?.filteredData || [];

      // Only include filteredData within the annotationRange if it's set
      if (annotationRangeStart !== null && annotationRangeEnd !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }

      const maxYValue =
        heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;

      context.fillStyle = colorScale(maxYValue);

      // Draw each cell ensuring it perfectly fits in the grid
      context.fillRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      // Set text properties
      context.fillStyle = "black"; // Set the text color
      context.font = "12px Arial"; // Set font size and family
      context.textAlign = "center"; // Center the text
      context.textBaseline = "middle"; // Middle align vertically

      // Calculate text position
      const textX = col * cellWidth + cellWidth / 2; // Center X
      const textY = row * cellHeight + cellHeight / 2; // Center Y

      // Draw the well label
      context.fillText(well.label || "", textX, textY); // Replace with actual label property
    });
    console.log(annotationRange);
  }, [
    wellArrays,
    largeCanvasWidth,
    largeCanvasHeight,
    numColumns,
    numRows,
    annotationRange, // annotationRange is memoized, reducing unnecessary recalculations
    // annotationRangeStart,
    // annotationRangeEnd,
  ]);

  // Mouse move handler to update tooltip position and visibility
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    const col = Math.floor(mouseX / cellWidth);
    const row = Math.floor(mouseY / cellHeight);
    const index = row * numColumns + col;

    if (index >= 0 && index < wellArrays.length) {
      const well = wellArrays[index];
      const filteredData = well.indicators[0]?.filteredData || [];
      const maxYValue =
        filteredData.length > 0 ? d3.max(filteredData, (d) => d.y) : 0;

      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        label: well.label || "",
        value: maxYValue,
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
      <canvas
        className="heatmap-canvas"
        ref={canvasRef}
        width={largeCanvasWidth}
        height={largeCanvasHeight}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      />
      {tooltip.visible && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x + 20,
            top: tooltip.y + 35,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "5px",
            borderRadius: "5px",
            pointerEvents: "none",
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
