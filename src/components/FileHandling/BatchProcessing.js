import React, { useState, useRef, useContext, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import "./BatchProcessing.css";
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import { Modal, Button } from "../ui";
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
                instance.rescaleByMedianFo = !!filterConfig.rescaleByMedianFo;
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
        return `start: ${filter.start}, end: ${filter.end}${
          filter.rescaleByMedianFo ? ", rescale: yes" : ""
        }`;
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

  // Renders one row of a batch list (file / filter / metric) — text on
  // the left, optional params, delete IconButton on the right.
  const renderListItem = (key, primaryText, paramsText, onRemove) => (
    <li key={key} className="batch-list-item">
      <div className="batch-list-item__row">
        <span>
          {primaryText}
          {paramsText && (
            <span className="batch-list-item__params">{paramsText}</span>
          )}
        </span>
        <IconButton className="batch-list-item__remove" onClick={onRemove}>
          <DeleteForeverTwoToneIcon />
        </IconButton>
      </div>
    </li>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={`batch-processing-modal ${
        isBatchProcessing ? "batch-processing-modal--processing" : ""
      }`}
    >
      <Modal.Header>Batch Report Generation</Modal.Header>
      <Modal.Body>
        {isBatchProcessing && (
          <div className="batch-processing__progress">
            <LinearProgress
              variant="determinate"
              value={progress}
              className="batch-processing__progress-bar"
            />
            <span className="batch-processing__progress-name">
              {currentFileName}
            </span>
            <Button
              variant="ghost"
              onClick={handleCancelBatch}
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
            <div className="batch-processing__row">
              <button
                className="batch-processing-add-btn"
                onClick={handleButtonClick}
              >
                Add .DAT files
              </button>
              <button
                className="batch-processing-clear-btn"
                onClick={() => setUploadedFiles([])}
              >
                Clear
              </button>
              <p className="batch-processing__row-title">.DAT Files</p>
            </div>
            <input
              type="file"
              accept=".dat"
              multiple
              ref={fileInputRef}
              hidden
              onChange={handleAddFile}
            />
            <input
              type="file"
              accept="application/json"
              ref={configFileInputRef}
              hidden
              onChange={handleConfigFileUpload}
            />

            <div className="batch-list-container">
              <ul className="batch-list">
                {uploadedFiles && uploadedFiles.length > 0 ? (
                  uploadedFiles.map((file, idx) =>
                    renderListItem(idx, file.name, null, () =>
                      setUploadedFiles((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    )
                  )
                ) : (
                  <li className="batch-list--empty">No files uploaded.</li>
                )}
              </ul>
            </div>
          </div>

          <section className="metrics-and-filters-container">
            <div className="batch-processing__row">
              <button
                className="batch-processing-add-config-file-btn"
                onClick={handleConfigFileButtonClick}
              >
                Upload Config File
              </button>
              <button
                className="batch-processing-clear-btn"
                onClick={handleClearConfig}
              >
                Clear
              </button>
              <p className="batch-processing__row-title">Filters and Metrics</p>
            </div>

            <div className="batch-list-container">
              <p className="batch-list-section-title">Filters</p>
              <ul className="batch-list">
                {uploadedFilters && uploadedFilters.length > 0 ? (
                  uploadedFilters.map((filter, idx) =>
                    renderListItem(
                      idx,
                      filter.name || filter.type || `Filter ${idx + 1}`,
                      getFilterParamsDisplay(filter),
                      () =>
                        setUploadedFilters(
                          uploadedFilters.filter((_, i) => i !== idx)
                        )
                    )
                  )
                ) : (
                  <li className="batch-list--empty">No filters uploaded.</li>
                )}
              </ul>
            </div>

            <div className="batch-list-container">
              <p className="batch-list-section-title">Metrics</p>
              <ul className="batch-list">
                {savedMetrics && savedMetrics.length > 0 ? (
                  savedMetrics.map((metric, idx) =>
                    renderListItem(
                      idx,
                      metric.metricType || metric.name || `Metric ${idx + 1}`,
                      getMetricParamsDisplay(metric),
                      () =>
                        setSavedMetrics(
                          savedMetrics.filter((_, i) => i !== idx)
                        )
                    )
                  )
                ) : (
                  <li className="batch-list--empty">No metrics uploaded.</li>
                )}
              </ul>
            </div>
          </section>
        </section>
      </Modal.Body>

      <div className="dialog-actions-container">
        <section className="batch-processing-config-checkboxes ui-clean-forms">
          <FormControl
            component="fieldset"
            sx={{ display: "flex", flexDirection: "row" }}
          >
            <FormLabel sx={{ textAlign: "center" }} component="legend">
              Batch Options
            </FormLabel>
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeRawData}
                  onChange={(e) => setIncludeRawData(e.target.checked)}
                />
              }
              label="Include Raw Data"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeFilteredData}
                  onChange={(e) => setIncludeFilteredData(e.target.checked)}
                />
              }
              label="Include Filtered Data"
            />
            <FormControlLabel
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
        <Button
          variant="primary"
          startIcon={<DynamicFeedIcon />}
          onClick={handleBatchReportGeneration}
          className="batch-processing-submit-btn"
        >
          Generate Batch
        </Button>
      </div>
    </Modal>
  );
};

export default BatchProcessing;

// When constructing the header row for CSV in BatchProcessing, use:
// Example: const wellHeaders = ["Time", ...wells.map((well) => well.label)];
// Use wellHeaders.join(",") wherever you build the header row
