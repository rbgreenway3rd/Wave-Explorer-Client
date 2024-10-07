import React, { useState, useRef } from "react";
// import "../../../styles/RubberbandSelector.css";

const RubberbandSelector = ({
  onSelectionComplete,
  width,
  height,
  smallCanvasHeight,
  smallCanvasWidth,
  children,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const selectionCanvasRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    const { offsetX, offsetY } = e.nativeEvent;
    setSelectionBox({
      xStart: offsetX + smallCanvasWidth,
      yStart: offsetY + smallCanvasHeight,
      xEnd: offsetX,
      yEnd: offsetY,
    });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const { offsetX, offsetY } = e.nativeEvent;
    setSelectionBox((prev) => ({
      ...prev,
      xEnd: offsetX,
      yEnd: offsetY,
    }));

    // Draw the rubberband box on the canvas
    const ctx = selectionCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(
      selectionBox.xStart,
      selectionBox.yStart,
      offsetX - selectionBox.xStart,
      offsetY - selectionBox.yStart
    );
  };

  const handleMouseUp = (e) => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Final selection logic (could compute selected wells here)
    onSelectionComplete(selectionBox);
    setSelectionBox(null);
    const ctx = selectionCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, width, height);
  };

  return (
    <div
      className="rubberband-container"
      style={{ position: "relative", width, height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {children}
      <canvas
        ref={selectionCanvasRef}
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      />
    </div>
  );
};

export default RubberbandSelector;
