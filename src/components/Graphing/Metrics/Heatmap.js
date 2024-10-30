// import React, {
//   useRef,
//   useEffect,
//   useState,
//   useMemo,
//   useCallback,
//   useContext,
// } from "react";
// import * as d3 from "d3";
// import { DataContext } from "../../../providers/DataProvider";
// import { ColormapValues } from "./HeatmapConfig";

// const Heatmap = ({
//   // largeCanvasWidth,
//   // largeCanvasHeight,
//   rowLabels,
//   columnLabels,
//   annotationRangeStart,
//   annotationRangeEnd,
//   metricType,
// }) => {
//   const { wellArrays } = useContext(DataContext);
//   const canvasRef = useRef(null);
//   const [tooltip, setTooltip] = useState({
//     visible: false,
//     x: 0,
//     y: 0,
//     label: "",
//     value: "",
//   });

//   const numColumns = columnLabels.length;
//   const numRows = rowLabels.length;

//   const [largeCanvasWidth, setLargeCanvasWidth] = useState(
//     window.innerWidth / 2.3
//     // window.innerWidth / 2.5
//   );
//   const [largeCanvasHeight, setLargeCanvasHeight] = useState(
//     window.innerHeight / 2.3
//     // window.innerHeight / 2.5
//   );
//   const [smallCanvasWidth, setSmallCanvasWidth] = useState(
//     window.innerWidth / 64.4
//     // window.innerWidth / 70
//   );
//   const [smallCanvasHeight, setSmallCanvasHeight] = useState(
//     window.innerHeight / 46
//     // window.innerHeight / 50
//   );

//   const handleResize = () => {
//     // setLargeCanvasWidth(window.innerWidth / 2.5);
//     // setLargeCanvasHeight(window.innerHeight / 2.5);
//     // setSmallCanvasWidth(window.innerWidth / 70);
//     // setSmallCanvasHeight(window.innerHeight / 50);
//     setLargeCanvasWidth(window.innerWidth / 2.3);
//     setLargeCanvasHeight(window.innerHeight / 2.3);
//     setSmallCanvasWidth(window.innerWidth / 64.4);
//     setSmallCanvasHeight(window.innerHeight / 46);
//   };

//   // Effect to listen to window resize events
//   useEffect(() => {
//     window.addEventListener("resize", handleResize);

//     // Cleanup event listener on component unmount
//     return () => {
//       window.removeEventListener("resize", handleResize);
//     };
//   }, []);

//   // Memoize annotationRange to prevent unnecessary recalculations and re-renders
//   const annotationRange = useMemo(() => {
//     return annotationRangeStart > annotationRangeEnd
//       ? { start: annotationRangeEnd, end: annotationRangeStart }
//       : { start: annotationRangeStart, end: annotationRangeEnd };
//   }, [annotationRangeStart, annotationRangeEnd]);

//   const allValues = useMemo(() => {
//     return wellArrays.flatMap((well) => {
//       const filteredData = well.indicators[0]?.filteredData || [];

//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         return filteredData
//           .filter(
//             (_, i) => i >= annotationRange.start && i <= annotationRange.end
//           )
//           .map((d) => d.y);
//       } else {
//         return filteredData.map((d) => d.y);
//       }
//     });
//   }, [wellArrays, annotationRange]);

//   const linearRegression = useCallback((data) => {
//     let xsum = 0,
//       ysum = 0;
//     for (let i = 0; i < data.length; i++) {
//       xsum += data[i].x;
//       ysum += data[i].y;
//     }
//     let xmean = xsum / data.length;
//     let ymean = ysum / data.length;

//     let num = 0,
//       denom = 0;
//     for (let i = 0; i < data.length; i++) {
//       let x = data[i].x;
//       let y = data[i].y;
//       num += (x - xmean) * (y - ymean);
//       denom += (x - xmean) * (x - xmean);
//     }
//     return num / denom;
//   }, []);

//   // Memoize slope calculation for each well
//   const calculateSlope = useCallback(
//     (heatmapData) => {
//       return heatmapData.length > 0 ? linearRegression(heatmapData) : 0;
//     },
//     [linearRegression]
//   );

