// import React, { useState, useRef, useEffect } from "react";
// import {
//   useSelectionContainer,
//   boxesIntersect,
// } from "@air/react-drag-to-select";
// import NotInterestedIcon from "@mui/icons-material/NotInterested";
// import HighlightOffIcon from "@mui/icons-material/HighlightOff";
// import CheckIcon from "@mui/icons-material/Check";
// import CloseIcon from "@mui/icons-material/Close";
// import {
//   Dialog,
//   DialogContent,
//   DialogActions,
//   Button,
//   Tooltip,
// } from "@mui/material";

// export const ControlSubtractionModal = ({
//   open,
//   onClose,
//   setControlWellArray,
//   setApplyWellArray,
//   number_of_rows,
//   number_of_columns,
//   onSave,
// }) => {
//   const createGrid = (rows, cols) => {
//     let grid = [];
//     for (let i = 0; i < rows; i++) {
//       let row = [];
//       for (let j = 0; j < cols; j++) {
//         row.push({ row: i, col: j, selected: false });
//       }
//       grid.push(row);
//     }
//     return grid;
//   };

//   const [controlGrid, setControlGrid] = useState(
//     createGrid(number_of_rows, number_of_columns)
//   );
//   const [applyGrid, setApplyGrid] = useState(
//     createGrid(number_of_rows, number_of_columns)
//   );

//   // Refs to store grid cells for selection
//   const controlGridRef = useRef(null);
//   const applyGridRef = useRef(null);

//   const controlSelectableItems = useRef([]);
//   const applySelectableItems = useRef([]);

//   const selectedControlIndexes = useRef([]);
//   const selectedApplyIndexes = useRef([]);

//   const getWellLabel = (row, col) => {
//     return row < 26
//       ? String.fromCharCode(row + 65) + String(col + 1).padStart(2, "0")
//       : "A" + String.fromCharCode(row + 40) + String(col + 1).padStart(2, "0");
//   };

//   // Populate controlSelectableItems.current when the modal is opened
//   useEffect(() => {
//     if (open) {
//       if (controlGridRef.current) {
//         controlSelectableItems.current = Array.from(
//           controlGridRef.current.querySelectorAll(".control-cell")
//         );
//       }
//       if (applyGridRef.current) {
//         applySelectableItems.current = Array.from(
//           applyGridRef.current.querySelectorAll(".apply-cell")
//         );
//       }
//     }
//   }, [open, controlGrid, applyGrid]);

//   const handleControlSelectionChange = (box) => {
//     console.log("controlSelectionChange");
//     const newSelectedIndexes = [];
//     controlSelectableItems.current.forEach((item, index) => {
//       const { left, top, width, height } = item.getBoundingClientRect();
//       const itemBox = { left, top, width, height };
//       if (boxesIntersect(box, itemBox)) {
//         newSelectedIndexes.push(index);
//       }
//     });
//     selectedControlIndexes.current = newSelectedIndexes; // Store selected indexes
//   };

//   const handleControlSelectionEnd = () => {
//     const updatedControlGrid = controlGrid.map((row, rowIndex) =>
//       row.map((cell, colIndex) => {
//         const index = rowIndex * number_of_columns + colIndex;
//         if (selectedControlIndexes.current.includes(index)) {
//           return { ...cell, selected: !cell.selected };
//         }
//         return cell;
//       })
//     );
//     setControlGrid(updatedControlGrid);

//     const selectedWells = updatedControlGrid
//       .flat()
//       .filter((cell) => cell.selected)
//       .map((cell) => ({ row: cell.row, col: cell.col }));
//     setControlWellArray(selectedWells);
//     // setIsSelectingControl(false);
//   };

