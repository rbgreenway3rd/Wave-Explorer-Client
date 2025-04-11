import React, { useContext, useCallback, useEffect } from "react";
import "../../styles/ChartControls.css";
import { AnalysisContext } from "../../AnalysisProvider";
import { Button, Typography } from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
import debounce from "lodash/debounce";

const ChartControls = ({
  resetZoom,
  useAdjustedBases,
  setUseAdjustedBases,
  setFindPeaksWindowWidth,
  setPeakProminence,
}) => {
  const {
    selectedWell,
    showVerticalLines,
    setShowVerticalLines,
    showDataPoints,
    setShowDataPoints,
    showAscentPoints,
    showDescentPoints,
    setShowAscentPoints,
    setShowDescentPoints,
    showBaselineData,
    setShowBaselineData,
    showSelectedData,
    setShowSelectedData,
    findPeaksWindowWidth, // From context
    peakProminence, // From context
  } = useContext(AnalysisContext);

  // Debounced setters for updating parent state
  const debouncedSetWindowWidth = useCallback(
    debounce((value) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFindPeaksWindowWidth(numValue);
      }
    }, 250),
    [setFindPeaksWindowWidth]
  );

  const debouncedSetPeakProminence = useCallback(
    debounce((value) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setPeakProminence(numValue);
      }
    }, 0),
    [setPeakProminence]
  );

  // useEffect to detect changes in findPeaksWindowWidth
  useEffect(() => {
    console.log("findPeaksWindowWidth updated:", findPeaksWindowWidth);
    // Perform any additional updates or actions here if needed
  }, [findPeaksWindowWidth]);

  // Checkbox handlers (unchanged)
  const handleShowVerticalLinesChange = (event) => {
    setShowVerticalLines(event.target.checked);
  };
  const handleShowDataPointsChange = (event) => {
    setShowDataPoints(event.target.checked);
  };
  const handleShowAscentPointsChange = (event) => {
    setShowAscentPoints(event.target.checked);
  };
  const handleShowDescentPointsChange = (event) => {
    setShowDescentPoints(event.target.checked);
  };

  const handleShowBaselineDataChange = (event) => {
    setShowBaselineData(event.target.checked);
  };

  const handleShowSelectedDataChange = (event) => {
    setShowSelectedData(event.target.checked);
  };

  return (
    <div className="chart-controls">
      {selectedWell ? (
        <>
          <div className="parameters">
            <label className="parameter-item">
              Window width: {findPeaksWindowWidth}
            </label>
            <label className="parameter-item">
              Peak Prominence:{" "}
              <input
                type="number"
                step={1000}
                value={peakProminence} // Directly use context state
                onChange={(e) => {
                  debouncedSetPeakProminence(e.target.value);
                }}
              />
            </label>
          </div>
          <div className="checkboxes">
            {/* <label>
              <input
                type="checkbox"
                checked={useAdjustedBases}
                onChange={(e) => setUseAdjustedBases(e.target.checked)}
              />
              Use Regressed Bases
            </label>
            <label>
              <input
                type="checkbox"
                checked={showVerticalLines}
                onChange={handleShowVerticalLinesChange}
              />
              Amplitude Lines
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDataPoints}
                onChange={handleShowDataPointsChange}
              />
              Show Raw Data Points
            </label>
            <label>
              <input
                type="checkbox"
                checked={showAscentPoints}
                onChange={handleShowAscentPointsChange}
              />
              Show Ascent Points
            </label>
            <label>
              <input
                type="checkbox"
                checked={showDescentPoints}
                onChange={handleShowDescentPointsChange}
              />
              Show Decent Points
            </label>
            <label>
              <input
                type="checkbox"
                checked={showBaselineData}
                onChange={handleShowBaselineDataChange}
              />
              Show Regularized Wave
            </label>
            <label>
              <input
                type="checkbox"
                checked={showSelectedData}
                onChange={handleShowSelectedDataChange}
              />
              Show Raw Wave
            </label> */}
          </div>
          <div>
            <Button
              className="reset-zoom-button"
              variant="outlined"
              onClick={resetZoom}
            >
              <FitScreenTwoToneIcon />
              <Typography align="center" variant="h1">
                Reset Zoom
              </Typography>
            </Button>
          </div>
        </>
      ) : (
        ""
      )}
    </div>
  );
};

export default ChartControls;
