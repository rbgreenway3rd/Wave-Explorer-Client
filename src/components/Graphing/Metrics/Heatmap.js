import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";

const Heatmap = ({
  wellArrays,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  rowLabels,
  columnLabels,
}) => {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });
  const numColumns = 24;
  const numRows = 16;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // const numColumns = 24;
    // const numRows = 16;

    // Calculate exact width and height for cells so they fill up the entire canvas
    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    // Clear the entire canvas before drawing
    context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

    // Flatten all y-values from the filteredData arrays inside wellArrays.
    const allValues = wellArrays.flatMap(
      (well) => well.indicators[0]?.filteredData.map((d) => d.y) || []
    );

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

      const filteredData = well.indicators[0]?.filteredData || [];
      const maxYValue =
        filteredData.length > 0 ? d3.max(filteredData, (d) => d.y) : 0;

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
  }, [wellArrays, largeCanvasWidth, largeCanvasHeight]);

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

  // return (
  //   <canvas
  //     ref={canvasRef}
  //     width={largeCanvasWidth} // Use the full large canvas width
  //     height={largeCanvasHeight} // Use the full large canvas height
  //     style={{ border: "solid 0.5em black" }}
  //   />
  // );
  return (
    <>
      <canvas
        ref={canvasRef}
        width={largeCanvasWidth} // Use the full large canvas width
        height={largeCanvasHeight} // Use the full large canvas height
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        style={{ border: "solid 0.5em black" }}
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
            pointerEvents: "none", // Prevents the tooltip from interfering with mouse events
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
