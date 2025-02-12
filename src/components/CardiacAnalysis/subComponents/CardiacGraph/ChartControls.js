import React from "react";
import "../../styles/ChartControls.css";

const ChartControls = ({
  useAdjustedBases,
  setUseAdjustedBases,
  findPeaksWindowWidth,
  setFindPeaksWindowWidth,
  peakProminence,
  setPeakProminence,
}) => {
  return (
    <div
      className="chart-controls"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <label>
        Use Adjusted Bases{" "}
        <input
          type="checkbox"
          checked={useAdjustedBases}
          onChange={(e) => setUseAdjustedBases(e.target.checked)}
        />
      </label>
      <label>
        Window width:{" "}
        <input
          type="number"
          step={10}
          value={findPeaksWindowWidth}
          onChange={(e) => setFindPeaksWindowWidth(e.target.value)}
        />
      </label>
      <label>
        Peak Prominence:{" "}
        <input
          type="number"
          step={1000}
          value={peakProminence}
          onChange={(e) => setPeakProminence(e.target.value)}
        />
      </label>
    </div>
  );
};

export default ChartControls;
