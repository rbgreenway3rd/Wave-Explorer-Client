// import React, { useEffect, useRef, useState } from "react";
// import * as d3 from "d3";
// import "./Heatmap.css"; // Import a CSS file for tooltip styling

// const Heatmap = ({ wellArrays }) => {
//   const svgRef = useRef();
//   const [tooltip, setTooltip] = useState({
//     display: false,
//     x: 0,
//     y: 0,
//     label: "",
//   });

//   useEffect(() => {
//     const width = 800; // Adjust as needed
//     const height = 600; // Adjust as needed
//     const cols = 24;
//     const rows = 16;
//     const cellSize = Math.min(width / cols, height / rows);

//     // Clear previous SVG
//     d3.select(svgRef.current).selectAll("*").remove();

//     const svg = d3
//       .select(svgRef.current)
//       .attr("width", width)
//       .attr("height", height);

//     // Compute all values from wellArrays
//     const allValues = wellArrays.flatMap(
//       (well) => well.indicators[0]?.filteredData.map((d) => d.y) || []
//     );

//     // Define the color scale using quantization
//     const colorScale = d3
//       .scaleQuantize()
//       .domain(d3.extent(allValues)) // Using extent for better min/max
//       .range(["black", "blue", "green", "yellow", "orange", "red"]); // Define the discrete color range

//     // Draw rectangles for each well
//     svg
//       .selectAll("rect")
//       .data(wellArrays)
//       .enter()
//       .append("rect")
//       .attr("x", (d, i) => (i % cols) * cellSize)
//       .attr("y", (d, i) => Math.floor(i / cols) * cellSize)
//       .attr("width", cellSize)
//       .attr("height", cellSize)
//       .attr("fill", (d) => {
//         const filteredData = d.indicators[0]?.filteredData || [];
//         const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0; // Use 0 as a fallback
//         return colorScale(maxValueForWell); // Get the color based on the well's maximum value
//       })
//       .attr("stroke", "#fff")
//       .on("mouseover", (event, d) => {
//         // Show tooltip on mouseover
//         setTooltip({
//           display: true,
//           x: event.pageX,
//           y: event.pageY,
//           label: d.label,
//         });
//       })
//       .on("mousemove", (event) => {
//         // Update tooltip position
//         setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
//       })
//       .on("mouseout", () => {
//         // Hide tooltip on mouseout
//         setTooltip({ display: false, x: 0, y: 0, label: "" });
//       });

//     // Draw labels for each well
//     svg
//       .selectAll("text")
//       .data(wellArrays)
//       .enter()
//       .append("text")
//       .attr("x", (d, i) => (i % cols) * cellSize + cellSize / 2)
//       .attr("y", (d, i) => Math.floor(i / cols) * cellSize + cellSize / 2)
//       .attr("dy", ".35em")
//       .attr("text-anchor", "middle")
//       .text((d) => d.label) // Adjust to your well object property for display
//       .attr("fill", "#000")
//       .attr("pointer-events", "none"); // Prevent text from capturing mouse events
//   }, [wellArrays]);

//   return (
//     <>
//       <svg ref={svgRef}></svg>
//       {tooltip.display && (
//         <div
//           className="tooltip"
//           style={{
//             left: tooltip.x + 10, // Offset for better visibility
//             top: tooltip.y - 30, // Offset for better visibility
//           }}
//         >
//           {tooltip.label} <br />
//           {tooltip.y}
//         </div>
//       )}
//     </>
//   );
// };

// export default Heatmap;
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "./Heatmap.css"; // Import a CSS file for tooltip styling

const Heatmap = ({ wellArrays }) => {
  const svgRef = useRef();
  const [tooltip, setTooltip] = useState({
    display: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  useEffect(() => {
    const width = 800; // Adjust as needed
    const height = 600; // Adjust as needed
    const cols = 24;
    const rows = 16;
    const cellSize = Math.min(width / cols, height / rows);

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
      .range(["black", "blue", "green", "yellow", "orange", "red"]); // Define the discrete color range

    // Draw rectangles for each well
    svg
      .selectAll("rect")
      .data(wellArrays)
      .enter()
      .append("rect")
      .attr("x", (d, i) => (i % cols) * cellSize)
      .attr("y", (d, i) => Math.floor(i / cols) * cellSize)
      .attr("width", cellSize)
      .attr("height", cellSize)
      .attr("fill", (d) => {
        const filteredData = d.indicators[0]?.filteredData || [];
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0; // Use 0 as a fallback
        return colorScale(maxValueForWell); // Get the color based on the well's maximum value
      })
      .attr("stroke", "#fff")
      .on("mouseover", (event, d) => {
        // Get the maximum value for the hovered well
        const filteredData = d.indicators[0]?.filteredData || [];
        const maxValueForWell = d3.max(filteredData, (d) => d.y) || 0; // Use 0 as a fallback

        // Show tooltip on mouseover
        setTooltip({
          display: true,
          x: event.pageX,
          y: event.pageY,
          label: d.label,
          value: maxValueForWell, // Set the value to display in the tooltip
        });
      })
      .on("mousemove", (event) => {
        // Update tooltip position
        setTooltip((prev) => ({ ...prev, x: event.pageX, y: event.pageY }));
      })
      .on("mouseout", () => {
        // Hide tooltip on mouseout
        setTooltip({ display: false, x: 0, y: 0, label: "", value: "" });
      });

    // Draw labels for each well
    svg
      .selectAll("text")
      .data(wellArrays)
      .enter()
      .append("text")
      .attr("x", (d, i) => (i % cols) * cellSize + cellSize / 2)
      .attr("y", (d, i) => Math.floor(i / cols) * cellSize + cellSize / 2)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .text((d) => d.label) // Adjust to your well object property for display
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
