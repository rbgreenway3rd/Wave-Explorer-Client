// import React, { useRef, useEffect, useState, useMemo, useContext } from "react";
// import * as d3 from "d3";
// import { DataContext } from "../../../providers/DataProvider";
// import { ColormapValues } from "../config/HeatmapConfig";
// import {
//   getAllValuesWorker,
//   getAllSlopesWorker,
//   getAllRangesWorker,
//   calculateSlopeWorker,
//   calculateRangeWorker,
//   linearRegressionWorker,
// } from "./MetricsUtilities";
// import "./Heatmap.css";

// const Heatmap = ({ rowLabels, columnLabels, metricType, metricIndicator }) => {
//   const { wellArrays, annotations, selectedWellArray } =
//     useContext(DataContext);

//   const heatmapRef = useRef(null);
//   const colorScaleRef = useRef(null); // Canvas for color scale
//   const [gradientState, setGradientState] = useState(false);
//   const [minMin, setMinMin] = useState(null);
//   const [maxMin, setMaxMin] = useState(null);

//   const [currentCellColors, setCurrentCellColors] = useState([]);

//   const [largeCanvasWidth, setLargeCanvasWidth] = useState(
//     window.innerWidth / 2.3
//   );
//   const [largeCanvasHeight, setLargeCanvasHeight] = useState(
//     window.innerHeight / 2.3
//   );

//   const [tooltip, setTooltip] = useState({
//     visible: false,
//     x: 0,
//     y: 0,
//     label: "",
//     value: "",
//   });

//   // console.log(selectedWellArray);

//   const numColumns = columnLabels.length;
//   const numRows = rowLabels.length;

//   const handleResize = () => {
//     setLargeCanvasWidth(window.innerWidth / 2.3);
//     setLargeCanvasHeight(window.innerHeight / 2.3);
//   };

