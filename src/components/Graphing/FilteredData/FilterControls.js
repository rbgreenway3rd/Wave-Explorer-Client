import React, { useRef, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

// GridCanvas component renders the grid and highlights selected cells
const GridCanvas = ({ width, height, selectedCells }) => {
  // State to store the size of the canvas
  const [canvasSize, setCanvasSize] = useState({ width, height });

  // useRef hook to reference the canvas DOM element
  const canvasRef = useRef(null);

  // Effect to update canvas size state when width or height props change
  useEffect(() => {
    setCanvasSize({ width, height });
  }, [width, height]);

  // Effect to draw the grid and fill selected cells whenever canvasSize or selectedCells changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    function drawBoard() {
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Drawing the grid
      const columns = 24; // Number of columns in the grid
      const rows = 16; // Number of rows in the grid
      const cellWidth = canvasSize.width / columns; // Width of each cell
      const cellHeight = canvasSize.height / rows; // Height of each cell

      // Draw vertical grid lines
      for (let x = 0; x <= canvasSize.width; x += cellWidth) {
        context.moveTo(x, 0);
        context.lineTo(x, canvasSize.height);
      }

      // Draw horizontal grid lines
      for (let y = 0; y <= canvasSize.height; y += cellHeight) {
        context.moveTo(0, y);
        context.lineTo(canvasSize.width, y);
      }

      context.strokeStyle = "black"; // Set grid line color to black
      context.stroke(); // Draw the grid

      // Fill selected cells with red color
      context.fillStyle = "red";
      selectedCells.forEach(({ row, col }) => {
        const x = col * cellWidth;
        const y = row * cellHeight;
        context.fillRect(x, y, cellWidth, cellHeight);
      });
    }

    drawBoard(); // Call the function to draw the grid and fill selected cells
  }, [canvasSize, selectedCells]);

  return (
    <canvas
      ref={canvasRef} // Attach the ref to the canvas element
      width={canvasSize.width}
      height={canvasSize.height}
      style={{ border: "1px solid black", width: "100%", height: "100%" }}
    />
  );
};

// OverlayCanvas component handles the rubberband selection functionality
const OverlayCanvas = ({ width, height, onSelect }) => {
  // State to store the size of the overlay canvas
  const [overlayCanvasSize, setOverlayCanvasSize] = useState({ width, height });
  // State to track whether the user is dragging the mouse
  const [isDragging, setIsDragging] = useState(false);
  // State to store the starting position of the drag
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  // State to store the current position of the drag
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  // State to store selected wells from rubberband
  const [rubberbandedWells, setRubberbandedWells] = useState([]);

  // useRef hook to reference the overlay canvas DOM element
  const overlayCanvasRef = useRef(null);

  // Handler for when the mouse button is pressed down
  const handleMouseDown = (e) => {
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const newStartPos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setStartPos(newStartPos); // Set the starting position
    setIsDragging(true); // Enable dragging
  };

  // Handler for when the mouse is moved
  const handleMouseMove = (e) => {
    if (!isDragging) return; // Do nothing if not dragging
    const rect = overlayCanvasRef.current.getBoundingClientRect();
    setCurrentPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Handler for when the mouse button is released
  const handleMouseUp = () => {
    setIsDragging(false); // Disable dragging

    // Calculate the selected cells based on the drag area
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
          cells.push({ row, col }); // Add the cell to the selected cells array
        }
      }
      setRubberbandedWells(cells);
    }
    onSelect(rubberbandedWells); // Call the onSelect callback with the selected cells
  };

  // Effect to update overlay canvas size when width or height props change
  useEffect(() => {
    setOverlayCanvasSize({ width, height });
  }, [width, height]);

  // Effect to draw the rubberband rectangle while dragging
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
        context.strokeStyle = "blue"; // Set the rubberband color to blue
        context.strokeRect(x, y, width, height); // Draw the rubberband rectangle
      }
    }

    drawRubberband(); // Call the function to draw the rubberband rectangle
  }, [isDragging, startPos, currentPos]);

  return (
    <canvas
      ref={overlayCanvasRef} // Attach the ref to the canvas element
      width={overlayCanvasSize.width}
      height={overlayCanvasSize.height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        border: "none",
        pointerEvents: "auto",
        width: "100%",
        height: "100%",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

// Styles for the modal container
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

// Main component that controls the modal and coordinates the grid and overlay canvas
const WellSelectionModal = ({ onFilterApply }) => {
  const [open, setOpen] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 400, height: 400 });
  const [selectedCells, setSelectedCells] = useState([]);

  const handleOpen = () => {
    setOpen(true);
    const modalWidth = window.innerWidth * 0.7;
    const modalHeight = window.innerHeight * 0.7;
    setModalSize({ width: modalWidth, height: modalHeight });
  };

  const handleClose = () => {
    setOpen(false);
    // Call the function to handle the selected cells when the modal is closed
    onFilterApply(selectedCells);
  };

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
              position: "relative",
            }}
          >
            <GridCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 80}
              selectedCells={selectedCells}
            />
            <OverlayCanvas
              width={modalSize.width - 40}
              height={modalSize.height - 80}
              onSelect={handleSelection}
            />
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

// Define FilterControls component
export const FilterControls = () => {
  const [selectedFilteredWellArray, setSelectedFilteredWellArray] = useState(
    []
  );

  // Handle rubberband selection for filtering
  const handleFilteredWellsSelect = (rubberbandedWells, wellArrays) => {
    const filteredWells = [];
    if (
      Array.isArray(rubberbandedWells) &&
      rubberbandedWells.every(
        (well) => Array.isArray(well) && well.length === 2
      )
    ) {
      rubberbandedWells.forEach(([row, col]) => {
        wellArrays.forEach((well) => {
          if (well.column === col && well.row === row) {
            filteredWells.push(well);
          }
        });
      });
      setSelectedFilteredWellArray(filteredWells);
    } else {
      console.error(
        "rubberbandedWells is not in the expected format",
        rubberbandedWells
      );
    }
  };

  const handleFilterApply = (selectedCells) => {
    // Here, `wellArrays` should be provided or obtained from elsewhere
    const wellArrays = []; // Replace with actual wellArrays data
    handleFilteredWellsSelect(selectedCells, wellArrays);
  };

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
            <WellSelectionModal onFilterApply={handleFilterApply} />
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
