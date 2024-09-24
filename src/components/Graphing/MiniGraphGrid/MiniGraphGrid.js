import React, { memo, useMemo, useContext, useState } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import { Line } from "react-chartjs-2";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import { debounce } from "lodash";
import "chartjs-adapter-date-fns";
import Button from "@mui/material/Button";

export const MiniGraphGrid = ({
  selectedWellArray,
  timeData,
  smallCanvasWidth,
  smallCanvasHeight,
  columnLabels,
  rowLabels,
  onWellClick,
  onRowSelectorClick,
  onColumnSelectorClick,
  onAllSelectorClick,
}) => {
  const { project, analysisData, showFiltered, setShowFiltered } =
    useContext(DataContext);

  // Local state for managing which data to show
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

  const plate = project?.plate || [];
  const experiment = plate[0]?.experiments[0] || {};
  const wellArrays = experiment.wells || [];

  const handleWellClick = useMemo(
    () => debounce(onWellClick, 200),
    [onWellClick]
  );
  const handleRowSelectorClick = useMemo(
    () => debounce(onRowSelectorClick, 200),
    [onRowSelectorClick]
  );
  const handleColumnSelectorClick = useMemo(
    () => debounce(onColumnSelectorClick, 200),
    [onColumnSelectorClick]
  );
  const handleAllSelectorClick = useMemo(
    () => debounce(onAllSelectorClick, 200),
    [onAllSelectorClick]
  );

  // const handleToggleDataShown = () => {
  //   if (showFiltered === false) {
  //     setShowFiltered(true);
  //   } else {
  //     setShowFiltered(false);
  //   }
  // };
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
  }, [analysisData, timeData, wellArrays, showFiltered]);

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
            onClick={handleAllSelectorClick}
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
              onClick={() => handleColumnSelectorClick(columnLabel)}
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
              onClick={() => handleRowSelectorClick(rowLabel)}
            >
              {rowLabel}
            </button>
          ))}
        </div>
        <div className="minigraph-and-controls__minigraph-grid">
          {wellArrays.map((well) => (
            <Line
              type="line"
              id="minigraphCanvas"
              className="minigraph-and-controls__minigraph-canvas"
              style={
                selectedWellArray.some(
                  (selectedWell) => selectedWell.id === well.id
                )
                  ? { border: "solid 2px red" } // styling for selected wells
                  : {} // styling for un-selected wells
              }
              key={well.id}
              data={{
                datasets: [
                  {
                    data:
                      // showFiltered === true
                      isFiltered
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
              // defaultChecked={true}
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
