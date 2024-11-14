import React, { useContext, useEffect, useState, useRef, useMemo } from "react";
import "../styles/CombinedComponent.css";
import { NoDataUploaded } from "./NoDataUploaded.js";
import { NavBar } from "./Nav/NavBar.js";
import { DataContext } from "../providers/DataProvider.js";
import { LargeGraphOptions } from "./Graphing/config/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { LargeGraphControls } from "./Graphing/LargeGraph/LargeGraphControls.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
import { MiniGraphControls } from "./Graphing/MiniGraphGrid/MiniGraphControls.js";
import { FilteredGraph } from "./Graphing/FilteredData/FilteredGraph.js";
import { FilteredGraphOptions } from "./Graphing/config/FilteredGraphOptions.js";
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
    rowLabels,
    extractedIndicatorTimes,
    analysisData,
    showFiltered,
    setShowFiltered,
    selectedWellArray,
    setSelectedWellArray,
    enabledFilters,
    extractedIndicators,
    savedMetrics,
    selectedFilters,
    // selectedIndicators,
    // setSelectedIndicators,
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

  // Ref to access FilteredGraph's chart instance
  const filteredGraphRef = useRef(null);

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
  const [metricIndicator, setMetricIndicator] = useState(0); // Defaults to first indicator

  // Extracted plate and experiment data from the project
  const plate = project?.plate || [];
  // const experiment = plate[0]?.experiments[0] || {};
  // const wellArrays = experiment.wells || [];

  // Generating labels for columns and rows
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  );

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

  const applyEnabledFilters = () => {
    console.log(enabledFilters);

    // Step 0: reset filtered data to raw data for all wells by copying the wellArrays
    const updatedWellArrays = wellArrays.map((well) => ({
      ...well,
      indicators: well.indicators.map((indicator) => {
        // Reset filteredData without deep cloning the entire indicator
        indicator.filteredData = indicator.rawData.map((point) => ({
          ...point,
        }));
        return indicator;
      }),
    }));

    // Step 1: Apply filters to the copied updatedWellArrays and update indicators
    for (let f = 0; f < enabledFilters.length; f++) {
      if (enabledFilters[f] instanceof ControlSubtraction_Filter) {
        enabledFilters[f].calculate_average_curve(updatedWellArrays);
      }
      enabledFilters[f].execute(updatedWellArrays);
    }

    // Update the project and selectedWellArray as before
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
    setProject(updatedProject);

    const updatedSelectedWellArray = selectedWellArray.map(
      (selectedWell) =>
        updatedWellArrays.find((well) => well.id === selectedWell.id) ||
        selectedWell
    );
    setSelectedWellArray(updatedSelectedWellArray);

    console.log("updated project: ", updatedProject);
    console.log("updated selectedWellArray: ", updatedSelectedWellArray);
    console.log("filters: ", enabledFilters);
  };

  const handleToggleVisibility = (indicatorId) => {
    // Create a deep clone of the project to avoid mutating the original object directly
    const updatedProject = { ...project };
    updatedProject.plate = updatedProject.plate.map((plate) => ({
      ...plate,
      experiments: plate.experiments.map((experiment) => ({
        ...experiment,
        wells: experiment.wells.map((well) => {
          const updatedIndicators = well.indicators.map((indicator) => {
            if (indicator.id === indicatorId) {
              // Toggle the 'isDisplayed' state using the setDisplayed method
              const newIsDisplayed = !indicator.isDisplayed;
              indicator.setDisplayed(newIsDisplayed); // Directly toggle the property
            }
            // console.log(
            //   "indicator.id: ",
            //   indicator.id,
            //   "indicatorId: ",
            //   indicatorId
            // );
            return indicator;
          });
          return { ...well, indicators: updatedIndicators };
        }),
      })),
    }));
    let indicatorTimes = Object.values(extractedIndicatorTimes);
    // Update the project in the context
    console.log("extractedIndicatorTimes: ", indicatorTimes[0]);
    console.log("savedMetrics: ", savedMetrics);
    console.log("selectedFilters: ", selectedFilters);
    console.log(updatedProject);
    setProject(updatedProject);
  };
  // Effect to track changes in project state
  useEffect(() => {
    if (!deepEqual(prevProjectRef.current, project)) {
      console.log("Project Data:", project);

      console.log("newInd: ", extractedIndicators);
      prevProjectRef.current = project; // Update the previous project reference only if there's a change
    }
  }, [project, wellArrays]);

  // Preparing graph data for raw and filtered graphs
  // Preparing graph data for raw and filtered graphs, considering all displayed indicators
  // Define a color palette to differentiate indicators
  const indicatorColors = [
    "rgb(75, 192, 192)", // Teal
    "rgb(255, 99, 132)", // Red
    "rgb(54, 162, 235)", // Blue
    "rgb(255, 206, 86)", // Yellow
    "rgb(153, 102, 255)", // Purple
    "rgb(255, 159, 64)", // Orange
    // Add more colors as needed
  ];

  // Preparing graph data for raw and filtered graphs, using color differentiation for each indicator
  const rawGraphData = {
    labels: extractedIndicatorTimes.Green, // Adjust based on your indicator-specific times
    datasets: selectedWellArray.flatMap((well, wellIndex) =>
      well.indicators
        // .filter((indicator) => indicator.isDisplayed)
        .map((indicator, indIndex) => ({
          label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
          data: indicator.rawData,
          fill: false,
          borderColor: indicatorColors[indIndex % indicatorColors.length], // Cycle colors
          tension: 0.1,
          hidden: !indicator.isDisplayed,
        }))
    ),
  };

  const filteredGraphData = {
    labels: extractedIndicatorTimes.Green, // Adjust based on your indicator-specific times
    datasets: selectedWellArray.flatMap((well, wellIndex) =>
      well.indicators
        // .filter((indicator) => indicator.isDisplayed)
        .map((indicator, indIndex) => ({
          label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
          data: indicator.filteredData,
          fill: false,
          borderColor: indicatorColors[indIndex % indicatorColors.length], // Cycle colors
          tension: 0.1,
          hidden: !indicator.isDisplayed,
        }))
    ),
  };

  // Configuration objects for graph options
  const largeGraphConfig = LargeGraphOptions(
    analysisData,
    wellArrays,
    extractedIndicatorTimes,
    zoomState,
    zoomMode,
    panState,
    panMode
  );

  // Generate the chart options with dynamic min/max y-values
  const filteredGraphConfig = FilteredGraphOptions(
    analysisData,
    wellArrays,
    filteredGraphData,
    extractedIndicatorTimes,
    annotations
    // minYValue,
    // maxYValue
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
                  handleToggleVisibility={handleToggleVisibility}
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
                  metricIndicator={metricIndicator}
                />
              </div>
              <div className="combined-component__metrics-controls">
                <MetricsControls
                  setMetricType={setMetricType}
                  metricIndicator={metricIndicator}
                  setMetricIndicator={setMetricIndicator}
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
                  ref={filteredGraphRef}
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
                  filteredGraphConfig={filteredGraphConfig}
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
