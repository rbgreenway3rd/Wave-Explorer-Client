import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import "../styles/CombinedComponent.css";
import { NoDataUploaded } from "./NoDataUploaded.js";
import { NavBar } from "./Nav/NavBar.js";
import { DataContext } from "./FileHandling/DataProvider.js";
import { LargeGraphOptions } from "../config/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { LargeGraphControls } from "./Graphing/LargeGraph/LargeGraphControls.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
import { MiniGraphControls } from "./Graphing/MiniGraphGrid/MiniGraphControls.js";
import { MiniGraphOptions } from "../config/MiniGraphOptions.js";
import { FileUploader } from "./FileHandling/FileUploader.js";
import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
import { FilteredGraphOptions } from "../config/FilteredGraphOptions.js";
import { FilterControls } from "./Graphing/FilteredData/FilterControls.js";
import { MetricsControls } from "./Graphing/Metrics/MetricsControls.js";
import { Chart, registerables } from "chart.js";
import Heatmap from "./Graphing/Metrics/Heatmap.js";
import "chartjs-adapter-date-fns";
import {
  handleWellArrayClick,
  handleAllSelectorClick,
  handleRowSelectorClick,
  handleColumnSelectorClick,
} from "../utilities/Helpers.js";
import deepEqual from "fast-deep-equal"; // for deep comparison of project state
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";

// Register Chart.js components and plugins
Chart.register(...registerables, annotationPlugin, zoomPlugin);

