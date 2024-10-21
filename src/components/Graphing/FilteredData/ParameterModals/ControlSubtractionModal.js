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

  const Grid = ({ grid, gridRef, isControl }) => (
    <div
      className="grid-container"
      ref={gridRef}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
        gap: "2px",
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={isControl ? "control-cell" : "apply-cell"}
            style={{
              width: "20px",
              height: "20px",
              border: "1px solid #000",
              backgroundColor: cell.selected ? "blue" : "transparent",
            }}
          />
        ))
      )}
    </div>
  );

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
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Edit Control Subtraction Filter Parameters</DialogTitle>
      <DialogContent>
        <h4>Select Control Wells</h4>
        <div style={{ position: "relative" }}>
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

        <h4>Select Apply Wells</h4>
        <div style={{ position: "relative" }}>
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

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};
