import React, { useRef, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

const GridCanvas = ({ width, height }) => {
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [selectedCells, setSelectedCells] = useState([]);

  const canvasRef = useRef(null);

  useEffect(() => {
    setCanvasSize({ width, height });
  }, [width, height]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);

    // Determine which cells fall within the rubberband selection
    const cells = [];
    const rect = canvasRef.current.getBoundingClientRect();
    const cellWidth = canvasSize.width / 24;
    const cellHeight = canvasSize.height / 16;
    const x1 = Math.min(startPos.x, currentPos.x);
    const y1 = Math.min(startPos.y, currentPos.y);
    const x2 = Math.max(startPos.x, currentPos.x);
    const y2 = Math.max(startPos.y, currentPos.y);

    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 24; col++) {
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;
        const cellRect = {
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
        };

        // Check if cell intersects with the rubberband rectangle
        if (
          cellRect.x < x2 &&
          cellRect.x + cellRect.width > x1 &&
          cellRect.y < y2 &&
          cellRect.y + cellRect.height > y1
        ) {
          cells.push({ row, col });
        }
      }
    }

    console.log("Selected cells:", cells);
    setSelectedCells(cells);
  };

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

      // Drawing the rubberband rectangle
      if (isDragging) {
        const x = Math.min(startPos.x, currentPos.x);
        const y = Math.min(startPos.y, currentPos.y);
        const width = Math.abs(startPos.x - currentPos.x);
        const height = Math.abs(startPos.y - currentPos.y);
        context.strokeStyle = "blue";
        context.strokeRect(x, y, width, height);
      }

      // Fill selected cells with red
      context.fillStyle = "red";
      selectedCells.forEach(({ row, col }) => {
        const x = col * (canvasSize.width / 24);
        const y = row * (canvasSize.height / 16);
        context.fillRect(x, y, canvasSize.width / 24, canvasSize.height / 16);
      });
    }

    drawBoard();
  }, [canvasSize, isDragging, startPos, currentPos, selectedCells]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ border: "1px solid black", width: "100%", height: "100%" }}
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
  display: "flex", // Flexbox to manage the layout
  flexDirection: "column", // Arrange children vertically
  p: 2, // Reduce padding to prevent overlap
};

export default function WellSelectionModal() {
  const [open, setOpen] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 400, height: 400 });

  const handleOpen = () => {
    setOpen(true);
    const modalWidth = window.innerWidth * 0.7;
    const modalHeight = window.innerHeight * 0.7;
    setModalSize({ width: modalWidth, height: modalHeight });
  };

  const handleClose = () => setOpen(false);

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
            sx={{ mb: 2 }} // Add margin-bottom to the title
          >
            Text in a modal
          </Typography>
          <Box sx={{ flex: 1, display: "flex" }}>
            <GridCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 100}
            />
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
export const FilterControls = (
  {
    //inherited data
  }
) => {
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
            <label className="filter-list-item-label" for="filter1">
              filter 1
            </label>
            <WellSelectionModal />
            {/* <button className="filter-list-item-settings-button">.</button> */}
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