//   // Calculate slopes for all wells
//   const allSlopes = useMemo(() => {
//     return wellArrays.map((well) => {
//       let heatmapData = well.indicators[0]?.filteredData || [];
//       // Filter based on annotationRange if needed
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }
//       return calculateSlope(heatmapData);
//     });
//   }, [wellArrays, annotationRange, calculateSlope]);

//   // Calculate the min and max slope values
//   const minSlope = d3.min(allSlopes);
//   const maxSlope = d3.max(allSlopes);

//   const calculateRange = (heatmapData) => {
//     if (heatmapData.length === 0) return 0; // If no data, return 0

//     const maxY = d3.max(heatmapData, (d) => d.y); // Find the maximum y value
//     const minY = d3.min(heatmapData, (d) => d.y); // Find the minimum y value

//     return maxY - minY; // Return the range (difference between max and min)
//   };

//   const allRanges = useMemo(() => {
//     return wellArrays.map((well) => {
//       let heatmapData = well.indicators[0]?.filteredData || [];
//       // Filter based on annotationRange if needed
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }
//       return calculateRange(heatmapData); // Calculate the range for each well
//     });
//   }, [wellArrays, annotationRange]);

//   // Calculate the min and max range values
//   const rangeExtent = d3.extent(allRanges);

//   // Memoize the colorScale
//   const colorScale = useMemo(() => {
//     const extent = d3.extent(allValues);
//     // console.log("Color scale extent: ", extent);

//     if (metricType === "slope") {
//       const slopeExtent = [minSlope, maxSlope];
//       const midpoint =
//         slopeExtent[0] > 0
//           ? slopeExtent[0]
//           : (slopeExtent[0] + slopeExtent[1]) / 2;
//       return d3
//         .scaleDiverging()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain([slopeExtent[0], midpoint, slopeExtent[1]]);
//     } else if (metricType === "range") {
//       // Calculate the midpoint of the range extent
//       const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
//       return d3
//         .scaleDiverging()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain([rangeExtent[0], midpoint, rangeExtent[1]]); // Use rangeExtent for the domain of the color scale
//     } else {
//       return d3
//         .scaleSequential()
//         .interpolator(d3.interpolateRgbBasis(ColormapValues))
//         .domain(extent);
//     }
//   }, [
//     minSlope,
//     maxSlope,
//     metricType,
//     allValues,
//     // wellArrays,
//     // annotationRange,
//     rangeExtent,
//   ]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const context = canvas.getContext("2d");
//     // console.log(allValues);

//     // Calculate exact width and height for cells so they fill up the entire canvas
//     const cellWidth = largeCanvasWidth / numColumns;
//     const cellHeight = largeCanvasHeight / numRows;

//     // Clear the entire canvas before drawing
//     context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

//     // Draw each well as a cell in the heatmap
//     wellArrays.forEach((well, i) => {
//       const row = Math.floor(i / numColumns);
//       const col = i % numColumns;

//       let heatmapData = well.indicators[0]?.filteredData || [];

//       // Only include filteredData within the annotationRange if it's set
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }

//       const maxYValue =
//         heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
//       const minYValue =
//         heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
//       const rangeOfYValues = maxYValue - minYValue;

//       // Calculate slope using the memoized function
//       const slope = calculateSlope(heatmapData);

//       const activeMetric =
//         metricType === "maxYValue"
//           ? maxYValue
//           : metricType === "minYValue"
//           ? minYValue
//           : metricType === "slope"
//           ? slope
//           : rangeOfYValues;

//       // Set the fill color based on the active metric
//       context.fillStyle = colorScale(activeMetric);

//       // Draw each cell ensuring it perfectly fits in the grid
//       context.fillRect(
//         col * cellWidth,
//         row * cellHeight,
//         cellWidth,
//         cellHeight
//       );

//       // Set border color and size
//       context.strokeStyle = "black"; // Border color
//       context.lineWidth = 2; // Border size

//       // Draw the border around the cell
//       context.strokeRect(
//         col * cellWidth,
//         row * cellHeight,
//         cellWidth,
//         cellHeight
//       );

//       // Set text properties
//       context.fillStyle = "black"; // Set the text color
//       context.font = "12px Arial"; // Set font size and family
//       context.textAlign = "center"; // Center the text
//       context.textBaseline = "middle"; // Middle align vertically

//       // Calculate text position
//       const textX = col * cellWidth + cellWidth / 2; // Center X
//       const textY = row * cellHeight + cellHeight / 2; // Center Y

