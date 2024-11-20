import React, { useState, useRef, useEffect } from "react";
import {
  useSelectionContainer,
  Box,
  boxesIntersect,
} from "@air/react-drag-to-select";
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
  largeCanvasWidth,
  largeCanvasHeight,
  smallCanvasWidth,
  smallCanvasHeight,
}) => {
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

  // Refs to store grid cells for selection
  const controlGridRef = useRef(null);
  const applyGridRef = useRef(null);

  const controlSelectableItems = useRef([]);
  const applySelectableItems = useRef([]);

  const selectedControlIndexes = useRef([]);
  const selectedApplyIndexes = useRef([]);

  const getWellLabel = (row, col) => {
    return row < 26
      ? String.fromCharCode(row + 65) + String(col + 1).padStart(2, "0")
      : "A" + String.fromCharCode(row + 40) + String(col + 1).padStart(2, "0");
  };

  // Populate controlSelectableItems.current when the modal is opened
  useEffect(() => {
    if (open) {
      if (controlGridRef.current) {
        controlSelectableItems.current = Array.from(
          controlGridRef.current.querySelectorAll(".control-cell")
        );
      }
      if (applyGridRef.current) {
        applySelectableItems.current = Array.from(
          applyGridRef.current.querySelectorAll(".apply-cell")
        );
      }
    }
  }, [open, controlGrid, applyGrid]);

  const handleControlSelectionChange = (box) => {
    const newSelectedIndexes = [];
    controlSelectableItems.current.forEach((item, index) => {
      const { left, top, width, height } = item.getBoundingClientRect();
      const itemBox = { left, top, width, height };
      if (boxesIntersect(box, itemBox)) {
        newSelectedIndexes.push(index);
      }
    });
    selectedControlIndexes.current = newSelectedIndexes; // Store selected indexes
  };

  const handleControlSelectionEnd = () => {
    const updatedControlGrid = controlGrid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const index = rowIndex * number_of_columns + colIndex;
        if (selectedControlIndexes.current.includes(index)) {
          return { ...cell, selected: !cell.selected };
        }
        return cell;
      })
    );
    setControlGrid(updatedControlGrid);

    const selectedWells = updatedControlGrid
      .flat()
      .filter((cell) => cell.selected)
      .map((cell) => ({ row: cell.row, col: cell.col }));
    setControlWellArray(selectedWells);
  };

  const handleApplySelectionChange = (box) => {
    const newSelectedIndexes = [];
    applySelectableItems.current.forEach((item, index) => {
      const { left, top, width, height } = item.getBoundingClientRect();
      const itemBox = { left, top, width, height };
      if (boxesIntersect(box, itemBox)) {
        newSelectedIndexes.push(index);
      }
    });
    selectedApplyIndexes.current = newSelectedIndexes; // Store selected indexes
  };

  const handleApplySelectionEnd = () => {
    const updatedApplyGrid = applyGrid.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const index = rowIndex * number_of_columns + colIndex;
        if (selectedApplyIndexes.current.includes(index)) {
          return { ...cell, selected: !cell.selected };
        }
        return cell;
      })
    );
    setApplyGrid(updatedApplyGrid);

    const selectedWells = updatedApplyGrid
      .flat()
      .filter((cell) => cell.selected)
      .map((cell) => ({ row: cell.row, col: cell.col }));
    setApplyWellArray(selectedWells);
  };

  const clearSelections = () => {
    // Reset selected wells arrays
    setControlWellArray([]);
    setApplyWellArray([]);

    // Reset the selected state in both grids
    setControlGrid(
      controlGrid.map((row) =>
        row.map((cell) => ({ ...cell, selected: false }))
      )
    );
    setApplyGrid(
      applyGrid.map((row) => row.map((cell) => ({ ...cell, selected: false })))
    );
  };

  const Grid = ({ grid, gridRef, isControl }) => {
    // Toggle selection for a single cell on click
    const handleSingleCellClick = (rowIndex, colIndex) => {
      const updatedGrid = grid.map((row, rIdx) =>
        row.map((cell, cIdx) => {
          if (rIdx === rowIndex && cIdx === colIndex) {
            return { ...cell, selected: !cell.selected }; // Toggle selection
          }
          return cell;
        })
      );

      // Update the appropriate grid state
      if (isControl) {
        setControlGrid(updatedGrid);
        setControlWellArray(
          updatedGrid
            .flat()
            .filter((cell) => cell.selected)
            .map((cell) => ({
              row: cell.row,
              col: cell.col,
            }))
        );
      } else {
        setApplyGrid(updatedGrid);
        setApplyWellArray(
          updatedGrid
            .flat()
            .filter((cell) => cell.selected)
            .map((cell) => ({
              row: cell.row,
              col: cell.col,
            }))
        );
      }
    };

    return (
      <div
        className="grid-container"
        ref={gridRef}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
          gap: "0px",
          border: "0.025em solid #000",
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={isControl ? "control-cell" : "apply-cell"}
              onClick={() => handleSingleCellClick(rowIndex, colIndex)}
              style={{
                width: smallCanvasWidth,
                height: smallCanvasHeight,
                border: "0.05em solid #000",
                backgroundColor: cell.selected ? "blue" : "lightgrey",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "0.7em",
                color: cell.selected ? "white" : "black",
                cursor: "pointer",
              }}
            >
              {getWellLabel(rowIndex, colIndex)}
            </div>
          ))
        )}
      </div>
    );
  };

  // DragSelection for control grid
  const { DragSelection: ControlDragSelection } = useSelectionContainer({
    onSelectionChange: handleControlSelectionChange,
    onSelectionEnd: handleControlSelectionEnd,
    isEnabled: true,
    selectionProps: {
      style: {
        border: "0.2em solid yellow",
        backgroundColor: "rgba(75, 192, 192, 0.4)",
      },
    },
  });

  // DragSelection for apply grid
  const { DragSelection: ApplyDragSelection } = useSelectionContainer({
    onSelectionChange: handleApplySelectionChange,
    onSelectionEnd: handleApplySelectionEnd,
    isEnabled: true,
    selectionProps: {
      style: {
        border: "0.2em solid yellow",
        backgroundColor: "rgba(75, 192, 192, 0.4)",
      },
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          width: largeCanvasWidth + smallCanvasWidth || "80vw",
          maxWidth: "none",
          margin: 0,
          height: "100vh",
        },
      }} // Set width dynamically or default to 80vw
    >
      {/* <DialogTitle sx={{ display: "flex", justifyContent: "center" }}>
        Edit Control Subtraction Filter Parameters
      </DialogTitle> */}
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // justifyContent: "space-between",
          // height: "100vh",
          width: largeCanvasWidth + smallCanvasWidth || "80vw",
          padding: 0,
        }}
      >
        <div style={{ position: "relative", marginBottom: "0.25em" }}>
          <h4
            style={{
              margin: 0,
              marginBottom: "0.2em",
              marginTop: "0.2em",
              fontSize: "0.8em",
            }}
          >
            Select Control Wells
          </h4>
          <ControlDragSelection
            selectableTargets={".control-cell"}
            selectionProps={{ boundingElement: "control-grid" }}
          />
          <Grid
            grid={controlGrid}
            gridRef={controlGridRef}
            isControl={true}
            className="control-grid"
          />
        </div>

        <div style={{ position: "relative" }}>
          <h4 style={{ margin: 0, marginBottom: "0.2em", fontSize: "0.8em" }}>
            Select Apply Wells
          </h4>
          <ApplyDragSelection
            selectableTargets={".apply-cell"}
            selectionProps={{ boundingElement: "apply-grid" }}
          />
          <Grid
            grid={applyGrid}
            gridRef={applyGridRef}
            isControl={false}
            className="apply-grid"
          />
        </div>
      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          justifyContent: "space-between",
          // width: "100%",
        }}
      >
        <Button onClick={clearSelections}>Clear</Button>
        <div>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}>Confirm</Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};
