import React, { useState, useRef, useEffect } from "react";
import {
  useSelectionContainer,
  Box,
  boxesIntersect,
} from "@air/react-drag-to-select";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
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
  Typography,
  Tooltip,
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
  // const handleControlSelectionChange = (box) => {
  //   const gridRect = controlGridRef.current.getBoundingClientRect(); // Get grid's bounding rectangle
  //   const adjustedBox = {
  //     left: box.left - gridRect.left,
  //     top: box.top - gridRect.top,
  //     width: box.width,
  //     height: box.height,
  //   };

  //   const newSelectedIndexes = [];
  //   controlSelectableItems.current.forEach((item, index) => {
  //     const { left, top, width, height } = item.getBoundingClientRect();
  //     const itemBox = {
  //       left: left - gridRect.left,
  //       top: top - gridRect.top,
  //       width,
  //       height,
  //     };

  //     if (boxesIntersect(adjustedBox, itemBox)) {
  //       newSelectedIndexes.push(index);
  //     }
  //   });
  //   selectedControlIndexes.current = newSelectedIndexes;
  // };

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
          gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`, // Set equal column distribution
          gridAutoRows: "1fr", // Rows should scale evenly with columns
          gap: "0px",
          justifyContent: "center", // Center the grid horizontally
          alignItems: "center", // Center grid cells vertically
          height: "calc(30vh - 2em)", // Each grid takes half the modal height
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={isControl ? "control-cell" : "apply-cell"}
              onClick={() => handleSingleCellClick(rowIndex, colIndex)}
              style={{
                height: "100%", // Take full height of grid cell
                aspectRatio: "1.6 / 1", // Ensure each cell's width is twice its height
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
  // const Grid = ({ grid, gridRef, isControl }) => {
  //   // Create the grid cells manually without using map

  //   const createGridCells = () => {
  //     const cells = [];
  //     for (let rowIndex = 0; rowIndex < number_of_rows; rowIndex++) {
  //       for (let colIndex = 0; colIndex < number_of_columns; colIndex++) {
  //         cells.push(
  //           <div
  //             key={`${rowIndex}-${colIndex}`}
  //             className={isControl ? "control-cell" : "apply-cell"}
  //             onClick={() => handleSingleCellClick(rowIndex, colIndex)}
  //             style={{
  //               height: "100%", // Take full height of grid cell
  //               aspectRatio: "1.6 / 1", // Ensure each cell's width is twice its height
  //               border: "0.05em solid #000",
  //               backgroundColor: grid[rowIndex][colIndex].selected
  //                 ? "blue"
  //                 : "lightgrey",
  //               display: "flex",
  //               justifyContent: "center",
  //               alignItems: "center",
  //               fontSize: "0.7em",
  //               color: grid[rowIndex][colIndex].selected ? "white" : "black",
  //               cursor: "pointer",
  //             }}
  //           >
  //             {getWellLabel(rowIndex, colIndex)}
  //           </div>
  //         );
  //       }
  //     }
  //     return cells;
  //   };

  //   return (
  //     <div
  //       className="grid-container"
  //       ref={gridRef}
  //       style={{
  //         display: "grid",
  //         gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
  //         gridAutoRows: "1fr",
  //         gap: "0px",
  //         justifyContent: "center",
  //         alignItems: "center",
  //         height: "calc(30vh - 2em)", // Each grid takes half the modal height
  //       }}
  //     >
  //       {createGridCells()} {/* Render cells manually */}
  //     </div>
  //   );
  // };

  // DragSelection for control grid
  // const { DragSelection: ControlDragSelection } = useSelectionContainer({
  //   onSelectionChange: handleControlSelectionChange,
  //   onSelectionEnd: handleControlSelectionEnd,
  //   isEnabled: true,
  //   selectionProps: {
  //     style: {
  //       border: "0.2em solid yellow",
  //       backgroundColor: "rgba(75, 192, 192, 0.4)",
  //     },
  //   },
  // });

  // // DragSelection for apply grid
  // const { DragSelection: ApplyDragSelection } = useSelectionContainer({
  //   onSelectionChange: handleApplySelectionChange,
  //   onSelectionEnd: handleApplySelectionEnd,
  //   isEnabled: true,
  //   selectionProps: {
  //     style: {
  //       border: "0.2em solid yellow",
  //       backgroundColor: "rgba(75, 192, 192, 0.4)",
  //     },
  //   },
  // });

  // DragSelection for control grid
  const { DragSelection: ControlDragSelection } = useSelectionContainer({
    onSelectionChange: handleControlSelectionChange,
    onSelectionEnd: handleControlSelectionEnd,
    isEnabled: true,
    selectionProps: {
      boundingElement: controlGridRef.current, // Ensure it's relative to the grid container
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
      boundingElement: applyGridRef.current, // Ensure it's relative to the grid container
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
          width: "50vw",
          maxWidth: "none",
          margin: 0,
          // height: "auto",
          height: "80vh",
        },
      }} // Set width dynamically or default to 80vw
    >
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column", // Stack items vertically
          alignItems: "center", // Center items horizontally
          // justifyContent: "center",
          gap: "2em", // Add consistent spacing between grids
          padding: 0,
          paddingTop: "1.5em",
          height: "100%", // Allow content to take full height
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Center content horizontally
            marginBottom: "1em",
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: "0.5em",
              fontSize: "0.8em",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Tooltip title="Clear Selected Control Wells" disableInteractive>
              <Button onClick={clearControlWellArray}>
                <HighlightOffIcon
                  sx={{
                    "&:hover": {
                      color: "red",
                    },
                  }}
                />
              </Button>
            </Tooltip>
            Select Control-Wells
            <HighlightOffIcon
              sx={{
                color: "transparent",
              }}
            />
          </h4>
          <ControlDragSelection
            selectableTargets={".control-cell"}
            // selectionProps={{ boundingElement: "control-grid" }}
            // selectionProps={{ boundingElement: "control-grid" }}
          />
          <Grid
            grid={controlGrid}
            gridRef={controlGridRef}
            isControl={true}
            className="control-grid"
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Center content horizontally
            marginTop: "1em",
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: "0.5em",
              fontSize: "0.8em",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Tooltip title="Clear Selected Apply Wells" disableInteractive>
              <Button onClick={clearApplyWellArray}>
                <HighlightOffIcon
                  sx={{
                    "&:hover": {
                      color: "red",
                    },
                  }}
                />
              </Button>
            </Tooltip>
            Select Apply-Wells
            <HighlightOffIcon
              sx={{
                color: "transparent",
              }}
            />
          </h4>
          <ApplyDragSelection
            selectableTargets={".apply-cell"}
            // selectionProps={{ boundingElement: "apply-grid" }}
            // selectionProps={{ boundingElement: "apply-grid" }}
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
        <Tooltip title="Clear All Well Selections" disableInteractive>
          <Button
            variant="text"
            onClick={clearSelections}
            sx={{
              "&:hover": {
                color: "red",
              },
            }}
          >
            <NotInterestedIcon />
            Clear All
          </Button>
        </Tooltip>
        <div style={{ display: "flex", flexDirection: "row" }}>
          <Button
            variant="outlined"
            onClick={onClose}
            style={{ paddingRight: "0.5em", marginRight: "0.25em" }}
          >
            <CloseIcon />
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSave}
            style={{ paddingRight: "0.5em" }}
          >
            <CheckIcon />
            Confirm
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
};
