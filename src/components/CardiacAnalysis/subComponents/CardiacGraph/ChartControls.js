import React, { useContext } from "react";
import "../../styles/ChartControls.css";
import { AnalysisContext } from "../../AnalysisProvider";

const ChartControls = ({
  useAdjustedBases,
  setUseAdjustedBases,
  findPeaksWindowWidth,
  setFindPeaksWindowWidth,
  peakProminence,
  setPeakProminence,
  onToggleVerticalLines,
}) => {
  const { showVerticalLines, setShowVerticalLines } =
    useContext(AnalysisContext);
  const handleCheckboxChange = (event) => {
    setShowVerticalLines(event.target.checked);
  };
  return (
    <div className="chart-controls" style={{ width: "100%" }}>
      <label>
        Use Normalized Bases{" "}
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
      <label>
        <input
          type="checkbox"
          checked={showVerticalLines}
          onChange={handleCheckboxChange}
        />
        Show Vertical Lines
      </label>
    </div>
  );
};

export default ChartControls;
