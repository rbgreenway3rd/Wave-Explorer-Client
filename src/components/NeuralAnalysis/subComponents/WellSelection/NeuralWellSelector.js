import React, { useEffect, useState, useContext } from "react";
import { DataContext } from "../../../../providers/DataProvider";
import {
  useNeuralSelection,
  useNeuralSettings,
} from "../../NeuralProvider";
import { Line } from "react-chartjs-2";
import Tooltip from "@mui/material/Tooltip";
import "../../styles/WellSelector.css";

/**
 * NeuralWellSelector — well grid in the right column of the Neural
 * modal. Reads selection + control-well state directly from
 * NeuralSelectionContext and the noise-suppression flag from
 * NeuralSettingsContext, so the modal passes no props.
 */
const NeuralWellSelector = () => {
  const { project, wellArrays } = useContext(DataContext);
  const {
    selectedWell,
    setSelectedWell,
    controlWell,
    setControlWell,
    selectingControl,
    setSelectingControl,
  } = useNeuralSelection();
  const { noiseSuppressionActive } = useNeuralSettings();
  const [globalYMin, setGlobalYMin] = useState(null);
  const [globalYMax, setGlobalYMax] = useState(null);

  // Extracted plate and experiment data from the project
  const plate = project?.plate[0] || [];

  // Grid dimensions — TODO(Tier E): replace window-fraction math with the
  // useContainerSize hook so the well grid resizes with its container
  // instead of the viewport.
  const availableWidth = window.innerWidth / 2.3;
  const availableHeight = window.innerHeight / 2.3;
  const cellWidth = availableWidth / plate.numberOfColumns;
  const cellHeight = availableHeight / plate.numberOfRows;

  // Selecting a new well changes selectedWell, which causes
  // NeuralResultsContext's pipeline useMemo to re-run with the new
  // signal — the previous well's spike results are replaced atomically
  // in the same render. No manual clearing required.
  const handleSelectWell = (well) => {
    setSelectedWell(well);
  };

  const getChartData = (well) => {
    const ind = well.indicators[0];
    // Prefer the small pre-decimated {x,y}[] (post-Phase C, the full
    // filteredData {x,y}[] is empty by default — canonical signal lives
    // in filteredYs/filteredXs typed arrays).
    const data =
      (ind.miniFilteredPoints && ind.miniFilteredPoints.length > 0)
        ? ind.miniFilteredPoints
        : ind.filteredData;
    return {
      datasets: [
        {
          label: "Filtered Data",
          data,
          borderColor: "rgb(153, 102, 255)",
          borderWidth: 1,
          fill: false,
        },
      ],
    };
  };

  // find max and min y values across all wells for consistent y-axis scaling
  useEffect(() => {
    let min = Infinity,
      max = -Infinity;
    wellArrays.forEach((well) => {
      const ind = well.indicators[0];
      // Prefer the typed-array path (post-Phase C, filteredData is empty
      // until materializeFilteredData() is called per-well).
      if (ind && ind.filteredYs) {
        const ys = ind.filteredYs;
        for (let i = 0; i < ys.length; i++) {
          const y = ys[i];
          if (y < min) min = y;
          if (y > max) max = y;
        }
        return;
      }
      (ind?.filteredData || []).forEach((point) => {
        if (point.y < min) min = point.y;
        if (point.y > max) max = point.y;
      });
    });
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 1;
    setGlobalYMin(min);
    setGlobalYMax(max);
  }, [wellArrays]);

  const getChartOptions = () => ({
    normalized: true,
    maintainAspectRatio: false,
    responsive: true,
    devicePixelRatio: window.devicePixelRatio || 1,
    spanGaps: false,
    events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
    animation: { duration: 0 },
    parsing: false,
    plugins: {
      legend: false,
      decimation: {
        enabled: true,
        algorithm: "lttb",
        samples: 40,
        threshold: 80,
      },
      tooltip: {
        enabled: false,
        mode: "nearest",
        intersect: false,
      },
    },
    elements: {
      point: { radius: 0 },
      line: { borderWidth: 1.5 },
    },
    layout: {
      autoPadding: false,
      padding: { left: -30, bottom: -30 },
    },
    scales: {
      x: {
        type: "time",
        ticks: { display: false },
        grid: { display: false },
      },
      y: {
        ticks: { display: false },
        grid: { display: false },
        min: globalYMin,
        max: globalYMax,
      },
    },
  });

  return (
    <>
      {/* Control well selection button moved to NoiseFilterControls */}
      <div
        className="well-grid"
        style={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: `repeat(${plate.numberOfColumns}, ${(
            cellWidth / 2
          ).toFixed(0)}fr)`,
          gridTemplateRows: `repeat(${plate.numberOfRows}, ${(
            cellHeight / 2
          ).toFixed(0)}fr)`,
        }}
      >
        {wellArrays.map((well, index) => (
          <Tooltip
            key={index}
            title={`${well.key}`}
            arrow
            slotProps={{
              modifiers: [
                {
                  name: "offset",
                  options: { offset: [0, 5] },
                },
              ],
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                maxHeight: cellHeight / 1.5,
                maxWidth: cellWidth / 1.5,
                opacity: selectingControl && !controlWell ? 0.7 : 1,
                cursor: selectingControl ? "pointer" : "default",
              }}
              onClick={() => {
                if (selectingControl && noiseSuppressionActive) {
                  setControlWell(well);
                  setSelectingControl(false);
                } else if (!selectingControl) {
                  console.log(well);
                  // setSelectedWell(well);
                  handleSelectWell(well);
                }
              }}
            >
              <Line
                type="line"
                className={`well-canvas${
                  selectedWell && selectedWell.id === well.id ? " selected" : ""
                }${
                  controlWell && controlWell.id === well.id
                    ? " control-well"
                    : ""
                }`}
                data={getChartData(well)}
                options={getChartOptions()}
                style={{ width: "100%" }}
              />
            </div>
          </Tooltip>
        ))}
      </div>
    </>
  );
};

export default NeuralWellSelector;