//       // Draw the well label
//       context.fillText(well.label || "", textX, textY); // Replace with actual label property
//     });
//   }, [
//     wellArrays,
//     allValues,
//     largeCanvasWidth,
//     largeCanvasHeight,
//     numColumns,
//     numRows,
//     annotationRange, // annotationRange is memoized, reducing unnecessary recalculations
//     metricType,
//     colorScale, // Add colorScale to dependencies
//     calculateSlope,
//   ]);

//   const handleMouseMove = (e) => {
//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseX = e.clientX - rect.left;
//     const mouseY = e.clientY - rect.top;

//     const cellWidth = largeCanvasWidth / numColumns;
//     const cellHeight = largeCanvasHeight / numRows;

//     const col = Math.floor(mouseX / cellWidth);
//     const row = Math.floor(mouseY / cellHeight);
//     const index = row * numColumns + col;

//     if (index >= 0 && index < wellArrays.length) {
//       const well = wellArrays[index];
//       let heatmapData = well.indicators[0]?.filteredData || [];

//       // Only include filteredData within the annotationRange if it's set
//       if (annotationRange.start !== null && annotationRange.end !== null) {
//         heatmapData = heatmapData.filter(
//           (_, i) => i >= annotationRange.start && i <= annotationRange.end
//         );
//       }

//       const maxYValue =
//         heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
//       const minYValue =
//         heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
//       const slope = heatmapData.length > 0 ? linearRegression(heatmapData) : 0;

//       const rangeOfYValues = maxYValue - minYValue;

//       // Determine the active metric for the tooltip based on metricType
//       const activeMetric =
//         metricType === "maxYValue"
//           ? maxYValue
//           : metricType === "minYValue"
//           ? minYValue
//           : metricType === "slope"
//           ? slope
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
//       <canvas
//         key={`${largeCanvasWidth}-${largeCanvasHeight}`}
//         className="heatmap-canvas"
//         ref={canvasRef}
//         width={largeCanvasWidth}
//         height={largeCanvasHeight}
//         onMouseLeave={handleMouseLeave}
//         onMouseMove={handleMouseMove}
//       />
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
//           }}
//         >
//           <div>
//             <strong>{tooltip.label}</strong>
//           </div>
//           <div>{tooltip.value}</div>
//         </div>
//       )}
//     </>
//   );
// };

// export default Heatmap;
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
import { ColormapValues } from "./HeatmapConfig";
import {
  linearRegression,
  calculateSlope,
  calculateRange,
  getAllValues,
  getAllSlopes,
  getAllRanges,
} from "./MetricsUtilities";

