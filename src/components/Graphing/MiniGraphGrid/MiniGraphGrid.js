import React from "react";
import { Line } from "react-chartjs-2";
import { MiniGraphOptions } from "../../../config/MiniGraphOptions";
import "../../../styles/MiniGraphGrid.css";
import { FilterControls } from "../FilteredData/FilterControls";

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
  return (
    <div className="minigraph-and-controls-container">
      <div
        className="minigraph-container"
        style={
          {
            // width: largeCanvasWidth,
            // height: largeCanvasHeight,
          }
        }
      >
        <div
          className="all-selector"
          style={{
            width: smallCanvasWidth, // Set width to match row selectors
            height: smallCanvasHeight, // Set height to match column selectors
          }}
        >
          <button
            id="allButton"
            className="all-button"
            key="allButton"
            onClick={() => onAllSelectorClick()}
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
              onClick={() => onColumnSelectorClick(columnLabel)}
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
              onClick={() => onRowSelectorClick(rowLabel)}
            >
              {rowLabel}
            </button>
          ))}
        </div>
        <div className="minigraph-grid">
          {wellArrays.map((well, index) => (
            <Line
              id="minigraphCanvas"
              className="minigraph-canvas"
              style={
                selectedWellArray.includes(well)
                  ? { border: "solid 2px red" }
                  : { color: "black" }
              }
              key={well.id} // Ensure each well has a unique key property
              data={{
                labels: timeData,
                datasets: [
                  {
                    labels: timeData,
                    data: well.indicators[0].rawData,
                    backgroundColor: "aqua",
                    borderColor: "black",
                    pointBorderWidth: 0,
                    pointBorderRadius: 0,
                  },
                ],
              }}
              width={smallCanvasWidth}
              height={smallCanvasHeight}
              options={MiniGraphOptions(analysisData)}
              onClick={() => onWellClick(index)}
            >
              {/* <span id="tooltip-text">{well.id}</span> */}
            </Line>
          ))}
        </div>
      </div>
      {/* <FilterControls className="minigraph-controls" /> */}
    </div>
  );
};
