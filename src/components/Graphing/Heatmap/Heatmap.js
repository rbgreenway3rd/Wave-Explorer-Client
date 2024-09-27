import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./Heatmap.css"; // Import a CSS file for tooltip styling

const Heatmap = ({
  wellArrays,
  columnLabels,
  rowLabels,
  largeCanvasWidth,
  largeCanvasHeight,
  smallCanvasWidth,
  smallCanvasHeight,
}) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({
    display: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  console.log("cl", columnLabels);
  console.log("rl", rowLabels);

  useEffect(() => {
    const width = largeCanvasWidth; // Adjust as needed
    const height = largeCanvasHeight; // Adjust as needed
    const cols = columnLabels.length;
    const rows = rowLabels.length;
    const cellWidth = width / cols; // Width of each rectangular cell
    const cellHeight = height / rows; // Height of each rectangular cell
    // const cellSize = Math.min(width / cols, height / rows);

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Compute all values from wellArrays
    const allValues = wellArrays.flatMap(
      (well) => well.indicators[0]?.filteredData.map((d) => d.y) || []
    );

    // Define the color scale using quantization
    const colorScale = d3
      .scaleQuantize()
      .domain(d3.extent(allValues)) // Using extent for better min/max
      // .range(["black", "blue", "green", "yellow", "orange", "red"]); // Define the discrete color range
      .range([
        "black", // 0: Black
        "#00008B", // 1: Dark Blue
        "blue", // 2: Blue
        "#007d5b", // 3: Blue-Green
        "green", // 4: Green
        "#b8ff2f", // 5: Green Yellow
        "yellow", // 6: Yellow
        "#FFC700", // 7: Gold (yellow + orange)
        "orange", // 8: Orange
        "#ff6100", // 9: Orange Red
        "red", // 10: Red
      ]);

    // Draw rectangles for each well (rectangular cells)
    svg
      .selectAll("rect")
      .data(wellArrays)
      .enter()
      .append("rect")
      .attr("x", (d, i) => (i % cols) * cellWidth)
      .attr("y", (d, i) => Math.floor(i / cols) * cellHeight)
      .attr("width", cellWidth)
      .attr("height", cellHeight)
      .attr("fill", (d) => {
        const filteredData = d.indicators[0]?.filteredData || [];
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0; // Use 0 as a fallback
        return colorScale(maxValueForWell);
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        const filteredData = d.indicators[0]?.filteredData || [];
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0;

        setTooltip({
          display: true,
          x: event.pageX,
          y: event.pageY,
          label: d.label,
          value: maxValueForWell,
        });
      })
      .on("mousemove", (event) => {
        setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
      })
      .on("mouseout", () => {
        setTooltip({ display: false, x: 0, y: 0, label: "", value: "" });
      });

    // Draw labels for each well
    svg
      .selectAll("text")
      .data(wellArrays)
      .enter()
      .append("text")
      .attr("x", (d, i) => (i % cols) * cellWidth + cellWidth / 2)
      .attr("y", (d, i) => Math.floor(i / cols) * cellHeight + cellHeight / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text((d) => d.label)
      .attr("fill", "#000")
      .attr("pointer-events", "none"); // Prevent text from capturing mouse events
  }, [wellArrays]);

  return (
    <>
      <svg ref={svgRef}></svg>
      {tooltip.display && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x + 10, // Offset for better visibility
            top: tooltip.y - 30, // Offset for better visibility
          }}
        >
          {tooltip.label}
          <br />
          {tooltip.value} {/* Display the value assigned to the well */}
        </div>
      )}
    </>
  );
};

export default Heatmap;