//   const handleApplySelectionChange = (box) => {
//     console.log("applySelectionChange");
//     const newSelectedIndexes = [];
//     applySelectableItems.current.forEach((item, index) => {
//       const { left, top, width, height } = item.getBoundingClientRect();
//       const itemBox = { left, top, width, height };
//       if (boxesIntersect(box, itemBox)) {
//         newSelectedIndexes.push(index);
//       }
//     });
//     selectedApplyIndexes.current = newSelectedIndexes; // Store selected indexes
//   };

//   const handleApplySelectionEnd = () => {
//     const updatedApplyGrid = applyGrid.map((row, rowIndex) =>
//       row.map((cell, colIndex) => {
//         const index = rowIndex * number_of_columns + colIndex;
//         if (selectedApplyIndexes.current.includes(index)) {
//           return { ...cell, selected: !cell.selected };
//         }
//         return cell;
//       })
//     );
//     setApplyGrid(updatedApplyGrid);

//     const selectedWells = updatedApplyGrid
//       .flat()
//       .filter((cell) => cell.selected)
//       .map((cell) => ({ row: cell.row, col: cell.col }));
//     setApplyWellArray(selectedWells);
//     // setIsSelectingApply(false);
//   };

//   const clearControlWellArray = () => {
//     setControlWellArray([]);
//     setControlGrid(
//       controlGrid.map((row) =>
//         row.map((cell) => ({ ...cell, selected: false }))
//       )
//     );
//   };

//   const clearApplyWellArray = () => {
//     setApplyWellArray([]);
//     setApplyGrid(
//       applyGrid.map((row) => row.map((cell) => ({ ...cell, selected: false })))
//     );
//   };

//   const clearSelections = () => {
//     // Reset selected wells arrays
//     setControlWellArray([]);
//     setApplyWellArray([]);

//     // Reset the selected state in both grids
//     setControlGrid(
//       controlGrid.map((row) =>
//         row.map((cell) => ({ ...cell, selected: false }))
//       )
//     );
//     setApplyGrid(
//       applyGrid.map((row) => row.map((cell) => ({ ...cell, selected: false })))
//     );
//   };

//   const Grid = ({ grid, gridRef, isControl }) => {
//     // Toggle selection for a single cell on click
//     const handleSingleCellClick = (rowIndex, colIndex) => {
//       const updatedGrid = grid.map((row, rIdx) =>
//         row.map((cell, cIdx) => {
//           if (rIdx === rowIndex && cIdx === colIndex) {
//             return { ...cell, selected: !cell.selected }; // Toggle selection
//           }
//           return cell;
//         })
//       );

//       // Update the appropriate grid state
//       if (isControl) {
//         setControlGrid(updatedGrid);
//         setControlWellArray(
//           updatedGrid
//             .flat()
//             .filter((cell) => cell.selected)
//             .map((cell) => ({
//               row: cell.row,
//               col: cell.col,
//             }))
//         );
//       } else {
//         setApplyGrid(updatedGrid);
//         setApplyWellArray(
//           updatedGrid
//             .flat()
//             .filter((cell) => cell.selected)
//             .map((cell) => ({
//               row: cell.row,
//               col: cell.col,
//             }))
//         );
//       }
//     };

//     return (
//       <div
//         className="grid-container"
//         ref={gridRef}
//         style={{
//           display: "grid",
//           gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`, // Set equal column distribution
//           gridAutoRows: "1fr", // Rows should scale evenly with columns
//           gap: "0px",
//           justifyContent: "center", // Center the grid horizontally
//           alignItems: "center", // Center grid cells vertically
//           height: "calc(30vh - 2em)", // Each grid takes half the modal height
//         }}
//       >
//         {grid.map((row, rowIndex) =>
//           row.map((cell, colIndex) => (
//             <div
//               key={`${rowIndex}-${colIndex}`}
//               className={isControl ? "control-cell" : "apply-cell"}
//               onClick={() => handleSingleCellClick(rowIndex, colIndex)}
//               style={{
//                 height: "100%", // Take full height of grid cell
//                 aspectRatio: "1.6 / 1",
//                 border: "0.05em solid #000",
//                 backgroundColor: cell.selected ? "blue" : "lightgrey",
//                 display: "flex",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 fontSize: "0.7em",
//                 color: cell.selected ? "white" : "black",
//                 cursor: "pointer",
//               }}
//             >
//               {getWellLabel(rowIndex, colIndex)}
//             </div>
//           ))
//         )}
//       </div>
//     );
//   };

