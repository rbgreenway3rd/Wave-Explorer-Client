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
  const {
    showVerticalLines,
    setShowVerticalLines,
    showDataPoints,
    setShowDataPoints,
  } = useContext(AnalysisContext);
  const handleShowVerticalLinesChange = (event) => {
    setShowVerticalLines(event.target.checked);
  };
  const handleShowDataPointsChange = (event) => {
    setShowDataPoints(event.target.checked);
  };
  return (
    <div className="chart-controls">
      <div className="parameters">
        <label className="parameter-item">
          Window width:{" "}
          <input
            type="number"
            step={10}
            value={findPeaksWindowWidth}
            onChange={(e) => setFindPeaksWindowWidth(e.target.value)}
          />
        </label>
        <label className="parameter-item">
          Peak Prominence:{" "}
          <input
            type="number"
            step={1000}
            value={peakProminence}
            onChange={(e) => setPeakProminence(e.target.value)}
          />
        </label>
      </div>
      <div className="checkboxes">
        <label>
          <input
            type="checkbox"
            checked={useAdjustedBases}
            onChange={(e) => setUseAdjustedBases(e.target.checked)}
          />
          Regressed Bases{" "}
        </label>
        <label>
          <input
            type="checkbox"
            checked={showVerticalLines}
            onChange={handleShowVerticalLinesChange}
          />
          Vertical Lines
        </label>
        <label>
          <input
            type="checkbox"
            checked={showDataPoints}
            onChange={handleShowDataPointsChange}
          />
          Show DataPoints
        </label>
      </div>
    </div>
  );
};

export default ChartControls;
