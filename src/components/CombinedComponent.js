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
  handleScreenshot,
} from "../utilities/Handlers.js";
import deepEqual from "fast-deep-equal"; // for deep comparison of project state
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import { ControlSubtraction_Filter } from "./Graphing/FilteredData/FilterModels.js";
import html2canvas from "html2canvas";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { AddAPhotoTwoTone } from "@mui/icons-material";
import AddAPhotoTwoToneIcon from "@mui/icons-material/AddAPhotoTwoTone";
import { motion } from "framer-motion";

// Register Chart.js components and plugins
Chart.register(...registerables, annotationPlugin, zoomPlugin);

// Main component that integrates various functionalities
export const CombinedComponent = ({ profile }) => {
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
    annotations,
    setAnnotations,
    overlayRawAndFiltered,
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

  // Ref to access each component instance for use in screenshotting
  const combinedComponentRef = useRef(null);
  const miniGraphGridComponentRef = useRef(null);
  const largeGraphComponentRef = useRef(null);
  const heatmapComponentRef = useRef(null);
  const filteredGraphComponentRef = useRef(null);

  // Canvas dimensions for graphs

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
    setLargeCanvasWidth(window.innerWidth / 2.3);
    setLargeCanvasHeight(window.innerHeight / 2.3);
    setSmallCanvasWidth(window.innerWidth / 64.4);
    setSmallCanvasHeight(window.innerHeight / 46);
  };

  // State for MiniGraph management
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

  // State variables to store range of y-values inside filteredGraph's annotation box
  // const [annotations, setAnnotations] = useState([]);
  const [annotationRangeStart, setAnnotationRangeStart] = useState(null);
  const [annotationRangeEnd, setAnnotationRangeEnd] = useState(null);

  // State variable handling what metrics type is shown in heatmap
  const [metricType, setMetricType] = useState("Max"); // Default metric type
  const [metricIndicator, setMetricIndicator] = useState(0); // Defaults to first indicator

  // State for tracking filter application progress
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [isLoadingFilterResults, setIsLoadingFilterResults] = useState(false);

  // Extracted plate and experiment data from the project
  const plate = project?.plate || [];

  // Generating labels for columns and rows
  const columnLabels = Array.from(
    { length: plate[0]?.numberOfColumns || 0 },
    (_, i) => i + 1
  );

  // Effect to listen to window resize events
  useEffect(() => {
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Shows window alert before refresh
  useEffect(() => {
    const onBeforeUnload = (ev) => {
      ev.returnValue = "prevent reload";
      return "prevent reload";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
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

  const applyEnabledFilters = async () => {
    setIsApplyingFilters(true); // Move this to the very start
    setIsLoadingFilterResults(true);
    console.log("Applying filters started...");
    console.log("filters: ", selectedFilters);
    setTimeout(async () => {
      try {
        const updatedWellArrays = wellArrays.map((well) => ({
          ...well,
          indicators: well.indicators.map((indicator) => {
            indicator.filteredData = indicator.rawData.map((point) => ({
              ...point,
            }));
            return indicator;
          }),
        }));

        for (let f = 0; f < enabledFilters.length; f++) {
          if (enabledFilters[f] instanceof ControlSubtraction_Filter) {
            enabledFilters[f].calculate_average_curve(updatedWellArrays);
          }
          await enabledFilters[f].execute(updatedWellArrays);
        }

        const updatedProject = {
          ...project,
          plate: project.plate.map((plate, index) => ({
            ...plate,
            experiments: plate.experiments.map((experiment, expIndex) => ({
              ...experiment,
              wells: updatedWellArrays,
            })),
          })),
        };

        setProject(updatedProject);
        const updatedSelectedWellArray = selectedWellArray.map(
          (selectedWell) =>
            updatedWellArrays.find((well) => well.id === selectedWell.id) ||
            selectedWell
        );
        setSelectedWellArray(updatedSelectedWellArray);
      } catch (error) {
        console.error("Error applying filters:", error);
      } finally {
        setIsApplyingFilters(false);
        setIsLoadingFilterResults(false);
      }
    }, 0);
  };

  const handleResetFilteredData = () => {
    if (!wellArrays || !wellArrays.length) return;

    // Deep copy wells and reset filteredData
    const resetWellArrays = wellArrays.map((well) => ({
      ...well,
      indicators: well.indicators.map((indicator) => ({
        ...indicator,
        filteredData: indicator.rawData.map((point) => ({ ...point })),
      })),
    }));

    // Update project
    if (typeof setProject === "function" && project) {
      const updatedProject = {
        ...project,
        plate: project.plate.map((plate) => ({
          ...plate,
          experiments: plate.experiments.map((experiment) => ({
            ...experiment,
            wells: resetWellArrays,
          })),
        })),
      };
      setProject(updatedProject);
    }

    // Update selectedWellArray
    if (typeof setSelectedWellArray === "function" && selectedWellArray) {
      const updatedSelectedWellArray = selectedWellArray.map(
        (selectedWell) =>
          resetWellArrays.find((well) => well.id === selectedWell.id) ||
          selectedWell
      );
      setSelectedWellArray(updatedSelectedWellArray);
    }
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
            return indicator;
          });
          return { ...well, indicators: updatedIndicators };
        }),
      })),
    }));
    let indicatorTimes = Object.values(extractedIndicatorTimes);
    // Update the project in the context
    // console.log("extractedIndicatorTimes: ", indicatorTimes[0]);
    // console.log("savedMetrics: ", savedMetrics);
    // console.log("selectedFilters: ", selectedFilters);
    console.log(updatedProject);
    setProject(updatedProject);
  };
  // Effect to track changes in project state
  useEffect(() => {
    if (!deepEqual(prevProjectRef.current, project)) {
      // console.log("Project Data:", project);

      // console.log("newInd: ", extractedIndicators);
      prevProjectRef.current = project; // Update the previous project reference only if there's a change
    }
  }, [project, wellArrays]);

  // Defined color palette to differentiate between different indicators
  const indicatorColors = [
    "rgb(75, 192, 192)", // Teal
    "rgb(255, 99, 132)", // Red
    "rgb(54, 162, 235)", // Blue
    "rgb(255, 206, 86)", // Yellow
    "rgb(153, 102, 255)", // Purple
    "rgb(255, 159, 64)", // Orange
  ];

  // Preparing graph data for raw and filtered graphs, using color differentiation for each indicator
  console.log(extractedIndicatorTimes);
  let indicatorTimes = Object.values(extractedIndicatorTimes);

  // Prepare data for raw graph
  const rawGraphData = {
    labels: indicatorTimes[0], // Adjust based on your indicator-specific times
    datasets: selectedWellArray.flatMap((well, wellIndex) =>
      well.indicators.map((indicator, indIndex) => ({
        label: `${well.label} - Indicator ${indIndex + 1}`, // Label for each indicator
        data: indicator.rawData,
        fill: false,
        borderColor: indicatorColors[indIndex % indicatorColors.length], // Cycle colors
        tension: 0.1,
        hidden: !indicator.isDisplayed,
      }))
    ),
  };

  // Prepare data for filtered graph
  const filteredGraphData = {
    labels: indicatorTimes[0], // Adjust based on your indicator-specific times
    datasets: selectedWellArray.flatMap((well, wellIndex) =>
      well.indicators.map((indicator, indIndex) => ({
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
  );

  const handleToggleDataShown = () => {
    setIsFiltered((prev) => !prev); // Toggle the filter state
    setShowFiltered((prev) => !prev); // Update context state as well
  };

  // Render the component
  return (
    <div className="combined-component">
      <NavBar combinedComponentRef={combinedComponentRef} profile={profile} />
      <div
        className="combined-component__main-container"
        ref={combinedComponentRef}
      >
        {project ? (
          <div
            style={{
              cursor: isApplyingFilters ? "wait" : "default",
            }}
          >
            {" "}
            <section className="combined-component__wave-container">
              <header className="combined-component__minigraph-header">
                <Typography
                  style={{
                    marginRight: "1em",
                    fontWeight: "bold",
                    fontSize: 15,
                  }}
                >
                  All Waves
                </Typography>
                <Tooltip
                  title="Capture Screenshot of 'All Waves' Grid"
                  disableInteractive
                  arrow
                  placement="top"
                >
                  <IconButton
                    onClick={() => handleScreenshot(miniGraphGridComponentRef)}
                  >
                    <AddAPhotoTwoTone
                      sx={{
                        fontSize: "0.75em",
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </header>
              <div
                className="combined-component__minigraph"
                ref={miniGraphGridComponentRef}
              >
                <MiniGraphGrid
                  analysisData={analysisData}
                  extractedIndicatorTimes={extractedIndicatorTimes}
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
                <Typography style={{ marginRight: "1em", fontWeight: "bold" }}>
                  Raw Waves
                </Typography>
                <Tooltip
                  title="Capture Screenshot of 'Raw Waves' Graph"
                  disableInteractive
                  arrow
                  placement="top"
                >
                  <IconButton
                    onClick={() => handleScreenshot(largeGraphComponentRef)}
                  >
                    <AddAPhotoTwoTone
                      sx={{
                        fontSize: "0.75em",
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </header>
              <div
                className="combined-component__large-graph"
                ref={largeGraphComponentRef}
              >
                <LargeGraph
                  ref={largeGraphRef}
                  zoomState={zoomState}
                  zoomMode={zoomMode}
                  panState={panState}
                  panMode={panMode}
                  rawGraphData={rawGraphData}
                  filteredGraphData={filteredGraphData}
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
            <section className="combined-component__metrics-filter-container">
              <header className="combined-component__metrics-header">
                <Typography style={{ marginRight: "1em", fontWeight: "bold" }}>
                  Metrics
                </Typography>
                <Tooltip
                  title="Capture Screenshot of 'Metrics' Heatmap"
                  disableInteractive
                  arrow
                >
                  <IconButton
                    onClick={() => handleScreenshot(heatmapComponentRef)}
                  >
                    <AddAPhotoTwoTone
                      sx={{
                        fontSize: "0.75em",
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </header>
              <div
                className="combined-component__metrics"
                ref={heatmapComponentRef}
              >
                <Heatmap
                  selectedWellArray={selectedWellArray}
                  timeData={extractedIndicatorTimes}
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
                  // annotations={annotations}
                  annotationRangeStart={annotationRangeStart}
                  annotationRangeEnd={annotationRangeEnd}
                  // setAnnotations={setAnnotations}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                />
              </div>
              <header className="combined-component__filters-header">
                <Typography style={{ marginRight: "1em", fontWeight: "bold" }}>
                  Filtered Waves
                </Typography>
                <Tooltip
                  title="Capture Screenshot of 'Filtered Waves' Graph"
                  disableInteractive
                  arrow
                >
                  <IconButton
                    onClick={() => handleScreenshot(filteredGraphComponentRef)}
                  >
                    <AddAPhotoTwoTone
                      sx={{
                        fontSize: "0.75em",
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </header>
              <div
                className="combined-component__filtered-graph"
                ref={filteredGraphComponentRef}
              >
                <FilteredGraph
                  analysisData={analysisData}
                  wellArrays={wellArrays}
                  extractedIndicatorTimes={extractedIndicatorTimes}
                  selectedWellArray={selectedWellArray}
                  filteredGraphData={filteredGraphData}
                  // annotations={annotations}
                  // setAnnotations={setAnnotations}
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
                  applyEnabledFilters={applyEnabledFilters}
                  showFiltered={showFiltered}
                  setShowFiltered={setShowFiltered}
                  columnLabels={columnLabels}
                  rowLabels={rowLabels}
                  // annotations={annotations}
                  // setAnnotations={setAnnotations}
                  setAnnotationRangeStart={setAnnotationRangeStart}
                  setAnnotationRangeEnd={setAnnotationRangeEnd}
                  handleResetFilteredData={handleResetFilteredData}
                />
              </div>
            </section>
          </div>
        ) : (
          <NoDataUploaded className="combined-component__no-data" />
        )}
      </div>
    </div>
  );
};