//   const { DragSelection: ControlDragSelection } = useSelectionContainer({
//     onSelectionChange: handleControlSelectionChange,
//     onSelectionEnd: handleControlSelectionEnd,
//     isEnabled: true, // Always enabled, but scoped via boundingElement
//     selectionProps: {
//       boundingElement: controlGridRef.current, // Ensures selection happens inside the control grid only
//       style: {
//         border: "0.2em solid yellow",
//         backgroundColor: "rgba(75, 192, 192, 0.4)",
//       },
//     },
//   });

//   const { DragSelection: ApplyDragSelection } = useSelectionContainer({
//     onSelectionChange: handleApplySelectionChange,
//     onSelectionEnd: handleApplySelectionEnd,
//     isEnabled: true, // Always enabled, but scoped via boundingElement
//     selectionProps: {
//       boundingElement: applyGridRef.current, // Ensures selection happens inside the apply grid only
//       style: {
//         border: "0.2em solid yellow",
//         backgroundColor: "rgba(75, 192, 192, 0.4)",
//       },
//     },
//   });

//   return (
//     <Dialog
//       open={open}
//       onClose={onClose}
//       sx={{
//         "& .MuiDialog-paper": {
//           width: "50vw",
//           maxWidth: "none",
//           margin: 0,
//           // height: "auto",
//           height: "80vh",
//         },
//       }} // Set width dynamically or default to 80vw
//     >
//       <DialogContent
//         sx={{
//           display: "flex",
//           flexDirection: "column", // Stack items vertically
//           alignItems: "center", // Center items horizontally
//           // justifyContent: "center",
//           gap: "2em", // Add consistent spacing between grids
//           padding: 0,
//           paddingTop: "1.5em",
//           height: "100%", // Allow content to take full height
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center", // Center content horizontally
//             marginBottom: "1em",
//           }}
//         >
//           <h4
//             style={{
//               margin: 0,
//               marginBottom: "0.5em",
//               fontSize: "0.8em",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <Tooltip title="Clear Selected Control Wells" disableInteractive>
//               <Button onClick={clearControlWellArray}>
//                 <HighlightOffIcon
//                   sx={{
//                     "&:hover": {
//                       color: "red",
//                     },
//                   }}
//                 />
//               </Button>
//             </Tooltip>
//             Select Control-Wells
//             <HighlightOffIcon
//               sx={{
//                 color: "transparent",
//               }}
//             />
//           </h4>
//           <ControlDragSelection selectableTargets={".control-cell"} />
//           {/* <Grid
//             grid={controlGrid}
//             gridRef={controlGridRef}
//             isControl={true}
//             className="control-grid"
//           /> */}
//           <Grid
//             grid={controlGrid}
//             gridRef={controlGridRef} // Ensure ref is assigned
//             isControl={true}
//             className="control-grid"
//           />
//         </div>

