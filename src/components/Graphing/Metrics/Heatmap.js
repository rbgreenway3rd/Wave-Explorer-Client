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
  metricType,
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
    // const colorScale = d3
    //   .scaleSequential()
    //   .interpolator(
    //     d3.interpolateRgbBasis([
    //       "#23171b",
    //       "#4a58dd",
    //       "#2f9df5",
    //       "#27d7c4",
    //       "#4df884",
    //       "#95fb51",
    //       "#dedd32",
    //       "#ffa423",
    //       "#f65f18",
    //       "#ba2208",
    //       "#900c00",
    //     ])
    //   )
    //   .domain(d3.extent(allValues));

    const colorScale = d3
      .scaleSequential()
      .interpolator(
        d3.interpolateRgbBasis([
          "#23171b",
          "#271a28",
          "#2b1c33",
          "#2f1e3f",
          "#32204a",
          "#362354",
          "#39255f",
          "#3b2768",
          "#3e2a72",
          "#402c7b",
          "#422f83",
          "#44318b",
          "#453493",
          "#46369b",
          "#4839a2",
          "#493ca8",
          "#493eaf",
          "#4a41b5",
          "#4a44bb",
          "#4b46c0",
          "#4b49c5",
          "#4b4cca",
          "#4b4ecf",
          "#4b51d3",
          "#4a54d7",
          "#4a56db",
          "#4959de",
          "#495ce2",
          "#485fe5",
          "#4761e7",
          "#4664ea",
          "#4567ec",
          "#446aee",
          "#446df0",
          "#426ff2",
          "#4172f3",
          "#4075f5",
          "#3f78f6",
          "#3e7af7",
          "#3d7df7",
          "#3c80f8",
          "#3a83f9",
          "#3985f9",
          "#3888f9",
          "#378bf9",
          "#368df9",
          "#3590f8",
          "#3393f8",
          "#3295f7",
          "#3198f7",
          "#309bf6",
          "#2f9df5",
          "#2ea0f4",
          "#2da2f3",
          "#2ca5f1",
          "#2ba7f0",
          "#2aaaef",
          "#2aaced",
          "#29afec",
          "#28b1ea",
          "#28b4e8",
          "#27b6e6",
          "#27b8e5",
          "#26bbe3",
          "#26bde1",
          "#26bfdf",
          "#25c1dc",
          "#25c3da",
          "#25c6d8",
          "#25c8d6",
          "#25cad3",
          "#25ccd1",
          "#25cecf",
          "#26d0cc",
          "#26d2ca",
          "#26d4c8",
          "#27d6c5",
          "#27d8c3",
          "#28d9c0",
          "#29dbbe",
          "#29ddbb",
          "#2adfb8",
          "#2be0b6",
          "#2ce2b3",
          "#2de3b1",
          "#2ee5ae",
          "#30e6ac",
          "#31e8a9",
          "#32e9a6",
          "#34eba4",
          "#35eca1",
          "#37ed9f",
          "#39ef9c",
          "#3af09a",
          "#3cf197",
          "#3ef295",
          "#40f392",
          "#42f490",
          "#44f58d",
          "#46f68b",
          "#48f788",
          "#4af786",
          "#4df884",
          "#4ff981",
          "#51fa7f",
          "#54fa7d",
          "#56fb7a",
          "#59fb78",
          "#5cfc76",
          "#5efc74",
          "#61fd71",
          "#64fd6f",
          "#66fd6d",
          "#69fd6b",
          "#6cfd69",
          "#6ffe67",
          "#72fe65",
          "#75fe63",
          "#78fe61",
          "#7bfe5f",
          "#7efd5d",
          "#81fd5c",
          "#84fd5a",
          "#87fd58",
          "#8afc56",
          "#8dfc55",
          "#90fb53",
          "#93fb51",
          "#96fa50",
          "#99fa4e",
          "#9cf94d",
          "#9ff84b",
          "#a2f84a",
          "#a6f748",
          "#a9f647",
          "#acf546",
          "#aff444",
          "#b2f343",
          "#b5f242",
          "#b8f141",
          "#bbf03f",
          "#beef3e",
          "#c1ed3d",
          "#c3ec3c",
          "#c6eb3b",
          "#c9e93a",
          "#cce839",
          "#cfe738",
          "#d1e537",
          "#d4e336",
          "#d7e235",
          "#d9e034",
          "#dcdf33",
          "#dedd32",
          "#e0db32",
          "#e3d931",
          "#e5d730",
          "#e7d52f",
          "#e9d42f",
          "#ecd22e",
          "#eed02d",
          "#f0ce2c",
          "#f1cb2c",
          "#f3c92b",
          "#f5c72b",
          "#f7c52a",
          "#f8c329",
          "#fac029",
          "#fbbe28",
          "#fdbc28",
          "#feb927",
          "#ffb727",
          "#ffb526",
          "#ffb226",
          "#ffb025",
          "#ffad25",
          "#ffab24",
          "#ffa824",
          "#ffa623",
          "#ffa323",
          "#ffa022",
          "#ff9e22",
          "#ff9b21",
          "#ff9921",
          "#ff9621",
          "#ff9320",
          "#ff9020",
          "#ff8e1f",
          "#ff8b1f",
          "#ff881e",
          "#ff851e",
          "#ff831d",
          "#ff801d",
          "#ff7d1d",
          "#ff7a1c",
          "#ff781c",
          "#ff751b",
          "#ff721b",
          "#ff6f1a",
          "#fd6c1a",
          "#fc6a19",
          "#fa6719",
          "#f96418",
          "#f76118",
          "#f65f18",
          "#f45c17",
          "#f25916",
          "#f05716",
          "#ee5415",
          "#ec5115",
          "#ea4f14",
          "#e84c14",
          "#e64913",
          "#e44713",
          "#e24412",
          "#df4212",
          "#dd3f11",
          "#da3d10",
          "#d83a10",
          "#d5380f",
          "#d3360f",
          "#d0330e",
          "#ce310d",
          "#cb2f0d",
          "#c92d0c",
          "#c62a0b",
          "#c3280b",
          "#c1260a",
          "#be2409",
          "#bb2309",
          "#b92108",
          "#b61f07",
          "#b41d07",
          "#b11b06",
          "#af1a05",
          "#ac1805",
          "#aa1704",
          "#a81604",
          "#a51403",
          "#a31302",
          "#a11202",
          "#9f1101",
          "#9d1000",
          "#9b0f00",
          "#9a0e00",
          "#980e00",
          "#960d00",
          "#950c00",
          "#940c00",
          "#930c00",
          "#920c00",
          "#910b00",
          "#910c00",
          "#900c00",
          "#900c00",
          "#900c00",
        ])
      )
      .domain(d3.extent(allValues));

    // .scaleQuantize()
    // .domain(d3.extent(allValues)) // Domain based on the min and max values
    // .range([
    //   "#4a4a4a",
    //   "#00008B",
    //   "blue",
    //   "#007d5b",
    //   "green",
    //   "#9ce237",
    //   "yellow",
    //   "#ffb600",
    //   "#ff9000",
    //   "#ff6100",
    //   "red",
    // ]);

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
      const minYValue =
        heatmapData.length > 0 ? d3.min(heatmapData, (d) => d.y) : 0;
      const rangeOfYValues = maxYValue - minYValue;

      const activeMetric =
        metricType === "maxYValue"
          ? maxYValue
          : metricType === "minYValue"
          ? minYValue
          : rangeOfYValues;

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
    metricType,
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
      const minYValue =
        filteredData.length > 0 ? d3.min(filteredData, (d) => d.y) : 0;
      const rangeOfYValues = maxYValue - minYValue;

      // Determine the active metric for the tooltip based on metricType
      const activeMetric =
        metricType === "maxYValue"
          ? maxYValue
          : metricType === "minYValue"
          ? minYValue
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
            top: tooltip.y + 5,
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
