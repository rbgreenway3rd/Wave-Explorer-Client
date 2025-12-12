import React, { useEffect, useState, useContext } from "react";
import { DataContext } from "../../../../providers/DataProvider";
import { NeuralContext } from "../../NeuralProvider";
import { Line } from "react-chartjs-2";
import Tooltip from "@mui/material/Tooltip";
import "../../styles/WellSelector.css";
import { findBaseline } from "../../../CardiacAnalysis/utilities/FindBaseline";
import { calculateMedianSignal } from "../../../CardiacAnalysis/utilities/CalculateMedianSignal";
import { applyMedianFilter } from "../../../CardiacAnalysis/utilities/MedianFilter";
import { calculatePeakProminence } from "../../../CardiacAnalysis/utilities/CalculatePeakProminence";
import { calculateWindowWidth } from "../../../CardiacAnalysis/utilities/CalculateWindowWidth";
import { findPeaks } from "../../../CardiacAnalysis/utilities/PeakFinder";

const NeuralWellSelector = ({
  noiseSuppressionActive = false,
  controlWell,
  setControlWell,
  selectingControl = false,
  setSelectingControl = () => {},
}) => {
  const { project, wellArrays, rowLabels, extractedIndicatorTimes } =
    useContext(DataContext);
  const { selectedWell, setSelectedWell, peakResults, setPeakResults } =
    useContext(NeuralContext);
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);
  const [showMedianGrid, setShowMedianGrid] = useState(false);
  const [filteredMedianData, setFilteredMedianData] = useState({});
  const [globalYMin, setGlobalYMin] = useState(null);
  const [globalYMax, setGlobalYMax] = useState(null);
  // selectingControl and setSelectingControl are now passed as props from parent

  // Extracted plate and experiment data from the project
  const plate = project?.plate[0] || [];

  // State for grid and cell dimensions, accounting for button areas
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth / 2.3);
  const [availableHeight, setAvailableHeight] = useState(
    window.innerHeight / 2.3
  );

  const cellWidth = availableWidth / plate.numberOfColumns;
  const cellHeight = availableHeight / plate.numberOfRows;

  const handleSelectWell = (well) => {
    setPeakResults([]);
    setSelectedWell(well);
  };

  useEffect(() => {
    if (wellArrays.length > 0) {
      const timeout = setTimeout(() => {
        setIsRenderingComplete(true);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [wellArrays]);

  const getChartData = (well) => ({
    datasets: [
      {
        label: "Filtered Data",
        data: well.indicators[0].filteredData,
        borderColor: "rgb(153, 102, 255)",
        borderWidth: 1,
        fill: false,
      },
    ],
  });

  const getFilteredMedianData = (well) => ({
    datasets: [
      {
        label: "Processed Data",
        data: filteredMedianData[well.id] || [],
        borderColor: "rgb(255, 217, 1)",
        borderWidth: 1,
        fill: false,
      },
    ],
  });

  // find max and min y values across all wells for consistent y-axis scaling
  useEffect(() => {
    let min = Infinity,
      max = -Infinity;
    wellArrays.forEach((well) => {
      (well.indicators[0].filteredData || []).forEach((point) => {
        if (point.y < min) min = point.y;
        if (point.y > max) max = point.y;
      });
    });
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
