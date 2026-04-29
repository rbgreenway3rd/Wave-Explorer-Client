import React, { useContext, useEffect, useState } from "react";
import "./FileUploader.css";
import { DataContext } from "../../providers/DataProvider.js";
import { Project, Plate, Experiment, Well, Indicator } from "../Models.js";
import { lttbTyped } from "../../utilities/lttbTyped.js";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import DriveFolderUploadIcon from "@mui/icons-material/DriveFolderUpload";
import { styled } from "@mui/material/styles";
import { Menu, MenuItem } from "@mui/material";
import { handleTxtFileUpload } from "./txtFileUploader.js";
import { ProcessApdData } from "./Matlab/MatlabClone.js"; // Import processExcelData

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
    ApdData,
    setApdData,
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
    if (
      dataExtracted &&
      fileType === "dat" &&
      analysisData &&
      Object.keys(analysisData).length > 0
    ) {
      distributeData(rowLabels, analysisData, extractedIndicatorTimes);
      // Phase D: analysisData duplicates rawYs (per-well column copies were
      // just built by distributeData). Free the ~384MB flat row-major buffer
      // now that nothing else reads it. The empty-object guard above keeps
      // this effect from re-firing distributeData when the cleared state
      // change re-triggers it.
      setAnalysisData({});
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

  // Build the project tree directly from the worker's typed-array output.
  // For each well × indicator, do one strided copy out of the row-major flat
  // analysisData buffer into a per-well Float64Array, and pre-decimate to
  // ~80 points for the mini grid. No {x,y}[] is allocated for any well —
  // those views are built lazily by indicator.materializeRawData() only for
  // the wells that get displayed in a non-mini chart. Old version allocated
  // ~10M {x,y} objects on the main thread for a 500MB DAT, which OOM'd the
  // renderer.
  const distributeData = (
    rowLabels,
    analysisData,
    extractedIndicatorTimes
  ) => {
    const newProject = new Project(
      extractedProjectTitle,
      extractedProjectDate,
      extractedProjectTime,
      extractedProjectInstrument,
      extractedProjectProtocol
    );
    const newPlate = new Plate(
      extractedRows,
      extractedColumns,
      extractedAssayPlateBarcode,
      extractedAddPlateBarcode
    );
    newProject.plate.push(newPlate);
    const newExperiment = new Experiment(
      extractedBinning,
      extractedRows,
      extractedColumns,
      extractedIndicatorConfigurations,
      extractedOperator
    );
    newPlate.experiments.push(newExperiment);

    const wellCount = extractedRows * extractedColumns;
    // Cache once per indicator so we don't re-derive these inside the
    // inner loop.
    const indicatorNames = Object.keys(analysisData);
    const indicatorMeta = indicatorNames.map((name) => {
      const flat = analysisData[name];
      const xs = extractedIndicatorTimes[name];
      const totalLen = flat ? flat.length : 0;
      const rowCount = wellCount > 0 ? Math.floor(totalLen / wellCount) : 0;
      // Keep the times as a Float64Array shared across every well in this
      // indicator — saves wellCount-1 copies.
      const xsTyped =
        xs && xs.buffer instanceof ArrayBuffer ? xs : Float64Array.from(xs || []);
      return { name, flat, xs: xsTyped, rowCount };
    });

    let wellId = 1;
    const newWellArrays = new Array(wellCount);
    let writeIdx = 0;
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
        );
        const wellIdx = rowIndex * extractedColumns + (colIndex - 1);
        for (let i = 0; i < indicatorMeta.length; i++) {
          const meta = indicatorMeta[i];
          const rowCount = meta.rowCount;
          const flat = meta.flat;
          const wellYs = new Float64Array(rowCount);
          // Strided copy: row-major → per-well column.
          for (let r = 0; r < rowCount; r++) {
            wellYs[r] = flat[r * wellCount + wellIdx];
          }
          const indicator = new Indicator(
            i,
            meta.name,
            [], // rawData lazy-built; setRawTypedArrays clears it
            [], // filteredData empty until first filter run
            meta.xs, // time array (shared ref)
            true
          );
          indicator.setRawTypedArrays(meta.xs, wellYs);
          // Seed filtered typed arrays as aliases of the raw ones — same
          // Float64Array references, zero extra memory. This makes the
          // FilteredGraph and Heatmap render real data at load (matching
          // the rawData == filteredData seed semantics that distributeData
          // had pre-Phase-C). When a filter runs, mergeFilteredBack calls
          // setFilteredTypedArrays with NEW worker-output buffers, so the
          // raw side stays untouched.
          indicator.filteredXs = meta.xs;
          indicator.filteredYs = wellYs;
          // Pre-decimated 80-point view for MiniGraphGrid. ~32B × 80 per
          // well per indicator — total ~250KB at 96 wells × 2 indicators.
          indicator.miniRawPoints = lttbTyped(meta.xs, wellYs, 80);
          // Filtered side initially aliases raw — same shared decimation,
          // no extra cost. setFilteredTypedArrays recomputes it after a
          // filter run.
          indicator.miniFilteredPoints = indicator.miniRawPoints;
          newWell.indicators.push(indicator);
        }
        newExperiment.wells.push(newWell);
        newWellArrays[writeIdx++] = newWell;
      }
    }
    setWellArraysUpdated(true);
    setSelectedWellArray([]);
    setProject(newProject);
  };

  const handleExcelFileSelect = async (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target.result;
      const apdData = ProcessApdData(fileContent);
      setApdData(apdData); // Store APD data in context
      setFileType("excel");
      setDataExtracted(true); // Set state to trigger data distribution
    };
    reader.readAsText(file);
  };

  // Handle file selection and reading for .txt files
  const handleTxtFileSelect = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileContent = e.target.result;
      const extractedData = await handleTxtFileUpload(fileContent);

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

  // Handle file selection and reading for .dat files. The File (a Blob) is
  // passed directly to the extractWorker, which streams it via
  // file.stream() — we never materialize the full UTF-16 string on the main
  // thread. This is the load-side pivot that makes 500MB+ files possible
  // without OOMing the renderer.
  const handleDatFileSelect = async (file) => {
    await extractAllData(file);
    setFileType("dat");
    setDataExtracted(true);
  };

  // Handle file selection and reading
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setFile(file);
      if (file.name.endsWith(".txt")) {
        await handleTxtFileSelect(file);
      } else {
        // await handleExcelFileSelect(file);
        await handleDatFileSelect(file);
      }
    }
    // console.log(project);
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
    <div
    // style={{ marginRight: "1em" }}
    >
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
