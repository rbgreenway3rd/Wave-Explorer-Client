import React, { useRef, useEffect, useState } from "react";

const GridCanvas = ({ width, height, selectedCells }) => {
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const canvasRef = useRef(null);

  useEffect(() => {
    setCanvasSize({ width, height });
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    const columns = 24;
    const rows = 16;
    const cellWidth = canvasSize.width / columns;
    const cellHeight = canvasSize.height / rows;

    context.strokeStyle = "black";
    for (let x = 0; x <= canvasSize.width; x += cellWidth) {
      context.moveTo(x, 0);
      context.lineTo(x, canvasSize.height);
    }
    for (let y = 0; y <= canvasSize.height; y += cellHeight) {
      context.moveTo(0, y);
      context.lineTo(canvasSize.width, y);
    }
    context.stroke();

    context.fillStyle = "red";
    selectedCells.forEach(({ row, col }) => {
      const x = col * cellWidth;
      const y = row * cellHeight;
      context.fillRect(x, y, cellWidth, cellHeight);
    });
  }, [canvasSize, selectedCells]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ border: "1px solid black", width: "100%", height: "100%" }}
    />
  );
};

export default GridCanvas;
