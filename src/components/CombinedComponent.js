// import React, { useContext, useEffect, useState } from "react";
// import "../styles/CombinedComponent.css";
// import { DataContext } from "./FileHandling/DataProvider.js";
// import { LargeGraphOptions } from "../config/LargeGraphOptions.js";
// import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
// import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
// import { MiniGraphControls } from "./Graphing/MiniGraphGrid/MiniGraphControls.js";
// import { FileUploader } from "./FileHandling/FileUploader.js";
// import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
// import { FilteredGraphOptions } from "../config/FilteredGraphOptions.js";
// import { FilterControls } from "./Graphing/FilteredData/FilterControls.js";
// import { Chart, registerables } from "chart.js";
// import Heatmap from "./Graphing/Heatmap/Heatmap.js";
// import {
//   handleWellArrayClick,
//   handleAllSelectorClick,
//   handleRowSelectorClick,
//   handleColumnSelectorClick,
// } from "../utilities/Helpers.js";

// Chart.register(...registerables);

// export const CombinedComponent = () => {
//   const { project, extractedIndicatorTimes, analysisData } =
//     useContext(DataContext);
//   const [selectedWellArray, setSelectedWellArray] = useState([]);
//   const [filteredWellArray, setFilteredWellArray] = useState([]);
//   const [wellArraysUpdated, setWellArraysUpdated] = useState(false);

//   const [largeCanvasWidth] = useState(window.innerWidth / 2);
//   const [largeCanvasHeight] = useState(window.innerHeight / 2);
//   const [smallCanvasWidth] = useState(window.innerWidth / 56);
//   const [smallCanvasHeight] = useState(window.innerHeight / 40);

//   const handleFilterUpdate = (newFilteredArray) => {
//     setFilteredWellArray(newFilteredArray);
//   };

//   const handleSelectedWellsUpdate = (selectedWells) => {
//     setSelectedWellArray(selectedWells);
//   };

//   const plate = project?.plate || [];
//   const experiment = plate[0]?.experiments[0] || {};
//   const wellArrays = experiment.wells || [];
//   const columnLabels = Array.from(
//     { length: plate[0]?.numberOfColumns || 0 },
//     (_, i) => i + 1
//   );
//   const rowLabels = [
//     "A",
//     "B",
//     "C",
//     "D",
//     "E",
//     "F",
//     "G",
//     "H",
//     "I",
//     "J",
//     "K",
//     "L",
//     "M",
//     "N",
//     "O",
//     "P",
//   ];

//   useEffect(() => {
//     if (extractedIndicatorTimes.length > 0) {
//       console.log("Project Data:", project);
//     }
//   }, [extractedIndicatorTimes, analysisData, project]);

//   const graphData = {
//     labels: extractedIndicatorTimes,
//     datasets: selectedWellArray.map((well) => ({
//       label: well.label,
//       data: well.indicators[0]?.rawData,
//       fill: false,
//       borderColor: "rgb(75, 192, 192)",
//       tension: 0.1,
//     })),
//   };

//   // const filteredResult = {
//   //   labels: extractedIndicatorTimes,
//   //   datasets: filteredWellArray.map((well) => ({
//   //     label: well.label,
//   //     data: well.indicators[0]?.rawData,
//   //     fill: false,
//   //     borderColor: "rgb(75, 192, 192)",
//   //     tension: 0.1,
//   //   })),
//   // };
//   // console.log("graph data: ", graphData);
//   // console.log("selected well array: ", selectedWellArray);
//   const largeGraphConfig = LargeGraphOptions(analysisData);
//   const filteredGraphConfig = FilteredGraphOptions(analysisData);

