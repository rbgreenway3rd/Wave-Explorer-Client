// import React, { useState, useRef } from "react";
// // import "../../../styles/RubberbandSelector.css";

// const RubberbandSelector = ({
//   onSelectionComplete,
//   width,
//   height,
//   smallCanvasHeight,
//   smallCanvasWidth,
//   children,
// }) => {
//   const [isSelecting, setIsSelecting] = useState(false);
//   const [selectionBox, setSelectionBox] = useState(null);
//   const selectionCanvasRef = useRef(null);

//   const handleMouseDown = (e) => {
//     setIsSelecting(true);
//     const { offsetX, offsetY } = e.nativeEvent;
//     setSelectionBox({
//       xStart: offsetX + smallCanvasWidth,
//       yStart: offsetY + smallCanvasHeight,
//       xEnd: offsetX,
//       yEnd: offsetY,
//     });
//   };

//   const handleMouseMove = (e) => {
//     if (!isSelecting) return;
//     const { offsetX, offsetY } = e.nativeEvent;
//     setSelectionBox((prev) => ({
//       ...prev,
//       xEnd: offsetX,
//       yEnd: offsetY,
//     }));

//     // Draw the rubberband box on the canvas
//     const ctx = selectionCanvasRef.current.getContext("2d");
//     ctx.clearRect(0, 0, width, height);
//     ctx.strokeStyle = "blue";
//     ctx.lineWidth = 2;
//     ctx.setLineDash([6]);
//     ctx.strokeRect(
//       selectionBox.xStart,
//       selectionBox.yStart,
//       offsetX - selectionBox.xStart,
//       offsetY - selectionBox.yStart
//     );
//   };

//   const handleMouseUp = (e) => {
//     if (!isSelecting) return;
//     setIsSelecting(false);

//     // Final selection logic (could compute selected wells here)
//     onSelectionComplete(selectionBox);
//     setSelectionBox(null);
//     const ctx = selectionCanvasRef.current.getContext("2d");
//     ctx.clearRect(0, 0, width, height);
//   };

//   return (
//     <div
//       className="rubberband-container"
//       style={{
//         position: "absolute", // Absolute inside the grid
//         width,
//         height,
//         zIndex: 10, // Ensure it stays on top of the grid
//         pointerEvents: "none", // So it doesn't block interactions with underlying elements
//       }}
//       onMouseDown={handleMouseDown}
//       onMouseMove={handleMouseMove}
//       onMouseUp={handleMouseUp}
//     >
//       {children}
//       <canvas
//         ref={selectionCanvasRef}
//         width={width}
//         height={height}
//         style={{
//           position: "absolute",
//           top: 0,
//           left: 0,
//           pointerEvents: "none", // Prevent the canvas from capturing clicks
//         }}
//       />
//     </div>
//   );
// };

// export default RubberbandSelector;
import { useState, useRef, useEffect } from "react";

export const RubberbandSelector = ({ width, height, onSelectionComplete }) => {
  const canvasRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !startPoint || !endPoint) return;

    // Finish selection and pass coordinates to parent
    onSelectionComplete({
      xStart: Math.min(startPoint.x, endPoint.x),
      yStart: Math.min(startPoint.y, endPoint.y),
      xEnd: Math.max(startPoint.x, endPoint.x),
      yEnd: Math.max(startPoint.y, endPoint.y),
    });

    setIsSelecting(false);
    setStartPoint(null);
    setEndPoint(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (isSelecting && startPoint && endPoint) {
      // Clear previous drawing
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the selection rectangle
      context.strokeStyle = "blue";
      context.lineWidth = 2;
      context.strokeRect(
        Math.min(startPoint.x, endPoint.x),
        Math.min(startPoint.y, endPoint.y),
        Math.abs(endPoint.x - startPoint.x),
        Math.abs(endPoint.y - startPoint.y)
      );
    } else {
      // Clear canvas when not selecting
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isSelecting, startPoint, endPoint]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1000,
        pointerEvents: isSelecting ? "auto" : "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

export default RubberbandSelector;