//   useEffect(() => {
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const toggleGradientState = (gradientState) => {
//     setGradientState(!gradientState);
//   };

//   const annotationRange = useMemo(() => {
//     if (!annotations || annotations.length === 0)
//       return { start: null, end: null };
//     return annotations[0].xMin > annotations[0].xMax
//       ? { start: annotations[0].xMax, end: annotations[0].xMin }
//       : { start: annotations[0].xMin, end: annotations[0].xMax };
//   }, [annotations]);

//   // Remove async state for metrics and useMemo for allValues, allSlopes, allRanges
//   const allValues = useMemo(
//     () => getAllValues(wellArrays, annotationRange, metricIndicator),
//     [wellArrays, annotationRange, metricIndicator]
//   );
//   const allSlopes = useMemo(
//     () => getAllSlopes(wellArrays, annotationRange, metricIndicator),
//     [wellArrays, annotationRange, metricIndicator]
//   );
//   const allRanges = useMemo(
//     () => getAllRanges(wellArrays, annotationRange, metricIndicator),
//     [wellArrays, annotationRange, metricIndicator]
//   );

//   const minSlope = useMemo(() => d3.min(allSlopes), [allSlopes]);
//   const maxSlope = useMemo(() => d3.max(allSlopes), [allSlopes]);
//   const rangeExtent = useMemo(() => d3.extent(allRanges), [allRanges]);

//   // Calculate minMin and maxMin values
//   useEffect(() => {
//     const minValues = wellArrays.map((well) => {
//       let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }
//       return heatmapData.length > 0
//         ? d3.min(heatmapData, (d) => d.y)
//         : Infinity;
//     });

//     setMinMin(d3.min(minValues));
//     setMaxMin(d3.max(minValues));
//     // console.log(d3.min(minValues), d3.max(minValues));
//   }, [wellArrays, metricIndicator, annotationRange]);

//   const colorScale = useMemo(() => {
//     const extent = d3.extent(allValues);

//     if (metricType === "Slope") {
//       const midpoint = (minSlope + maxSlope) / 2;
//       return d3
//         .scaleDiverging()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain([minSlope, midpoint, maxSlope]);
//     } else if (metricType === "Range") {
//       const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
//       return d3
//         .scaleDiverging()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain([rangeExtent[0], midpoint, rangeExtent[1]]);
//     } else {
//       return d3
//         .scaleSequential()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain(extent);
//     }
//   }, [minSlope, maxSlope, rangeExtent, allValues, metricType]);

//   const sortRGBColors = (colors) => {
//     return colors.sort((colorA, colorB) => {
//       // Extract RGB values from the "rgb(r, g, b)" format
//       const rgbA = colorA.match(/\d+/g).map(Number); // [r, g, b]
//       const rgbB = colorB.match(/\d+/g).map(Number); // [r, g, b]

//       // Get dominant color
//       const dominantA = getDominantColor(rgbA);
//       const dominantB = getDominantColor(rgbB);

//       // Define order of dominant colors (Blues → Greens → Yellows → Oranges → Reds)
//       const order = { blue: 1, green: 2, yellow: 3, orange: 4, red: 5 };

//       if (order[dominantA] !== order[dominantB]) {
//         return order[dominantA] - order[dominantB]; // Primary sort by dominant color
//       }

//       // Sorting within each color group:
//       return refineSortWithinGroup(rgbA, rgbB, dominantA);
//     });
//   };

//   // COLOR SORTING
//   // Function to determine dominant color category
//   const getDominantColor = ([r, g, b]) => {
//     if (b > g && b > r) return "blue";
//     if (g > r && g > b) return "green";
//     if (r > g && g > b) return "orange";
//     if (r > g && b < g) return "yellow";
//     return "red";
//   };

//   // Function to refine sorting within each color category
//   const refineSortWithinGroup = (rgbA, rgbB, category) => {
//     const [rA, gA, bA] = rgbA;
//     const [rB, gB, bB] = rgbB;

//     if (category === "blue") {
//       return bA - bB || gA - gB; // Sort by blue, then green
//     }
//     if (category === "green") {
//       return gA - gB || rA - rB; // Sort by green, then red
//     }
//     if (category === "yellow") {
//       return rA - rB; // Sort by red
//     }
//     if (category === "orange") {
//       return rA - rB; // Sort by red
//     }
//     return rA - rB; // Reds sorted by red intensity
//   };

//   // const sortedColors = sortRGBColors(colors);
//   // console.log(sortedColors);
//   const sortedCellColors = useMemo(() => sortRGBColors(currentCellColors), [currentCellColors]);

//   // GRADIENT COLOR HANDLING
//   // const gradientColorScale = useMemo(() => {
//   //   const extent = d3.extent(allValues);

//   //   if (!gradientState) {
//   //     // Locked color scale when gradientState is false
//   //     return d3
//   //       .scaleSequential()
//   //       .interpolator(d3.interpolateRgbBasis(ColormapValues))
//   //       .domain(extent);
//   //   }

//   //   if (!isDataReady) {
//   //     console.warn("Data not ready for color scale. Using fallback domain.");
//   //     return d3
//   //       .scaleSequential()
//   //       .interpolator(d3.interpolateGreys)
//   //       .domain([0, 1]);
//   //     // } else if (metricType === "Min") {
//   //     //   const midpoint = (minMin + maxMin) / 2;
//   //     //   return (
//   //     //     d3
//   //     //       .scaleDiverging()
//   //     //       .interpolator(d3.interpolateRgbBasis(sortedCellColors))
//   //     //       // .interpolator(d3.interpolateRgbBasis(ColormapValues))
//   //     //       .domain([minMin, midpoint, maxMin])
//   //     //   );
//   //     // } else if (metricType === "Slope") {
//   //     //   const midpoint = (minSlope + maxSlope) / 2;
//   //     //   return (
//   //     //     d3
//   //     //       .scaleDiverging()
//   //     //       // .interpolator(d3.interpolateRgbBasis(ColormapValues))
//   //     //       .interpolator(d3.interpolateRgbBasis(sortedCellColors))
//   //     //       .domain([minSlope, midpoint, maxSlope])
//   //     //   );
//   //     // } else if (metricType === "Range") {
//   //     //   console.log(rangeExtent);
//   //     //   const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
//   //     //   return (
//   //     //     d3
//   //     //       .scaleDiverging()
//   //     //       // .interpolator(d3.interpolateRgbBasis(ColormapValues))
//   //     //       .interpolator(d3.interpolateRgbBasis(sortedCellColors))
//   //     //       .domain([rangeExtent[0], midpoint, rangeExtent[1]])
//   //     //   );
//   //   } else {
//   //     return (
//   //       d3
//   //         .scaleSequential()
//   //         // .interpolator(d3.interpolateRgbBasis(ColormapValues))
//   //         .interpolator(d3.interpolateRgbBasis(sortedCellColors))
//   //         .domain(extent)
//   //     );
//   //   }
//   // }, [
//   //   gradientState,
//   //   isDataReady,
//   //   minSlope,
//   //   maxSlope,
//   //   rangeExtent,
//   //   allValues,
//   //   metricType,
//   //   maxMin,
//   //   minMin,
//   // ]);

//   useEffect(() => {
//     if (!heatmapRef.current) return;

//     const canvas = heatmapRef.current;
//     const context = canvas.getContext("2d");

//     if (!context) return;

//     const adjustedCanvasWidth = largeCanvasWidth;
//     const cellWidth = adjustedCanvasWidth / numColumns;
//     const cellHeight = largeCanvasHeight / numRows;

//     context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

//     let newColors = [];

//     // First pass: draw all cells and their default borders
//     wellArrays.forEach((well, i) => {
//       const row = Math.floor(i / numColumns);
//       const col = i % numColumns;

//       let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }

//       const max = heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
//       const min = heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
//       const rangeOfYValues = max - min;
//       const slope = calculateSlopeWorker(heatmapData);

//       const activeMetric =
//         metricType === "Max"
//           ? max
//           : metricType === "Min"
//           ? min
//           : metricType === "Slope"
//           ? slope
//           : rangeOfYValues;

//       const color = colorScale(activeMetric);
//       newColors.push(color);

//       context.fillStyle = color;
//       context.fillRect(
//         col * cellWidth,
//         row * cellHeight,
//         cellWidth,
//         cellHeight
//       );

//       // Draw default border (black, thin)
//       context.strokeStyle = "black";
//       context.lineWidth = 1;
//       context.strokeRect(
//         col * cellWidth,
//         row * cellHeight,
//         cellWidth,
//         cellHeight
//       );

//       context.fillStyle = "black";
//       context.font = "12px Arial";
//       context.textAlign = "center";
//       context.textBaseline = "middle";

//       const textX = col * cellWidth + cellWidth / 2;
//       const textY = row * cellHeight + cellHeight / 2;
//       context.fillText(well.label || "", textX, textY);
//     });

//     setCurrentCellColors((prevColors) => {
//       if (
//         prevColors.length === newColors.length &&
//         prevColors.every((color, i) => color === newColors[i])
//       ) {
//         return prevColors; // No change, prevent update
//       }
//       return newColors; // Update only if different
//     });
//   }, [
//     wellArrays,
//     largeCanvasWidth,
//     largeCanvasHeight,
//     numColumns,
//     numRows,
//     annotationRange,
//     metricType,
//     metricIndicator,
//     colorScale,
//   ]);

//   // Separate effect: draw white outlines for selected wells (depends on selectedWellArray)
//   useEffect(() => {
//     if (!heatmapRef.current) return;
//     const canvas = heatmapRef.current;
//     const context = canvas.getContext("2d");
//     if (!context) return;
//     const cellWidth = largeCanvasWidth / numColumns;
//     const cellHeight = largeCanvasHeight / numRows;

//     // First, redraw default borders (black, thin) for all cells
//     wellArrays.forEach((well, i) => {
//       const row = Math.floor(i / numColumns);
//       const col = i % numColumns;
//       context.save();
//       context.strokeStyle = "black";
//       context.lineWidth = 1;
//       context.strokeRect(
//         col * cellWidth,
//         row * cellHeight,
//         cellWidth,
//         cellHeight
//       );
//       context.restore();
//     });

//     // Then, draw white borders for selected wells on top
//     if (selectedWellArray && selectedWellArray.length > 0) {
//       selectedWellArray.forEach((sel) => {
//         const index = wellArrays.findIndex((well) => well.label === sel.label);
//         if (index !== -1) {
//           const row = Math.floor(index / numColumns);
//           const col = index % numColumns;
//           context.save();
//           context.strokeStyle = "white";
//           context.lineWidth = 3;
//           context.strokeRect(
//             col * cellWidth,
//             row * cellHeight,
//             cellWidth,
//             cellHeight
//           );
//           context.restore();
//         }
//       });
//     }
//   }, [
//     selectedWellArray,
//     wellArrays,
//     numColumns,
//     largeCanvasWidth,
//     largeCanvasHeight,
//     numRows,
//   ]);

//   //   useEffect(() => {
//   //     if (!colorScaleRef.current) return;

//   //     const ctx = colorScaleRef.current.getContext("2d");
//   //     const { width, height } = colorScaleRef.current;

//   //     ctx.clearRect(0, 0, width, height);

//   //     // Create a linear gradient along the x-axis
//   //     const gradient = gradientState
//   //       ? ctx.createLinearGradient(0, 0, 0, height)
//   //       : ctx.createLinearGradient(0, height, 0, 0);

//   //     // Generate color stops using the gradientColorScale
//   //     const numStops = 10; // Adjust as needed for smoothness
//   //     for (let i = 0; i <= numStops; i++) {
//   //       const t = i / numStops;
//   //       const value =
//   //         gradientColorScale.domain()[0] +
//   //         t * (gradientColorScale.domain()[1] - gradientColorScale.domain()[0]);
//   //       gradient.addColorStop(t, gradientColorScale(value));
//   //     }

//   //     ctx.fillStyle = gradient;
//   //     ctx.fillRect(0, 0, width, height);
//   //   }, [gradientColorScale, gradientState, heatmapRef, metricType]);

//   // Mouse move handler for tooltip
//   const handleMouseMove = (e) => {
//     if (!heatmapRef.current) return;
//     const rect = heatmapRef.current.getBoundingClientRect();
//     const mouseX = (e.clientX - rect.left) * (largeCanvasWidth / rect.width);
//     const mouseY = (e.clientY - rect.top) * (largeCanvasHeight / rect.height);

//     const cellWidth = largeCanvasWidth / numColumns;
//     const cellHeight = largeCanvasHeight / numRows;

//     const col = Math.floor(mouseX / cellWidth);
//     const row = Math.floor(mouseY / cellHeight);
//     const index = row * numColumns + col;

//     if (index >= 0 && index < wellArrays.length) {
//       const well = wellArrays[index];
//       let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }
//       const max = heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
//       const min = heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
//       const rangeOfYValues = max - min;
//       // Tooltip only shows static values (not async slope)
//       const activeMetric =
//         metricType === "Max"
//           ? max
//           : metricType === "Min"
//           ? min
//           : rangeOfYValues;
//       setTooltip({
//         visible: true,
//         x: e.clientX,
//         y: e.clientY,
//         label: well.label || "",
//         value: activeMetric,
//       });
//     } else {
//       setTooltip((prev) => ({ ...prev, visible: false }));
//     }
//   };

//   // Mouse leave handler to hide tooltip
//   const handleMouseLeave = () => {
//     setTooltip((prev) => ({ ...prev, visible: false }));
//   };

//   return (
//     <>
//       {wellArrays && wellArrays.length > 0 ? (
//         <div className="heatmap-container" style={{ position: "relative" }}>
//           {/* Color Scale Gradient */}
//           {/* <section className="color-scale" height="100%"> */}
//           {/* Checkbox in the top-left corner */}
//           {/* <div className="color-scale-toggle">
//               <input
//                 type="checkbox"
//                 checked={gradientState}
//                 onChange={() => toggleGradientState(gradientState)}
//               />
//             </div> */}
//           {/* <canvas
//               className="color-scale-canvas"
//               ref={colorScaleRef}
//               // ref={gradientState ? heatmapRef : colorScaleRef}
//               width={20}
//             /> */}
//           {/* </section> */}
//           {/* Heatmap Canvas */}
//           <canvas
//             className="heatmap-canvas"
//             ref={heatmapRef}
//             width={largeCanvasWidth}
//             height={largeCanvasHeight}
//             onMouseLeave={handleMouseLeave}
//             onMouseMove={handleMouseMove}
//           />
//           {/* Tooltip */}
//         </div>
//       ) : (
//         <div>No well data to display.</div>
//       )}
//       {tooltip.visible && (
//         <div
//           style={{
//             position: "absolute",
//             left: tooltip.x + 20,
//             top: tooltip.y - 40,
//             backgroundColor: "rgba(0, 0, 0, 0.7)",
//             color: "white",
//             padding: "5px",
//             borderRadius: "5px",
//             pointerEvents: "none",
//             zIndex: 99999,
//           }}
//         >
//           <div>
//             <strong>{tooltip.label}</strong>
//           </div>
//           <div>{tooltip.value.toFixed(2)}</div>
//         </div>
//       )}
//     </>
//   );
// };

// export default Heatmap;

import React, { useRef, useEffect, useState, useMemo, useContext } from "react";
import * as d3 from "d3";
import { DataContext } from "../../../providers/DataProvider";
import { ColormapValues } from "../config/HeatmapConfig";
import {
  linearRegression,
  calculateSlope,
  getAllValues,
  getAllSlopes,
  getAllRanges,
} from "./MetricsUtilities";
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

  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
  );

  const [tooltip, setTooltip] = useState({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    value: "",
  });

  // console.log(selectedWellArray);

  const numColumns = columnLabels.length;
  const numRows = rowLabels.length;

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
    // console.log(d3.min(minValues), d3.max(minValues));
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

  // const sortedColors = sortRGBColors(colors);
  // console.log(sortedColors);
  const sortedCellColors = useMemo(
    () => sortRGBColors(currentCellColors),
    [currentCellColors]
  );

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

    // First pass: draw all cells and their default borders
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
  ]);

  // Separate effect: draw white outlines for selected wells (depends on selectedWellArray)
  useEffect(() => {
    if (!heatmapRef.current) return;
    const canvas = heatmapRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    // First, redraw default borders (black, thin) for all cells
    wellArrays.forEach((well, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;
      context.save();
      context.strokeStyle = "black";
      context.lineWidth = 1;
      context.strokeRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );
      context.restore();
    });

    // Then, draw white borders for selected wells on top
    if (selectedWellArray && selectedWellArray.length > 0) {
      selectedWellArray.forEach((sel) => {
        const index = wellArrays.findIndex((well) => well.label === sel.label);
        if (index !== -1) {
          const row = Math.floor(index / numColumns);
          const col = index % numColumns;
          context.save();
          context.strokeStyle = "white";
          context.lineWidth = 3;
          context.strokeRect(
            col * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight
          );
          context.restore();
        }
      });
    }
  }, [
    selectedWellArray,
    wellArrays,
    numColumns,
    largeCanvasWidth,
    largeCanvasHeight,
    numRows,
  ]);

  //   useEffect(() => {
  //     if (!colorScaleRef.current) return;

  //     const ctx = colorScaleRef.current.getContext("2d");
  //     const { width, height } = colorScaleRef.current;

  //     ctx.clearRect(0, 0, width, height);

  //     // Create a linear gradient along the x-axis
  //     const gradient = gradientState
  //       ? ctx.createLinearGradient(0, 0, 0, height)
  //       : ctx.createLinearGradient(0, height, 0, 0);

  //     // Generate color stops using the gradientColorScale
  //     const numStops = 10; // Adjust as needed for smoothness
  //     for (let i = 0; i <= numStops; i++) {
  //       const t = i / numStops;
  //       const value =
  //         gradientColorScale.domain()[0] +
  //         t * (gradientColorScale.domain()[1] - gradientColorScale.domain()[0]);
  //       gradient.addColorStop(t, gradientColorScale(value));
  //     }

  //     ctx.fillStyle = gradient;
  //     ctx.fillRect(0, 0, width, height);
  //   }, [gradientColorScale, gradientState, heatmapRef, metricType]);

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
      let heatmapData = well.indicators[metricIndicator]?.filteredData || [];
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }
      const max = heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
      const min = heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const rangeOfYValues = max - min;
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
        <div className="heatmap-container" style={{ position: "relative" }}>
          {/* Color Scale Gradient */}
          {/* <section className="color-scale" height="100%"> */}
          {/* Checkbox in the top-left corner */}
          {/* <div className="color-scale-toggle">
              <input
                type="checkbox"
                checked={gradientState}
                onChange={() => toggleGradientState(gradientState)}
              />
            </div> */}
          {/* <canvas
              className="color-scale-canvas"
              ref={colorScaleRef}
              // ref={gradientState ? heatmapRef : colorScaleRef}
              width={20}
            /> */}
          {/* </section> */}
          {/* Heatmap Canvas */}
          <canvas
            className="heatmap-canvas"
            ref={heatmapRef}
            width={largeCanvasWidth}
            height={largeCanvasHeight}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          />
          {/* Tooltip */}
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