//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             alignItems: "center", // Center content horizontally
//             marginTop: "1em",
//           }}
//         >
//           <h4
//             style={{
//               margin: 0,
//               marginBottom: "0.5em",
//               fontSize: "0.8em",
//               display: "flex",
//               alignItems: "center",
//             }}
//           >
//             <Tooltip title="Clear Selected Apply Wells" disableInteractive>
//               <Button onClick={clearApplyWellArray}>
//                 <HighlightOffIcon
//                   sx={{
//                     "&:hover": {
//                       color: "red",
//                     },
//                   }}
//                 />
//               </Button>
//             </Tooltip>
//             Select Apply-Wells
//             <HighlightOffIcon
//               sx={{
//                 color: "transparent",
//               }}
//             />
//           </h4>
//           <ApplyDragSelection selectableTargets={".apply-cell"} />
//           {/* <Grid
//             grid={applyGrid}
//             gridRef={applyGridRef}
//             isControl={false}
//             className="apply-grid"
//           /> */}
//           <Grid
//             grid={applyGrid}
//             gridRef={applyGridRef} // Ensure ref is assigned
//             isControl={false}
//             className="apply-grid"
//           />
//         </div>
//       </DialogContent>

//       <DialogActions
//         sx={{
//           display: "flex",
//           justifyContent: "space-between",
//         }}
//       >
//         <Tooltip title="Clear All Well Selections" disableInteractive>
//           <Button
//             variant="text"
//             onClick={clearSelections}
//             sx={{
//               "&:hover": {
//                 color: "red",
//               },
//             }}
//           >
//             <NotInterestedIcon />
//             Clear All
//           </Button>
//         </Tooltip>
//         <div style={{ display: "flex", flexDirection: "row" }}>
//           <Button
//             variant="outlined"
//             onClick={onClose}
//             style={{ paddingRight: "0.5em", marginRight: "0.25em" }}
//           >
//             <CloseIcon />
//             Cancel
//           </Button>
//           <Button
//             variant="contained"
//             onClick={onSave}
//             style={{ paddingRight: "0.5em" }}
//           >
//             <CheckIcon />
//             Confirm
//           </Button>
//         </div>
//       </DialogActions>
//     </Dialog>
//   );
// };

// import React, { useState, useRef, useEffect } from "react";
// import {
//   useSelectionContainer,
//   boxesIntersect,
// } from "@air/react-drag-to-select";
// import {
//   Dialog,
//   DialogContent,
//   DialogActions,
//   Button,
//   Tooltip,
// } from "@mui/material";

// export const ControlSubtractionModal = ({
//   open,
//   onClose,
//   setControlWellArray,
//   setApplyWellArray,
//   number_of_rows,
//   number_of_columns,
//   onSave,
// }) => {
//   const createGrid = (rows, cols) =>
//     Array.from({ length: rows }, (_, row) =>
//       Array.from({ length: cols }, (_, col) => ({ row, col, selected: false }))
//     );
//   const [controlGrid, setControlGrid] = useState(
//     createGrid(number_of_rows, number_of_columns)
//   );
//   const [applyGrid, setApplyGrid] = useState(
//     createGrid(number_of_rows, number_of_columns)
//   );
//   const controlGridRef = useRef(null);
//   const applyGridRef = useRef(null);
//   const selectableItemsRef = useRef([]);
//   const selectedIndexesRef = useRef([]);
//   const selectionTargetRef = useRef(null); // Tracks whether selection started in control or apply grid
//   const controlTargetRef = useRef(null);
//   const applyTargetRef = useRef(null);

//   useEffect(() => {
//     if (open) {
//       selectableItemsRef.current = Array.from(
//         document.querySelectorAll(".apply-cell, .control-cell")
//         // controlCells & applyCells
//       );
//     }
//   }, [open, controlGrid, applyGrid]);

//   const handleSelectionChange = (box) => {
//     const newSelectedIndexes = [];
//     // Handle selection for control grid
//     if (selectionTargetRef.current === "control") {
//       selectableItemsRef.current.forEach((item, index) => {
//         const { left, top, width, height } = item.getBoundingClientRect();
//         if (boxesIntersect(box, { left, top, width, height })) {
//           newSelectedIndexes.push(index);
//         }
//       });
//       selectedIndexesRef.current = newSelectedIndexes;
//     }
//     // Handle selection for apply grid
//     if (selectionTargetRef.current === "apply") {
//       selectableItemsRef.current.forEach((item, index) => {
//         const { left, top, width, height } = item.getBoundingClientRect();
//         if (boxesIntersect(box, { left, top, width, height })) {
//           newSelectedIndexes.push(index);
//         }
//       });
//       selectedIndexesRef.current = newSelectedIndexes;
//     }
//   };

