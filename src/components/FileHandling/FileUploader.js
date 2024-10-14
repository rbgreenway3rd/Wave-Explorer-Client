import React, { useContext, useEffect, useState } from "react";
import "./FileUploader.css";
import { DataContext } from "./DataProvider";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import { styled } from "@mui/material/styles";

export const FileUploader = ({ setWellArraysUpdated, setFile }) => {
  // Row labels for wells
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

  const {
    extractedLines,
    extractedRows,
    extractedColumns,
    extractedProjectTitle,
    extractedProjectDate,
    extractedProjectTime,
    extractedProjectProtocol,
    extractedIndicatorConfigurations,
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
  // const plate = project?.plate || [];
  // const experiment = plate[0]?.experiments[0] || {};
  // const wellArrays = experiment.wells || [];

  useEffect(() => {
    if (dataExtracted) {
      distributeData(rowLabels, analysisData, extractedIndicatorTimes); // Distribute data after extraction
    }
  }, [dataExtracted, analysisData, extractedIndicatorTimes]);

  // Generate well label based on row and column
  const getWellLabel = (row, col) => {
    return row < 26
      ? String.fromCharCode(row + 65) + String(col + 1).padStart(2, "0")
      : "A" + String.fromCharCode(row + 40) + String(col + 1).padStart(2, "0");
  };

  // Distribute extracted data into project, plate, experiment, wells, and indicators
  const distributeData = (rowLabels, analysisData, extractedIndicatorTimes) => {
    const plateDimensions = extractedRows * extractedColumns;
    const newProject = new Project(
      extractedProjectTitle,
      extractedProjectDate,
      extractedProjectTime,
      extractedProjectProtocol
    ); // Create new project
    const newPlate = new Plate(
      extractedRows,
      extractedColumns,
      plateDimensions
    ); // Create new plate
    newProject.plate.push(newPlate);
    const newExperiment = new Experiment(
      extractedRows,
      extractedColumns,
      extractedIndicatorConfigurations
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
        let data = [];
        let i = 0;
        for (
          let y = rowIndex * extractedColumns + (colIndex - 1);
          y < analysisData.length;
          y += extractedRows * extractedColumns
        ) {
          data.push({ x: extractedIndicatorTimes[i], y: analysisData[y] });
          i++;
        }
        const indicator = new Indicator(
          data,
          [...data],
          extractedIndicatorTimes,
          true
        ); // Create new indicator
        newWell.indicators.push(indicator);
        newExperiment.wells.push(newWell); // Add well to experiment
        newWellArrays.push(newWell); // Add well to array
      }
    }
    setWellArraysUpdated(true); // Notify that well arrays are updated
    setSelectedWellArray([]);
    setProject(newProject); // Set the new project in context
    console.log(newProject);
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
          minWidth: 30,
          display: "flex", // Flexbox for centering
          justifyContent: "center", // Center horizontally
          alignItems: "center", // Center vertically
        }}
      >
        <DriveFolderUploadIcon />
        <VisuallyHiddenInput type="file" onChange={handleFileSelect} multiple />
      </Button>
    </Tooltip>
  );
};

export default FileUploader;