const Heatmap = ({
  // largeCanvasWidth,
  // largeCanvasHeight,
  rowLabels,
  columnLabels,
  annotationRangeStart,
  annotationRangeEnd,
  metricType,
}) => {
  const { wellArrays } = useContext(DataContext);
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

  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
    // window.innerWidth / 2.5
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
    // window.innerHeight / 2.5
  );
  const [smallCanvasWidth, setSmallCanvasWidth] = useState(
    window.innerWidth / 64.4
    // window.innerWidth / 70
  );
  const [smallCanvasHeight, setSmallCanvasHeight] = useState(
    window.innerHeight / 46
    // window.innerHeight / 50
  );

  const handleResize = () => {
    // setLargeCanvasWidth(window.innerWidth / 2.5);
    // setLargeCanvasHeight(window.innerHeight / 2.5);
    // setSmallCanvasWidth(window.innerWidth / 70);
    // setSmallCanvasHeight(window.innerHeight / 50);
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
    setSmallCanvasWidth(window.innerWidth / 64.4);
    setSmallCanvasHeight(window.innerHeight / 46);
  };

  // Effect to listen to window resize events
  useEffect(() => {
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Memoize annotationRange to prevent unnecessary recalculations and re-renders
  const annotationRange = useMemo(() => {
    return annotationRangeStart > annotationRangeEnd
      ? { start: annotationRangeEnd, end: annotationRangeStart }
      : { start: annotationRangeStart, end: annotationRangeEnd };
  }, [annotationRangeStart, annotationRangeEnd]);

  const allValues = useMemo(
    () => getAllValues(wellArrays, annotationRange),
    [wellArrays, annotationRange]
  );
  const allSlopes = useMemo(
    () => getAllSlopes(wellArrays, annotationRange),
    [wellArrays, annotationRange]
  );
  const allRanges = useMemo(
    () => getAllRanges(wellArrays, annotationRange),
    [wellArrays, annotationRange]
  );

  // Calculate min and max for slopes and ranges
  const minSlope = d3.min(allSlopes);
  const maxSlope = d3.max(allSlopes);
  const rangeExtent = d3.extent(allRanges);

  // Memoize the colorScale
  const colorScale = useMemo(() => {
    const extent = d3.extent(allValues);
    // console.log("Color scale extent: ", extent);

    if (metricType === "slope") {
      const slopeExtent = [minSlope, maxSlope];
      const midpoint =
        slopeExtent[0] > 0
          ? slopeExtent[0]
          : (slopeExtent[0] + slopeExtent[1]) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([slopeExtent[0], midpoint, slopeExtent[1]]);
    } else if (metricType === "range") {
      // Calculate the midpoint of the range extent
      const midpoint = (rangeExtent[0] + rangeExtent[1]) / 2;
      return d3
        .scaleDiverging()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain([rangeExtent[0], midpoint, rangeExtent[1]]); // Use rangeExtent for the domain of the color scale
    } else {
      return d3
        .scaleSequential()
        .interpolator(d3.interpolateRgbBasis(ColormapValues))
        .domain(extent);
    }
  }, [
    minSlope,
    maxSlope,
    metricType,
    allValues,
    // wellArrays,
    // annotationRange,
    rangeExtent,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    // console.log(allValues);

    // Calculate exact width and height for cells so they fill up the entire canvas
    const cellWidth = largeCanvasWidth / numColumns;
    const cellHeight = largeCanvasHeight / numRows;

    // Clear the entire canvas before drawing
    context.clearRect(0, 0, largeCanvasWidth, largeCanvasHeight);

    // Draw each well as a cell in the heatmap
    wellArrays.forEach((well, i) => {
      const row = Math.floor(i / numColumns);
      const col = i % numColumns;

      let heatmapData = well.indicators[0]?.filteredData || [];

      // Only include filteredData within the annotationRange if it's set
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }

      const maxYValue =
        heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
      const minYValue =
        heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const rangeOfYValues = maxYValue - minYValue;

      // Calculate slope using the memoized function
      const slope = calculateSlope(heatmapData);

      const activeMetric =
        metricType === "maxYValue"
          ? maxYValue
          : metricType === "minYValue"
          ? minYValue
          : metricType === "slope"
          ? slope
          : rangeOfYValues;

      // Set the fill color based on the active metric
      context.fillStyle = colorScale(activeMetric);

      // Draw each cell ensuring it perfectly fits in the grid
      context.fillRect(
        col * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight
      );

      // Set border color and size
      context.strokeStyle = "black"; // Border color
      context.lineWidth = 2; // Border size

      // Draw the border around the cell
      context.strokeRect(
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
  }, [
    wellArrays,
    allValues,
    largeCanvasWidth,
    largeCanvasHeight,
    numColumns,
    numRows,
    annotationRange, // annotationRange is memoized, reducing unnecessary recalculations
    metricType,
    colorScale, // Add colorScale to dependencies
    // calculateSlope,
  ]);

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
      let heatmapData = well.indicators[0]?.filteredData || [];

      // Only include filteredData within the annotationRange if it's set
      if (annotationRange.start !== null && annotationRange.end !== null) {
        heatmapData = heatmapData.filter(
          (_, i) => i >= annotationRange.start && i <= annotationRange.end
        );
      }

      const maxYValue =
        heatmapData.length > 0 ? d3.max(heatmapData, (d) => d.y) : 0;
      const minYValue =
        heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const slope = heatmapData.length > 0 ? linearRegression(heatmapData) : 0;

      const rangeOfYValues = maxYValue - minYValue;

      // Determine the active metric for the tooltip based on metricType
      const activeMetric =
        metricType === "maxYValue"
          ? maxYValue
          : metricType === "minYValue"
          ? minYValue
          : metricType === "slope"
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

  return (
    <>
      <canvas
        key={`${largeCanvasWidth}-${largeCanvasHeight}`}
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
            top: tooltip.y - 40,
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
