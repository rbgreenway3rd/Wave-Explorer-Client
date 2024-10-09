import React, { memo, useMemo, useContext, useState, useRef } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import "../../../styles/MiniGraphGrid.css";
import "chartjs-adapter-date-fns";
import { Line } from "react-chartjs-2";
import {
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../../../utilities/Helpers";
import RubberbandSelector from "./RubberbandSelector";

export const MiniGraphGrid = ({
  minigraphOptions,
  largeCanvasWidth,
  largeCanvasHeight,
  smallCanvasWidth,
  smallCanvasHeight,
  columnLabels,
  rowLabels,
}) => {
  const {
    project,
    showFiltered,
    selectedWellArray,
    handleSelectWell,
    handleDeselectWell,
    handleClearSelectedWells,
  } = useContext(DataContext);

  // console.log(selectedWellArray);
  const [isSelecting, setIsSelecting] = useState(true);
  const [mouseMoved, setMouseMoved] = useState(false);

  const plate = project?.plate || [];
  const experiment = plate[0]?.experiments[0] || {};
  const wellArrays = experiment.wells || [];

  const handleWellClick = (wellId) => {
    const well = wellArrays.find((well) => well.id === wellId);
    if (selectedWellArray.includes(well)) {
      handleDeselectWell(well);
    } else {
      handleSelectWell(well);
    }
  };

  const onSelectionComplete = () => {
    console.log("selection complete");
  };

  const handleMouseDown = (e) => {
    setIsSelecting(true);
    setMouseMoved(false); // Reset mouseMoved state
  };

  const handleMouseMove = () => {
    setMouseMoved(true); // Set mouseMoved to true if mouse is moved
  };

  const handleMouseUp = (wellId) => {
    if (!isSelecting) {
      handleWellClick(wellId); // Pass the well ID as needed
    }
    setIsSelecting(false);
  };

  return (
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
              width: "100%",
              height: smallCanvasHeight,
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
        style={{
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <RubberbandSelector
          selectionCanvasWidth={largeCanvasWidth - smallCanvasWidth}
          selectionCanvasHeight={largeCanvasHeight - smallCanvasHeight}
          isSelecting={isSelecting}
          setIsSelecting={setIsSelecting}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onSelectionComplete={onSelectionComplete}
          style={{ zIndex: 10000 }}
        />
        {wellArrays?.length > 0 &&
          wellArrays.map((well) => (
            <Line
              type="line"
              id="minigraphCanvas"
              className="minigraph-and-controls__minigraph-canvas"
              style={
                selectedWellArray?.some(
                  (selectedWell) => selectedWell.id === well.id
                )
                  ? {
                      border: "solid 2px red",
                      zIndex: 10,
                    } // styling for selected wells
                  : { zIndex: 10 } // styling for un-selected wells
              }
              key={well.id}
              data={{
                datasets: [
                  {
                    data: showFiltered
                      ? well.indicators[0]?.filteredData
                      : well.indicators[0]?.rawData,
                    borderColor: "black",
                    pointBorderWidth: 0,
                    pointBorderRadius: 0,
                  },
                ],
              }}
              width={smallCanvasWidth}
              height={smallCanvasHeight}
              options={minigraphOptions}
              onClick={() => handleWellClick(well.id)}
            />
          ))}
      </div>
    </div>
  );
};

export default memo(MiniGraphGrid);
