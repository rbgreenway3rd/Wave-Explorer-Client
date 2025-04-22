import React, { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { DataContext } from "../../../../providers/DataProvider";
import { AnalysisContext } from "../../AnalysisProvider";
import { Line } from "react-chartjs-2";
import DotWaveLoader from "../../../../assets/animations/DotWaveLoader";
import Tooltip from "@mui/material/Tooltip";
import "../../styles/WellSelector.css";
import { findBaseline } from "../../utilities/FindBaseline";
import { calculateMedianSignal } from "../../utilities/CalculateMedianSignal";
import { applyMedianFilter } from "../../utilities/MedianFilter";
import { calculatePeakProminence } from "../../utilities/CalculatePeakProminence";
import { calculateWindowWidth } from "../../utilities/CalculateWindowWidth";
import { findPeaks } from "../../utilities/PeakFinder";

// export const WellSelector = () => {
//   const { project, wellArrays, rowLabels, extractedIndicatorTimes } =
//     useContext(DataContext);
//   const { selectedWell, setSelectedWell, handleSelectWell } =
//     useContext(AnalysisContext);
//   const [isRenderingComplete, setIsRenderingComplete] = useState(false);
//   const [showMedianGrid, setShowMedianGrid] = useState(false);

//   // Extracted plate and experiment data from the project
//   const plate = project?.plate[0] || [];

//   // State for grid and cell dimensions, accounting for button areas
//   const [availableWidth, setAvailableWidth] = useState(window.innerWidth / 2.3);
//   const [availableHeight, setAvailableHeight] = useState(
//     window.innerHeight / 2.3
//   );

//   const cellWidth = availableWidth / plate.numberOfColumns;
//   const cellHeight = availableHeight / plate.numberOfRows;

//   useEffect(() => {
//     if (wellArrays.length > 0) {
//       // Introduce a small delay before setting isRenderingComplete
//       const timeout = setTimeout(() => {
//         setIsRenderingComplete(true);
//       }, 1500); // keep loader for at least 1.5 sec

//       return () => clearTimeout(timeout); // Cleanup timeout on component unmount
//     }
//   }, [wellArrays]);

//   const getChartData = (well) => ({
//     datasets: [
//       {
//         label: "Filtered Data",
//         data: well.indicators[0].filteredData,
//         borderColor: "rgb(153, 102, 255)",
//         borderWidth: 1,
//         fill: false,
//       },
//     ],
//   });

//   const getFilteredMedianData = (well) => {
//     // Step 1: Run filteredData through findBaseline
//     let baselineData = findBaseline(well.indicators[0].filteredData);

//     // Step 2: Calculate peak prominence
//     let prominence = calculatePeakProminence(baselineData);

//     // Step 3: Calculate window width
//     let windowWidth = calculateWindowWidth(baselineData, prominence);

//     // Step 4: Find peaks
//     let peakResults = findPeaks(baselineData, prominence, windowWidth);

//     // Step 5: Calculate the median signal
//     let medianSignal = calculateMedianSignal(
//       baselineData,
//       peakResults,
//       windowWidth
//     );

//     // Step 6: Apply the median filter
//     let filteredMedianSignal = applyMedianFilter(medianSignal, 5); // Example windowSize, adjust as needed

//     return {
//       datasets: [
//         {
//           label: "Processed Data",
//           data: filteredMedianSignal,
//           borderColor: "rgb(255, 99, 132)",
//           borderWidth: 1,
//           fill: false,
//         },
//       ],
//     };
//   };

//   const getChartOptions = () => ({
//     normalized: true,
//     maintainAspectRatio: false,
//     responsive: true,
//     devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

//     spanGaps: false,
//     events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
//     animation: {
//       duration: 0,
//     },
//     parsing: false,
//     plugins: {
//       legend: false,
//       decimation: {
//         enabled: true,
//         algorithm: "lttb",
//         samples: 40,
//         threshold: 80,
//       },
//       tooltip: {
//         enabled: false, // set to FALSE if using an external function for tooltip
//         mode: "nearest",
//         intersect: false,
//       },
//     },
//     elements: {
//       point: {
//         radius: 0,
//       },
//       line: {
//         borderWidth: 1.5,
//       },
//     },
//     layout: {
//       autoPadding: false,
//       padding: {
//         left: -30,
//         bottom: -30,
//       },
//     },
//     scales: {
//       x: {
//         type: "time",

//         ticks: {
//           display: false,
//         },
//         grid: {
//           display: false,
//         },
//       },
//       y: {
//         ticks: {
//           display: false,
//         },
//         grid: {
//           display: false,
//         },
//       },
//     },
//   });

//   return (
//     <>
//       <div style={{ display: "flex" }}>
//         <button style={{ width: "100%" }} onClick={setShowMedianGrid(false)}>
//           Original
//         </button>
//         <button style={{ width: "100%" }} onClick={setShowMedianGrid(true)}>
//           Median
//         </button>
//       </div>
//       <div
//         className="well-grid"
//         style={{
//           display: "grid",
//           gap: 1,
//           gridTemplateColumns: `repeat(${plate.numberOfColumns}, ${(
//             cellWidth / 2
//           ).toFixed(0)}fr)`,
//           gridTemplateRows: `repeat(${plate.numberOfRows}, ${(
//             cellHeight / 2
//           ).toFixed(0)}fr)`,
//         }}
//       >
//         {wellArrays.map((well, index) => (
//           <Tooltip
//             key={index}
//             title={`${well.key}`} // Tooltip content
//             arrow
//             PopperProps={{
//               modifiers: [
//                 {
//                   name: "offset",
//                   options: {
//                     offset: [0, 5], // Adjust the offset [horizontal, vertical]
//                   },
//                 },
//               ],
//             }}
//           >
//             <div
//               style={{
//                 width: "100%",
//                 height: "100%",
//                 maxHeight: cellHeight / 1.5,
//                 maxWidth: cellWidth / 1.5,
//               }}
//             >
//               <Line
//                 type="line"
//                 className={`well-canvas ${
//                   selectedWell && selectedWell.id === well.id ? "selected" : ""
//                 }`}
//                 data={
//                   showMedianGrid
//                     ? getFilteredMedianData(well)
//                     : getChartData(well)
//                 }
//                 options={getChartOptions()}
//                 onClick={() => handleSelectWell(well)}
//               />
//             </div>
//           </Tooltip>
//         ))}
//       </div>
//     </>
//   );
// };

// export default WellSelector;
export const WellSelector = () => {
  const { project, wellArrays, rowLabels, extractedIndicatorTimes } =
    useContext(DataContext);
  const { selectedWell, setSelectedWell, handleSelectWell } =
    useContext(AnalysisContext);
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);
  const [showMedianGrid, setShowMedianGrid] = useState(false);
  const [filteredMedianData, setFilteredMedianData] = useState({}); // Cache for precomputed data

  // Extracted plate and experiment data from the project
  const plate = project?.plate[0] || [];

  // State for grid and cell dimensions, accounting for button areas
  const [availableWidth, setAvailableWidth] = useState(window.innerWidth / 2.3);
  const [availableHeight, setAvailableHeight] = useState(
    window.innerHeight / 2.3
  );

  const cellWidth = availableWidth / plate.numberOfColumns;
  const cellHeight = availableHeight / plate.numberOfRows;

  useEffect(() => {
    if (wellArrays.length > 0) {
      // Introduce a small delay before setting isRenderingComplete
      const timeout = setTimeout(() => {
        setIsRenderingComplete(true);
      }, 1500); // keep loader for at least 1.5 sec

      return () => clearTimeout(timeout); // Cleanup timeout on component unmount
    }
  }, [wellArrays]);

  // Precompute filtered median data when showMedianGrid is toggled to true
  useEffect(() => {
    if (showMedianGrid) {
      const computedData = {};
      wellArrays.forEach((well) => {
        const baselineData = findBaseline(well.indicators[0].filteredData);
        const prominence = calculatePeakProminence(baselineData);
        const windowWidth = calculateWindowWidth(baselineData, prominence);
        const peakResults = findPeaks(baselineData, prominence, windowWidth);
        const medianSignal = calculateMedianSignal(
          baselineData,
          peakResults,
          windowWidth
        );
        const filteredMedianSignal = applyMedianFilter(medianSignal, 5); // Example windowSize
        computedData[well.id] = filteredMedianSignal;
      });
      setFilteredMedianData(computedData);
    }
  }, [showMedianGrid, wellArrays]);

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

  const getChartOptions = () => ({
    normalized: true,
    maintainAspectRatio: false,
    responsive: true,
    devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

    spanGaps: false,
    events: ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
    animation: {
      duration: 0,
    },
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
        enabled: false, // set to FALSE if using an external function for tooltip
        mode: "nearest",
        intersect: false,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        borderWidth: 1.5,
      },
    },
    layout: {
      autoPadding: false,
      padding: {
        left: -30,
        bottom: -30,
      },
    },
    scales: {
      x: {
        type: "time",

        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
  });

  return (
    <>
      <div style={{ display: "flex" }}>
        <button
          style={{ width: "100%" }}
          onClick={() => setShowMedianGrid(false)}
        >
          Original
        </button>
        <button
          style={{ width: "100%" }}
          onClick={() => setShowMedianGrid(true)}
        >
          Median
        </button>
      </div>
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
            title={`${well.key}`} // Tooltip content
            arrow
            PopperProps={{
              modifiers: [
                {
                  name: "offset",
                  options: {
                    offset: [0, 5], // Adjust the offset [horizontal, vertical]
                  },
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
              }}
            >
              <Line
                type="line"
                className={`well-canvas ${
                  showMedianGrid ? "median-grid" : ""
                } ${
                  selectedWell && selectedWell.id === well.id ? "selected" : ""
                }`}
                data={
                  showMedianGrid
                    ? getFilteredMedianData(well)
                    : getChartData(well)
                }
                options={getChartOptions()}
                onClick={() => handleSelectWell(well)}
              />
            </div>
          </Tooltip>
        ))}
      </div>
    </>
  );
};

export default WellSelector;
