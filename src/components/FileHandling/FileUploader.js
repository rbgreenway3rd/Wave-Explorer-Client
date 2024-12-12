import React, { useContext, useEffect, useState } from "react";
import "./FileUploader.css";
import { DataContext } from "../../providers/DataProvider.js";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import { styled } from "@mui/material/styles";

export const FileUploader = ({ setWellArraysUpdated, setFile }) => {
  // Row labels for wells

  const {
    extractedIndicators,

    extractedLines,
    extractedRows,
    rowLabels,
    extractedColumns,
    extractedProjectTitle,
    extractedProjectDate,
    extractedProjectTime,
    extractedProjectInstrument,
    extractedProjectProtocol,
    extractedAssayPlateBarcode,
    extractedAddPlateBarcode,
    extractedBinning,
    extractedIndicatorConfigurations,
    extractedOperator,
    extractedIndicatorTimes,
    extractAllData,
    analysisData,
    selectedWellArray,
    setSelectedWellArray,
    project,
    setProject,
    wellArrays,
    updateWellArrays,
  } = useContext(DataContext); // Accessing context data

  const [dataExtracted, setDataExtracted] = useState(false); // State to track if data is extracted

  useEffect(() => {
    if (dataExtracted) {
      distributeData(rowLabels, analysisData, extractedIndicatorTimes); // Distribute data after extraction
    }
  }, [dataExtracted, analysisData, extractedIndicatorTimes, rowLabels]);

  // Generate well label based on row and column
  const getWellLabel = (row, col) => {
    return row < 26
      ? String.fromCharCode(row + 65) + String(col + 1).padStart(2, "0")
      : "A" + String.fromCharCode(row + 40) + String(col + 1).padStart(2, "0");
  };

  const distributeData = (
    rowLabels,
    analysisData, // Expecting an object with indicator names as keys, each containing an array of data points
    extractedIndicatorTimes // Expecting an object with indicator names as keys, each containing an array of time points
  ) => {
    const plateDimensions = extractedRows * extractedColumns;

    const newProject = new Project(
      extractedProjectTitle,
      extractedProjectDate,
      extractedProjectTime,
      extractedProjectInstrument,
      extractedProjectProtocol
    ); // Create new project

    const newPlate = new Plate(
      extractedRows,
      extractedColumns,
      extractedAssayPlateBarcode,
      extractedAddPlateBarcode,
      plateDimensions
    ); // Create new plate

    newProject.plate.push(newPlate);

    const newExperiment = new Experiment(
      extractedBinning,
      extractedRows,
      extractedColumns,
      extractedIndicatorConfigurations,
      extractedOperator
    ); // Create new experiment

    newPlate.experiments.push(newExperiment);

    let newWellArrays = [];
    let wellId = 1;

    for (let rowIndex = 0; rowIndex < rowLabels.length; rowIndex++) {
      for (let colIndex = 1; colIndex <= extractedColumns; colIndex++) {
        const wellKey = `${rowLabels[rowIndex]}${colIndex}`;
        const wellLabel = getWellLabel(rowIndex, colIndex - 1);

        const newWell = new Well(
          wellId++,
          wellKey,
          wellLabel,
          colIndex - 1,
          rowIndex
        ); // Create new well

        // Loop through each indicator for the well
        let indicatorId = 0;
        for (let indicatorName in analysisData) {
          let indicatorData = [];
          let timeData = extractedIndicatorTimes[indicatorName];
          let i = 0;

          // Collect data for this indicator in the current well
          for (
            let y = rowIndex * extractedColumns + (colIndex - 1);
            y < analysisData[indicatorName].length;
            y += extractedRows * extractedColumns
          ) {
            indicatorData.push({
              x: timeData[i],
              y: analysisData[indicatorName][y],
            });
            i++;
          }

          const indicator = new Indicator(
            indicatorId++,
            indicatorName,
            indicatorData, // filteredData is initially set to the raw data
            [...indicatorData], // Copy of the data for rawData
            timeData, // Time points specific to this indicator
            true
          ); // Create new indicator and add to well

          newWell.indicators.push(indicator);
        }

        newExperiment.wells.push(newWell); // Add well to experiment
        newWellArrays.push(newWell); // Add well to array
      }
    }

    setWellArraysUpdated(true); // Notify that well arrays are updated
    setSelectedWellArray([]);
    setProject(newProject); // Set the new project in context

    console.log(newProject);
    console.log("extractedIndicators: ", extractedIndicators);
  };

  // Handle file selection and reading
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target.result;

        await extractAllData(fileContent); // Extract all data from file

        setDataExtracted(true); // Set state to trigger data distribution
      };
      reader.readAsText(file); // Read file as text
    }
  };

  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    // minWidth: 3,
    width: 1,
  });

  return (
    <Tooltip title="Choose File" arrow>
      <Button
        component="label"
        variant="contained"
        className={!project ? "glow-button" : ""} // Apply glow class if no project
        style={{
          padding: 0,
          marginRight: "1.5em",
          minWidth: 30,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "10%",
        }}
      >
        <DriveFolderUploadIcon />
        <VisuallyHiddenInput
          type="file"
          accept="file/dat, .dat"
          onChange={handleFileSelect}
        />
      </Button>
    </Tooltip>
  );
};

export default FileUploader;
