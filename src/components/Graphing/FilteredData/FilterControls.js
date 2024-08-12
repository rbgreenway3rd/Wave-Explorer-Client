import React, { useRef, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

const GridCanvas = ({ width, height, selectedCells }) => {
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const canvasRef = useRef(null);

  useEffect(() => {
    setCanvasSize({ width, height });
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    function drawBoard() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Drawing the grid
      const columns = 24;
      const rows = 16;
      const cellWidth = canvasSize.width / columns;
      const cellHeight = canvasSize.height / rows;
      for (let x = 0; x <= canvasSize.width; x += cellWidth) {
        context.moveTo(x, 0);
        context.lineTo(x, canvasSize.height);
      }
      for (let y = 0; y <= canvasSize.height; y += cellHeight) {
        context.moveTo(0, y);
        context.lineTo(canvasSize.width, y);
      }
      context.strokeStyle = "black";
      context.stroke();

      // Fill selected cells with red
      context.fillStyle = "red";
      selectedCells.forEach(({ row, col }) => {
        const x = col * cellWidth;
        const y = row * cellHeight;
        context.fillRect(x, y, cellWidth, cellHeight);
      });
    }

    drawBoard();
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

const OverlayCanvas = ({ width, height, onSelect }) => {
  const [overlayCanvasSize, setOverlayCanvasSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const overlayCanvasRef = useRef(null);

  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const newStartPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setStartPos(newStartPos);
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    const rect = overlayCanvasRef.current.getBoundingClientRect();
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

    onSelect(cells);
  };

  useEffect(() => {
    setOverlayCanvasSize({ width, height });
  }, [width, height]);

  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const context = overlayCanvas.getContext("2d");

    function drawRubberband() {
      context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      if (isDragging) {
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);
        context.strokeStyle = "blue";
        context.strokeRect(x, y, width, height);
      }
    }

    drawRubberband();
  }, [isDragging, startPos, currentPos]);

  return (
    <canvas
      ref={overlayCanvasRef}
      // width={width}
      // height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        border: "none",
        pointerEvents: "auto",
        width: "100%",
        height: "100%",
      }}
      // ref={canvasRef}
      width={overlayCanvasSize.width}
      height={overlayCanvasSize.height}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  maxWidth: 800,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  display: "flex",
  flexDirection: "column",
  p: 2,
};

export default function WellSelectionModal() {
  const [open, setOpen] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 400, height: 400 });
  const [selectedCells, setSelectedCells] = useState([]);

  const handleOpen = () => {
    setOpen(true);
    const modalWidth = window.innerWidth * 0.7;
    const modalHeight = window.innerHeight * 0.7;
    setModalSize({ width: modalWidth, height: modalHeight });
  };

  const handleClose = () => setOpen(false);

  const handleSelection = (cells) => {
    setSelectedCells(cells);
  };

  return (
    <div>
      <Button onClick={handleOpen}>Settings</Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box
          sx={{ ...style, width: modalSize.width, height: modalSize.height }}
        >
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2 }}
          >
            Text in a modal
          </Typography>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              position: "relative", // Ensure relative positioning
            }}
          >
            <GridCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 100}
              selectedCells={selectedCells}
            />
            <OverlayCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 100}
              onSelect={handleSelection}
            />
          </Box>
        </Box>
      </Modal>
    </div>
  );
}

export const FilterControls = () => {
  return (
    <div className="filter-controls-container">
      <div className="filter-list-container">
        <div className="filter-save-status">unsaved</div>
        <ul className="selected-filter-list">
          <li className="filter-list-item">
            <input
              className="filter-list-item-checkbox"
              type="checkbox"
              name="filter"
              id="filter1"
            />
            <label className="filter-list-item-label" htmlFor="filter1">
              filter 1
            </label>
            <WellSelectionModal />
          </li>
        </ul>
      </div>
      <div className="filter-list-order">
        <button className="add-filter-button filter-list-order-edit-button">
          +
        </button>
        <button className="move-up-filter-button filter-list-order-edit-button">
          ^
        </button>
        <button className="move-down-filter-button filter-list-order-edit-button">
          v
        </button>
        <button className="remove-filter-button filter-list-order-edit-button">
          x
        </button>
      </div>
    </div>
  );
};
