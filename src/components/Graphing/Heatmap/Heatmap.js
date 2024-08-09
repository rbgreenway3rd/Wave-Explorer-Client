// import React, { useEffect, useRef } from "react";
// import * as d3 from "d3";

// const Heatmap = ({
//   wellArrays,
//   selectedWellArray,
//   timeData,
//   smallCanvasWidth,
//   smallCanvasHeight,
//   largeCanvasWidth,
//   largeCanvasHeight,
//   columnLabels,
//   rowLabels,
//   analysisData,
// }) => {
//   const ref = useRef();

//   // Labels of row and columns
//   const myGroups = columnLabels;
//   const myVars = rowLabels;

//   useEffect(() => {
//     // set the dimensions and margins of the graph
//     const margin = { top: 30, right: 30, bottom: 30, left: 30 },
//       width = 450 - margin.left - margin.right,
//       height = 450 - margin.top - margin.bottom;

//     // select the div and append the svg object to it
//     const svg = d3
//       .select(ref.current)
//       .append("svg")
//       .attr("width", width + margin.left + margin.right)
//       .attr("height", height + margin.top + margin.bottom)
//       .append("g")
//       .attr("transform", `translate(${margin.left},${margin.top})`);

//     // Build X scales and axis:
//     const x = d3.scaleBand().range([0, width]).domain(myGroups).padding(0.01);
//     svg
//       .append("g")
//       .attr("transform", `translate(0, 0)`) // Move x-axis to the top
//       .call(d3.axisTop(x));

//     // Build Y scales and axis:
//     const y = d3
//       .scaleBand()
//       .range([height, 0])
//       .domain(myVars.reverse())
//       .padding(0.01);
//     svg.append("g").call(d3.axisLeft(y));

//     // Build color scale
//     const myColor = d3
//       .scaleLinear()
//       .range(["white", "#69b3a2"])
//       .domain([1, 100]);

//     // Read the data
//     d3.csv(
//       "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/heatmap_data.csv"
//     ).then(function (data) {
//       svg
//         .selectAll()
//         .data(data, function (d) {
//           return d.group + ":" + d.variable;
//         })
//         .join("rect")
//         .attr("x", function (d) {
//           return x(d.group);
//         })
//         .attr("y", function (d) {
//           return y(d.variable);
//         })
//         .attr("width", x.bandwidth())
//         .attr("height", y.bandwidth())
//         .style("fill", function (d) {
//           return myColor(d.value);
//         });
//     });

//     // Cleanup function
//     return () => {
//       d3.select(ref.current).selectAll("*").remove();
//       console.log(rowLabels);
//     };
//   }, [myGroups, myVars]);

//   return <div ref={ref}></div>;
// };

// export default Heatmap;
import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const Heatmap = ({
  wellArrays,
  selectedWellArray,
  timeData,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  columnLabels,
  rowLabels,
  analysisData,
}) => {
  const ref = useRef();

  // Labels of row and columns
  const myGroups = columnLabels;
  const myVars = rowLabels;

  useEffect(() => {
    // set the dimensions and margins of the graph
    const margin = { top: 30, right: 30, bottom: 30, left: 30 },
      width = 450 - margin.left - margin.right,
      height = 450 - margin.top - margin.bottom;

    // select the div and append the svg object to it
    const svg = d3
      .select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build X scales and axis:
    const x = d3.scaleBand().range([0, width]).domain(myGroups).padding(0.01);
    svg
      .append("g")
      .attr("transform", `translate(0, 0)`) // Move x-axis to the top
      .call(d3.axisTop(x));

    // Build Y scales and axis:
    const y = d3
      .scaleBand()
      .range([height, 0])
      .domain(myVars.slice().reverse()) // Reverse the order here so 'A' is the first row label and 'P' is the last
      .padding(0.01);
    svg.append("g").call(d3.axisLeft(y));

    // Build color scale
    const myColor = d3
      .scaleLinear()
      .range(["white", "#69b3a2"])
      .domain([1, 100]);

    // Read the data
    d3.csv(
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/heatmap_data.csv"
    ).then(function (data) {
      svg
        .selectAll()
        .data(data, function (d) {
          return d.group + ":" + d.variable;
        })
        .join("rect")
        .attr("x", function (d) {
          return x(d.group);
        })
        .attr("y", function (d) {
          return y(d.variable);
        })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) {
          return myColor(d.value);
        });
    });

    // Cleanup function
    return () => {
      d3.select(ref.current).selectAll("*").remove();
      console.log(rowLabels);
    };
  }, [myGroups, myVars]);

  return <div ref={ref}></div>;
};

export default Heatmap;
