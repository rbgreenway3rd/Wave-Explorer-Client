import React, {
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
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
import "chartjs-adapter-date-fns";
import {
  handleWellArrayClick,
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../utilities/Helpers.js";
import deepEqual from "fast-deep-equal"; // for 'deep comparison'

Chart.register(...registerables);

export const CombinedComponent = () => {
  const {
    project,
    setProject,
    extractedIndicatorTimes,
    analysisData,
    dispatch,
    showFiltered,
    setShowFiltered,
  } = useContext(DataContext);
  const prevProjectRef = useRef(null); // To store the previous project state
  const [selectedWellArray, setSelectedWellArray] = useState([]);
  const [filteredWellArray, setFilteredWellArray] = useState([]);
  const [wellArraysUpdated, setWellArraysUpdated] = useState(false);

  const [largeCanvasWidth] = useState(window.innerWidth / 2);
  const [largeCanvasHeight] = useState(window.innerHeight / 2);
  const [smallCanvasWidth] = useState(window.innerWidth / 56);
  const [smallCanvasHeight] = useState(window.innerHeight / 40);

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
    if (!deepEqual(prevProjectRef.current, project)) {
      console.log("Project Data:", project);
      prevProjectRef.current = project; // Update the previous project reference only if there's a change
    }
  }, [project]);

  const rawGraphData = {
    labels: extractedIndicatorTimes,
    datasets: selectedWellArray.map((well) => ({
      label: well.label,
      data: well.indicators[0]?.rawData,
      fill: false,
      borderColor: "rgb(75, 192, 192)",
      tension: 0.1,
    })),
  };
  const filteredGraphData = {
    labels: extractedIndicatorTimes,
    datasets: selectedWellArray.map((well) => ({
      label: well.label,
      data: well.indicators[0]?.filteredData,
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
              {/* <div className="minigraph-controls">
                <MiniGraphControls />
              </div> */}
              <div className="large-graph-header">Raw Waves</div>
              <LargeGraph
                className="large-graph"
                rawGraphData={rawGraphData}
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
              {/* <div className="metrics-controls">
                <MiniGraphControls />
              </div> */}
              <div className="filters-header">Filtered Waves</div>
              <FilteredGraph
                project={project}
                wellArrays={wellArrays}
                // filteredWellArray={filteredWellArray}
                filteredGraphData={filteredGraphData}
                // onFilterUpdate={handleFilterUpdate}
                options={filteredGraphConfig}
              />
              <div className="filter-controls">
                <FilterControls
                  wellArrays={wellArrays}
                  // filteredWells={filteredWellArray}
                  // onFilterUpdate={handleFilterUpdate}
                  // onSelectedWellsUpdate={handleSelectedWellsUpdate}
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
