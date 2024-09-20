import React, { memo, useMemo, useContext, useEffect } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
import { Line } from "react-chartjs-2";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import { debounce } from "lodash";
import "chartjs-adapter-date-fns";

export const MiniGraphGrid = ({
  // wellArrays,
  selectedWellArray,
  timeData,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  columnLabels,
  rowLabels,
  // analysisData,
  onWellClick,
  onRowSelectorClick,
  onColumnSelectorClick,
  onAllSelectorClick,
}) => {
  const {
    project,
    setProject,
    extractedIndicatorTimes,
    analysisData,
    dispatch,
    showFiltered,
    setShowFiltered,
  } = useContext(DataContext);

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

  const handleToggleDataShown = () => {
    if (showFiltered === false) {
      setShowFiltered(true);
    } else {
      setShowFiltered(false);
    }
  };

  const options = useMemo(() => {
    // Collect yValues based on whether showFiltered is true or not
    const yValues = wellArrays.flatMap((well) =>
      showFiltered
        ? well.indicators[0]?.filteredData?.map((point) => point.y) || []
        : well.indicators[0]?.rawData?.map((point) => point.y) || []
    );

    // Return the options object instead of the yValues
    return MiniGraphOptions(analysisData, timeData, wellArrays, yValues);
  }, [analysisData, timeData, wellArrays, showFiltered]);

  return (
    <div className="minigraph-and-controls-container">
      <div className="minigraph-container">
        <div
          className="all-selector"
          style={{
            width: smallCanvasWidth,
            height: smallCanvasHeight,
          }}
        >
          <button
            id="allButton"
            className="all-button"
            onClick={handleAllSelectorClick}
          >
            all
          </button>
        </div>
        <div
          className="column-selectors"
          style={{
            height: smallCanvasHeight,
          }}
        >
          {columnLabels.map((columnLabel) => (
            <button
              id="columnButton"
              className="column-button"
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
          className="row-selectors"
          style={{
            width: smallCanvasWidth / 2,
          }}
        >
          {rowLabels.map((rowLabel) => (
            <button
              id="rowButton"
              className="row-button"
              key={rowLabel}
              onClick={() => handleRowSelectorClick(rowLabel)}
            >
              {rowLabel}
            </button>
          ))}
        </div>
        <div className="minigraph-grid">
          {wellArrays.map((well) => (
            <Line
              type="line"
              id="minigraphCanvas"
              className="minigraph-canvas"
              style={
                selectedWellArray.includes(well)
                  ? { border: "solid 2px red" } // styling for selected wells
                  : {} // styling for un-selected wells
              }
              key={well.id}
              data={{
                datasets: [
                  {
                    data:
                      showFiltered === true
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
      <div className="minigraph-controls-container">
        <div className="show-raw-or-filtered">
          Show
          <div className="show-raw">
            <input
              type="radio"
              id="show-raw"
              className="raw-radio"
              value="showRaw"
              name="radio-group-1"
              defaultChecked={true}
              onClick={() => handleToggleDataShown()}
            />
            <label htmlFor="show-raw">Raw</label>
          </div>
          <div className="show-filtered">
            <input
              type="radio"
              id="show-filtered"
              className="filtered-radio"
              value="showFiltered"
              name="radio-group-1"
              onClick={() => handleToggleDataShown()}
            />
            <label htmlFor="show-filtered">Filtered</label>
          </div>
        </div>
        <div className="visibility">
          Visibility
          <div className="visibility-selector1">
            <input
              type="checkbox"
              id="visibility-selector"
              className="visibility-selector"
              value="visibility-selector1"
            />
            <label htmlFor="visibility-selector">Green</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(MiniGraphGrid);
