import React, { useState } from "react";
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { Modal, Button } from "../ui";
import { GenerateNeuralCSV } from "./NeuralReport";
import "./ReportModal.css";

const REPORT_OPTIONS = [
  {
    key: "includeProcessedSignal",
    title: "Processed Signal",
    caption: "Time-series data after all processing steps",
  },
  {
    key: "includeSpikeData",
    title: "Spike Data",
    caption: "Detailed information for each detected spike",
  },
  {
    key: "includeOverallMetrics",
    title: "Overall Metrics",
    caption: "Summary statistics for spike frequency, amplitude, width, etc.",
  },
  {
    key: "includeBurstData",
    title: "Burst Data",
    caption: "Details of detected burst events",
  },
  {
    key: "includeBurstMetrics",
    title: "Burst Metrics",
    caption: "Summary statistics for burst duration and intervals",
  },
  // ROI Analysis is appended dynamically below — its caption depends on
  // roiList length and the option is disabled when no ROIs are defined.
];

/**
 * NeuralReportModal — single-well CSV export. User picks which sections
 * to include, then download triggers via a synthesized `<a download>`.
 */
const NeuralReportModal = ({
  open,
  onClose,
  project,
  selectedWell,
  processedSignal,
  peakResults,
  burstResults,
  overallMetrics,
  roiMetrics,
  roiList,
  processingParams,
}) => {
  const [options, setOptions] = useState({
    includeProcessedSignal: true,
    includeSpikeData: true,
    includeOverallMetrics: true,
    includeBurstData: true,
    includeBurstMetrics: true,
    includeROIAnalysis: true,
  });

  const handleOptionChange = (key) => (event) => {
    setOptions({ ...options, [key]: event.target.checked });
  };

  const handleGenerate = () => {
    try {
      const csv = GenerateNeuralCSV(
        project,
        selectedWell,
        processedSignal,
        peakResults,
        burstResults || [],
        overallMetrics,
        roiMetrics || {},
        roiList || [],
        processingParams,
        options
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const wellName = selectedWell?.key || selectedWell?.label || "unknown";
      link.download = `Neural_Analysis_${wellName}_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onClose();
      alert("Neural analysis report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Check console for details.");
    }
  };

  const hasROIs = roiList && roiList.length > 0;
  const roiCaption = hasROIs
    ? `Per-ROI spike/burst data and metrics (${roiList.length} ROI${
        roiList.length > 1 ? "s" : ""
      })`
    : "No ROIs defined";

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      className="report-modal"
      style={{ "--report-modal-accent": "var(--color-success)" }}
    >
      <Modal.Header>Generate Neural Analysis Report</Modal.Header>
      <Modal.Body>
        <p className="report-modal__intro">
          Select which sections to include in the CSV report:
        </p>

        <section className="report-modal__section">
          <h6 className="report-modal__section-title">Include in Report</h6>
          <FormGroup className="report-modal__option-list">
            {REPORT_OPTIONS.map(({ key, title, caption }) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={options[key]}
                    onChange={handleOptionChange(key)}
                    color="success"
                  />
                }
                label={
                  <div>
                    <div className="report-modal__option-title">{title}</div>
                    <span className="report-modal__option-caption">
                      {caption}
                    </span>
                  </div>
                }
              />
            ))}

            <FormControlLabel
              className={hasROIs ? "" : "report-modal__option--disabled"}
              control={
                <Checkbox
                  checked={options.includeROIAnalysis}
                  onChange={handleOptionChange("includeROIAnalysis")}
                  color="success"
                  disabled={!hasROIs}
                />
              }
              label={
                <div>
                  <div className="report-modal__option-title">ROI Analysis</div>
                  <span className="report-modal__option-caption">
                    {roiCaption}
                  </span>
                </div>
              }
            />
          </FormGroup>
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          style={{
            backgroundImage: "none",
            backgroundColor: "var(--color-success)",
            borderColor: "var(--color-success)",
          }}
        >
          Generate Report
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NeuralReportModal;
