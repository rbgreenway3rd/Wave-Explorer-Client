import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./Heatmap.css"; // Import a CSS file for tooltip styling

// The Heatmap component receives various props such as well data and dimensions for rendering the heatmap.
const Heatmap = ({
  wellArrays, // Array containing well data, with each well having a set of indicators and filtered data.
  columnLabels, // Labels for the heatmap columns.
  rowLabels, // Labels for the heatmap rows.
  largeCanvasWidth, // Width of the canvas for the heatmap.
  largeCanvasHeight, // Height of the canvas for the heatmap.
}) => {
  const svgRef = useRef(); // A reference to the SVG element for rendering the heatmap.
  const [tooltip, setTooltip] = useState({
    display: false, // Whether the tooltip is currently being displayed.
    x: 0, // X position of the tooltip.
    y: 0, // Y position of the tooltip.
    label: "", // Label for the tooltip (e.g., well name).
    value: "", // Value to display in the tooltip.
  });

  // useEffect runs when wellArrays, columnLabels, or dimensions change.
  useEffect(() => {
    const width = largeCanvasWidth; // Set the width of the heatmap canvas.
    const height = largeCanvasHeight; // Set the height of the heatmap canvas.
    const cols = columnLabels.length; // Number of columns in the heatmap (based on the length of column labels).
    const rows = rowLabels.length; // Number of rows in the heatmap (based on the length of row labels).

    // Calculate the dimensions for each cell in the grid.
    const cellWidth = width / cols; // Width of each cell (divide total width by number of columns).
    const cellHeight = height / rows; // Height of each cell (divide total height by number of rows).

    // Clear any existing SVG elements before rendering new ones (prevents overlap).
    d3.select(svgRef.current).selectAll("*").remove();

    // Create an SVG element with the specified width and height.
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Flatten all y-values from the filteredData arrays inside wellArrays.
    const allValues = wellArrays.flatMap(
      (well) => well.indicators[0]?.filteredData.map((d) => d.y) || [] // Extracts the y-values from each well's filtered data.
    );

    // Create a color scale using d3's scaleQuantize, which will map values to colors in a discrete range.
    const colorScale = d3
      .scaleQuantize()
      .domain(d3.extent(allValues)) // The domain is set to the min and max values in allValues (from filtered data).
      .range([
        "black", // Start of the color range (coldest values).
        "#00008B", // Dark Blue
        "blue", // Blue
        "#007d5b", // Blue-Green
        "green", // Green
        "#9ce237", // Green-Yellow
        "yellow", // Yellow
        "#ffb600", // Gold (yellow + orange)
        "#ff9000", // Orange
        "#ff6100", // Orange-Red
        "red", // End of the color range (hottest values).
      ]);

    // Create and append a rectangle for each well in wellArrays.
    svg
      .selectAll("rect")
      .data(wellArrays) // Bind well data to the rectangles.
      .enter()
      .append("rect") // Append a rectangle for each well.
      .attr("x", (d, i) => (i % cols) * cellWidth) // Set the x position for the cell (based on column).
      .attr("y", (d, i) => Math.floor(i / cols) * cellHeight) // Set the y position for the cell (based on row).
      .attr("width", cellWidth) // Set the width of each cell.
      .attr("height", cellHeight) // Set the height of each cell.
      .attr("fill", (d) => {
        // For each well, get its filtered data, find the max value, and map it to a color using colorScale.
        const filteredData = d.indicators[0]?.filteredData || []; // Get filtered data for the well (fallback to empty array).
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0; // Find the max y value for the well.
        return colorScale(maxValueForWell); // Use the color scale to determine the cell's color.
      })
      .attr("stroke", "#808080") // Set a grey border for each cell.
      .on("mouseover", (event, d) => {
        // Event listener for when the mouse is over a cell.
        const filteredData = d.indicators[0]?.filteredData || [];
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0;

        // Display the tooltip with well details.
        setTooltip({
          display: true,
          x: event.pageX, // Set tooltip X position to the mouse's X coordinate.
          y: event.pageY, // Set tooltip Y position to the mouse's Y coordinate.
          label: d.label, // Display the well label in the tooltip.
          value: maxValueForWell, // Display the max y value for the well in the tooltip.
        });
      })
      .on("mousemove", (event) => {
        // Update the tooltip position as the mouse moves.
        setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
      })
      .on("mouseout", () => {
        // Hide the tooltip when the mouse leaves the cell.
        setTooltip({ display: false, x: 0, y: 0, label: "", value: "" });
      });

    // Draw well labels inside each cell (centered).
    svg
      .selectAll("text")
      .data(wellArrays)
      .enter()
      .append("text")
      .attr("x", (d, i) => (i % cols) * cellWidth + cellWidth / 2) // Position the label in the center of the cell horizontally.
      .attr("y", (d, i) => Math.floor(i / cols) * cellHeight + cellHeight / 2) // Position the label in the center of the cell vertically.
      .attr("dy", ".35em") // Vertically center the text.
      .attr("text-anchor", "middle") // Horizontally center the text.
      .text((d) => d.label) // Set the text to the well's label.
      .attr("fill", "#000") // Set the text color to black.
      .attr("pointer-events", "none"); // Prevent the text from interfering with mouse events (i.e., don't block hover).
  }, [
    wellArrays, // Rerun the effect if one of these dependencies changes.
    columnLabels.length,
    largeCanvasHeight,
    largeCanvasWidth,
    rowLabels.length,
  ]);

  return (
    <div className="heatmap-container">
      <svg ref={svgRef} className="heatmap-svg"></svg>{" "}
      {/* The SVG element where the heatmap will be rendered. */}
      {tooltip.display && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x + 10, // Slightly offset the tooltip from the mouse pointer for better visibility.
            top: tooltip.y - 30, // Slightly offset the tooltip from the mouse pointer for better visibility.
          }}
        >
          {tooltip.label} {/* Show the well label in the tooltip. */}
          <br />
          {tooltip.value}{" "}
          {/* Show the max y value of the well in the tooltip. */}
        </div>
      )}
    </div>
  );
};

export default Heatmap;
