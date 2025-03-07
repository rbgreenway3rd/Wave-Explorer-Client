import React, {
  memo,
  useMemo,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { DataContext } from "../../../providers/DataProvider";
import { MiniGraphOptions } from "../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import "chartjs-adapter-date-fns"; // date-fns adapter for Chart.js necessary for decimation
import { Line } from "react-chartjs-2";
import {
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../../../utilities/Handlers";
import {
  useSelectionContainer,
  Box,
  boxesIntersect,
} from "@air/react-drag-to-select";
import DotWaveLoader from "../../../assets/animations/DotWaveLoader";
import * as d3 from "d3";

export const MiniGraphGrid = ({
  analysisData,
  extractedIndicatorTimes,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  columnLabels,
  rowLabels,
}) => {
  const {
    project,
    wellArrays,
    showFiltered,
    selectedWellArray,
    handleSelectWell,
    handleDeselectWell,
    handleClearSelectedWells,
    // rowLabels,
    // columnLabels,
  } = useContext(DataContext);

  // // State to track if rendering is complete
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);

  const numRows = rowLabels.length;
  const numColumns = columnLabels.length;

  // State for grid and cell dimensions, accounting for button areas
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth / 2.3);
  const [availableHeight, setAvailableHeight] = useState(
    window.innerHeight / 2.3
  );
  // Fixed button dimensions
  const buttonHeight = 40; // Height of row buttons
  const buttonWidth = 80; // Width of column buttons

  // Parent container dimensions (e.g., from the parent layout or window)
  const parentWidth = availableWidth - buttonWidth;
  const parentHeight = availableHeight - buttonHeight;

  // Dynamically calculate grid dimensions
  const gridWidth = availableWidth - buttonWidth / 4; // Deduct column button area
  const gridHeight = availableHeight - buttonHeight / 2; // Deduct row + "all" button area

  const cellWidth = gridWidth / numColumns;
  const cellHeight = gridHeight / numRows;
  // Dynamically calculate available grid space
  const availableGridWidth = parentWidth - buttonWidth; // Remaining width for the grid
  const availableGridHeight = parentHeight - buttonHeight; // Remaining height for the grid

  // Update available dimensions on window resize
  const handleResize = () => {
    setAvailableWidth(window.innerWidth / 2.3);
    setAvailableHeight(window.innerHeight / 2.3);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to listen to window resize events

  useEffect(() => {
    if (wellArrays.length > 0) {
      // Introduce a small delay before setting isRenderingComplete
      const timeout = setTimeout(() => {
        setIsRenderingComplete(true);
      }, 1500); // keep loader for at least 1.5 sec

      return () => clearTimeout(timeout); // Cleanup timeout on component unmount
    }
  }, [wellArrays]);

  // Refs used for the drag-to-select box
  const gridRef = useRef(null); // Ref to the grid container
  const selectableItems = useRef([]); // Store selectable items for drag selection
  const selectedIndexes = useRef([]); // Store selected indexes during drag

  // handles y-scales for proper rendering
  const yValues = wellArrays.flatMap((well) =>
    showFiltered
      ? well.indicators?.filteredData?.map((point) => point.y) || []
      : well.indicators?.rawData?.map((point) => point.y) || []
  );

  const handleWellClick = (wellId) => {
    const isSelected = selectedWellArray.some((well) => well.id === wellId);

    if (isSelected) {
      handleDeselectWell(wellId); // Deselect by ID if already selected
    } else {
      const well = wellArrays.find((well) => well.id === wellId);
      handleSelectWell(well); // Select by finding the well in wellArrays
    }
  };

  // Handle selection change to track selected wells during drag
  const handleSelectionChange = (box) => {
    console.log("handle selection change");
    // Adjust box coordinates for scrolling
    const scrollAwareBox = {
      ...box,
      top: box.top + window.scrollY, // Adjust for vertical scroll
      left: box.left + window.scrollX, // Adjust for horizontal scroll
    };

    const newSelectedIndexes = []; // Array to store new selected indexes

    // Check which selectable items intersect with the selection box
    selectableItems.current.forEach((item) => {
      if (boxesIntersect(scrollAwareBox, item)) {
        newSelectedIndexes.push(item.index); // Add the index of the intersecting item
      }
    });

    // Store the newly selected indexes in the ref for later use
    selectedIndexes.current = newSelectedIndexes;
  };

  // Handle selection end to finalize selected wells
  const handleSelectionEnd = () => {
    const wellsToSelect = []; // Array to keep track of wells to select
    const wellsToDeselect = []; // Array to keep track of wells to deselect

    // Loop through selected indexes to finalize selections
    selectedIndexes.current.forEach((index) => {
      const well = wellArrays[index]; // Get the well using the index
      if (well) {
        if (!selectedWellArray.includes(well)) {
          wellsToSelect.push(well); // Mark well to select if not already selected
        } else {
          wellsToDeselect.push(well); // Mark well to deselect if already selected
        }
      }
    });

    // Update selectedWellArray based on the wellsToSelect and wellsToDeselect
    wellsToSelect.forEach((well) => handleSelectWell(well)); // Select the wells
    wellsToDeselect.forEach((well) => handleDeselectWell(well.id)); // Deselect the wells

    // Clear the selectedIndexes ref for future selections
    selectedIndexes.current = [];
  };

  // NEW
  useEffect(() => {
    console.log("Selectable items:", selectableItems.current);
  }, [selectableItems]);

  const updateSelectableItems = () => {
    selectableItems.current = [];
    if (gridRef.current) {
      Array.from(gridRef.current.children).forEach((child, index) => {
        const { left, top, width, height } = child.getBoundingClientRect();
        selectableItems.current.push({ left, top, width, height, index }); // Add index to track wells
      });
    }
  };
  // NEW ^

  // const updateSelectableItems = () => {
  //   selectableItems.current = []; // Reset selectable items
  //   if (gridRef.current) {
  //     console.log("updatedSelectableItems: ", selectableItems);
  //     const gridChildren = Array.from(
  //       gridRef.current.querySelectorAll(
  //         ".minigraph-and-controls__minigraph-canvas"
  //       )
  //     );
  //     gridChildren.forEach((child) => {
  //       const { left, top, width, height } = child.getBoundingClientRect(); // Get bounding rect
  //       selectableItems.current.push({ left, top, width, height });
  //     });
  //   }
  // };

  useEffect(() => {
    if (isRenderingComplete && gridRef.current) {
      updateSelectableItems(); // Ensure selectable items are recalculated after rendering
    }
  }, [isRenderingComplete, wellArrays]);

  // Capture the bounding boxes of wells
  useEffect(() => {
    console.log("update", selectableItems);
    updateSelectableItems(); // Initial update of selectable items
    window.addEventListener("resize", updateSelectableItems); // Re-capture on window resize

    return () => window.removeEventListener("resize", updateSelectableItems); // Cleanup event listener on unmount
  }, [wellArrays]); // Run effect when wellArrays changes

  // controls whether useSelectionContainer fires or not
  // const shouldStartSelecting = (target) => {
  //   // Check if the click originated from the grid container
  //   if (gridRef.current && gridRef.current.contains(target)) {
  //     return true; // Allow selection to start
  //   }
  //   return false; // Prevent selection from starting
  // };
  const shouldStartSelecting = (target) => {
    // Ensure the target is inside the gridRef
    return gridRef.current && gridRef.current.contains(target);
  };

  // Setup drag selection container
  const { DragSelection } = useSelectionContainer({
    onSelectionChange: handleSelectionChange,
    onSelectionEnd: handleSelectionEnd, // Call handleSelectionEnd when dragging ends
    selectionProps: {
      style: {
        border: "0.2em solid yellow", // Style for the selection box
        borderRadius: 0, // Rounded corners for the box
        backgroundColor: "rgb(75, 192, 192)", // Background color for the selection box
        opacity: 0.4, // Opacity for the selection box
        zIndex: 99999,
      },
    },
    isEnabled: true,
    shouldStartSelecting, // condition to control selection initializing
  });

  const minigraphOptions = useMemo(() => {
    return MiniGraphOptions(
      analysisData,
      extractedIndicatorTimes,
      wellArrays,
      yValues,
      showFiltered
    );
  }, [
    analysisData,
    extractedIndicatorTimes,
    wellArrays,
    yValues,
    showFiltered,
  ]);

  const indicatorColors = [
    "rgb(75, 192, 192)", // Teal
    "rgb(255, 99, 132)", // Red
    "rgb(54, 162, 235)", // Blue
    "rgb(255, 206, 86)", // Yellow
    "rgb(153, 102, 255)", // Purple
    "rgb(255, 159, 64)", // Orange
    // Add more colors as needed
  ];

  return (
    <div className="container">
      {isRenderingComplete ? (
        <div
          className="minigraph-container"
          style={{
            display: "grid",
            gridTemplateColumns: `${buttonWidth} 10fr`,
            gridTemplateRows: `${buttonHeight} 10fr`,
            // width: parentWidth,
            // height: parentHeight,
            maxWidth: `calc(${parentWidth})`, // Adjust for parent's border (0.5em * 2)
            maxHeight: `calc(${parentHeight})`, // Adjust for parent's border (0.5em * 2)
            boxSizing: "border-box", // Ensures the padding and border are included in the container's size
          }}
        >
          {/* "All" button (Top-left cell) */}
          <div
            className="minigraph-all-button-container"
            style={{
              gridRow: "1 / 2",
              gridColumn: "1 / 2",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              maxWidth: buttonWidth / 4,
            }}
          >
            <button
              id="allButton"
              style={{
                width: buttonWidth / 4,
                height: buttonHeight / 2,
                alignItems: "center",
                padding: 0,
                fontWeight: "bold",
              }}
              onClick={() =>
                handleAllSelectorClick(
                  wellArrays,
                  selectedWellArray,
                  handleSelectWell,
                  handleClearSelectedWells
                )
              }
            >
              *
            </button>
          </div>

          {/* Column selection buttons (Top-right nested grid) */}
          <div
            className="minigraph-column-buttons-container"
            style={{
              gridRow: "1 / 2",
              gridColumn: "2 / 3",
              display: "grid",
              gridTemplateColumns: `repeat(${numColumns}, ${cellWidth}px)`,
              // justifyContent: "start",
            }}
          >
            {columnLabels.map((columnLabel) => (
              <button
                className="minigraph-and-controls__column-button"
                key={columnLabel}
                style={{
                  width: cellWidth, // Match canvas width
                  height: buttonHeight / 2, // Half canvas height
                }}
                onClick={() =>
                  handleColumnSelectorClick(
                    columnLabel,
                    wellArrays,
                    selectedWellArray,
                    handleSelectWell,
                    handleDeselectWell
                  )
                }
              >
                {columnLabel}
              </button>
            ))}
          </div>

          {/* Row selection buttons (Bottom-left column) */}
          <div
            className="minigraph-row-buttons-container"
            style={{
              gridRow: "2 / 3",
              gridColumn: "1 / 2",
              display: "grid",
              gridTemplateRows: `repeat(${numRows}, ${cellHeight}px)`,
              justifyContent: "center",
              maxWidth: buttonWidth / 4,
            }}
          >
            {rowLabels.map((rowLabel) => (
              <button
                key={rowLabel}
                style={{
                  width: buttonWidth / 4, // Match the 'all' button width
                  height: cellHeight, // Match canvas height
                  textAlign: "center",
                  padding: 0,
                }}
                onClick={() =>
                  handleRowSelectorClick(
                    rowLabel,
                    wellArrays,
                    selectedWellArray,
                    handleSelectWell,
                    handleDeselectWell
                  )
                }
              >
                {rowLabel}
              </button>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              // position: "relative",
              width: "100%",
              height: "100%",
              pointerEvents: "none", // Prevent this container from interfering with clicks
              zIndex: 99999, // prevents seleciton box from being drawn behind canvases
            }}
          >
            <DragSelection
              selectableTargets={".minigraph-and-controls__minigraph-canvas"}
              onSelectionChange={handleSelectionChange}
              selectionProps={{
                // boundingElement: ".minigraph-and-controls__minigraph-grid", // Limits selection to grid bounds
                boundingElement: ".minigraph-container", // Limits selection to grid bounds
              }}
            />
          </div>
          {/* Minigraph canvases (Bottom-right nested grid) */}
          <div
            className="minigraph-canvas-grid"
            ref={gridRef}
            style={{
              gridRow: "2 / 3",
              gridColumn: "2 / 3",
              display: "grid",
              gridTemplateColumns: `repeat(${numColumns}, ${cellWidth}px)`,
              gridTemplateRows: `repeat(${numRows}, ${cellHeight}px)`,
              // width: gridWidth,
              // height: gridHeight,
              // width: availableGridWidth,
              // height: availableGridHeight,
              gap: 0,
            }}
          >
            {wellArrays?.length > 0 &&
              wellArrays.map((well) => (
                <Line
                  type="line"
                  id="minigraphCanvas"
                  className="minigraph-and-controls__minigraph-canvas"
                  data-well-id={well.id}
                  style={
                    selectedWellArray?.some(
                      (selectedWell) => selectedWell.id === well.id
                    )
                      ? {
                          border: "solid 0.1em yellow",
                          zIndex: 10,
                          // width: "95%",
                          // height: "95%",
                          width: "100%",
                          height: "100%",
                          maxWidth: cellWidth,
                          maxHeight: cellHeight,
                        } // styling for selected wells
                      : {
                          zIndex: 10,
                          // width: "95%",
                          // height: "95%",
                          width: "100%",
                          height: "100%",
                          maxWidth: cellWidth,
                          maxHeight: cellHeight,
                        } // styling for un-selected wells
                  }
                  // key={well.id}
                  key={well.id}
                  data={{
                    datasets: well.indicators
                      // .filter((indicator) => indicator.isDisplayed)
                      .map((indicator, indIndex) => ({
                        label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
                        data: showFiltered
                          ? indicator.filteredData
                          : indicator.rawData,
                        fill: false,
                        borderColor:
                          indicatorColors[indIndex % indicatorColors.length], // Cycle colors
                        tension: 0.1,
                        hidden: !indicator.isDisplayed,
                      })),
                  }}
                  // width={smallCanvasWidth}
                  // height={smallCanvasHeight}
                  options={minigraphOptions}
                  onClick={() => handleWellClick(well.id)}
                />
              ))}
          </div>
        </div>
      ) : (
        <DotWaveLoader className="dotwave-loader" />
      )}
    </div>
  );
};

export default memo(MiniGraphGrid);

// import React, {
//   memo,
//   useMemo,
//   useContext,
//   useState,
//   useRef,
//   useEffect,
// } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import { MiniGraphOptions } from "../config/MiniGraphOptions";
// import "../../../styles/MiniGraphGrid.css";
// import "chartjs-adapter-date-fns"; // date-fns adapter for Chart.js necessary for decimation
// import { Line } from "react-chartjs-2";
// import {
//   handleAllSelectorClick,
//   handleRowSelectorClick,
//   handleColumnSelectorClick,
// } from "../../../utilities/Handlers";
// import {
//   useSelectionContainer,
//   Box,
//   boxesIntersect,
// } from "@air/react-drag-to-select";
// import DotWaveLoader from "../../../assets/animations/DotWaveLoader";
// import * as d3 from "d3";

// export const MiniGraphGrid = ({ rowLabels, columnLabels, metricIndicator }) => {
//   const {
//     project,
//     wellArrays,
//     showFiltered,
//     selectedWellArray,
//     handleSelectWell,
//     handleDeselectWell,
//     handleClearSelectedWells,
//     analysisData,
//     extractedIndicatorTimes,
//   } = useContext(DataContext);

//   const [isRenderingComplete, setIsRenderingComplete] = useState(false);

//   const numRows = rowLabels.length;
//   const numColumns = columnLabels.length;

//   // State for grid and cell dimensions
//   const [gridWidth, setGridWidth] = useState(window.innerWidth / 2.3);
//   const [gridHeight, setGridHeight] = useState(window.innerHeight / 2.3);

//   const cellWidth = gridWidth / numColumns;
//   const cellHeight = gridHeight / numRows;

//   // Resize handler for dynamic grid resizing
//   const handleResize = () => {
//     setGridWidth(window.innerWidth / 2.3);
//     setGridHeight(window.innerHeight / 2.3);
//   };

//   // Add resize event listener
//   useEffect(() => {
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   useEffect(() => {
//     if (wellArrays.length > 0) {
//       // Introduce a small delay before setting isRenderingComplete
//       const timeout = setTimeout(() => {
//         setIsRenderingComplete(true);
//       }, 1500); // keep loader for at least 1.5 sec

//       return () => clearTimeout(timeout); // Cleanup timeout on component unmount
//     }
//   }, [wellArrays]);

//   //   // Refs used for the drag-to-select box
//   const gridRef = useRef(null); // Ref to the grid container
//   const selectableItems = useRef([]); // Store selectable items for drag selection
//   const selectedIndexes = useRef([]); // Store selected indexes during drag

//   // handles y-scales for proper rendering
//   const yValues = wellArrays.flatMap((well) =>
//     showFiltered
//       ? well.indicators?.filteredData?.map((point) => point.y) || []
//       : well.indicators?.rawData?.map((point) => point.y) || []
//   );

//   const handleWellClick = (wellId) => {
//     const isSelected = selectedWellArray.some((well) => well.id === wellId);

//     if (isSelected) {
//       handleDeselectWell(wellId); // Deselect by ID if already selected
//     } else {
//       const well = wellArrays.find((well) => well.id === wellId);
//       handleSelectWell(well); // Select by finding the well in wellArrays
//     }
//   };

//   // Handle selection change to track selected wells during drag
//   const handleSelectionChange = (box) => {
//     const scrollAwareBox = {
//       ...box,
//       top: box.top + window.scrollY,
//       left: box.left + window.scrollX,
//     };

//     const newSelectedIndexes = [];

//     selectableItems.current.forEach((item) => {
//       if (boxesIntersect(scrollAwareBox, item)) {
//         newSelectedIndexes.push(item.index); // Use the stored index
//       }
//     });

//     selectedIndexes.current = newSelectedIndexes;
//   };

//   // Handle selection end to finalize selected wells
//   // const handleSelectionEnd = () => {
//   //   const wellsToSelect = []; // Array to keep track of wells to select
//   //   const wellsToDeselect = []; // Array to keep track of wells to deselect

//   //   // Loop through selected indexes to finalize selections
//   //   selectedIndexes.current.forEach((index) => {
//   //     const well = wellArrays[index]; // Get the well using the index
//   //     if (well) {
//   //       if (!selectedWellArray.includes(well)) {
//   //         wellsToSelect.push(well); // Mark well to select if not already selected
//   //       } else {
//   //         wellsToDeselect.push(well); // Mark well to deselect if already selected
//   //       }
//   //     }
//   //   });

//   //   // Update selectedWellArray based on the wellsToSelect and wellsToDeselect
//   //   wellsToSelect.forEach((well) => handleSelectWell(well)); // Select the wells
//   //   wellsToDeselect.forEach((well) => handleDeselectWell(well.id)); // Deselect the wells

//   //   // Clear the selectedIndexes ref for future selections
//   //   selectedIndexes.current = [];
//   // };
//   const handleSelectionEnd = () => {
//     const wellsToSelect = [];
//     const wellsToDeselect = [];

//     selectedIndexes.current.forEach((index) => {
//       const well = wellArrays[index]; // Map the index correctly
//       if (well) {
//         if (!selectedWellArray.includes(well)) {
//           wellsToSelect.push(well);
//         } else {
//           wellsToDeselect.push(well);
//         }
//       }
//     });

//     wellsToSelect.forEach((well) => handleSelectWell(well));
//     wellsToDeselect.forEach((well) => handleDeselectWell(well.id));

//     selectedIndexes.current = [];
//   };

//   useEffect(() => {
//     console.log("Selectable items:", selectableItems.current);
//   }, [selectableItems]);

//   const updateSelectableItems = () => {
//     selectableItems.current = [];
//     if (gridRef.current) {
//       Array.from(gridRef.current.children).forEach((child, index) => {
//         const { left, top, width, height } = child.getBoundingClientRect();
//         selectableItems.current.push({ left, top, width, height, index }); // Add index to track wells
//       });
//     }
//   };

//   useEffect(() => {
//     if (isRenderingComplete && gridRef.current) {
//       updateSelectableItems(); // Ensure selectable items are recalculated after rendering
//     }
//   }, [isRenderingComplete, wellArrays]);

//   // Capture the bounding boxes of wells
//   useEffect(() => {
//     updateSelectableItems(); // Initial update of selectable items
//     window.addEventListener("resize", updateSelectableItems); // Re-capture on window resize

//     return () => window.removeEventListener("resize", updateSelectableItems); // Cleanup event listener on unmount
//   }, [wellArrays]); // Run effect when wellArrays changes

//   // controls whether useSelectionContainer fires or not
//   const shouldStartSelecting = (target) => {
//     // Check if the click originated from the grid container
//     if (gridRef.current && gridRef.current.contains(target)) {
//       return true; // Allow selection to start
//     }
//     return false; // Prevent selection from starting
//   };

//   // Setup drag selection container
//   const { DragSelection } = useSelectionContainer({
//     onSelectionChange: handleSelectionChange,
//     onSelectionEnd: handleSelectionEnd, // Call handleSelectionEnd when dragging ends
//     selectionProps: {
//       style: {
//         border: "0.2em solid yellow", // Style for the selection box
//         borderRadius: 0, // Rounded corners for the box
//         backgroundColor: "rgb(75, 192, 192)", // Background color for the selection box
//         opacity: 0.4, // Opacity for the selection box
//         zIndex: 99999,
//       },
//     },
//     isEnabled: true,
//     shouldStartSelecting, // condition to control selection initializing
//   });

//   const minigraphOptions = useMemo(() => {
//     return MiniGraphOptions(
//       analysisData,
//       extractedIndicatorTimes,
//       wellArrays,
//       yValues
//     );
//   }, [
//     analysisData,
//     extractedIndicatorTimes,
//     wellArrays,
//     yValues,
//     // showFiltered,
//   ]);

//   const indicatorColors = [
//     "rgb(75, 192, 192)", // Teal
//     "rgb(255, 99, 132)", // Red
//     "rgb(54, 162, 235)", // Blue
//     "rgb(255, 206, 86)", // Yellow
//     "rgb(153, 102, 255)", // Purple
//     "rgb(255, 159, 64)", // Orange
//     // Add more colors as needed
//   ];
//   console.log(cellHeight, cellWidth);

//   return (
//     <>
//       {isRenderingComplete ? (
//         <div
//           className="minigraph-and-controls__minigraph-container"
//           // style={{ height: largeCanvasHeight, width: largeCanvasWidth }}
//         >
//           <button
//             id="allButton"
//             className="minigraph-and-controls__all-button"
//             onClick={() =>
//               handleAllSelectorClick(
//                 wellArrays,
//                 selectedWellArray,
//                 handleSelectWell,
//                 handleClearSelectedWells
//               )
//             }
//           >
//             all
//           </button>
//           <div
//             className="minigraph-and-controls__column-selectors"
//             style={{
//               width: "100%",
//               // height: smallCanvasHeight,
//             }}
//           >
//             {columnLabels.map((columnLabel) => (
//               <button
//                 id="columnButton"
//                 className="minigraph-and-controls__column-button"
//                 key={columnLabel}
//                 style={{
//                   display: "flex",
//                   width: "100%",
//                   // height: smallCanvasHeight,
//                   justifyContent: "center",
//                   justifySelf: "center",
//                 }}
//                 onClick={() =>
//                   handleColumnSelectorClick(
//                     columnLabel,
//                     wellArrays,
//                     selectedWellArray,
//                     handleSelectWell,
//                     handleDeselectWell
//                   )
//                 }
//               >
//                 {columnLabel}
//               </button>
//             ))}
//           </div>
//           <div
//             className="minigraph-and-controls__row-selectors"
//             style={{
//               width: "100%",
//               height: "100%",
//             }}
//           >
//             {rowLabels.map((rowLabel) => (
//               <button
//                 id="rowButton"
//                 className="minigraph-and-controls__row-button"
//                 key={rowLabel}
//                 style={{
//                   // width: { smallCanvasWidth },
//                   // height: { smallCanvasHeight },
//                   width: "100%",
//                   height: "100%",
//                 }}
//                 onClick={() =>
//                   handleRowSelectorClick(
//                     rowLabel,
//                     wellArrays,
//                     selectedWellArray,
//                     handleSelectWell,
//                     handleDeselectWell
//                   )
//                 }
//               >
//                 {rowLabel}
//               </button>
//             ))}
//           </div>
//           <div
//             className="minigraph-and-controls__minigraph-grid"
//             ref={gridRef} // Assign the ref to the grid container
//             style={{
//               // height: largeCanvasHeight,
//               // width: largeCanvasWidth,
//               overflow: "hidden", // Prevent the drag selector from going outside the grid
//             }}
//           >
//             {/* DragSelection is absolutely positioned and won't interfere with grid layout */}
//             <div
//               style={{
//                 position: "absolute",
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 bottom: 0,
//                 pointerEvents: "none", // Prevent this container from interfering with clicks
//                 zIndex: 200000, // prevents seleciton box from being drawn behind canvases
//               }}
//             >
//               <DragSelection
//                 selectableTargets={".minigraph-and-controls__minigraph-canvas"}
//                 onSelectionChange={handleSelectionChange}
//                 selectionProps={{
//                   // boundingElement: ".minigraph-and-controls__minigraph-grid", // Limits selection to grid bounds
//                   boundingElement:
//                     ".minigraph-and-controls__minigraph-container", // Limits selection to grid bounds
//                 }}
//               />
//             </div>
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateRows: `repeat(${numRows}, ${cellHeight}px)`,
//                 gridTemplateColumns: `repeat(${numColumns}, ${cellWidth}px)`,
//                 width: gridWidth,
//                 height: gridHeight,
//               }}
//             >
//               {wellArrays?.length > 0 &&
//                 wellArrays.map((well) => (
//                   <Line
//                     type="line"
//                     id="minigraphCanvas"
//                     className="minigraph-and-controls__minigraph-canvas"
//                     data-well-id={well.id}
//                     style={
//                       selectedWellArray?.some(
//                         (selectedWell) => selectedWell.id === well.id
//                       )
//                         ? {
//                             border: "solid 0.1em yellow",
//                             zIndex: 10,
//                             // width: "95%",
//                             // height: "95%",
//                             width: "100%",
//                             height: "100%",
//                             maxWidth: cellWidth,
//                             maxHeight: cellHeight,
//                             // width: cellWidth,
//                             // height: cellHeight,
//                             // width: `${cellWidth}px`,
//                             // height: `${cellHeight}px`,
//                           } // styling for selected wells
//                         : {
//                             // border: "solid 1px grey",

//                             zIndex: 10,
//                             // width: "95%",
//                             // height: "95%",
//                             width: "100%",
//                             height: "100%",
//                             maxWidth: cellWidth,
//                             maxHeight: cellHeight,
//                             // width: cellWidth,
//                             // height: cellHeight,
//                             // width: `${cellWidth}px`,
//                             // height: `${cellHeight}px`,
//                           } // styling for un-selected wells
//                     }
//                     key={well.id}
//                     data={{
//                       datasets: well.indicators
//                         .filter((indicator) => indicator.isDisplayed)
//                         .map((indicator, indIndex) => ({
//                           label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
//                           data: showFiltered
//                             ? indicator.filteredData
//                             : indicator.rawData,
//                           fill: false,
//                           borderColor:
//                             indicatorColors[indIndex % indicatorColors.length], // Cycle colors
//                           tension: 1,
//                           hidden: !indicator.isDisplayed,
//                         })),
//                     }}
//                     options={minigraphOptions}
//                     onClick={() => handleWellClick(well.id)}
//                   />
//                 ))}
//             </div>
//           </div>
//         </div>
//       ) : (
//         <DotWaveLoader className="dotwave-loader" />
//       )}
//     </>
//   );
// };

// export default MiniGraphGrid;
