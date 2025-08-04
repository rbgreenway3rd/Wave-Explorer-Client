import React, { useState, useRef, useContext } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
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
    if (uploadedFiles.length === 0) {
      alert("Please upload at least one .DAT file.");
      return;
    }
    // Dynamically import GenerateCSV from GenerateReport.js
    const { GenerateCSV } = await import("./GenerateReport.js");
    const zip = new JSZip();
    for (const file of uploadedFiles) {
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
              wellRawData.push({ y: rawDataArr[offset] });
              wellFilteredData.push({ y: rawDataArr[offset] });
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
        // Rehydrate filter instances from uploadedFilters
        let filterInstances = uploadedFilters
          .map((filterConfig) => {
            const FilterClass = filterModule[filterConfig.className];
            // Pass all required params for filter construction
            if (!FilterClass) return null;
            // For ControlSubtraction_Filter, pass number_of_columns/rows if needed
            if (filterConfig.className === "ControlSubtraction_Filter") {
              return new FilterClass(
                filterConfig.num,
                undefined,
                result.extractedColumns,
                result.extractedRows
              );
            }
            // For other filters, pass num and undefined for onEdit
            return new FilterClass(filterConfig.num, undefined);
          })
          .filter(Boolean);
        // Set filter params from config
        filterInstances.forEach((instance, idx) => {
          const config = uploadedFilters[idx];
          // Set all config params on the instance
          Object.keys(config).forEach((key) => {
            if (key !== "className" && key !== "num") {
              instance[key] = config[key];
            }
          });
        });
        // Mimic applyEnabledFilters logic
        for (let f = 0; f < filterInstances.length; f++) {
          if (filterInstances[f].calculate_average_curve) {
            filterInstances[f].calculate_average_curve(
              project.plate[0].experiments[0].wells
            );
          }
          await filterInstances[f].execute(
            project.plate[0].experiments[0].wells
          );
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
      // Add CSV to ZIP archive
      const csvFilename = `${file.name.replace(/\.dat$/i, "")}_report.csv`;
      zip.file(csvFilename, csv);
    }
    // Generate ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then((zipBlob) => {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "batch_reports.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="batch-processing-dialog"
      PaperProps={{
        style: { minWidth: "70vw", minHeight: "70vh" },
      }}
    >
      <DialogTitle>Batch Report Generation</DialogTitle>
      <DialogContent sx={{ height: "40vh" }}>
        <section className="file-upload-section">
          <div className="upload-config-container">
            <button
              className="batch-processing-add-btn"
              onClick={handleButtonClick}
            >
              Add .DAT files
            </button>
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
            <div className="batch-processing-preference-radios"></div>
            <div className="batch-processing-list-container">
              <ul className="batch-processing-list">
                {uploadedFiles.map((file, idx) => (
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
                ))}
              </ul>
            </div>
          </div>
          <button
            className="batch-processing-add-config-file-btn"
            onClick={handleConfigFileButtonClick}
          >
            Upload Metrics & Filters
          </button>

          <section className="metrics-and-filters-container">
            <div className="filters-list">
              <h4>Uploaded Filters</h4>
              <ul>
                {uploadedFilters && uploadedFilters.length > 0 ? (
                  uploadedFilters.map((filter, idx) => (
                    <li key={idx} style={{ fontSize: "0.9em" }}>
                      {filter.name || filter.type || `Filter ${idx + 1}`}
                    </li>
                  ))
                ) : (
                  <li style={{ color: "#888", fontSize: "0.8em" }}>
                    No filters uploaded.
                  </li>
                )}
              </ul>
            </div>
            <div className="metrics-list">
              <h4>Uploaded Metrics</h4>
              <ul>
                {savedMetrics && savedMetrics.length > 0 ? (
                  savedMetrics.map((metric, idx) => (
                    <li key={idx} style={{ fontSize: "0.9em" }}>
                      {metric.metricType || metric.name || `Metric ${idx + 1}`}
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
              <FormLabel component="legend">Batch Options</FormLabel>
              <FormControlLabel
                sx={{ backgroundColor: "transparent", border: "none" }}
                control={
                  <Checkbox
                    checked={includeRawData}
                    onChange={(e) => setIncludeRawData(e.target.checked)}
                  />
                }
                label="Include Raw Data"
              />
              <FormControlLabel
                sx={{ backgroundColor: "transparent", border: "none" }}
                control={
                  <Checkbox
                    checked={includeFilteredData}
                    onChange={(e) => setIncludeFilteredData(e.target.checked)}
                  />
                }
                label="Include Filtered Data"
              />
              <FormControlLabel
                sx={{ backgroundColor: "transparent", border: "none" }}
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
          <Button onClick={handleBatchReportGeneration} color="primary">
            Generate Batch
          </Button>
        </DialogActions>
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Close
          </Button>
          {/* Future: Add button to start batch report generation */}
        </DialogActions>
      </section>
    </Dialog>
  );
};

export default BatchProcessing;

// When constructing the header row for CSV in BatchProcessing, use:
// Example: const wellHeaders = ["Time", ...wells.map((well) => well.label)];
// Use wellHeaders.join(",") wherever you build the header row
