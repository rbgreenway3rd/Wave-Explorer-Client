// import React, { useEffect, useRef, useState } from "react";
// import { useContext } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import { Chart } from "chart.js";
// import { Line } from "react-chartjs-2";
// import DotWaveLoader from "../../../assets/animations/DotWaveLoader";

// export const WellSelector = () => {
//   const { project, wellArrays, rowLabels } = useContext(DataContext);
//   //   const wells = project?.plate[0]?.experiments[0]?.wells || [];
//   const chartRefs = useRef([]);
//   const gridRef = useRef(null); // Ref to the grid container
//   const [isRenderingComplete, setIsRenderingComplete] = useState(false);

//   // Extracted plate and experiment data from the project
//   const plate = project?.plate || [];

//   // Generating labels for columns and rows
//   const columnLabels = Array.from(
//     { length: plate[0]?.numberOfColumns || 0 },
//     (_, i) => i + 1
//   );

//   useEffect(() => {
//     if (wellArrays.length > 0) {
//       // Introduce a small delay before setting isRenderingComplete
//       const timeout = setTimeout(() => {
//         setIsRenderingComplete(true);
//       }, 1500); // keep loader for at least 1.5 sec

//       return () => clearTimeout(timeout); // Cleanup timeout on component unmount
//     }
//   }, [wellArrays]);

//   const renderChart = (canvas, well, index) => {
//     const ctx = canvas.getContext("2d");

//     // Destroy existing chart instance if it exists
//     if (chartRefs.current[index]) {
//       chartRefs.current[index].destroy();
//     }

//     // Create new chart instance
//     const chartInstance = new Chart(ctx, {
//       type: "line",
//       data: {
//         datasets: [
//           {
//             label: "Raw Data",
//             data: well.indicators[0].rawData,
//             borderColor: "rgba(75, 192, 192, 1)",
//             borderWidth: 1,
//             fill: false,
//           },
//           {
//             label: "Filtered Data",
//             data: well.indicators[0].filteredData,
//             borderColor: "rgba(153, 102, 255, 1)",
//             borderWidth: 1,
//             fill: false,
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         scales: {
//           x: {
//             type: "linear",
//             position: "bottom",
//           },
//         },
//       },
//     });

//     // Store chart instance in ref
//     chartRefs.current[index] = chartInstance;
//   };

//   const chartOptions = {
//     normalized: true,
//     maintainAspectRatio: true,
//     responsive: true,
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
//         // min: Math.min(extractedIndicatorTimes[0]),
//         // max: Math.max(extractedIndicatorTimes[0]),
//         // min: Math.min(...extractedIndicatorTimes[0]),
//         // max: Math.max(...extractedIndicatorTimes[0]),
//         // min: minXValue,
//         // max: maxXValue,
//         ticks: {
//           display: false,
//         },
//         grid: {
//           display: false,
//         },
//       },
//       y: {
//         // min: minYValue,
//         // max: maxYValue,

//         ticks: {
//           display: false,
//         },
//         grid: {
//           display: false,
//         },
//       },
//     },
//   };

//   useEffect(() => {
//     const currentChartRefs = chartRefs.current;

//     wellArrays.forEach((well, index) => {
//       const canvas = document.getElementById(`well-canvas-${index}`);
//       if (canvas) {
//         renderChart(canvas, well, index);
//       }
//     });

//     // Cleanup function to destroy chart instances on unmount
//     return () => {
//       currentChartRefs.forEach((chart) => chart && chart.destroy());
//     };
//   }, [wellArrays]);

//   return (
//     <div className="well-selector-container">
//       {isRenderingComplete ? (
//         <div>
//           {wellArrays.map((well, index) => (
//             <div
//               key={well.id}
//               ref={gridRef}
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
//                 gap: "10px",
//               }}
//             >
//               <Line
//                 data={{
//                   datasets: well.indicators.map((indicator, indIndex) => ({
//                     label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
//                     data: indicator.rawData,
//                     fill: false,
//                     tension: 0.1,
//                     hidden: !indicator.isDisplayed,
//                   })),
//                 }}
//                 options={chartOptions}
//               />
//             </div>
//           ))}
//         </div>
//       ) : (
//         <DotWaveLoader className="dotwave-loader" />
//       )}
//     </div>
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
  const { project, wellArrays, rowLabels } = useContext(DataContext);
  const { selectedWell, setSelectedWell, handleSelectWell } =
    useContext(AnalysisContext);
  const [isRenderingComplete, setIsRenderingComplete] = useState(false);

  // Extracted plate and experiment data from the project
  const plate = project?.plate[0] || [];

  // Generating labels for columns and rows
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  );

  useEffect(() => {
    if (wellArrays.length > 0) {
      // Introduce a small delay before setting isRenderingComplete
      const timeout = setTimeout(() => {
        setIsRenderingComplete(true);
      }, 1500); // keep loader for at least 1.5 sec

      return () => clearTimeout(timeout); // Cleanup timeout on component unmount
    }
  }, [wellArrays]);

  const getChartData = (well) => ({
    datasets: [
      // {
      //   label: "Raw Data",
      //   data: well.indicators[0].rawData,
      //   borderColor: "rgba(75, 192, 192, 1)",
      //   borderWidth: 1,
      //   fill: false,
      // },
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
    maintainAspectRatio: true,
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
        // min: Math.min(extractedIndicatorTimes[0]),
        // max: Math.max(extractedIndicatorTimes[0]),
        // min: Math.min(...extractedIndicatorTimes[0]),
        // max: Math.max(...extractedIndicatorTimes[0]),
        // min: minXValue,
        // max: maxXValue,
        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
      y: {
        // min: minYValue,
        // max: maxYValue,

        ticks: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
  });

  console.log(plate.numberOfRows, plate.numberOfColumns);
  console.log(plate);

  return (
    <div className="well-selector-container">
      {isRenderingComplete ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${plate.numberOfColumns}, 40px)`,
            gridTemplateRows: `repeat(${plate.numberOfRows}, 20px)`,
            gap: "0px",
            border: "0.2em solid black",
            width: "fit-content",
            height: "fit-content",
            padding: "0em",
          }}
        >
          {wellArrays.map((well, index) => (
            <div key={well.id} className="well-canvas-container">
              <Line
                // className="well-canvas"
                className={`well-canvas ${
                  selectedWell?.id === well.id ? "selected" : ""
                }`}
                data={getChartData(well)}
                options={getChartOptions()}
                key={well.id}
                id={index}
                style={{
                  background: "rgb(0, 0, 0)",
                }}
                onClick={() => handleSelectWell(well)}
              />
            </div>
          ))}
          <div>
            {selectedWell ? (
              <div>
                <h3>Selected Well</h3>
                <p>{selectedWell.label}</p>
              </div>
            ) : (
              <div>
                <h3>No Well Selected</h3>
              </div>
            )}
          </div>
        </div>
      ) : (
        <DotWaveLoader className="dotwave-loader" />
      )}
    </div>
  );
};

export default WellSelector;
