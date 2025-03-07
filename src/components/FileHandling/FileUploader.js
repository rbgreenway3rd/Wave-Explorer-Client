import React, { useContext, useEffect, useState } from "react";
import "./FileUploader.css";
import { DataContext } from "../../providers/DataProvider.js";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import { styled } from "@mui/material/styles";
import { Menu, MenuItem } from "@mui/material";
import { handleTxtFileUpload } from "./txtFileUploader.js";

export const FileUploader = ({ setWellArraysUpdated, setFile }) => {
  const {
    extractedIndicators,
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
    setSelectedWellArray,
    project,
    setProject,
    setRowLabels,
    setAnalysisData,
    setExtractedIndicatorTimes,
  } = useContext(DataContext); // Accessing context data

  const [dataExtracted, setDataExtracted] = useState(false); // State to track if data is extracted
  const [fileType, setFileType] = useState(""); // State to track the type of file being uploaded
  const [extractedTxtData, setExtractedTxtData] = useState({}); // State to store extracted data from txt file

  const [anchorEl, setAnchorEl] = useState(null);
  const isOpen = Boolean(anchorEl);
  const [demoMenuAnchor, setDemoMenuAnchor] = useState(null); // Anchor for the demo file menu

  const isMainMenuOpen = Boolean(anchorEl);
  const isDemoMenuOpen = Boolean(demoMenuAnchor);

  const handleMainMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMainMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDemoMenuOpen = (event) => {
    setDemoMenuAnchor(event.currentTarget);
  };

  const handleDemoMenuClose = () => {
    setDemoMenuAnchor(null);
  };

  useEffect(() => {
    if (dataExtracted && fileType === "txt") {
      createProjectFromTxtData(extractedTxtData); // Create project from extracted data
    }
  }, [dataExtracted, extractedTxtData]);

  useEffect(() => {
    if (dataExtracted && fileType === "dat") {
      distributeData(rowLabels, analysisData, extractedIndicatorTimes); // Distribute data after extraction
    }
  }, [
    dataExtracted,
    analysisData,
    extractedIndicatorTimes,
    rowLabels,
    fileType,
  ]);

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
      extractedAddPlateBarcode
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
        for (let wellKey in analysisData) {
          let indicatorData = [];
          let timeData = extractedIndicatorTimes[wellKey];
          let i = 0;
          // Collect data for this indicator in the current well
          for (
            let y = rowIndex * extractedColumns + (colIndex - 1);
            y < analysisData[wellKey].length;
            y += extractedRows * extractedColumns
          ) {
            indicatorData.push({
              x: timeData[i],
              y: analysisData[wellKey][y],
            });
            i++;
          }
          const indicator = new Indicator(
            indicatorId++,
            wellKey,
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

  // Handle file selection and reading for .txt files
  const handleTxtFileSelect = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      const extractedData = await handleTxtFileUpload(fileContent);
      console.log(extractedData);

      setRowLabels(extractedData.rowLabels);
      setAnalysisData(extractedData.analysisData);
      setExtractedIndicatorTimes(extractedData.extractedIndicatorTimes);
      setFileType("txt");
      setDataExtracted(true); // Set state to trigger data distribution

      // Set the extracted data to state
      setExtractedTxtData(extractedData);
    };
    reader.readAsText(file); // Read file as text
  };

  const createProjectFromTxtData = (extractedTxtData) => {
    if (!extractedTxtData) {
      console.error("No extracted data provided");
      return;
    }

    const {
      rowLabels,
      analysisData,
      extractedIndicatorTimes,
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
      numberOfRows,
      numberOfColumns,
    } = extractedTxtData;

    const newProject = new Project(
      extractedProjectTitle,
      extractedProjectDate,
      extractedProjectTime,
      extractedProjectInstrument,
      extractedProjectProtocol
    ); // Create new project

    const newPlate = new Plate(
      numberOfRows,
      numberOfColumns,
      extractedAssayPlateBarcode,
      extractedAddPlateBarcode
    ); // Create new plate

    newProject.plate.push(newPlate);

    const newExperiment = new Experiment(
      extractedBinning,
      numberOfRows,
      numberOfColumns,
      extractedIndicatorConfigurations,
      extractedOperator
    ); // Create new experiment
    newPlate.experiments.push(newExperiment);

    let newWellArrays = [];
    let wellId = 1;
    for (let rowIndex = 0; rowIndex < rowLabels.length; rowIndex++) {
      for (let colIndex = 1; colIndex <= numberOfColumns; colIndex++) {
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
        let indicatorData = [];
        let timeData = extractedIndicatorTimes["string"]; // Access the correct key
        let wellData = analysisData[wellKey]; // Get data for the current well

        if (wellData) {
          for (let i = 0; i < wellData.length; i++) {
            indicatorData.push({
              x: timeData[i],
              y: wellData[i],
            });
          }
        }

        const indicator = new Indicator(
          indicatorId++,
          wellKey,
          indicatorData, // filteredData is initially set to the raw data
          [...indicatorData], // Copy of the data for rawData
          timeData, // Time points specific to this indicator
          true
        ); // Create new indicator and add to well
        newWell.indicators.push(indicator);
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
  const VisuallyHiddenInput = styled("input")({
    clip: "rect(0  0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
  });

  // Handle file selection and reading for .dat files
  const handleDatFileSelect = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      await extractAllData(fileContent); // Extract all data from .dat file
      setFileType("dat");
      setDataExtracted(true); // Set state to trigger data distribution
    };
    reader.readAsText(file); // Read file as text
  };

  // Handle file selection and reading
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
      if (file.name.endsWith(".txt")) {
        await handleTxtFileSelect(file);
      } else {
        await handleDatFileSelect(file);
      }
    }
    console.log(project);
    handleMainMenuClose();
  };

  // Handle demo file selection and reading
  const handleDemoFileSelect = async (event) => {
    const demoFileName = event.target.value;

    if (demoFileName) {
      const demoFileURL = `${process.env.PUBLIC_URL}/demo-files/${demoFileName}`;
      console.log(demoFileURL); // Check the URL
      const xhr = new XMLHttpRequest();
      xhr.open("GET", demoFileURL, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4 && xhr.status === 200) {
          const fileContent = xhr.responseText;
          console.log(fileContent); // Log file content for debugging
          extractAllData(fileContent); // Process the content
          setFileType("dat");
          setDataExtracted(true); // Trigger data extraction
        }
      };
      xhr.send();
    }
    handleMainMenuClose();
  };

  return (
    <div>
      <Tooltip title="File Options" arrow>
        <Button
          variant="contained"
          className={!project ? "glow-button" : ""}
          onClick={handleMainMenuOpen}
          style={{
            padding: 0,
            marginRight: "0.5em",
            marginLeft: "0.5em",
            minWidth: 30,
            borderRadius: "10%",
          }}
        >
          <DriveFolderUploadIcon />
        </Button>
      </Tooltip>
      <Menu
        className="file-menu"
        anchorEl={anchorEl}
        open={isMainMenuOpen}
        onClose={handleMainMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <MenuItem
          style={{ padding: 0, paddingRight: "8px", paddingLeft: "8px" }}
        >
          <label className="upload-file-label">
            Upload File
            <VisuallyHiddenInput
              type="file"
              accept=".dat, .txt"
              onChange={handleFileSelect}
            />
          </label>
        </MenuItem>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            cursor: "default",
            paddingTop: "4px",
            paddingBottom: "4px",
          }}
        >
          or
        </div>
        <MenuItem
          style={{ padding: 0, paddingRight: "8px", paddingLeft: "8px" }}
        >
          <select
            onChange={handleDemoFileSelect}
            style={{
              cursor: "pointer",
            }}
          >
            <option value="" hidden>
              Select a Demo File
            </option>
            <option value="demo96Well.dat" className="demo-option">
              <span>Demo x96</span>
            </option>
            <option value="demo384Well.dat" className="demo-option">
              <span>Demo x384</span>
            </option>
            <option value="demoCardiac96Well.dat" className="demo-option">
              <span>Cardiac Demo x96</span>
            </option>
          </select>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default FileUploader;
