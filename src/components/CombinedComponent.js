import React, { useContext, useEffect, useState, useRef } from "react";
import "../styles/CombinedComponent.css";
import { DataContext } from "./FileHandling/DataProvider.js";
import { LargeGraphOptions } from "../config/LargeGraphOptions.js";
import { LargeGraph } from "./Graphing/LargeGraph/LargeGraph.js";
import { MiniGraphGrid } from "./Graphing/MiniGraphGrid/MiniGraphGrid.js";
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
import deepEqual from "fast-deep-equal"; // for 'deep comparison'
import DynamicAnnotationChart from "./Graphing/FilteredData/DynamicAnnotationChart.js";
import annotationPlugin from "chartjs-plugin-annotation";

Chart.register(...registerables, annotationPlugin);

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
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [enabledFilters, setEnabledFilters] = useState([]);
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

  console.log("enabledFilters: ", enabledFilters);

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
  };

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
      <div className="combined-component__main-container">
        {project ? (
          <>
            <section className="combined-component__wave-container">
              <header className="combined-component__minigraph-header">
                All Waves
              </header>
              <MiniGraphGrid
                className="combined-component__minigraph"
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
              <header className="combined-component__large-graph-header">
                Raw Waves
              </header>
              <LargeGraph
                className="combined-component__large-graph"
                rawGraphData={rawGraphData}
                options={largeGraphConfig}
              />
            </section>

            <section className="combined-component__metrics-filter-container">
              <header className="combined-component__metrics-header">
                Metrics
              </header>
              <div className="combined-component__metrics">
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
                <MetricsControls />
              </div>
              <header className="combined-component__filters-header">
                Filtered Waves
              </header>

              <FilteredGraph
                className="combined-component__filtered-graph"
                wellArrays={wellArrays}
                selectedWellArray={selectedWellArray}
                filteredGraphData={filteredGraphData}
                options={filteredGraphConfig}
              />
              <div className="combined-component__filter-controls">
                <FilterControls
                  wellArrays={wellArrays}
                  selectedFilters={selectedFilters}
                  setSelectedFilters={setSelectedFilters}
                  enabledFilters={enabledFilters}
                  setEnabledFilters={setEnabledFilters}
                  applyEnabledFilters={applyEnabledFilters}
                />
              </div>
            </section>
          </>
        ) : (
          <div className="combined-component__no-data">
            No project data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default CombinedComponent;
