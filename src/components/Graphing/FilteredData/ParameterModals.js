import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";

import { Delete } from "@mui/icons-material";

export const StaticRatioModal = ({
  open,
  onClose,
  startValue,
  setStartValue,
  endValue,
  setEndValue,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Static Ratio Filter Parameters</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Start Value"
          type="number"
          fullWidth
          value={startValue}
          onChange={(e) => setStartValue(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="End Value"
          type="number"
          fullWidth
          value={endValue}
          onChange={(e) => setEndValue(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export const SmoothingFilterModal = ({
  open,
  onClose,
  windowWidth,
  setWindowWidth,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit Smoothing Filter Sliding Window Parameter</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Sliding Window Width"
          type="number"
          fullWidth
          value={windowWidth}
          onChange={(e) => setWindowWidth(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export const ControlSubtractionModal = ({
  open,
  onClose,
  controlWellArray,
  setControlWellArray,
  applyWellArray,
  setApplyWellArray,
  number_of_rows,
  number_of_columns,
  onSave,
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState(null); // Start point of rubberband
  const [endPoint, setEndPoint] = useState(null); // End point of rubberband
  const [activeGrid, setActiveGrid] = useState("control"); // Track the active grid
  const [rubberbandStyle, setRubberbandStyle] = useState({}); // Style for rubberband box

  const createGrid = (rows, cols) => {
    let grid = [];
    for (let i = 0; i < rows; i++) {
      let row = [];
      for (let j = 0; j < cols; j++) {
        row.push({ row: i, col: j, selected: false });
      }
      grid.push(row);
    }
    return grid;
  };

  const [controlGrid, setControlGrid] = useState(
    createGrid(number_of_rows, number_of_columns)
  );
  const [applyGrid, setApplyGrid] = useState(
    createGrid(number_of_rows, number_of_columns)
  );

  const applyRubberbandSelection = (
    start,
    end,
    grid,
    setGrid,
    setWellArray
  ) => {
    const newGrid = grid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (
          rowIndex >= Math.min(start.row, end.row) &&
          rowIndex <= Math.max(start.row, end.row) &&
          colIndex >= Math.min(start.col, end.col) &&
          colIndex <= Math.max(start.col, end.col)
        ) {
          return { ...cell, selected: !cell.selected };
        }
        return cell;
      })
    );

    setGrid(newGrid);

    const selectedWells = newGrid
      .flat()
      .filter((cell) => cell.selected)
      .map((cell) => ({ row: cell.row, col: cell.col }));

    setWellArray(selectedWells);
  };

  const handleMouseDown = (row, col, mode) => {
    setIsSelecting(true);
    setStartPoint({ row, col });
    setActiveGrid(mode);
  };

  const handleMouseMove = (row, col, event) => {
    if (isSelecting && startPoint) {
      setEndPoint({ row, col });
      // updateRubberbandStyle(startPoint, { row, col }, event);
    }
  };

  const handleMouseUp = () => {
    if (!startPoint) return;

    const grid = activeGrid === "control" ? controlGrid : applyGrid;
    const setGrid = activeGrid === "control" ? setControlGrid : setApplyGrid;
    const setWellArray =
      activeGrid === "control" ? setControlWellArray : setApplyWellArray;

    if (startPoint && endPoint) {
      applyRubberbandSelection(
        startPoint,
        endPoint,
        grid,
        setGrid,
        setWellArray
      );
    } else if (startPoint) {
      toggleCellSelection(
        startPoint.row,
        startPoint.col,
        grid,
        setGrid,
        setWellArray
      );
    }

    setIsSelecting(false);
    setStartPoint(null);
    setEndPoint(null);
    setActiveGrid(null);
    setRubberbandStyle({}); // Reset rubberband style after selection
  };

  const toggleCellSelection = (row, col, grid, setGrid, setWellArray) => {
    const newGrid = grid.map((r, rowIndex) =>
      r.map((cell, colIndex) => {
        if (rowIndex === row && colIndex === col) {
          return { ...cell, selected: !cell.selected };
        }
        return cell;
      })
    );

    setGrid(newGrid);

    const selectedWells = newGrid
      .flat()
      .filter((cell) => cell.selected)
      .map((cell) => ({ row: cell.row, col: cell.col }));

    setWellArray(selectedWells);
  };

  const Grid = ({ grid, number_of_columns, mode }) => {
    return (
      <div
        className="grid-container" // Add class for correct targeting
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
          gap: "2px", // Add space between grid cells
          position: "relative", // Ensure rubberband positioning relative to grid
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              style={{
                width: "20px",
                height: "20px",
                border: "1px solid #000",
                backgroundColor: cell.selected ? "blue" : "transparent",
                cursor: "pointer",
              }}
              onMouseDown={(e) => handleMouseDown(rowIndex, colIndex, mode)}
              onMouseMove={(e) => handleMouseMove(rowIndex, colIndex, e)}
              onMouseUp={handleMouseUp}
            />
          ))
        )}
        {isSelecting && <div style={rubberbandStyle}></div>}{" "}
        {/* Render rubberband box */}
      </div>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Edit Control Subtraction Filter Parameters</DialogTitle>
      <DialogContent>
        <h4>Select Control Wells</h4>
        <Grid
          grid={controlGrid}
          number_of_columns={number_of_columns}
          mode="control"
        />

        <h4>Select Apply Wells</h4>
        <Grid
          grid={applyGrid}
          number_of_columns={number_of_columns}
          mode="apply"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};
