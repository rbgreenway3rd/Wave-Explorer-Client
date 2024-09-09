import React, { useRef, useEffect, useState } from "react";

const OverlayCanvas = ({ width, height, onSelect }) => {
  const [overlayCanvasSize, setOverlayCanvasSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [rubberbandedCells, setRubberbandedCells] = useState([]);
  const overlayCanvasRef = useRef(null);

  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    // startPos.x = e.clientX - rect.left;
    // startPos.y = e.clientY - rect.top;
    // currentPos.x = e.clientX - rect.left;
    // currentPos.y = e.clientY - rect.top;
    setIsDragging(true);
    console.log("mouseDown: ", startPos);
    console.log("Canvas: ", rect.x, rect.y, rect.width, rect.height);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    // currentPos.x = e.clientX - rect.left;
    // currentPos.y = e.clientY - rect.top;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const cellWidth = width / 24;
    const cellHeight = height / 16;
    const x1 = Math.min(startPos.x, currentPos.x);
    const y1 = Math.min(startPos.y, currentPos.y);
    const x2 = Math.max(startPos.x, currentPos.x);
    const y2 = Math.max(startPos.y, currentPos.y);

    const cells = [];
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 24; col++) {
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;
        if (
          cellX < x2 &&
          cellX + cellWidth > x1 &&
          cellY < y2 &&
          cellY + cellHeight > y1
        ) {
          cells.push({ row, col });
        }
      }
    }
    setRubberbandedCells(cells);
    onSelect(cells);
    console.log("mouseUp: ", currentPos);
    console.log("selected wells: ", cells);
    // setStartPos({ x: 0, y: 0 });
  };

  useEffect(() => {
    setOverlayCanvasSize({ width, height });
    console.log("overlayCanvasSize: ", overlayCanvasSize);
  }, [width, height]);

  useEffect(() => {
    // const overlayCanvas = overlayCanvasRef.current;
    const context = overlayCanvasRef.current.getContext("2d");

    function drawRubberband() {
      context.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );
      if (isDragging) {
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);
        context.strokeStyle = "blue";
        context.strokeRect(x, y, width, height);
      }
    }
    // console.log(
    //   "Drawing: ",
    //   startPos,
    //   currentPos,
    //   overlayCanvasRef.current.width,
    //   overlayCanvasRef.current.height
    // );

    drawRubberband();
  }, [isDragging, startPos, currentPos]);

  return (
    <canvas
      ref={overlayCanvasRef}
      width={overlayCanvasSize.width}
      height={overlayCanvasSize.height}
      // position: "absolute",
      style={{
        position: "absolute",
        // position: "unset",
        top: 0,
        left: 0,
        border: "none",
        pointerEvents: "auto",
        // width: "auto",
        // height: "auto",
        width: "100%",
        height: "100%",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

export default OverlayCanvas;
