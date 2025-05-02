import React, { useContext, useCallback, useEffect } from "react";
import "../../styles/ChartControls.css";
import { AnalysisContext } from "../../AnalysisProvider";
import { DataContext } from "../../../../providers/DataProvider";
import { Button, Typography, IconButton } from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
import debounce from "lodash/debounce";
import { generateCardiacReport } from "../../CardiacReport";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

const ChartControls = ({
  resetZoom,
  useAdjustedBases,
  setUseAdjustedBases,
  setFindPeaksWindowWidth,
  setPeakProminence,
}) => {
  const {
    selectedWell,
    setSelectedWell,
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
    prominenceFactor,
    setProminenceFactor,
    calculateMedianSignal,
    calculateAPDValues,
    findBaselineAndPeak,
  } = useContext(AnalysisContext);
  const { wellArrays } = useContext(DataContext);
  console.log("wellArrays", wellArrays);

  // useEffect to detect changes in findPeaksWindowWidth
  useEffect(() => {
    console.log("findPeaksWindowWidth updated:", findPeaksWindowWidth);
    // Perform any additional updates or actions here if needed
  }, [findPeaksWindowWidth]);

  const incrementProminenceFactor = () => {
    setProminenceFactor((prev) => Math.min(prev + 0.05, 1)); // Cap at 1
  };

  const decrementProminenceFactor = () => {
    setProminenceFactor((prev) => Math.max(prev - 0.05, 0)); // Floor at 0
  };

  const handleGenerateReport = () => {
    generateCardiacReport({
      allWells: wellArrays,
      calculateMedianSignal,
      calculateAPDValues,
      findBaselineAndPeak,
      setSelectedWell,
    });
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
              Peak Prominence: {peakProminence}
              {/* <input
                type="number"
                step={1000}
                value={peakProminence} // Directly use context state
                onChange={(e) => {
                  debouncedSetPeakProminence(e.target.value);
                }}
              /> */}
            </label>
            <label className="parameter-item">
              Prominence Factor: {prominenceFactor.toFixed(2)}
              <IconButton onClick={decrementProminenceFactor} size="small">
                <RemoveIcon />
              </IconButton>
              <IconButton onClick={incrementProminenceFactor} size="small">
                <AddIcon />
              </IconButton>
            </label>
          </div>
          <div className="checkboxes"></div>
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
            <button onClick={handleGenerateReport}>Generate Report</button>
          </div>
        </>
      ) : (
        ""
      )}
    </div>
  );
};

export default ChartControls;
