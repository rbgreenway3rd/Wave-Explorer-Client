// import { useState, useRef, useEffect } from "react";

// export const RubberbandSelector = ({
//   selectionCanvasWidth,
//   selectionCanvasHeight,
//   onSelectionComplete,
// }) => {
//   const canvasRef = useRef(null);
//   const [isSelecting, setIsSelecting] = useState(false);
//   const [startPoint, setStartPoint] = useState(null);
//   const [endPoint, setEndPoint] = useState(null);

//   const handleMouseDown = (e) => {
//     // Start new selection when mouse is clicked
//     setIsSelecting(true);
//     const rect = canvasRef.current.getBoundingClientRect();
//     setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
//   };

//   const handleMouseMove = (e) => {
//     // Update selection box as mouse moves, only if selecting
//     if (!isSelecting) return;
//     const rect = canvasRef.current.getBoundingClientRect();
//     setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
//   };

//   const handleMouseUp = () => {
//     // Complete selection and reset isSelecting to false
//     if (!isSelecting || !startPoint || !endPoint) return;

//     // Pass the final coordinates to the parent component
//     onSelectionComplete({
//       xStart: Math.min(startPoint.x, endPoint.x),
//       yStart: Math.min(startPoint.y, endPoint.y),
//       xEnd: Math.max(startPoint.x, endPoint.x),
//       yEnd: Math.max(startPoint.y, endPoint.y),
//     });

//     // Reset selection states
//     setIsSelecting(false);
//     setStartPoint(null);
//     setEndPoint(null);
//   };

//   // Handle mouseup globally so selection doesn't break if the mouse leaves the canvas
//   useEffect(() => {
//     if (isSelecting) {
//       window.addEventListener("mouseup", handleMouseUp);
//     } else {
//       window.removeEventListener("mouseup", handleMouseUp);
//     }

//     return () => {
//       window.removeEventListener("mouseup", handleMouseUp);
//     };
//   }, [isSelecting]);

//   // Drawing the rubberband selection box
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const context = canvas.getContext("2d");

//     if (isSelecting && startPoint && endPoint) {
//       // Clear previous drawings
//       context.clearRect(0, 0, canvas.width, canvas.height);

//       // Draw the selection rectangle
//       context.strokeStyle = "blue";
//       context.lineWidth = 2;
//       context.strokeRect(
//         Math.min(startPoint.x, endPoint.x),
//         Math.min(startPoint.y, endPoint.y),
//         Math.abs(endPoint.x - startPoint.x),
//         Math.abs(endPoint.y - startPoint.y)
//       );
//     } else {
//       // Clear canvas when not selecting
//       context.clearRect(0, 0, canvas.width, canvas.height);
//     }
//   }, [isSelecting, startPoint, endPoint]);

//   return (
//     <canvas
//       ref={canvasRef}
//       width={selectionCanvasWidth}
//       height={selectionCanvasHeight}
//       style={{
//         position: "absolute",
//         top: 0,
//         left: 0,
//         zIndex: 1000,
//         pointerEvents: isSelecting ? "auto" : "none",
//       }}
//       onMouseDown={handleMouseDown}
//       onMouseMove={handleMouseMove}
//       onMouseUp={handleMouseUp}
//     />
//   );
// };

// export default RubberbandSelector;
import { useState, useRef, useEffect } from "react";

export const RubberbandSelector = ({
  selectionCanvasWidth,
  selectionCanvasHeight,
  isSelecting,
  setIsSelecting,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onSelectionComplete,
}) => {
  const canvasRef = useRef(null);

  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    onMouseDown(e); // Notify parent that mouse down occurred
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    onMouseMove(e); // Notify parent of mouse movement
  };

  const handleMouseUp = (e) => {
    if (!isSelecting || !startPoint || !endPoint) return;

    onSelectionComplete({
      xStart: Math.min(startPoint.x, endPoint.x),
      yStart: Math.min(startPoint.y, endPoint.y),
      xEnd: Math.max(startPoint.x, endPoint.x),
      yEnd: Math.max(startPoint.y, endPoint.y),
    });

    setIsSelecting(false);
    setStartPoint(null);
    setEndPoint(null);
    onMouseUp(e);
  };

  useEffect(() => {
    if (isSelecting) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isSelecting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (isSelecting && startPoint && endPoint) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "blue";
      context.lineWidth = 2;
      context.strokeRect(
        Math.min(startPoint.x, endPoint.x),
        Math.min(startPoint.y, endPoint.y),
        Math.abs(endPoint.x - startPoint.x),
        Math.abs(endPoint.y - startPoint.y)
      );
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isSelecting, startPoint, endPoint]);

  return (
    <canvas
      ref={canvasRef}
      width={selectionCanvasWidth}
      height={selectionCanvasHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 1000,
        pointerEvents: isSelecting ? "auto" : "none", // Only intercept events when selecting
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

export default RubberbandSelector;
