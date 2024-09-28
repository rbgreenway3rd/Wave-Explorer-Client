import React, { memo, useMemo, useContext, useState } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import { Line } from "react-chartjs-2";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import {
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../../../utilities/Helpers";
import "chartjs-adapter-date-fns";

export const MiniGraphGrid = ({
  timeData,
  smallCanvasWidth,
  smallCanvasHeight,
  columnLabels,
  rowLabels,
}) => {
  const {
    project,
    analysisData,
    showFiltered,
    setShowFiltered,
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

  const handleToggleDataShown = () => {
    setIsFiltered((prev) => !prev); // Toggle the filter state
    setShowFiltered((prev) => !prev); // Update context state as well
  };

  const options = useMemo(() => {
    // Collect yValues based on whether showFiltered is true or not
    const yValues = wellArrays.flatMap((well) =>
      isFiltered
        ? well.indicators[0]?.filteredData?.map((point) => point.y) || []
        : well.indicators[0]?.rawData?.map((point) => point.y) || []
    );

    // Return the options object instead of the yValues
    return MiniGraphOptions(analysisData, timeData, wellArrays, yValues);
  }, [analysisData, timeData, wellArrays, showFiltered, isFiltered]);

  return (
    <section className="minigraph-and-controls">
      <div className="minigraph-and-controls__minigraph-container">
        <div
          className="minigraph-and-controls__all-selector"
          style={{
            width: smallCanvasWidth,
            height: smallCanvasHeight,
          }}
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
        </div>
        <div
          className="minigraph-and-controls__column-selectors"
          style={{
            height: smallCanvasHeight,
          }}
        >
          {columnLabels.map((columnLabel) => (
            <button
              id="columnButton"
              className="minigraph-and-controls__column-button"
              key={columnLabel}
              style={{
                width: smallCanvasWidth,
                height: "100%",
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
            width: smallCanvasWidth / 2,
          }}
        >
          {rowLabels.map((rowLabel) => (
            <button
              id="rowButton"
              className="minigraph-and-controls__row-button"
              key={rowLabel}
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
        <div className="minigraph-and-controls__minigraph-grid">
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
                    ? { border: "solid 2px red" } // styling for selected wells
                    : {} // styling for un-selected wells
                }
                key={well.id}
                data={{
                  datasets: [
                    {
                      data: isFiltered
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
                options={options}
                onClick={() => handleWellClick(well.id)}
              />
            ))}
        </div>
      </div>
      <div className="minigraph-and-controls__controls-container">
        <div className="minigraph-and-controls__show-raw-or-filtered">
          Show
          <div className="minigraph-and-controls__show-raw">
            <input
              type="radio"
              id="show-raw"
              className="minigraph-and-controls__raw-radio"
              value="showRaw"
              name="radio-group-1"
              checked={!isFiltered}
              onChange={() => handleToggleDataShown()}
            />
            <label htmlFor="show-raw">Raw</label>
          </div>
          <div className="minigraph-and-controls__show-filtered">
            <input
              type="radio"
              id="show-filtered"
              className="minigraph-and-controls__filtered-radio"
              value="showFiltered"
              name="radio-group-1"
              checked={isFiltered}
              onChange={() => handleToggleDataShown()}
            />
            <label htmlFor="show-filtered">Filtered</label>
          </div>
        </div>
        <div className="minigraph-and-controls__visibility">
          Visibility
          <div className="minigraph-and-controls__visibility-selector1">
            <input
              type="checkbox"
              id="visibility-selector"
              className="minigraph-and-controls__visibility-selector"
              value="visibility-selector1"
            />
            <label htmlFor="visibility-selector">Green</label>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(MiniGraphGrid);
