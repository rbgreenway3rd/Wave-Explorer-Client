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
import DotWaveLoader from "../../../assets/Loaders/DotWaveLoader";

export const MiniGraphGrid = ({
  // minigraphOptions,
  analysisData,
  extractedIndicatorTimes,
  // largeCanvasWidth,
  // largeCanvasHeight,
  // smallCanvasWidth,
  // smallCanvasHeight,
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
  } = useContext(DataContext);

  // // State to track if rendering is complete
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);

  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
    // window.innerWidth / 2.5
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
    // window.innerHeight / 2.5
  );
  const [smallCanvasWidth, setSmallCanvasWidth] = useState(
    window.innerWidth / 64.4
    // window.innerWidth / 70
  );
  const [smallCanvasHeight, setSmallCanvasHeight] = useState(
    window.innerHeight / 46
    // window.innerHeight / 50
  );

  const handleResize = () => {
    // setLargeCanvasWidth(window.innerWidth / 2.5);
    // setLargeCanvasHeight(window.innerHeight / 2.5);
    // setSmallCanvasWidth(window.innerWidth / 70);
    // setSmallCanvasHeight(window.innerHeight / 50);
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
    setSmallCanvasWidth(window.innerWidth / 64.4);
    setSmallCanvasHeight(window.innerHeight / 46);
  };

  // Effect to listen to window resize events
  useEffect(() => {
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
      ? well.indicators[0]?.filteredData?.map((point) => point.y) || []
      : well.indicators[0]?.rawData?.map((point) => point.y) || []
  );

  // Function handling selection of a single well by click event
  const handleWellClick = (wellId) => {
    const well = wellArrays.find((well) => well.id === wellId); // Find the well by its ID
    if (selectedWellArray.includes(well)) {
      handleDeselectWell(well); // Deselect the well if already selected
    } else {
      handleSelectWell(well); // Select the well if not already selected
    }
  };

  // Handle selection change to track selected wells during drag
  const handleSelectionChange = (box) => {
    // Adjust box coordinates for scrolling
    const scrollAwareBox = {
      ...box,
      top: box.top + window.scrollY, // Adjust for vertical scroll
      left: box.left + window.scrollX, // Adjust for horizontal scroll
    };

    const newSelectedIndexes = []; // Array to store new selected indexes

    // Check which selectable items intersect with the selection box
    selectableItems.current.forEach((item, index) => {
      if (boxesIntersect(scrollAwareBox, item)) {
        newSelectedIndexes.push(index - 1); // Add the index of the intersecting item
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
    wellsToDeselect.forEach((well) => handleDeselectWell(well)); // Deselect the wells

    // Clear the selectedIndexes ref for future selections
    selectedIndexes.current = [];
  };

  const updateSelectableItems = () => {
    selectableItems.current = []; // Reset selectable items
    if (gridRef.current) {
      // If gridRef is assigned
      Array.from(gridRef.current.children).forEach((child) => {
        // Loop through each child in the grid
        const { left, top, width, height } = child.getBoundingClientRect(); // Get bounding rect
        selectableItems.current.push({ left, top, width, height }); // Store the bounding box
      });
    }
  };

  useEffect(() => {
    if (isRenderingComplete && gridRef.current) {
      updateSelectableItems(); // Ensure selectable items are recalculated after rendering
    }
  }, [isRenderingComplete, wellArrays]);

  // Capture the bounding boxes of wells
  useEffect(() => {
    updateSelectableItems(); // Initial update of selectable items
    window.addEventListener("resize", updateSelectableItems); // Re-capture on window resize

    return () => window.removeEventListener("resize", updateSelectableItems); // Cleanup event listener on unmount
  }, [wellArrays]); // Run effect when wellArrays changes

  // controls whether useSelectionContainer fires or not
  const shouldStartSelecting = (target) => {
    // Check if the click originated from the grid container
    if (gridRef.current && gridRef.current.contains(target)) {
      return true; // Allow selection to start
    }
    return false; // Prevent selection from starting
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
      yValues
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
    <>
      {isRenderingComplete ? (
        <div
          className="minigraph-and-controls__minigraph-container"
          style={{ height: largeCanvasHeight, width: largeCanvasWidth }}
        >
          <button
            id="allButton"
            className="minigraph-and-controls__all-button"
            onClick={() =>
              handleAllSelectorClick(
                wellArrays,
                selectedWellArray,
                handleSelectWell,
                handleClearSelectedWells
              )
            }
          >
            all
          </button>
          <div
            className="minigraph-and-controls__column-selectors"
            style={{
              width: "100%",
              height: smallCanvasHeight,
            }}
          >
            {columnLabels.map((columnLabel) => (
              <button
                id="columnButton"
                className="minigraph-and-controls__column-button"
                key={columnLabel}
                style={{
                  display: "flex",
                  width: "100%",
                  height: smallCanvasHeight,
                  justifyContent: "center",
                  justifySelf: "center",
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
          <div
            className="minigraph-and-controls__row-selectors"
            style={{
              width: "100%",
              height: "100%",
            }}
          >
            {rowLabels.map((rowLabel) => (
              <button
                id="rowButton"
                className="minigraph-and-controls__row-button"
                key={rowLabel}
                style={{
                  // width: { smallCanvasWidth },
                  // height: { smallCanvasHeight },
                  width: "100%",
                  height: "100%",
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
            className="minigraph-and-controls__minigraph-grid"
            ref={gridRef} // Assign the ref to the grid container
            style={{
              // height: largeCanvasHeight,
              // width: largeCanvasWidth,
              overflow: "hidden", // Prevent the drag selector from going outside the grid
            }}
          >
            {/* DragSelection is absolutely positioned and won't interfere with grid layout */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: "none", // Prevent this container from interfering with clicks
                zIndex: 200000, // prevents seleciton box from being drawn behind canvases
              }}
            >
              <DragSelection
                selectableTargets={".minigraph-and-controls__minigraph-canvas"}
                onSelectionChange={handleSelectionChange}
                selectionProps={{
                  // boundingElement: ".minigraph-and-controls__minigraph-grid", // Limits selection to grid bounds
                  boundingElement:
                    ".minigraph-and-controls__minigraph-container", // Limits selection to grid bounds
                }}
              />
            </div>
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
                          width: "95%",
                          height: "95%",
                        } // styling for selected wells
                      : {
                          zIndex: 10,
                          width: "95%",
                          height: "95%",
                        } // styling for un-selected wells
                  }
                  // key={well.id}
                  key={`${well.id}-${smallCanvasWidth}-${smallCanvasHeight}`}
                  data={{
                    // datasets: [
                    //   {
                    //     data: showFiltered
                    //       ? well.indicators[0]?.filteredData
                    //       : well.indicators[0]?.rawData,
                    //     borderColor: "rgb(75, 192, 192)",
                    //     pointBorderWidth: 0,
                    //     pointBorderRadius: 0,
                    //   },
                    // ],
                    datasets: well.indicators
                      // .filter((indicator) => indicator.isDisplayed)
                      .map((indicator, indIndex) => ({
                        label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
                        data: indicator.rawData,
                        fill: false,
                        borderColor:
                          indicatorColors[indIndex % indicatorColors.length], // Cycle colors
                        tension: 0.1,
                        hidden: !indicator.isDisplayed,
                      })),
                  }}
                  width={smallCanvasWidth}
                  height={smallCanvasHeight}
                  options={minigraphOptions}
                  onClick={() => handleWellClick(well.id)}

                  // hover state used in LargeGraph
                  // onMouseEnter={() => handleHoverSelectedWellEnter(well.id)} // Call onMouseEnter with well ID
                  // onMouseLeave={() => handleHoverSelectedWellEnter(null)} // Reset hover on mouse leave
                />
              ))}
          </div>
        </div>
      ) : (
        <DotWaveLoader className="dotwave-loader" />
      )}
    </>
  );
};

export default memo(MiniGraphGrid);
