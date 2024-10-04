import React, { memo, useMemo, useContext, useState } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import { Line } from "react-chartjs-2";
import { MiniGraphControls } from "./MiniGraphControls";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import {
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../../../utilities/Helpers";
import "chartjs-adapter-date-fns";

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

  console.log(selectedWellArray);

  // Local state for managing which data to show
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

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

  console.log("sch: ", smallCanvasHeight, "smw: ", smallCanvasWidth);

  return (
    // <section
    //   className="minigraph-and-controls"
    //   style={{ width: largeCanvasWidth, height: largeCanvasHeight }}
    // >
    <div
      className="minigraph-and-controls__minigraph-container"
      style={{ height: largeCanvasHeight, width: largeCanvasWidth }}
    >
      {/* <div
        className="minigraph-and-controls__all-selector"
        style={{
          width: smallCanvasWidth,
          height: smallCanvasHeight,
        }}
      > */}
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
          // width: smallCanvasWidth,
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
              // height: "100%",
              // width: smallCanvasWidth,
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
        // style={{
        //   width: smallCanvasWidth / 2,
        // }}
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
          alignItems: "center",
          justifyContent: "center",
          // width: { largeCanvasWidth },
          // height: { largeCanvasHeight },
          // width: { smallCanvasWidth },
          // height: { smallCanvasHeight },
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
              // width={"100%"}
              // height={"100%"}
              width={smallCanvasWidth}
              height={smallCanvasHeight}
              options={minigraphOptions}
              onClick={() => handleWellClick(well.id)}
            />
          ))}
      </div>
    </div>

    // </section>
  );
};

export default memo(MiniGraphGrid);
