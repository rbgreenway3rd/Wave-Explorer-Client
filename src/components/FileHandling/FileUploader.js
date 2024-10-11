import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "./DataProvider";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import Button from "@mui/material/Button";
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
    setProject,
  } = useContext(DataContext); // Accessing context data

  const [dataExtracted, setDataExtracted] = useState(false); // State to track if data is extracted

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
    width: 1,
  });

  return (
    // <div style={{ display: "flex", alignItems: "center" }}>
    <Button
      component="label"
      variant="contained"
      startIcon={<DriveFolderUploadIcon />}
    >
      Upload File
      <VisuallyHiddenInput
        type="file"
        onChange={handleFileSelect} // Trigger file selection handler on change
        multiple
      />
    </Button>
    //  Display the file name next to the button
    // {file && <span style={{ marginLeft: "10px" }}>{file.name}</span>}
    // </div>
  );
};

export default FileUploader;

// <Button
//   component="label"
//   role={undefined}
//   variant="contained"
//   tabIndex={-1}
//   startIcon={<DriveFolderUploadIcon />}
// >
//   Upload file
//   <VisuallyHiddenInput
//     type="file"
//     onChange={handleFileSelect} // Trigger file selection handler on change
//     multiple
//   />
// </Button>

// <input
//   className="file-uploader-input"
//   type="file"
//   onChange={handleFileSelect} // Trigger file selection handler on change
// />
