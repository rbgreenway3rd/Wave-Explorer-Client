// import React, { useEffect, useRef, useState } from "react";
// import { useContext } from "react";
// import { DataContext } from "../../../../providers/DataProvider";
// import { AnalysisContext } from "../../AnalysisProvider";
// import { Line } from "react-chartjs-2";
// // import { getChartOptions } from "../CardiacGraph/ChartOptions";
// import DotWaveLoader from "../../../../assets/animations/DotWaveLoader";
// import "../../styles/WellSelector.css";

// export const WellSelector = () => {
//   const { project, wellArrays, rowLabels, extractedIndicatorTimes } =
//     useContext(DataContext);
//   const { selectedWell, setSelectedWell, handleSelectWell } =
//     useContext(AnalysisContext);
//   const [isRenderingComplete, setIsRenderingComplete] = useState(false);

//   // Extracted plate and experiment data from the project
//   const plate = project?.plate[0] || [];
//   // const xTimes = extractedIndicatorTimes;
//   // Generating labels for columns and rows
//   const columnLabels = Array.from(
//     { length: plate[0]?.numberOfColumns || 0 },
//     (_, i) => i + 1
//   );

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

//   // Update available dimensions on window resize
//   const handleResize = () => {
//     setAvailableWidth(window.innerWidth / 2.3);
//     setAvailableHeight(window.innerHeight / 2.3);
//   };

//   useEffect(() => {
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   const getChartData = (well) => ({
//     datasets: [
//       // {
//       //   label: "Raw Data",
//       //   data: well.indicators[0].rawData,
//       //   borderColor: "rgba(75, 192, 192, 1)",
//       //   borderWidth: 1,
//       //   fill: false,
//       // },
//       {
//         label: "Filtered Data",
//         data: well.indicators[0].filteredData,
//         borderColor: "rgb(153, 102, 255)",
//         borderWidth: 1,
//         fill: false,
//       },
//     ],
//   });

//   const getChartOptions = () => ({
//     normalized: true,
//     maintainAspectRatio: true,
//     responsive: true,
//     // devicePixelRatio: 6, // Match screen pixel density
//     devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

//     spanGaps: false,
//     events: ["onHover"],
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

//   console.log(plate.numberOfRows, plate.numberOfColumns);
//   console.log(plate);

//   useEffect(() => {
//     const canvases = document.querySelectorAll(".well-canvas");
//     canvases.forEach((canvas) => {
//       const context = canvas.getContext("2d");
//       const scale = window.devicePixelRatio || 2;
//       canvas.width = cellWidth * scale;
//       canvas.height = cellHeight * scale;
//       context.scale(scale, scale);
//     });
//   }, [isRenderingComplete, cellWidth, cellHeight]);

//   return (
//     // <div className="well-selector-container">
//     <>
//       {isRenderingComplete ? (
//         <div
//           className="well-grid"
//           style={{
//             display: "grid",
//             // gap: 10,
//             gridTemplateColumns: `repeat(${plate.numberOfColumns}, ${
//               cellWidth / 2
//             }px)`,
//             gridTemplateRows: `repeat(${plate.numberOfRows}, ${
//               cellHeight / 2
//             }px)`,
//             width: (cellWidth / 2) * plate.numberOfColumns,
//             height: (cellHeight / 2) * plate.numberOfRows,
//           }}
//         >
//           {wellArrays.map((well, index) => (
//             <Line
//               type="line"
//               className="well-canvas"
//               data={getChartData(well)}
//               options={getChartOptions()}
//               id={index}
//               style={{
//                 maxWidth: "100%",
//                 maxHeight: "100%",
//                 width: cellWidth / 2,
//                 height: cellHeight / 2,
//               }}
//               onClick={() => handleSelectWell(well)}
//               // objectFit="contain"
//             />
//           ))}
//         </div>
//       ) : (
//         <DotWaveLoader className="dotwave-loader" />
//       )}
//     </>
//   );
// };

// export default WellSelector;
import React, { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { DataContext } from "../../../../providers/DataProvider";
import { AnalysisContext } from "../../AnalysisProvider";
import { Line } from "react-chartjs-2";
import DotWaveLoader from "../../../../assets/animations/DotWaveLoader";
import "../../styles/WellSelector.css";

export const WellSelector = () => {
  const { project, wellArrays, rowLabels, extractedIndicatorTimes } =
    useContext(DataContext);
  const { selectedWell, setSelectedWell, handleSelectWell } =
    useContext(AnalysisContext);
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);

  // Extracted plate and experiment data from the project
  const plate = project?.plate[0] || [];
  // const xTimes = extractedIndicatorTimes;
  // Generating labels for columns and rows
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  );

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

  // Update available dimensions on window resize
  const handleResize = () => {
    setAvailableWidth(window.innerWidth / 2.3);
    setAvailableHeight(window.innerHeight / 2.3);
  };

  // useEffect(() => {
  //   window.addEventListener("resize", handleResize);
  //   return () => window.removeEventListener("resize", handleResize);
  // }, []);

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

  const getChartOptions = () => ({
    normalized: true,
    maintainAspectRatio: false,
    responsive: true,
    devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

    spanGaps: false,
    events: ["onHover"],
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

  // useEffect(() => {
  //   if (isRenderingComplete) {
  //     const canvases = document.querySelectorAll(".well-canvas");
  //     canvases.forEach((canvas) => {
  //       const context = canvas.getContext("2d");
  //       const scale = window.devicePixelRatio || 2;
  //       canvas.width = cellWidth * scale;
  //       canvas.height = cellHeight * scale;
  //       context.scale(scale, scale);
  //     });
  //   }
  // }, [isRenderingComplete, cellWidth, cellHeight]);

  return (
    // <>
    //   {isRenderingComplete ? (
    <div
      className="well-grid"
      style={{
        display: "grid",
        // padding: 1,
        gap: 1,
        gridTemplateColumns: `repeat(${plate.numberOfColumns}, ${(
          cellWidth / 2
        ).toFixed(0)}px)`,
        gridTemplateRows: `repeat(${plate.numberOfRows}, ${(
          cellHeight / 2
        ).toFixed(0)}px)`,
        width: ((cellWidth / 2) * plate.numberOfColumns).toFixed(0),
        height: ((cellHeight / 2) * plate.numberOfRows).toFixed(0),
      }}
    >
      {wellArrays.map((well, index) => (
        <div
          className="well-canvas-container"
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <Line
            type="line"
            className={`well-canvas ${
              selectedWell && selectedWell.id === well.id ? "selected" : ""
            }`}
            data={getChartData(well)}
            options={getChartOptions()}
            id={index}
            style={{
              width: "100%",
              height: "100%",
            }}
            onClick={() => handleSelectWell(well)}
          />
        </div>
      ))}
    </div>
    //   ) : (
    //     <DotWaveLoader className="dotwave-loader" />
    //   )}
    // </>
  );
};

export default WellSelector;
