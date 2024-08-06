import React, { useContext, useEffect, useState } from "react";
import "../styles/CombinedComponent.css";
import { DataContext } from "./FileHandling/DataProvider.js";
import { Metrics } from "./Graphing/Metrics/Metrics.js";
import { LargeGraphOptions } from "./Graphing/LargeGraph/Configuration/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
import { FileUploader } from "./FileHandling/FileUploader.js";
// import DrawRectangle from "./Graphing/DrawRectangle/DrawRectangle.js";
import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
import { FilteredGraphOptions } from "./Graphing/FilteredData/Configuration/FilteredGraphOptions.js";
import { FilterControls } from "./Graphing/FilteredData/FilterControls.js";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables); // avoids the error: 'category' is not a registered scale

export const CombinedComponentTest = () => {
  const { project, extractedIndicatorTimes, analysisData } =
    useContext(DataContext); // Accessing context data
  const [selectedWellArray, setSelectedWellArray] = useState([]); // State for selected wells

  const [wellArraysUpdated, setWellArraysUpdated] = useState(false); // State to track well arrays update

  const [largeCanvasWidth] = useState(window.innerWidth / 2); // State for large canvas width
  const [largeCanvasHeight] = useState(window.innerHeight / 2); // State for large canvas height
  const [smallCanvasWidth] = useState(window.innerWidth / 56); // State for small canvas width
  const [smallCanvasHeight] = useState(window.innerHeight / 40); // State for small canvas height

  // Safe access with defaults
  const plate = project?.plate || []; // Access plate from project
  const experiment = plate[0]?.experiments[0] || {}; // Access first experiment from plate
  const wellArrays = experiment.wells || []; // Access wells from experiment
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  ); // Generate column labels based on number of columns
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
  ]; // Predefined row labels

  useEffect(() => {
    if (extractedIndicatorTimes.length > 0) {
      // console.log("Time Data:", extractedIndicatorTimes);
      // console.log("Analysis Data:", analysisData);
      console.log("Project Data:", project);
    }
  }, [extractedIndicatorTimes, analysisData, project]); // Log data when dependencies change

  // Handle selecting a well
  const handleSelectWell = (well) => {
    setSelectedWellArray((prevSelectedWellArray) => [
      ...prevSelectedWellArray,
      well,
    ]);
  };

  // Handle deselecting a well
  const handleDeselectWell = (wellToRemove) => {
    setSelectedWellArray((prevSelectedWellArray) =>
      prevSelectedWellArray.filter((well) => well !== wellToRemove)
    );
  };

  // Handle clicking on a well array (toggle selection)
  const handleWellArrayClick = (index) => {
    const well = wellArrays[index];
    if (selectedWellArray.includes(well)) {
      handleDeselectWell(well);
    } else {
      handleSelectWell(well);
      // console.log("well: key=" + well.key + ", id=" + well.id);
    }
  };

  // Handle clicking the "select all" button
  const handleAllSelectorClick = () => {
    const allSelected = wellArrays.every((well) =>
      selectedWellArray.includes(well)
    );
    setSelectedWellArray(allSelected ? [] : [...wellArrays]);
  };

  // Handle selecting a row of wells
  const handleRowSelectorClick = (rowLabel) => {
    const wellsInRow = wellArrays.filter((well) =>
      well.key.startsWith(rowLabel)
    );
    const allSelected = wellsInRow.every((well) =>
      selectedWellArray.includes(well)
    );
    setSelectedWellArray(
      allSelected
        ? selectedWellArray.filter((well) => !wellsInRow.includes(well))
        : [...selectedWellArray, ...wellsInRow]
    );
  };

  // Handle selecting a column of wells
  const handleColumnSelectorClick = (colIndex) => {
    const wellsInCol = wellArrays.filter(
      (well) => well.column + 1 === colIndex
    );
    const allSelected = wellsInCol.every((well) =>
      selectedWellArray.includes(well)
    );
    setSelectedWellArray(
      allSelected
        ? selectedWellArray.filter((well) => !wellsInCol.includes(well))
        : [...selectedWellArray, ...wellsInCol]
    );
  };

  // Handle click & drag well selection

  // Prepare data for the large graph
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

  // Configure options for the large graph
  const largeGraphConfig = LargeGraphOptions(analysisData);
  const filteredGraphConfig = FilteredGraphOptions(analysisData);
  // console.log("graphData:", graphData);
  // console.log("wellArrays:", wellArrays);
  // console.log("analysisData:", analysisData);
  // console.log("timeData:", extractedIndicatorTimes);

  return (
    <div className="combined-component">
      <FileUploader
        className="file-uploader"
        // setTimeData={setTimeData}
        // setAnalysisData={setAnalysisData}
        setWellArraysUpdated={setWellArraysUpdated} // Set state when well arrays are updated
      />
      <div className="main-container">
        {project ? (
          <>
            {/* <div>Project: {project.title || "No title available"}</div>
            <div>Protocol: {project.protocol || "No protocol available"}</div>
            <div>Date: {project.date || "No date available"}</div>
            <div>Time: {project.time || "No time available"}</div>
            <div>
              Indicator Configurations:{" "}
              {project.plate[0].experiments[0].indicatorConfigurations?.join(
                ", "
              ) || "No configurations available"}
            </div> */}
            <div className="file-and-grid-container">
              <div className="minigraph-header">All Waves</div>
              <MiniGraphGrid
                className="minigraph"
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
                onWellClick={handleWellArrayClick} // Handle clicking on a well
                onRowSelectorClick={handleRowSelectorClick} // Handle selecting a row
                onColumnSelectorClick={handleColumnSelectorClick} // Handle selecting a column
                onAllSelectorClick={handleAllSelectorClick} // Handle selecting all wells
              />
              <div className="minigraph-controls">
                <FilterControls />
              </div>

              <div className="large-graph-header">Raw Waves</div>
              <LargeGraph
                className="large-graph"
                graphData={graphData}
                // width={largeCanvasWidth}
                // height={largeCanvasHeight}
                options={largeGraphConfig}
                // style={{ width: "100%", height: "100%" }} // Set size of the large graph
              />
              <div className="large-graph-controls">
                <FilterControls />
              </div>
            </div>

            <div className="metrics-and-filter-container">
              <div className="metrics-header">Metrics</div>
              <Metrics
                className="metrics"
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
                onWellClick={handleWellArrayClick} // Handle clicking on a well
                onRowSelectorClick={handleRowSelectorClick} // Handle selecting a row
                onColumnSelectorClick={handleColumnSelectorClick} // Handle selecting a column
                onAllSelectorClick={handleAllSelectorClick} // Handle selecting all wells
              />
              <div className="metrics-controls">
                <FilterControls />
              </div>
              <div className="filters-header">Filtered Waves</div>
              <FilteredGraph
                className="filtered-graph"
                project={project}
                graphData={graphData}
                wellArrays={wellArrays}
                selectedWellArray={selectedWellArray}
                timeData={extractedIndicatorTimes}
                columnLabels={columnLabels}
                rowLabels={rowLabels}
                // width={largeCanvasWidth}
                // height={largeCanvasHeight}
                options={filteredGraphConfig}
              />
              <div className="filter-controls">
                <FilterControls />
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

export default CombinedComponentTest;
