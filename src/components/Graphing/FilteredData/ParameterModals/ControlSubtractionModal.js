import React, { useState, useRef, useEffect } from "react";
import {
  useSelectionContainer,
  boxesIntersect,
} from "@air/react-drag-to-select";
import { Dialog, DialogContent, Button, Tooltip } from "@mui/material";
import NotInterestedIcon from "@mui/icons-material/NotInterested";

export const ControlSubtractionModal = ({
  open,
  onClose,
  initialControlWellArray = [],
  initialApplyWellArray = [],
  number_of_rows,
  number_of_columns,
  onSave,
  ...rest
}) => {
  const createGrid = (rows, cols, selectedWells = []) =>
    Array.from({ length: rows }, (_, row) =>
      Array.from({ length: cols }, (_, col) => {
        const isSelected = selectedWells.some(
          (w) => w.row === row && w.col === col
        );
        return { row, col, selected: isSelected };
      })
    );

  // Initialize grids from initial arrays
  const [controlGrid, setControlGrid] = useState(() =>
    createGrid(number_of_rows, number_of_columns, initialControlWellArray)
  );
  const [applyGrid, setApplyGrid] = useState(() =>
    createGrid(number_of_rows, number_of_columns, initialApplyWellArray)
  );

  // Reset grids when modal is opened or initial arrays change
  useEffect(() => {
    if (open) {
      setControlGrid(
        createGrid(number_of_rows, number_of_columns, initialControlWellArray)
      );
      setApplyGrid(
        createGrid(number_of_rows, number_of_columns, initialApplyWellArray)
      );
    }
  }, [
    open,
    number_of_rows,
    number_of_columns,
    initialControlWellArray,
    initialApplyWellArray,
  ]);

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

    const updateGrid = (grid, setGrid, isControlGrid) => {
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
    };

    updateGrid(controlGrid, setControlGrid, true);
    updateGrid(applyGrid, setApplyGrid, false);

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

  const clearAllSelections = () => {
    setControlGrid(
      controlGrid.map((row) =>
        row.map((cell) => ({ ...cell, selected: false }))
      )
    );
    setApplyGrid(
      applyGrid.map((row) => row.map((cell) => ({ ...cell, selected: false })))
    );
  };

  // Add a handler for individual cell clicks
  const handleCellClick = (rowIndex, colIndex, className) => {
    if (className === "control-grid") {
      const updatedGrid = controlGrid.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          rIdx === rowIndex && cIdx === colIndex
            ? { ...cell, selected: !cell.selected }
            : cell
        )
      );
      setControlGrid(updatedGrid);
    } else if (className === "apply-grid") {
      const updatedGrid = applyGrid.map((row, rIdx) =>
        row.map((cell, cIdx) =>
          rIdx === rowIndex && cIdx === colIndex
            ? { ...cell, selected: !cell.selected }
            : cell
        )
      );
      setApplyGrid(updatedGrid);
    }
  };

  // Handler for selecting/deselecting an entire row
  const handleRowButtonClick = (rowIndex, className) => {
    if (className === "control-grid") {
      const isAllSelected = controlGrid[rowIndex].every(
        (cell) => cell.selected
      );
      const updatedGrid = controlGrid.map((row, rIdx) =>
        row.map((cell) =>
          rIdx === rowIndex ? { ...cell, selected: !isAllSelected } : cell
        )
      );
      setControlGrid(updatedGrid);
    } else if (className === "apply-grid") {
      const isAllSelected = applyGrid[rowIndex].every((cell) => cell.selected);
      const updatedGrid = applyGrid.map((row, rIdx) =>
        row.map((cell) =>
          rIdx === rowIndex ? { ...cell, selected: !isAllSelected } : cell
        )
      );
      setApplyGrid(updatedGrid);
    }
  };

  // Handler for selecting/deselecting an entire column
  const handleColButtonClick = (colIndex, className) => {
    if (className === "control-grid") {
      const isAllSelected = controlGrid.every((row) => row[colIndex].selected);
      const updatedGrid = controlGrid.map((row) =>
        row.map((cell, cIdx) =>
          cIdx === colIndex ? { ...cell, selected: !isAllSelected } : cell
        )
      );
      setControlGrid(updatedGrid);
    } else if (className === "apply-grid") {
      const isAllSelected = applyGrid.every((row) => row[colIndex].selected);
      const updatedGrid = applyGrid.map((row) =>
        row.map((cell, cIdx) =>
          cIdx === colIndex ? { ...cell, selected: !isAllSelected } : cell
        )
      );
      setApplyGrid(updatedGrid);
    }
  };

  const Grid = ({ grid, gridRef, className }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Column of row buttons and clear button as a grid */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: `repeat(${grid.length + 1}, 1fr)`,
          // width: `calc(100% / ${number_of_columns})`,
          width: "auto",
          height: "100%",
        }}
      >
        {/* Top-left corner: clear button for this grid only */}
        <Tooltip
          title={
            className === "control-grid"
              ? "Clear/Select All Control Wells"
              : "Clear/Select All Apply Wells"
          }
          disableInteractive
        >
          <Button
            onClick={() => {
              if (className === "control-grid") {
                const allSelected = controlGrid
                  .flat()
                  .every((cell) => cell.selected);
                const updatedGrid = controlGrid.map((row) =>
                  row.map((cell) => ({ ...cell, selected: !allSelected }))
                );
                setControlGrid(updatedGrid);
              } else if (className === "apply-grid") {
                const allSelected = applyGrid
                  .flat()
                  .every((cell) => cell.selected);
                const updatedGrid = applyGrid.map((row) =>
                  row.map((cell) => ({ ...cell, selected: !allSelected }))
                );
                setApplyGrid(updatedGrid);
              }
            }}
            variant="outlined"
            style={{
              width: "100%",
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              margin: 0,
              border: "1px solid black",
              borderTop: "2px solid black",
              borderLeft: "2px solid black",
              borderRadius: "0.25em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              boxSizing: "border-box",
            }}
          >
            {/* <HighlightOffIcon sx={{ color: "red" }} fontSize="medium" /> */}
            *
          </Button>
        </Tooltip>
        {grid.map((_, rowIndex) => (
          <Button
            key={`row-btn-${rowIndex}`}
            variant="outlined"
            style={{
              width: "100%",
              height: "100%",
              margin: 0,
              padding: 0,
              border: "1px solid black",
              borderLeft: "2px solid black",
              borderRadius: "0.25em",
              boxSizing: "border-box",
            }}
            tabIndex={-1}
            onClick={() => handleRowButtonClick(rowIndex, className)}
          >
            {String.fromCharCode(65 + rowIndex)}
          </Button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          height: "100%",
        }}
      >
        {/* Row of column buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
            width: "100%",
            height: `calc(100% / ${grid.length + 1})`,
          }}
        >
          {Array.from({ length: number_of_columns }).map((_, colIndex) => (
            <Button
              key={`col-btn-${colIndex}`}
              variant="outlined"
              style={{
                width: "100%",
                height: "100%",
                margin: 0,
                padding: 0,
                border: "1px solid black",
                borderTop: "2px solid black",
                borderRadius: "0.25em",
                boxSizing: "border-box",
              }}
              tabIndex={-1}
              onClick={() => handleColButtonClick(colIndex, className)}
            >
              {colIndex + 1}
            </Button>
          ))}
        </div>
        {/* The grid itself */}
        <div
          ref={gridRef}
          className={className}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
            gridTemplateRows: `repeat(${grid.length}, 1fr)`,
            gap: 0,
            width: "100%",
            height: `calc(100% * ${grid.length} / (${grid.length} + 1))`,
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
                  width: "100%",
                  height: "100%",
                  backgroundColor: cell.selected ? "blue" : "lightgrey",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxSizing: "border-box",
                  border: "1px solid black",
                }}
                onClick={() => handleCellClick(rowIndex, colIndex, className)}
              >
                {String.fromCharCode(65 + rowIndex) + (colIndex + 1)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      sx={{
        "& .MuiDialog-paper": {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "90vw",
          width: "100%",
          margin: 0,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "90vh", // total height constraint
          overflow: "hidden",
          padding: "1em",
          boxSizing: "border-box",
        }}
      >
        <DragSelection selectableTargets={[".control-cell", ".apply-cell"]} />

        <h4
          style={{
            margin: 0,
            marginBottom: "0.25em",
            fontSize: "0.8em",
            display: "flex",
            alignItems: "center",
          }}
        >
          Select Control-Wells
        </h4>

        {/* Grid container for both control and apply wells */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            // gap: "1em",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflow: "auto" }}>
            <Grid
              grid={controlGrid}
              gridRef={controlGridRef}
              className="control-grid"
            />
          </div>

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
            Select Apply-Wells
          </h4>

          <div style={{ flex: 1, overflow: "auto" }}>
            <Grid
              grid={applyGrid}
              gridRef={applyGridRef}
              className="apply-grid"
            />
          </div>
        </div>
      </DialogContent>

      {/* Bottom Buttons */}
      <div
        className="bottom-buttons"
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0.5em 1em",
        }}
      >
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
            onClick={() => {
              const controlWells = controlGrid
                .flat()
                .filter((cell) => cell.selected);
              const applyWells = applyGrid
                .flat()
                .filter((cell) => cell.selected);
              onSave(controlWells, applyWells);
            }}
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
