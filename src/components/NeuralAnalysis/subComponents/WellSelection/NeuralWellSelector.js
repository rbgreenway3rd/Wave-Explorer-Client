import React, { useEffect, useMemo, useState, useContext } from "react";
import { DataContext } from "../../../../providers/DataProvider";
import { useNeuralSelection } from "../../NeuralProvider";
import { Line } from "react-chartjs-2";
import Tooltip from "@mui/material/Tooltip";
import "../../styles/WellSelector.css";

/**
 * NeuralWellSelector — well grid in the right column of the Neural
 * modal. Its sole interaction is choosing the DISPLAYED well; the
 * parameter/setting well selections (control well, control set, F/Fo
 * exclusion) are made in NeuralWellPickerModal, opened from their panels.
 * This grid still renders read-only highlights for those designated wells
 * so the user can see them in context. Reads selection state directly from
 * NeuralSelectionContext, so the modal passes no props.
 */
const NeuralWellSelector = () => {
  const { project, wellArrays } = useContext(DataContext);
  const {
    selectedWell,
    setSelectedWell,
    controlWell,
    controlWellSet,
    foExcludedWellSet,
  } = useNeuralSelection();
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

  // Memoized so all ~96 mini-charts share one chart.js options object
  // instead of receiving a fresh one on every parent re-render — which
  // forced chart.js to diff and `chart.update()` each instance even
  // when nothing changed about the options.
  const chartOptions = useMemo(
    () => ({
      normalized: true,
      maintainAspectRatio: false,
      responsive: true,
      // DPR capped to 1 — 96–384 tiny canvases at 2× retina is
      // significant memory + draw cost; visual delta is negligible at
      // this surface size.
      devicePixelRatio: 1,
      spanGaps: false,
      events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
      // `false` (not `{ duration: 0 }`) so chart.js skips the animator
      // entirely. Compounds across all well-selector instances.
      animation: false,
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
    }),
    [globalYMin, globalYMax]
  );

  return (
    <>
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
                cursor: "pointer",
              }}
              onClick={() => handleSelectWell(well)}
            >
              <Line
                type="line"
                className={`well-canvas${
                  selectedWell && selectedWell.id === well.id ? " selected" : ""
                }${
                  controlWell && controlWell.id === well.id
                    ? " control-well"
                    : ""
                }${
                  controlWellSet &&
                  controlWellSet.some((w) => w.id === well.id)
                    ? " control-set-well"
                    : ""
                }${
                  foExcludedWellSet &&
                  foExcludedWellSet.some((w) => w.id === well.id)
                    ? " fo-excluded-well"
                    : ""
                }`}
                data={getChartData(well)}
                options={chartOptions}
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
