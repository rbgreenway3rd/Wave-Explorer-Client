// import React, { useContext } from "react";
// import "../../styles/ChartControls.css";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { Chart } from "chart.js";
// import { Button, Typography } from "@mui/material";
// import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
// import zoomPlugin from "chartjs-plugin-zoom";
// Chart.register(zoomPlugin);

// const ChartControls = ({
//   resetZoom,
//   useAdjustedBases,
//   setUseAdjustedBases,
//   findPeaksWindowWidth,
//   setFindPeaksWindowWidth,
//   peakProminence,
//   setPeakProminence,
//   onToggleVerticalLines,
// }) => {
//   const {
//     selectedWell,
//     showVerticalLines,
//     setShowVerticalLines,
//     showDataPoints,
//     setShowDataPoints,
//     showAscentPoints,
//     showDescentPoints,
//     setShowAscentPoints,
//     setShowDescentPoints,
//   } = useContext(AnalysisContext);
//   const handleShowVerticalLinesChange = (event) => {
//     setShowVerticalLines(event.target.checked);
//   };
//   const handleShowDataPointsChange = (event) => {
//     setShowDataPoints(event.target.checked);
//   };
//   const handleShowAscentPointsChange = (event) => {
//     setShowAscentPoints(event.target.checked);
//   };
//   const handleShowDescentPointsChange = (event) => {
//     setShowDescentPoints(event.target.checked);
//   };

//   return (
//     <div className="chart-controls">
//       {selectedWell ? (
//         <>
//           <div className="parameters">
//             <label className="parameter-item">
//               Window width:{" "}
//               <input
//                 type="number"
//                 step={1}
//                 value={findPeaksWindowWidth}
//                 onChange={(e) => setFindPeaksWindowWidth(e.target.value)}
//               />
//             </label>
//             <label className="parameter-item">
//               Peak Prominence:{" "}
//               <input
//                 type="number"
//                 step={1000}
//                 value={peakProminence}
//                 onChange={(e) => setPeakProminence(e.target.value)}
//               />
//             </label>
//           </div>
//           <div className="checkboxes">
//             <label>
//               <input
//                 type="checkbox"
//                 checked={useAdjustedBases}
//                 onChange={(e) => setUseAdjustedBases(e.target.checked)}
//               />
//               Use Regressed Bases
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 checked={showVerticalLines}
//                 onChange={handleShowVerticalLinesChange}
//               />
//               Amplitude Lines
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 checked={showDataPoints}
//                 onChange={handleShowDataPointsChange}
//               />
//               Show Raw Data Points
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 checked={showAscentPoints}
//                 onChange={handleShowAscentPointsChange}
//               />
//               Show Ascent Points
//             </label>
//             <label>
//               <input
//                 type="checkbox"
//                 checked={showDescentPoints}
//                 onChange={handleShowDescentPointsChange}
//               />
//               Show Decent Points
//             </label>
//           </div>
//           <div>
//             <Button
//               className="reset-zoom-button"
//               variant="outlined"
//               onClick={resetZoom}
//             >
//               <FitScreenTwoToneIcon />
//               <Typography align="center" variant="h1">
//                 Reset Zoom
//               </Typography>
//             </Button>
//           </div>
//         </>
//       ) : (
//         ""
//       )}
//     </div>
//   );
// };

// export default ChartControls;
import React, { useState, useEffect, useCallback, useContext } from "react";
import "../../styles/ChartControls.css";
import { AnalysisContext } from "../../AnalysisProvider";
import { Chart } from "chart.js";
import { Button, Typography } from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
import zoomPlugin from "chartjs-plugin-zoom";
import debounce from "lodash/debounce";

Chart.register(zoomPlugin);

const ChartControls = ({
  resetZoom,
  useAdjustedBases,
  setUseAdjustedBases,
  findPeaksWindowWidth,
  setFindPeaksWindowWidth,
  peakProminence,
  setPeakProminence,
  onToggleVerticalLines,
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
  } = useContext(AnalysisContext);

  // Local state for input values
  const [windowWidthInput, setWindowWidthInput] = useState(
    findPeaksWindowWidth.toString()
  );
  const [peakProminenceInput, setPeakProminenceInput] = useState(
    peakProminence.toString()
  );

  // Sync local state with props when props change
  useEffect(() => {
    setWindowWidthInput(findPeaksWindowWidth.toString());
  }, [findPeaksWindowWidth]);

  useEffect(() => {
    setPeakProminenceInput(peakProminence.toString());
  }, [peakProminence]);

  // Debounced setters for updating parent state
  const debouncedSetWindowWidth = useCallback(
    debounce((value) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setFindPeaksWindowWidth(numValue);
      }
    }, 1000),
    [setFindPeaksWindowWidth]
  );

  const debouncedSetPeakProminence = useCallback(
    debounce((value) => {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setPeakProminence(numValue);
      }
    }, 500),
    [setPeakProminence]
  );

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
              Window width:{" "}
              <input
                type="text"
                value={windowWidthInput}
                onChange={(e) => {
                  setWindowWidthInput(e.target.value);
                  debouncedSetWindowWidth(e.target.value);
                }}
              />
            </label>
            <label className="parameter-item">
              Peak Prominence:{" "}
              <input
                type="text"
                value={peakProminenceInput}
                onChange={(e) => {
                  setPeakProminenceInput(e.target.value);
                  debouncedSetPeakProminence(e.target.value);
                }}
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
            </label>
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
