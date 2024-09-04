import React, { memo, useMemo } from "react";
import { Line } from "react-chartjs-2";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import { FilterControls } from "../FilteredData/FilterControls";
import { useCallback } from "react";
import { debounce } from "lodash";
import "chartjs-adapter-date-fns";

export const MiniGraphGrid = ({
  wellArrays,
  selectedWellArray,
  timeData,
  smallCanvasWidth,
  smallCanvasHeight,
  largeCanvasWidth,
  largeCanvasHeight,
  columnLabels,
  rowLabels,
  analysisData,
  onWellClick,
  onRowSelectorClick,
  onColumnSelectorClick,
  onAllSelectorClick,
}) => {
  const handleWellClick = useCallback(debounce(onWellClick, 200), [
    onWellClick,
  ]);
  const handleRowSelectorClick = useCallback(
    debounce(onRowSelectorClick, 200),
    [onRowSelectorClick]
  );
  const handleColumnSelectorClick = useCallback(
    debounce(onColumnSelectorClick, 200),
    [onColumnSelectorClick]
  );
  const handleAllSelectorClick = useCallback(
    debounce(onAllSelectorClick, 200),
    [onAllSelectorClick]
  );

  const options = useMemo(
    () => MiniGraphOptions(analysisData, timeData),
    [analysisData, timeData]
  );

  let minigraphWellArrays = [...wellArrays];

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
          {minigraphWellArrays.map((well) => (
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
                // labels: timeData,
                datasets: [
                  {
                    data: well.indicators[0].rawData,
                    // backgroundColor: "aqua",
                    borderColor: "black",
                    pointBorderWidth: 0,
                    pointBorderRadius: 0,
                  },
                ],
              }}
              // data={{
              //   labels: timeData,
              //   datasets: [
              //     {
              //       data: well.indicators[0].rawData,
              //       backgroundColor: "aqua",
              //       borderColor: "black",
              //       pointBorderWidth: 0,
              //       pointBorderRadius: 0,
              //       graph_data: {x:timeData,y:well.indicators[0].rawData},
              //     },
              //   ],
              // }}

              width={smallCanvasWidth}
              height={smallCanvasHeight}
              options={options}
              onClick={() => handleWellClick(well.id)}
            />
          ))}
        </div>
      </div>
      {/* <FilterControls className="minigraph-controls" /> */}
    </div>
  );
};

export default memo(MiniGraphGrid);
