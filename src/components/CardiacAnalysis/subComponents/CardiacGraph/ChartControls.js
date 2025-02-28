// import React, { useContext } from "react";
// import "../../styles/ChartControls.css";
// import { AnalysisContext } from "../../AnalysisProvider";

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
//     showVerticalLines,
//     setShowVerticalLines,
//     showDataPoints,
//     setShowDataPoints,
//   } = useContext(AnalysisContext);
//   const handleShowVerticalLinesChange = (event) => {
//     setShowVerticalLines(event.target.checked);
//   };
//   const handleShowDataPointsChange = (event) => {
//     setShowDataPoints(event.target.checked);
//   };
//   return (
//     <div className="chart-controls">
//       <div className="parameters">
//         <label className="parameter-item">
//           Window width:{" "}
//           <input
//             type="number"
//             step={10}
//             value={findPeaksWindowWidth}
//             onChange={(e) => setFindPeaksWindowWidth(e.target.value)}
//           />
//         </label>
//         <label className="parameter-item">
//           Peak Prominence:{" "}
//           <input
//             type="number"
//             step={1000}
//             value={peakProminence}
//             onChange={(e) => setPeakProminence(e.target.value)}
//           />
//         </label>
//       </div>
//       <div className="checkboxes">
//         <label>
//           <input
//             type="checkbox"
//             checked={useAdjustedBases}
//             onChange={(e) => setUseAdjustedBases(e.target.checked)}
//           />
//           Regressed Bases{" "}
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={showVerticalLines}
//             onChange={handleShowVerticalLinesChange}
//           />
//           Vertical Lines
//         </label>
//         <label>
//           <input
//             type="checkbox"
//             checked={showDataPoints}
//             onChange={handleShowDataPointsChange}
//           />
//           Show DataPoints
//         </label>
//       </div>
//       <div className="button-container">
//         <button onClick={resetZoom}>Reset Zoom</button>
//       </div>
//     </div>
//   );
// };

// export default ChartControls;
import React, { useContext } from "react";
import "../../styles/ChartControls.css";
import { AnalysisContext } from "../../AnalysisProvider";
import { Chart } from "chart.js";
import { Button, Typography } from "@mui/material";
import FitScreenTwoToneIcon from "@mui/icons-material/FitScreenTwoTone";
import zoomPlugin from "chartjs-plugin-zoom";
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
  } = useContext(AnalysisContext);
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

  return (
    <div className="chart-controls">
      {selectedWell ? (
        <>
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