//   const handleSelectionEnd = () => {
//     if (!selectionTargetRef.current) return;
//     const updateGrid = (grid, setGrid, setArray, gridClass) => {
//       const updatedGrid = grid.map((row) =>
//         row.map((cell) => {
//           const index = cell.row * number_of_columns + cell.col;
//           return {
//             ...cell,
//             selected:
//               selectionTargetRef.current === gridClass &&
//               selectedIndexesRef.current.includes(index)
//                 ? !cell.selected
//                 : cell.selected,
//           };
//         })
//       );
//       setGrid(updatedGrid);
//       setArray(updatedGrid.flat().filter((cell) => cell.selected));
//     };
//     // Update control grid
//     if (selectionTargetRef.current === "control") {
//       updateGrid(controlGrid, setControlGrid, setControlWellArray, "control");
//     }
//     // Update apply grid
//     else {
//       updateGrid(applyGrid, setApplyGrid, setApplyWellArray, "apply");
//     }
//   };

//   const { DragSelection } = useSelectionContainer({
//     onSelectionChange: handleSelectionChange,
//     onSelectionEnd: handleSelectionEnd,
//     isEnabled: true,
//     selectionProps: {
//       style: {
//         border: "0.2em solid yellow",
//         backgroundColor: "rgba(75, 192, 192, 0.4)",
//       },
//     },
//     onSelectionStart: (event) => {
//       if (applyGridRef.current?.contains(event.target)) {
//         selectionTargetRef.current = "apply";
//       } else if (controlGridRef.current?.contains(event.target)) {
//         selectionTargetRef.current = "control";
//       }
//     },
//   });

//   const Grid = ({ grid, gridRef, className }) => (
//     <div
//       ref={gridRef}
//       className={className}
//       style={{
//         display: "grid",
//         gridTemplateColumns: `repeat(${number_of_columns}, 1fr)`,
//         gap: "2px",
//       }}
//     >
//       {grid.map((row, rowIndex) =>
//         row.map((cell, colIndex) => (
//           <div
//             key={`${rowIndex}-${colIndex}`}
//             className={
//               className === "control-grid" ? "control-cell" : "apply-cell"
//             }
//             style={{
//               width: "30px",
//               height: "30px",
//               border: "1px solid black",
//               backgroundColor: cell.selected ? "blue" : "lightgrey",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               cursor: "pointer",
//             }}
//           >
//             {String.fromCharCode(65 + rowIndex) + (colIndex + 1)}
//           </div>
//         ))
//       )}
//     </div>
//   );

//   return (
//     <Dialog open={open} onClose={onClose}>
//       <DialogContent>
//         <DragSelection selectableTargets={[".control-cell", ".apply-cell"]} />
//         <h4>Select Control-Wells</h4>
//         <Grid
//           grid={controlGrid}
//           gridRef={controlGridRef}
//           className="control-grid"
//         />
//         <h4>Select Apply-Wells</h4>
//         <Grid grid={applyGrid} gridRef={applyGridRef} className="apply-grid" />
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button onClick={onSave}>Confirm</Button>
//       </DialogActions>
//     </Dialog>
//   );
// };
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
              // height: "80%",
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
          // width: "50vw",
          // width: "auto",
          maxWidth: "none",
          margin: 0,
          // height: "80vh",
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
            marginBottom: "0.5em",
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
          </Tooltip>
          Select Control-Wells
          <HighlightOffIcon
            sx={{
              color: "transparent",
            }}
          />
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
          </Tooltip>
          Select Apply-Wells
          <HighlightOffIcon
            sx={{
              color: "transparent",
            }}
          />
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
