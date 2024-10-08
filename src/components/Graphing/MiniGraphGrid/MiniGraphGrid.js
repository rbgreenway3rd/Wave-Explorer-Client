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

  const [isRubberbanding, setIsRubberbanding] = useState(false);

  const [selectionBox, setSelectionBox] = useState(null);

  const selectionCanvasRef = useRef(null);
  // console.log(selectedWellArray);

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
      {/* </div> */}
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
                    } // styling for selected wells
                  : {} // styling for un-selected wells
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
