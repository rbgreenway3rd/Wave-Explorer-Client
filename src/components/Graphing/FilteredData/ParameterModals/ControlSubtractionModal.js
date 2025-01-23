import React, { useState, useRef, useEffect } from "react";
import {
  useSelectionContainer,
  boxesIntersect,
} from "@air/react-drag-to-select";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from "@mui/material";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import { autoType } from "d3";

export const ControlSubtractionModal = ({
  open,
  onClose,
  setControlWellArray,
  setApplyWellArray,
  number_of_rows,
  number_of_columns,
  onSave,
}) => {
  const createGrid = (rows, cols) =>
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => ({ row, col, selected: false }))
    );

  const [controlGrid, setControlGrid] = useState(
    createGrid(number_of_rows, number_of_columns)
  );
  const [applyGrid, setApplyGrid] = useState(
    createGrid(number_of_rows, number_of_columns)
  );

  const controlGridRef = useRef(null);
  const applyGridRef = useRef(null);
  const controlItemsRef = useRef([]);
  const applyItemsRef = useRef([]);
  const selectedIndexesRef = useRef([]);
  const controlTargetRef = useRef(false);
  const applyTargetRef = useRef(false);

  useEffect(() => {
    if (open) {
      controlItemsRef.current = Array.from(
        document.querySelectorAll(".control-cell")
      );
      applyItemsRef.current = Array.from(
        document.querySelectorAll(".apply-cell")
      );
    }
  }, [open, controlGrid, applyGrid]);

  const handleSelectionChange = (box) => {
    const newSelectedIndexes = [];
    const targetItems = controlTargetRef.current
      ? controlItemsRef.current
      : applyItemsRef.current;

    targetItems.forEach((item, index) => {
      const { left, top, width, height } = item.getBoundingClientRect();
      if (boxesIntersect(box, { left, top, width, height })) {
        newSelectedIndexes.push(index);
      }
    });
    selectedIndexesRef.current = newSelectedIndexes;
  };

  const handleSelectionEnd = () => {
    if (!controlTargetRef.current && !applyTargetRef.current) return;

    const updateGrid = (grid, setGrid, setArray, isControlGrid) => {
      const updatedGrid = grid.map((row) =>
        row.map((cell) => {
          const index = cell.row * number_of_columns + cell.col;
          return {
            ...cell,
            selected:
              ((isControlGrid && controlTargetRef.current) ||
                (!isControlGrid && applyTargetRef.current)) &&
              selectedIndexesRef.current.includes(index)
                ? !cell.selected
                : cell.selected,
          };
        })
      );
      setGrid(updatedGrid);
      setArray(updatedGrid.flat().filter((cell) => cell.selected));
    };

    updateGrid(controlGrid, setControlGrid, setControlWellArray, true);
    updateGrid(applyGrid, setApplyGrid, setApplyWellArray, false);

    controlTargetRef.current = false;
    applyTargetRef.current = false;
  };

  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    onSelectionEnd: handleSelectionEnd,
    isEnabled: true,
    selectionProps: {
      style: {
        border: "0.2em solid yellow",
        backgroundColor: "rgba(75, 192, 192, 0.4)",
      },
    },
    onSelectionStart: (event) => {
      controlTargetRef.current = controlGridRef.current?.contains(event.target);
      applyTargetRef.current = applyGridRef.current?.contains(event.target);
    },
  });

  const clearControlWellArray = () => {
    setControlWellArray([]);
    setControlGrid(
      controlGrid.map((row) =>
        row.map((cell) => ({ ...cell, selected: false }))
      )
    );
  };

  const clearApplyWellArray = () => {
    setApplyWellArray([]);
    setApplyGrid(
      applyGrid.map((row) => row.map((cell) => ({ ...cell, selected: false })))
    );
  };

  const clearAllSelections = () => {
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

  const Grid = ({ grid, gridRef, className }) => (
    <div
      ref={gridRef}
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
        // gap: "2px",
        // gap: "none",
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={
              className === "control-grid" ? "control-cell" : "apply-cell"
            }
            style={{
              width: "4em",
              height: "auto",
              aspectRatio: "1.6 / 1",
              border: "1px solid black",
              backgroundColor: cell.selected ? "blue" : "lightgrey",
              gap: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {String.fromCharCode(65 + rowIndex) + (colIndex + 1)}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          display: "flex",
          justifyContent: "center",
          maxWidth: "none",
          margin: 0,
          height: "auto",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogContent>
        <DragSelection selectableTargets={[".control-cell", ".apply-cell"]} />
        {/* <h4>Select Control-Wells</h4> */}
        <h4
          style={{
            margin: 0,
            marginBottom: "0.25em",
            fontSize: "0.8em",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Tooltip title="Clear Selected Control Wells" disableInteractive>
            <Button
              onClick={clearControlWellArray}
              style={{ minWidth: 0, marginRight: "0.25em" }}
            >
              <HighlightOffIcon
                sx={{
                  color: "red",
                }}
              />
            </Button>
            Select Control-Wells
            <HighlightOffIcon
              sx={{
                color: "transparent",
              }}
            />
          </Tooltip>
        </h4>
        <Grid
          grid={controlGrid}
          gridRef={controlGridRef}
          className="control-grid"
        />
        {/* <h4>Select Apply-Wells</h4> */}
        <h4
          style={{
            margin: 0,
            marginBottom: "0.5em",
            marginTop: "0.5em",
            fontSize: "0.8em",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Tooltip title="Clear Selected Apply Wells" disableInteractive>
            <Button
              onClick={clearApplyWellArray}
              style={{ minWidth: 0, marginRight: "0.25em" }}
            >
              <HighlightOffIcon
                sx={{
                  color: "red",
                }}
              />
            </Button>
            Select Apply-Wells
            <HighlightOffIcon
              sx={{
                color: "transparent",
              }}
            />
          </Tooltip>
        </h4>
        <Grid grid={applyGrid} gridRef={applyGridRef} className="apply-grid" />
      </DialogContent>
      <div
        className="bottom-buttons"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        {/* <DialogActions> */}
        <div style={{}}>
          <Tooltip title="Clear All Well Selections" disableInteractive>
            <Button
              variant="text"
              onClick={clearAllSelections}
              sx={{
                color: "red",
                "&:hover": {
                  background: "lightgrey",
                },
                padding: "0.25em",
              }}
            >
              <NotInterestedIcon />
              Clear All
            </Button>
          </Tooltip>
        </div>
        {/* </DialogActions> */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            onClick={onClose}
            sx={{
              "&:hover": {
                background: "lightgrey",
              },
              padding: "0.25em",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            sx={{
              "&:hover": {
                background: "lightgrey",
              },
              padding: "0.25em",
            }}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
