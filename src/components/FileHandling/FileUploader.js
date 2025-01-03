import React, { useContext, useEffect, useState } from "react";
import "./FileUploader.css";
import { DataContext } from "../../providers/DataProvider.js";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import { styled } from "@mui/material/styles";
import { Menu, MenuItem } from "@mui/material";

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
    handleMainMenuClose(); // Close the main menu when demo menu is closed
  };

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

  //   return (
  //     <Tooltip title="Choose File" arrow>
  //       <Button
  //         component="label"
  //         variant="contained"
  //         className={!project ? "glow-button" : ""} // Apply glow class if no project
  //         style={{
  //           padding: 0,
  //           marginRight: "1.5em",
  //           minWidth: 30,
  //           display: "flex",
  //           justifyContent: "center",
  //           alignItems: "center",
  //           borderRadius: "10%",
  //         }}
  //       >
  //         <DriveFolderUploadIcon />
  //         <VisuallyHiddenInput
  //           type="file"
  //           accept="file/dat, .dat"
  //           onChange={handleFileSelect}
  //         />
  //       </Button>
  //     </Tooltip>
  //   );
  // };
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle file selection and reading
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileContent = e.target.result;
        console.log(fileContent);
        await extractAllData(fileContent); // Extract all data from file

        setDataExtracted(true); // Set state to trigger data distribution
      };
      reader.readAsText(file); // Read file as text
    }
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
          setDataExtracted(true); // Trigger data extraction
        }
      };

      xhr.send();
    }
  };

  // const handleDemoFileSelect = (demoFileName) => {
  //   const demoFileURL = `/demo-files/${demoFileName}`;

  //   fetch(demoFileURL)
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch demo file: ${demoFileName}`);
  //       }
  //       return response.text(); // Read the content as text (use .text() instead of .blob())
  //     })
  //     .then((fileContent) => {
  //       // Extract the data using the extractAllData function
  //       // const extractedData = extractAllData(fileContent);

  //       // Create a mock File object (to mimic file selection)
  //       const demoFile = new File([fileContent], demoFileName, {
  //         type: "application/octet-stream",
  //       });

  //       // Trigger the same logic as handleFileSelect
  //       const fileInputEvent = {
  //         target: { files: [demoFile] }, // Mimic the file input event
  //       };

  //       // Process the extracted data or pass it along
  //       // console.log("Extracted Data:", extractedData);

  //       // You can do something with extractedData, e.g., store it in state or pass it to other functions

  //       handleFileSelect(fileInputEvent); // Reuse the existing handleFileSelect function for further processing
  //     })
  //     .catch((error) => {
  //       console.error(
  //         `Error fetching or processing demo file "${demoFileName}":`,
  //         error
  //       );
  //     });
  // };

  // const handleFileSelect = (event) => {
  //   const selectedFile = event.target.files[0];
  //   setFile(selectedFile);
  //   setWellArraysUpdated(true);
  //   handleMenuClose();
  // };

  return (
    <div>
      {/* Main File Options Button */}
      <Tooltip title="File Options" arrow>
        <Button
          variant="contained"
          className={!project ? "glow-button" : ""}
          onClick={handleMainMenuOpen}
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
        </Button>
      </Tooltip>

      {/* Main Menu */}
      <Menu
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
        {/* Upload File Option */}
        <MenuItem>
          <label
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            Upload File
            <VisuallyHiddenInput
              type="file"
              accept=".dat"
              onChange={handleFileSelect}
            />
          </label>
        </MenuItem>
        {/* Use Demo File Option */}
        {/* <MenuItem onClick={handleDemoMenuOpen}>Use Demo File</MenuItem> */}
        <select onChange={handleDemoFileSelect}>
          <option value="">Select a Demo File</option>
          <option value="demo96Well.dat">96 Well</option>
          <option value="demo384Well.dat">384 Well</option>
        </select>
      </Menu>

      {/* Demo Files Menu */}
      {/* <Menu
        anchorEl={demoMenuAnchor}
        open={isDemoMenuOpen}
        onClose={handleDemoMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      > */}
      {/* <MenuItem onClick={() => handleDemoFileSelect("demo96Well.dat")}>
          96 Well
        </MenuItem>
        <MenuItem onClick={() => console.log("Demo File 2 Selected")}>
          Demo File 2
        </MenuItem>
        <MenuItem onClick={() => console.log("Demo File 3 Selected")}>
          Demo File 3
        </MenuItem> */}
      {/* </Menu> */}
    </div>
  );
};

export default FileUploader;