// Main component that integrates various functionalities
export const CombinedComponent = (wellArraysUpdated, setWellArraysUpdated) => {
  // Context to manage shared data across components
  const {
    project,
    setProject,
    wellArrays,
    extractedRows,
    extractedColumns,
    extractedIndicatorTimes,
    analysisData,
    showFiltered,
    setShowFiltered,
    selectedWellArray,
    setSelectedWellArray,
    // hoveredSelectedWellId,
    // setHoveredSelectedWellId,
  } = useContext(DataContext);

  // Ref to store the previous project state for comparison
  const prevProjectRef = useRef(null);

  // Zoom and Pan state for LargeGraph
  const [zoomState, setZoomState] = useState(true);
  const [zoomMode, setZoomMode] = useState("xy");
  const [panState, setPanState] = useState(true);
  const [panMode, setPanMode] = useState("xy");
  // Ref to access LargeGraph's chart instance
  const largeGraphRef = useRef(null);

  // Canvas dimensions for graphs

  const [largeCanvasWidth] = useState(window.innerWidth / 2.2);
  const [largeCanvasHeight] = useState(window.innerHeight / 2.2);
  // const [largeCanvasWidth] = useState(window.innerWidth / 2);
  // const [largeCanvasHeight] = useState(window.innerHeight / 2);

  const [smallCanvasWidth] = useState(window.innerWidth / 61.6); // increased by 1.1
  const [smallCanvasHeight] = useState(window.innerHeight / 44); // increased by 1.1
  // const [smallCanvasWidth] = useState(window.innerWidth / 56);
  // const [smallCanvasHeight] = useState(window.innerHeight / 40);

  // State for MiniGraph management
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)
  // State to handle hovering over selectedWell
  const [hoveredWellId, setHoveredWellId] = useState(null);

  // State variables for well arrays and filter management
  // const [wellArraysUpdated, setWellArraysUpdated] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);

  // State variables to store range of y-values inside filteredGraph's annotation box
  const [annotationRangeStart, setAnnotationRangeStart] = useState(null);
  const [annotationRangeEnd, setAnnotationRangeEnd] = useState(null);

  // State variable handling what metrics type is shown in heatmap
  const [metricType, setMetricType] = useState("maxYValue"); // Default metric type

  // Extracted plate and experiment data from the project
  const plate = project?.plate || [];
  // const experiment = plate[0]?.experiments[0] || {};
  // const wellArrays = experiment.wells || [];

  // Generating labels for columns and rows
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

  console.log(
    "extractedRows: ",
    extractedRows,
    "extractedColumns: ",
    extractedColumns
  );

  // Functions to handle zoom state changes
  const toggleZoomState = (currentZoomState) => {
    setZoomState(!currentZoomState);
  };

  const changeZoomMode = (mode) => {
    setZoomMode(mode);
  };

  // Functions to handle pan state changes
  const togglePanState = (currentPanState) => {
    setPanState(!currentPanState);
  };

  const changePanMode = (mode) => {
    setPanMode(mode);
  };

  // Reset zoom handler
  const resetZoom = () => {
    if (largeGraphRef.current) {
      largeGraphRef.current.resetZoom(); // Call resetZoom on the chart instance
    }
  };

  // const handleHoverSelectedWellEnter = (wellId) => {
  //   setHoveredWellId(wellId); // Update hovered well ID on mouse enter
  // };

  // const handleHoverSelectedWellLeave = () => {
  //   setHoveredWellId(null); // Reset hovered well ID on mouse leave
  // };

  // Function to apply enabled filters to well arrays
  const applyEnabledFilters = () => {
    // Step 1: Apply filters to wellArrays and update indicators
    const updatedWellArrays = wellArrays.map((well) => {
      const updatedIndicators = well.indicators.map((indicator) => {
        let filteredData = [...indicator.rawData]; // start with raw data
        enabledFilters.forEach((filter) => {
          if (filter.isEnabled) filteredData = filter.execute(filteredData);
        });
        return { ...indicator, filteredData };
      });
      return { ...well, indicators: updatedIndicators };
    });

    // Step 2: Update the project with the new wellArrays
    const updatedProject = {
      ...project,
      plate: project.plate.map((plate, index) => {
        if (index === 0) {
          return {
            ...plate,
            experiments: plate.experiments.map((experiment, expIndex) => {
              if (expIndex === 0) {
                return {
                  ...experiment,
                  wells: updatedWellArrays,
                };
              }
              return experiment;
            }),
          };
        }
        return plate;
      }),
    };

    // Step 3: Set the updated project in the context
    setProject(updatedProject);

    // Step 4: Sync selectedWellArray with the newly filtered wellArrays
    const updatedSelectedWellArray = selectedWellArray.map(
      (selectedWell) =>
        updatedWellArrays.find((well) => well.id === selectedWell.id) ||
        selectedWell
    );

    // Step 5: Update the selectedWellArray state with the updated wells
    setSelectedWellArray(updatedSelectedWellArray);

    console.log("updated project: ", updatedProject);
    console.log("updated selectedWellArray: ", updatedSelectedWellArray);
    console.log("filters: ", enabledFilters);
  };

  // Effect to track changes in project state
  useEffect(() => {
    if (!deepEqual(prevProjectRef.current, project)) {
      console.log("Project Data:", project);
      prevProjectRef.current = project; // Update the previous project reference only if there's a change
    }
  }, [project]);

  // Preparing graph data for raw and filtered graphs
  const rawGraphData = {
    labels: extractedIndicatorTimes,
    datasets: selectedWellArray.map((well) => ({
      label: well.label,
      data: well.indicators[0]?.rawData,
      fill: false,
      borderColor: "rgb(75, 192, 192)",
      // borderColor: well.id === hoveredWellId ? "red" : "rgb(75, 192, 192)", // Change color if hovered
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

  // Configuration objects for graph options
  const largeGraphConfig = LargeGraphOptions(
    analysisData,
    extractedIndicatorTimes,
    zoomState,
    zoomMode,
    panState,
    panMode
  );
  const filteredGraphConfig = FilteredGraphOptions(
    analysisData,
    wellArrays,
    filteredGraphData,
    extractedIndicatorTimes
  );

  console.log(wellArrays);

  const handleToggleDataShown = () => {
    setIsFiltered((prev) => !prev); // Toggle the filter state
    setShowFiltered((prev) => !prev); // Update context state as well
  };

  const minigraphOptions = useMemo(() => {
    // Collect yValues based on whether showFiltered is true or not
    const yValues = wellArrays.flatMap((well) =>
      showFiltered
        ? well.indicators[0]?.filteredData?.map((point) => point.y) || []
        : well.indicators[0]?.rawData?.map((point) => point.y) || []
    );

    // Return the options object instead of the yValues
    return MiniGraphOptions(
      analysisData,
      extractedIndicatorTimes,
      wellArrays,
      yValues
    );
  }, [analysisData, extractedIndicatorTimes, wellArrays, showFiltered]);

  // Render the component
  return (
    <div className="combined-component">
      <NavBar />
      {/* File uploader to upload project data */}
      {/* <FileUploader setWellArraysUpdated={setWellArraysUpdated} /> */}
      <div className="combined-component__main-container">
        {project ? (
          <>
            {/* Main graphing section */}
            <section className="combined-component__wave-container">
              <header className="combined-component__minigraph-header">
                All Waves
              </header>
              <div
                className="combined-component__minigraph"
                style={{ width: largeCanvasWidth, height: largeCanvasHeight }}
                // onMouseLeave={handleHoverSelectedWellLeave}
              >
                <MiniGraphGrid
                  // handleHoverSelectedWellEnter={handleHoverSelectedWellEnter} // Pass mouse enter handler to MiniGraphGrid
                  minigraphOptions={minigraphOptions}
                  largeCanvasWidth={largeCanvasWidth}
                  largeCanvasHeight={largeCanvasHeight}
                  smallCanvasWidth={smallCanvasWidth}
                  smallCanvasHeight={smallCanvasHeight}
                  columnLabels={columnLabels}
                  rowLabels={rowLabels}
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
              </div>
              <div className="combined-component__minigraph-controls">
                <MiniGraphControls
                  handleToggleDataShown={handleToggleDataShown}
                  isFiltered={isFiltered}
                />
              </div>
              <header className="combined-component__large-graph-header">
                Raw Waves
              </header>
              <div className="combined-component__large-graph">
                <LargeGraph
                  ref={largeGraphRef}
                  zoomState={zoomState}
                  zoomMode={zoomMode}
                  panState={panState}
                  panMode={panMode}
                  rawGraphData={rawGraphData}
                  analysisData={analysisData}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  largeGraphConfig={largeGraphConfig}
                />
              </div>
              <div className="combined-component__large-graph-controls">
                <LargeGraphControls
                  resetZoom={resetZoom}
                  zoomState={zoomState}
                  toggleZoomState={toggleZoomState}
                  changeZoomMode={changeZoomMode}
                  panState={panState}
                  togglePanState={togglePanState}
                  changePanMode={changePanMode}
                />
              </div>
            </section>

            {/* Metrics and filtering section */}
            <section className="combined-component__metrics-filter-container">
              <header className="combined-component__metrics-header">
                Metrics
              </header>
              <div className="combined-component__metrics">
                <Heatmap
                  className="combined-component__metrics"
                  // wellArrays={wellArrays}
                  selectedWellArray={selectedWellArray}
                  timeData={extractedIndicatorTimes}
                  smallCanvasWidth={smallCanvasWidth}
                  smallCanvasHeight={smallCanvasHeight}
                  largeCanvasWidth={largeCanvasWidth}
                  largeCanvasHeight={largeCanvasHeight}
                  columnLabels={columnLabels}
                  rowLabels={rowLabels}
                  analysisData={analysisData}
                  annotationRangeStart={annotationRangeStart}
                  annotationRangeEnd={annotationRangeEnd}
                  metricType={metricType}
                />
              </div>
              <div className="combined-component__metrics-controls">
                <MetricsControls setMetricType={setMetricType} />
              </div>
              <header className="combined-component__filters-header">
                Filtered Waves
              </header>
              <div className="combined-component__filtered-graph">
                <FilteredGraph
                  wellArrays={wellArrays}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  selectedWellArray={selectedWellArray}
                  filteredGraphData={filteredGraphData}
                  annotationRangeStart={annotationRangeStart}
                  annotationRangeEnd={annotationRangeEnd}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                  options={filteredGraphConfig}
                />
              </div>
              <div className="combined-component__filter-controls">
                <FilterControls
                  wellArrays={wellArrays}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  selectedFilters={selectedFilters}
                  setSelectedFilters={setSelectedFilters}
                  enabledFilters={enabledFilters}
                  setEnabledFilters={setEnabledFilters}
                  applyEnabledFilters={applyEnabledFilters}
                  showFiltered={showFiltered}
                  setShowFiltered={setShowFiltered}
                  columnLabels={columnLabels}
                  rowLabels={rowLabels}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                />
              </div>
            </section>
          </>
        ) : (
          <NoDataUploaded className="combined-component__no-data" />
        )}
      </div>
    </div>
  );
};