//   return (
//     <div className="combined-component">
//       <FileUploader setWellArraysUpdated={setWellArraysUpdated} />
//       <div className="main-container">
//         {project ? (
//           <>
//             <div className="file-and-grid-container">
//               <div className="minigraph-header">All Waves</div>
//               <MiniGraphGrid
//                 wellArrays={wellArrays}
//                 selectedWellArray={selectedWellArray}
//                 timeData={extractedIndicatorTimes}
//                 smallCanvasWidth={smallCanvasWidth}
//                 smallCanvasHeight={smallCanvasHeight}
//                 largeCanvasWidth={largeCanvasWidth}
//                 largeCanvasHeight={largeCanvasHeight}
//                 columnLabels={columnLabels}
//                 rowLabels={rowLabels}
//                 analysisData={analysisData}
//                 onWellClick={(index) =>
//                   handleWellArrayClick(
//                     index,
//                     wellArrays,
//                     selectedWellArray,
//                     setSelectedWellArray
//                   )
//                 }
//                 onRowSelectorClick={(rowLabel) =>
//                   handleRowSelectorClick(
//                     rowLabel,
//                     wellArrays,
//                     selectedWellArray,
//                     setSelectedWellArray
//                   )
//                 }
//                 onColumnSelectorClick={(colIndex) =>
//                   handleColumnSelectorClick(
//                     colIndex,
//                     wellArrays,
//                     selectedWellArray,
//                     setSelectedWellArray
//                   )
//                 }
//                 onAllSelectorClick={() =>
//                   handleAllSelectorClick(
//                     wellArrays,
//                     selectedWellArray,
//                     setSelectedWellArray
//                   )
//                 }
//               />
//               <div className="minigraph-controls">
//                 <MiniGraphControls />
//               </div>
//               <div className="large-graph-header">Raw Waves</div>
//               <LargeGraph
//                 className="large-graph"
//                 graphData={graphData}
//                 options={largeGraphConfig}
//               />
//               <div className="large-graph-controls">
//                 <FilterControls />
//               </div>
//             </div>
//             <div className="metrics-and-filter-container">
//               <div className="metrics-header">Metrics</div>
//               <Heatmap
//                 wellArrays={wellArrays}
//                 selectedWellArray={selectedWellArray}
//                 timeData={extractedIndicatorTimes}
//                 smallCanvasWidth={smallCanvasWidth}
//                 smallCanvasHeight={smallCanvasHeight}
//                 largeCanvasWidth={largeCanvasWidth}
//                 largeCanvasHeight={largeCanvasHeight}
//                 columnLabels={columnLabels}
//                 rowLabels={rowLabels}
//                 analysisData={analysisData}
//               />
//               <div className="metrics-controls">
//                 <MiniGraphControls />
//               </div>
//               <div className="filters-header">Filtered Waves</div>
//               <FilteredGraph
//                 // project={project}
//                 // filteredData={filteredResult}
//                 wellArrays={wellArrays}
//                 filteredWellArray={filteredWellArray}
//                 onFilterUpdate={handleFilterUpdate}
//                 // selectedWellArray={selectedFilteredWellArray}
//                 // timeData={extractedIndicatorTimes}
//                 // columnLabels={columnLabels}
//                 // rowLabels={rowLabels}
//                 options={filteredGraphConfig}
//               />
//               <div className="filter-controls">
//                 <FilterControls
//                   wellArrays={wellArrays}
//                   filteredWells={filteredWellArray}
//                   onFilterUpdate={handleFilterUpdate}
//                 />
//               </div>
//             </div>
//           </>
//         ) : (
//           <div>No project data available.</div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CombinedComponent;
import React, { useContext, useEffect, useState } from "react";
import "../styles/CombinedComponent.css";
import { DataContext } from "./FileHandling/DataProvider.js";
import { LargeGraphOptions } from "../config/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
import { MiniGraphControls } from "./Graphing/MiniGraphGrid/MiniGraphControls.js";
import { FileUploader } from "./FileHandling/FileUploader.js";
import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
import { FilteredGraphOptions } from "../config/FilteredGraphOptions.js";
import { FilterControls } from "./Graphing/FilteredData/FilterControls.js";
import { Chart, registerables } from "chart.js";
import Heatmap from "./Graphing/Heatmap/Heatmap.js";
import {
  handleWellArrayClick,
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../utilities/Helpers.js";

Chart.register(...registerables);

export const CombinedComponent = () => {
  const { project, extractedIndicatorTimes, analysisData } =
    useContext(DataContext);
  const [selectedWellArray, setSelectedWellArray] = useState([]);
  const [filteredWellArray, setFilteredWellArray] = useState([]);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);

  const [largeCanvasWidth] = useState(window.innerWidth / 2);
  const [largeCanvasHeight] = useState(window.innerHeight / 2);
  const [smallCanvasWidth] = useState(window.innerWidth / 56);
  const [smallCanvasHeight] = useState(window.innerHeight / 40);

  const handleFilterUpdate = (newFilteredArray) => {
    setFilteredWellArray(newFilteredArray);
  };

  const handleSelectedWellsUpdate = (selectedWells) => {
    setSelectedWellArray(selectedWells);
  };

  const plate = project?.plate || [];
  const experiment = plate[0]?.experiments[0] || {};
  const wellArrays = experiment.wells || [];
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  );
  const rowLabels = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
  ];

  useEffect(() => {
    if (extractedIndicatorTimes.length > 0) {
      console.log("Project Data:", project);
    }
  }, [extractedIndicatorTimes, analysisData, project]);

  const graphData = {
    labels: extractedIndicatorTimes,
    datasets: selectedWellArray.map((well) => ({
      label: well.label,
      data: well.indicators[0]?.rawData,
      fill: false,
      borderColor: "rgb(75, 192, 192)",
      tension: 0.1,
    })),
  };

  const largeGraphConfig = LargeGraphOptions(analysisData);
  const filteredGraphConfig = FilteredGraphOptions(analysisData);

  return (
    <div className="combined-component">
      <FileUploader setWellArraysUpdated={setWellArraysUpdated} />
      <div className="main-container">
        {project ? (
          <>
            <div className="file-and-grid-container">
              <div className="minigraph-header">All Waves</div>
              <MiniGraphGrid
                wellArrays={wellArrays}
                selectedWellArray={selectedWellArray}
                timeData={extractedIndicatorTimes}
                smallCanvasWidth={smallCanvasWidth}
                smallCanvasHeight={smallCanvasHeight}
                largeCanvasWidth={largeCanvasWidth}
                largeCanvasHeight={largeCanvasHeight}
                columnLabels={columnLabels}
                rowLabels={rowLabels}
                analysisData={analysisData}
                onWellClick={(index) =>
                  handleWellArrayClick(
                    index,
                    wellArrays,
                    selectedWellArray,
                    setSelectedWellArray
                  )
                }
                onRowSelectorClick={(rowLabel) =>
                  handleRowSelectorClick(
                    rowLabel,
                    wellArrays,
                    selectedWellArray,
                    setSelectedWellArray
                  )
                }
                onColumnSelectorClick={(colIndex) =>
                  handleColumnSelectorClick(
                    colIndex,
                    wellArrays,
                    selectedWellArray,
                    setSelectedWellArray
                  )
                }
                onAllSelectorClick={() =>
                  handleAllSelectorClick(
                    wellArrays,
                    selectedWellArray,
                    setSelectedWellArray
                  )
                }
              />
              <div className="minigraph-controls">
                <MiniGraphControls />
              </div>
              <div className="large-graph-header">Raw Waves</div>
              <LargeGraph
                className="large-graph"
                graphData={graphData}
                options={largeGraphConfig}
              />
            </div>
            <div className="metrics-and-filter-container">
              <div className="metrics-header">Metrics</div>
              <Heatmap
                wellArrays={wellArrays}
                selectedWellArray={selectedWellArray}
                timeData={extractedIndicatorTimes}
                smallCanvasWidth={smallCanvasWidth}
                smallCanvasHeight={smallCanvasHeight}
                largeCanvasWidth={largeCanvasWidth}
                largeCanvasHeight={largeCanvasHeight}
                columnLabels={columnLabels}
                rowLabels={rowLabels}
                analysisData={analysisData}
              />
              <div className="metrics-controls">
                <MiniGraphControls />
              </div>
              <div className="filters-header">Filtered Waves</div>
              <FilteredGraph
                wellArrays={wellArrays}
                filteredWellArray={filteredWellArray}
                onFilterUpdate={handleFilterUpdate}
                options={filteredGraphConfig}
              />
              <div className="filter-controls">
                <FilterControls
                  wellArrays={wellArrays}
                  filteredWells={filteredWellArray}
                  onFilterUpdate={handleFilterUpdate}
                  onSelectedWellsUpdate={handleSelectedWellsUpdate}
                />
              </div>
            </div>
          </>
        ) : (
          <div>No project data available.</div>
        )}
      </div>
    </div>
  );
};

export default CombinedComponent;
