import React, { useContext, useEffect, useState } from "react";
import { DataContext } from "./DataProvider";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";

export const FileUploader = ({ setWellArraysUpdated }) => {
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
    setProject,
  } = useContext(DataContext); // Accessing context data

  const [dataExtracted, setDataExtracted] = useState(false); // State to track if data is extracted

  useEffect(() => {
    if (dataExtracted) {
      distributeData(rowLabels, analysisData, extractedIndicatorTimes); // Distribute data after extraction
    }
  }, [dataExtracted]);

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
        for (
          let y = rowIndex * extractedColumns + (colIndex - 1);
          y < analysisData.length;
          y += extractedRows * extractedColumns
        ) {
          data.push(analysisData[y]); // Populate well data
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
    setProject(newProject); // Set the new project in context

    // console.log("New Project Created:", newProject); // Log the created project
    // console.log("Extracted Indicator Times:", extractedIndicatorTimes);
    // console.log("Analysis Data:", analysisData);
    // console.log("Extracted columns:", extractedColumns);
  };

  // Handle file selection and reading
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target.result;

        // const allData = await extractAllData(fileContent);
        await extractAllData(fileContent); // Extract all data from file

        setDataExtracted(true); // Set state to trigger data distribution
      };
      reader.readAsText(file); // Read file as text
    }
  };

  return (
    <input
      className="file-uploader-input"
      type="file"
      onChange={handleFileSelect} // Trigger file selection handler on change
    />
  );
};

export default FileUploader;
