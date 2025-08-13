import React, { useState, useRef, useContext, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import "./BatchProcessing.css";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";
import { DataContext } from "../../providers/DataProvider";
// Import filter classes from FilterModels.js
import * as filterModule from "../Graphing/FilteredData/FilterModels.js";
import JSZip from "jszip";
import LinearProgress from "@mui/material/LinearProgress";

const BatchProcessing = ({ open, onClose }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const configFileInputRef = useRef(null);
  const {
    setUploadedFilters,
    setSavedMetrics,
    uploadedFilters,
    savedMetrics,
    extractAllData,
  } = useContext(DataContext);

  const [includeRawData, setIncludeRawData] = useState(true);
  const [includeFilteredData, setIncludeFilteredData] = useState(true);
  const [includeSavedMetrics, setIncludeSavedMetrics] = useState(true);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState("");
  const [cancelRequested, setCancelRequested] = useState(false);

  const handleAddFile = (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handler for config file upload
  const handleConfigFileButtonClick = () => {
    if (configFileInputRef.current) {
      configFileInputRef.current.click();
    }
  };

  const handleConfigFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.filters && data.metrics) {
            setUploadedFilters(data.filters);
            setSavedMetrics(data.metrics);
          } else {
            alert(
              "Invalid JSON format. Please upload a valid preferences file."
            );
          }
        } catch (error) {
          alert("Error reading the file. Make sure it's a valid JSON file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleBatchReportGeneration = async () => {
    setIsBatchProcessing(true);
    setProgress(0);
    setCurrentFileName("");
    setCancelRequested(false);
    if (uploadedFiles.length === 0) {
      alert("Please upload at least one .DAT file.");
      setIsBatchProcessing(false);
      return;
    }
    try {
      const { GenerateCSV } = await import("./GenerateReport.js");
      const zip = new JSZip();
      for (let i = 0; i < uploadedFiles.length; i++) {
        if (cancelRequested) {
          break;
        }
        const file = uploadedFiles[i];
        setCurrentFileName(file.name);
        setProgress(Math.round(((i + 1) / uploadedFiles.length) * 100));
        const content = await file.text();
        // Parse the .DAT file using extractAllData
        const result = await extractAllData(content);
        // --- Well label logic ---
        let wellLabels =
          Array.isArray(result.rowLabels) &&
          result.rowLabels.length ===
            result.extractedRows * result.extractedColumns
            ? result.rowLabels
            : Array.from(
                {
                  length: result.extractedRows * result.extractedColumns,
                },
                (_, i) => {
                  // Generate labels like A01, B12, etc.
                  const row = String.fromCharCode(
                    65 + Math.floor(i / result.extractedColumns)
                  );
                  const col = (i % result.extractedColumns) + 1;
                  return `${row}${col.toString().padStart(2, "0")}`;
                }
              );
        // --- Wells construction ---
        const wells = [];
        const indicators = result.extractedIndicators || [];
        for (let i = 0; i < wellLabels.length; i++) {
          wells.push({
            label: wellLabels[i],
            indicators: indicators.map((indicator) => {
              const time =
                result.extractedIndicatorTimes[indicator.indicatorName] || [];
              const rawDataArr =
                result.analysisData[indicator.indicatorName] || [];
              // Each well's data is at offset i * time.length
              const wellRawData = [];
              const wellFilteredData = [];
              for (let t = 0; t < time.length; t++) {
                const offset = i * time.length + t;
                const x = time[t];
                const y = rawDataArr[offset];
                wellRawData.push({ x, y });
                wellFilteredData.push({ x, y });
              }
              return {
                time,
                rawData: wellRawData,
                filteredData: wellFilteredData,
              };
            }),
          });
        }
        // --- Project object construction ---
        const project = {
          title: result.extractedProjectTitle,
          date: result.extractedProjectDate,
          time: result.extractedProjectTime,
          instrument: result.extractedProjectInstrument,
          protocol: result.extractedProjectProtocol,
          plate: [
            {
              assayPlateBarcode: result.extractedAssayPlateBarcode,
              addPlateBarcode: result.extractedAddPlateBarcode,
              experiments: [
                {
                  binning: result.extractedBinning,
                  numberOfRows: result.extractedRows,
                  numberOfColumns: result.extractedColumns,
                  operator: result.extractedOperator,
                  indicatorConfigurations:
                    result.extractedIndicatorConfigurations,
                  wells,
                },
              ],
            },
          ],
        };
        // --- Apply filters before generating CSV ---
        if (
          includeFilteredData &&
          uploadedFilters &&
          uploadedFilters.length > 0
        ) {
          let filterInstances = uploadedFilters
            .map((filterConfig) => {
              const FilterClass = filterModule[filterConfig.className];
              if (!FilterClass) return null;
              let instance;
              if (filterConfig.className === "ControlSubtraction_Filter") {
                instance = new FilterClass(
                  filterConfig.num || 0,
                  undefined,
                  filterConfig.number_of_columns || result.extractedColumns,
                  filterConfig.number_of_rows || result.extractedRows
                );
                instance.controlWellArray = filterConfig.controlWellArray || [];
                instance.applyWellArray = filterConfig.applyWellArray || [];
                // Always call calculate_average_curve before execute
                instance.calculate_average_curve(wells);
              } else if (filterConfig.className === "StaticRatio_Filter") {
                instance = new FilterClass(filterConfig.num, undefined);
                instance.start = filterConfig.start;
                instance.end = filterConfig.end;
              } else if (filterConfig.className === "Smoothing_Filter") {
                instance = new FilterClass(filterConfig.num, undefined);
                instance.windowWidth = filterConfig.windowWidth;
                instance.useMedian = filterConfig.useMedian;
              } else if (filterConfig.className === "OutlierRemoval_Filter") {
                instance = new FilterClass(filterConfig.num, undefined);
                instance.halfWindow = filterConfig.halfWindow;
                instance.threshold = filterConfig.threshold;
              } else if (
                filterConfig.className === "FlatFieldCorrection_Filter"
              ) {
                instance = new FilterClass(filterConfig.num, undefined);
                instance.correctionMatrix = filterConfig.correctionMatrix || [];
              } else if (filterConfig.className === "DynamicRatio_Filter") {
                instance = new FilterClass(filterConfig.num, undefined);
                instance.numerator = filterConfig.numerator;
                instance.denominator = filterConfig.denominator;
              } else if (filterConfig.className === "Derivative_Filter") {
                instance = new FilterClass(filterConfig.num, undefined);
              }
              return instance;
            })
            .filter(Boolean);
          for (let f = 0; f < filterInstances.length; f++) {
            if (
              filterInstances[f].calculate_average_curve &&
              filterInstances[f].controlWellArray
            ) {
              // Only call if not already called above
              if (
                filterInstances[f].controlWellArray.length &&
                filterInstances[f].applyWellArray.length
              ) {
                // Already called above for ControlSubtraction_Filter
              }
            }
            await filterInstances[f].execute(wells);
          }
        }
        // --- End filter application ---
        // Rehydrate filters and metrics from context
        const enabledFilters = uploadedFilters || [];
        const metrics = savedMetrics || [];
        // Generate CSV report
        const csv = GenerateCSV(
          project,
          enabledFilters,
          includeRawData,
          includeFilteredData,
          includeSavedMetrics,
          metrics
        );
        // Only add to zip if not cancelled
        if (!cancelRequested) {
          // Add CSV to ZIP archive
          const csvFilename = `${file.name.replace(/\.dat$/i, "")}_report.csv`;
          zip.file(csvFilename, csv);
        }
      }
      // Only save zip if not cancelled
      if (!cancelRequested) {
        // Generate ZIP and trigger download
        await zip.generateAsync({ type: "blob" }).then((zipBlob) => {
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "batch_reports.zip";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }
    } finally {
      setIsBatchProcessing(false);
      setCurrentFileName("");
      setProgress(0);
      setCancelRequested(false);
    }
  };

  const handleCancelBatch = () => {
    setCancelRequested(true);
  };

  const handleClearConfig = () => {
    setUploadedFilters([]);
    setSavedMetrics([]);
  };

  // Helper to display filter params
  const getFilterParamsDisplay = (filter) => {
    switch (filter.className || filter.name) {
      case "StaticRatio_Filter":
      case "Static Ratio":
        return `start: ${filter.start}, end: ${filter.end}`;
      case "Smoothing_Filter":
      case "Smoothing":
        return `window: ${filter.windowWidth}, median: ${
          filter.useMedian ? "yes" : "no"
        }`;
      case "ControlSubtraction_Filter":
      case "Control Subtraction":
        return `control: ${filter.controlWellArray?.length || 0}, apply: ${
          filter.applyWellArray?.length || 0
        }`;
      case "Derivative_Filter":
      case "Derivative":
        return ``;
      case "OutlierRemoval_Filter":
      case "Outlier Removal":
        return `window: ${filter.halfWindow}, threshold: ${filter.threshold}`;
      case "FlatFieldCorrection_Filter":
      case "Flat Field Correction":
        return `matrix: ${filter.correctionMatrix?.length || 0}`;
      case "DynamicRatio_Filter":
      case "Dynamic Ratio":
        return `numerator: ${filter.numerator}, denominator: ${filter.denominator}`;
      default:
        return "";
    }
  };

  // Helper to display metric params
  const getMetricParamsDisplay = (metric) => {
    if (metric.range !== undefined) {
      return `range: ${JSON.stringify(metric.range)}`;
    }
    return "";
  };

  useEffect(() => {
    console.log(
      "saved metrics: ",
      savedMetrics,
      "uploaded filters: ",
      uploadedFilters
    );
  }, [savedMetrics, uploadedFilters]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="batch-processing-dialog"
      PaperProps={{
        style: {
          minWidth: "70vw",
          minHeight: "75vh",
          cursor: isBatchProcessing ? "wait" : "default",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: "bold", padding: "0.5em" }}>
        Batch Report Generation
      </DialogTitle>
      <DialogContent sx={{ height: "50vh", paddingBottom: 0 }}>
        {isBatchProcessing && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1em",
            }}
          >
            <LinearProgress
              variant="determinate"
              value={progress}
              style={{ flex: 1, marginRight: "1em" }}
            />
            <span style={{ minWidth: "12em", fontSize: "1em" }}>
              {currentFileName}
            </span>
            <Button
              onClick={handleCancelBatch}
              color="secondary"
              style={{ marginLeft: "1em", pointerEvents: "auto", zIndex: 2 }}
              disabled={
                progress === 0 || progress === 100 || !isBatchProcessing
              }
            >
              Cancel
            </Button>
          </div>
        )}
        <section className="file-upload-section">
          <div className="upload-config-container">
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "0.5em",
                marginBottom: "0.5em",
                marginLeft: "0.5em",
                marginTop: "0.5em",
                position: "relative",
              }}
            >
              <button
                className="batch-processing-add-btn"
                onClick={handleButtonClick}
              >
                Add .DAT files
              </button>
              <button
                className="batch-processing-clear-btn"
                onClick={() => setUploadedFiles([])}
                style={{ marginLeft: "0.5em" }}
              >
                Clear
              </button>
              <p
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  margin: 0,
                  fontWeight: 500,
                  fontSize: "1.1em",
                  textAlign: "center",
                  width: "max-content",
                }}
              >
                .DAT Files
              </p>
            </div>
            <input
              type="file"
              accept=".dat"
              multiple
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleAddFile}
              //   webkitdirectory="true"
            />

            <input
              type="file"
              accept="application/json"
              ref={configFileInputRef}
              style={{ display: "none" }}
              onChange={handleConfigFileUpload}
            />

            <div className="batch-processing-list-container">
              <ul className="batch-processing-list">
                {uploadedFiles && uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file, idx) => (
                    <li key={idx} className="batch-processing-list-item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{file.name}</span>
                        <IconButton
                          className="batch-processing-remove-btn"
                          onClick={() =>
                            setUploadedFiles((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          <DeleteForeverTwoToneIcon
                            sx={{
                              fontSize: "0.75em",
                              color: "rgb(255,0,0, 0.7)",
                            }}
                          />
                        </IconButton>
                      </div>
                    </li>
                  ))
                ) : (
                  <li style={{ color: "#888", fontSize: "0.8em" }}>
                    No files uploaded.
                  </li>
                )}
              </ul>
            </div>
          </div>

          <section className="metrics-and-filters-container">
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "0.5em",
                marginBottom: "0.5em",
                marginLeft: "0.5em",
                marginTop: "0.5em",
                position: "relative",
              }}
            >
              <button
                className="batch-processing-add-config-file-btn"
                onClick={handleConfigFileButtonClick}
              >
                Upload Config File
              </button>
              <button
                className="batch-processing-clear-btn"
                onClick={() => handleClearConfig()}
              >
                Clear
              </button>
              <p
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  margin: 0,
                  fontWeight: 500,
                  fontSize: "1.1em",
                  textAlign: "center",
                  width: "max-content",
                }}
              >
                Filters and Metrics
              </p>
            </div>
            <div className="filters-list-container">
              <p
                style={{
                  marginLeft: "1em",
                  marginRight: "1em",
                  borderBottom: "solid 1px #888",
                  marginTop: "0.5em",
                  marginBottom: "0.5em",
                }}
              >
                Filters
              </p>
              <ul className="filters-list">
                {uploadedFilters && uploadedFilters.length > 0 ? (
                  uploadedFilters.map((filter, idx) => (
                    <li
                      className="filters-list-item"
                      key={idx}
                      style={{ fontSize: "0.9em" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          {filter.name || filter.type || `Filter ${idx + 1}`}{" "}
                          <span
                            style={{
                              color: "#555",
                              fontSize: "0.85em",
                              marginLeft: "0.5em",
                            }}
                          >
                            {getFilterParamsDisplay(filter)}
                          </span>
                        </span>
                        <IconButton
                          className="filters-list-remove-btn"
                          onClick={() => {
                            const newFilters = uploadedFilters.filter(
                              (_, i) => i !== idx
                            );
                            setUploadedFilters(newFilters);
                            console.log("uploadedFilters:", newFilters);
                          }}
                        >
                          <DeleteForeverTwoToneIcon
                            sx={{
                              fontSize: "0.75em",
                              color: "rgb(255,0,0, 0.7)",
                            }}
                          />
                        </IconButton>
                      </div>
                    </li>
                  ))
                ) : (
                  <li style={{ color: "#888", fontSize: "0.8em" }}>
                    No filters uploaded.
                  </li>
                )}
              </ul>
            </div>
            <div className="metrics-list-container">
              <p
                style={{
                  marginLeft: "1em",
                  marginRight: "1em",
                  borderBottom: "solid 1px #888",
                  marginTop: "0.5em",
                  marginBottom: "0.5em",
                }}
              >
                Metrics
              </p>
              <ul className="metrics-list">
                {savedMetrics && savedMetrics.length > 0 ? (
                  savedMetrics.map((metric, idx) => (
                    <li
                      className="metrics-list-item"
                      key={idx}
                      style={{ fontSize: "0.9em" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          {metric.metricType ||
                            metric.name ||
                            `Metric ${idx + 1}`}{" "}
                          <span
                            style={{
                              color: "#555",
                              fontSize: "0.85em",
                              marginLeft: "0.5em",
                            }}
                          >
                            {getMetricParamsDisplay(metric)}
                          </span>
                        </span>
                        <IconButton
                          className="metrics-list-remove-btn"
                          onClick={() => {
                            const newMetrics = savedMetrics.filter(
                              (_, i) => i !== idx
                            );
                            setSavedMetrics(newMetrics);
                          }}
                        >
                          <DeleteForeverTwoToneIcon
                            sx={{
                              fontSize: "0.75em",
                              color: "rgb(255,0,0, 0.7)",
                            }}
                          />
                        </IconButton>
                      </div>
                    </li>
                  ))
                ) : (
                  <li style={{ color: "#888", fontSize: "0.8em" }}>
                    No metrics uploaded.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </section>
      </DialogContent>
      <section className="dialog-actions-container">
        <DialogActions>
          <section className="batch-processing-config-checkboxes">
            <FormControl
              component="fieldset"
              sx={{ display: "flex", flexDirection: "row" }}
            >
              <FormLabel sx={{ textAlign: "center" }} component="legend">
                Batch Options
              </FormLabel>
              <FormControlLabel
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  marginRight: "1em",
                  marginLeft: "1em",
                }}
                control={
                  <Checkbox
                    checked={includeRawData}
                    onChange={(e) => setIncludeRawData(e.target.checked)}
                  />
                }
                label="Include Raw Data"
              />
              <FormControlLabel
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  marginRight: "1em",
                  marginLeft: "1em",
                }}
                control={
                  <Checkbox
                    checked={includeFilteredData}
                    onChange={(e) => setIncludeFilteredData(e.target.checked)}
                  />
                }
                label="Include Filtered Data"
              />
              <FormControlLabel
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  marginRight: "1em",
                  marginLeft: "1em",
                }}
                control={
                  <Checkbox
                    checked={includeSavedMetrics}
                    onChange={(e) => setIncludeSavedMetrics(e.target.checked)}
                  />
                }
                label="Include Saved Metrics"
              />
            </FormControl>
          </section>
        </DialogActions>
        <DialogActions>
          <Button
            className="batch-processing-submit-btn"
            onClick={handleBatchReportGeneration}
            color="primary"
            variant="contained"
            sx={{ padding: "0.5em", borderRadius: "4px" }}
          >
            <DynamicFeedIcon />
            Generate Batch
          </Button>
        </DialogActions>
      </section>
    </Dialog>
  );
};

export default BatchProcessing;

// When constructing the header row for CSV in BatchProcessing, use:
// Example: const wellHeaders = ["Time", ...wells.map((well) => well.label)];
// Use wellHeaders.join(",") wherever you build the header row
