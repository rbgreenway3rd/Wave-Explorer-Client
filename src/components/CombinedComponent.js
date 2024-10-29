import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import "../styles/CombinedComponent.css";
import { NoDataUploaded } from "./NoDataUploaded.js";
import { NavBar } from "./Nav/NavBar.js";
import { DataContext } from "../providers/DataProvider.js";
import { LargeGraphOptions } from "../config/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { LargeGraphControls } from "./Graphing/LargeGraph/LargeGraphControls.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
import { MiniGraphControls } from "./Graphing/MiniGraphGrid/MiniGraphControls.js";
import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
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
} from "../utilities/Handlers.js";
import deepEqual from "fast-deep-equal"; // for deep comparison of project state
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { ControlSubtraction_Filter } from "./Graphing/FilteredData/FilterModels.js";

// Register Chart.js components and plugins
Chart.register(...registerables, annotationPlugin, zoomPlugin);

// Main component that integrates various functionalities
export const CombinedComponent = () => {
  // Context to manage shared data across components
  const {
    project,
    setProject,
    wellArrays,
    extractedIndicatorTimes,
    analysisData,
    showFiltered,
    setShowFiltered,
    selectedWellArray,
    setSelectedWellArray,
    enabledFilters,
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

  // const [largeCanvasWidth] = useState(window.innerWidth / 2);
  // const [largeCanvasHeight] = useState(window.innerHeight / 2);
  // const [smallCanvasWidth] = useState(window.innerWidth / 56);
  // const [smallCanvasHeight] = useState(window.innerHeight / 40);
  const [largeCanvasWidth, setLargeCanvasWidth] = useState(
    window.innerWidth / 2.3
    // window.innerWidth / 2.5
  );
  const [largeCanvasHeight, setLargeCanvasHeight] = useState(
    window.innerHeight / 2.3
    // window.innerHeight / 2.5
  );
  const [smallCanvasWidth, setSmallCanvasWidth] = useState(
    window.innerWidth / 64.4
    // window.innerWidth / 70
  );
  const [smallCanvasHeight, setSmallCanvasHeight] = useState(
    window.innerHeight / 46
    // window.innerHeight / 50
  );

  const handleResize = () => {
    // setLargeCanvasWidth(window.innerWidth / 2.5);
    // setLargeCanvasHeight(window.innerHeight / 2.5);
    // setSmallCanvasWidth(window.innerWidth / 70);
    // setSmallCanvasHeight(window.innerHeight / 50);
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
    setSmallCanvasWidth(window.innerWidth / 64.4);
    setSmallCanvasHeight(window.innerHeight / 46);
  };

  // State for MiniGraph management
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

  // State variables to store range of y-values inside filteredGraph's annotation box
  const [annotations, setAnnotations] = useState([]);
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

  // console.log(
  //   "extractedRows: ",
  //   extractedRows,
  //   "extractedColumns: ",
  //   extractedColumns
  // );
  // Resize handler function

  // Effect to listen to window resize events
  useEffect(() => {
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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

  // Function to apply enabled filters to well arrays
  const applyEnabledFilters = () => {
    console.log(enabledFilters);

    // Step 0: reset filtered data to raw data for all wells by copying the wellArrays
    const updatedWellArrays = wellArrays.map((well) => ({
      ...well,
      indicators: well.indicators.map((indicator) => ({
        ...indicator,
        filteredData: [...indicator.rawData], // Reset filteredData
      })),
    }));

    // Step 1: Apply filters to the copied updatedWellArrays and update indicators
    for (let f = 0; f < enabledFilters.length; f++) {
      // if this filter is a ControlSubtraction_Filter, then first calculate the average curve for the control wells
      if (enabledFilters[f] instanceof ControlSubtraction_Filter) {
        enabledFilters[f].calculate_average_curve(updatedWellArrays);
      }
      enabledFilters[f].execute(updatedWellArrays);
    }

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
                  wells: updatedWellArrays, // Use the updated wellArrays
                };
              }
              return experiment;
            }),
          };
        }
        return plate;
      }),
    };

    // Step 3: Set the updated project in the context, triggering wellArrays update
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

  const handleToggleDataShown = () => {
    setIsFiltered((prev) => !prev); // Toggle the filter state
    setShowFiltered((prev) => !prev); // Update context state as well
  };

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
                  analysisData={analysisData}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  // minigraphOptions={minigraphOptions}
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
                  // className="combined-component__metrics"
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
                <MetricsControls
                  setMetricType={setMetricType}
                  annotations={annotations}
                  annotationRangeStart={annotationRangeStart}
                  annotationRangeEnd={annotationRangeEnd}
                  setAnnotations={setAnnotations}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                />
              </div>
              <header className="combined-component__filters-header">
                Filtered Waves
              </header>
              <div className="combined-component__filtered-graph">
                <FilteredGraph
                  analysisData={analysisData}
                  wellArrays={wellArrays}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  selectedWellArray={selectedWellArray}
                  filteredGraphData={filteredGraphData}
                  annotations={annotations}
                  setAnnotations={setAnnotations}
                  annotationRangeStart={annotationRangeStart}
                  annotationRangeEnd={annotationRangeEnd}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                  // options={filteredGraphConfig}
                />
              </div>
              <div className="combined-component__filter-controls">
                <FilterControls
                  wellArrays={wellArrays}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  // selectedFilters={selectedFilters}
                  // setSelectedFilters={setSelectedFilters}
                  // enabledFilters={enabledFilters}
                  // setEnabledFilters={setEnabledFilters}
                  applyEnabledFilters={applyEnabledFilters}
                  showFiltered={showFiltered}
                  setShowFiltered={setShowFiltered}
                  columnLabels={columnLabels}
                  rowLabels={rowLabels}
                  annotations={annotations}
                  setAnnotations={setAnnotations}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                  largeCanvasWidth={largeCanvasWidth}
                  largeCanvasHeight={largeCanvasHeight}
                  smallCanvasWidth={smallCanvasWidth}
                  smallCanvasHeight={smallCanvasHeight}
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
