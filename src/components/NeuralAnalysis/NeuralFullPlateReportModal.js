import React, { useState } from "react";
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  LinearProgress,
  CircularProgress,
  FormControl,
  FormLabel,
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Modal, Button } from "../ui";
import { GenerateFullPlateReport } from "./NeuralFullPlateReport";
import "./ReportModal.css";

const PLATE_OPTIONS = [
  {
    key: "includeProcessedSignal",
    title: "Processed Signal",
    caption:
      "Time-series data after all processing steps (may result in large file)",
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
  {
    key: "includePlateSummary",
    title: "Plate Summary Table",
    caption:
      "Side-by-side per-ROI summary across all wells (supplemental; appended after the per-well blocks)",
  },
];

/**
 * NeuralFullPlateReportModal — full-plate CSV export. Iterates every
 * well, runs the analysis pipeline, and emits a combined CSV. Shows a
 * progress overlay while processing; user can cancel mid-flight.
 */
const NeuralFullPlateReportModal = ({
  open,
  onClose,
  project,
  wellArrays,
  processingParams,
  roiList = [],
}) => {
  const [options, setOptions] = useState({
    includeProcessedSignal: false,
    includeSpikeData: false,
    includeOverallMetrics: false,
    includeBurstData: false,
    includeBurstMetrics: false,
    includeROIAnalysis: true,
    includePlateSummary: true,
    // Default to "defined" so the full-plate report uses the same
    // Prominence / Window the user has dialed in via the modal's
    // sliders — that's what they're seeing on screen, and they
    // reasonably expect the same calibration applied to every well.
    // "auto" stays available behind the radio for users who want a
    // per-well auto-suggested prominence instead.
    parameterMode: "defined",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWellIndex, setCurrentWellIndex] = useState(0);
  const [totalWells, setTotalWells] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleOptionChange = (key) => (event) => {
    setOptions({ ...options, [key]: event.target.checked });
  };

  const handleCancelProcessing = () => setIsCancelled(true);

  const handleGenerate = async () => {
    try {
      setIsProcessing(true);
      setIsCancelled(false);
      setCurrentWellIndex(0);

      // Wells store filtered data as typed-array primary storage
      // (filteredXs / filteredYs) post-Phase C; the {x,y}[] form
      // (`filteredData`) is left empty until a consumer calls
      // `materializeFilteredData()`. So we filter on the typed-array
      // presence, not on the (always-truthy-when-empty) point array.
      const allWells = [];
      if (wellArrays && Array.isArray(wellArrays)) {
        wellArrays.forEach((well) => {
          const ind = well && well.indicators && well.indicators[0];
          if (!ind) return;
          const hasFiltered =
            (ind.filteredYs && ind.filteredYs.length > 0) ||
            (Array.isArray(ind.filteredData) && ind.filteredData.length > 0);
          if (hasFiltered) allWells.push(well);
        });
      }

      if (allWells.length === 0) {
        alert("No wells with data found.");
        setIsProcessing(false);
        return;
      }
      setTotalWells(allWells.length);

      const handleProgress = (wellIndex) => {
        if (isCancelled) return;
        setCurrentWellIndex(wellIndex);
      };

      // GenerateFullPlateReport returns an ARRAY of CSV chunks (not a
      // single string) so very large plates don't hit Firefox's
      // "allocation size overflow" limit when concatenating the whole
      // file in JS. Blob accepts the array directly and handles the
      // storage natively.
      const csvChunks = await GenerateFullPlateReport(
        project,
        allWells,
        processingParams,
        options,
        handleProgress,
        roiList
      );

      if (isCancelled) {
        alert("Report generation cancelled.");
        setIsProcessing(false);
        setIsCancelled(false);
        return;
      }

      const blob = new Blob(csvChunks, {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      link.download = `Neural_Analysis_FullPlate_${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsProcessing(false);
      onClose();
      alert(
        `Full-plate neural analysis report generated successfully! Processed ${allWells.length} wells.`
      );
    } catch (error) {
      console.error("Error generating full-plate report:", error);
      alert("Error generating full-plate report. Check console for details.");
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) handleCancelProcessing();
    else onClose();
  };

  const progressPercentage =
    totalWells > 0 ? (currentWellIndex / totalWells) * 100 : 0;

  const hasROIs = roiList && roiList.length > 0;
  const roiCaption = hasROIs
    ? `Apply ${roiList.length} defined ROI${roiList.length > 1 ? "s" : ""} to all wells`
    : "No ROIs defined (define ROIs in the graph above)";

  return (
    <Modal
      open={open}
      onClose={isProcessing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      className="report-modal"
      style={{
        "--report-modal-accent": "var(--color-primary)",
        "--report-modal-info-bg": "var(--color-primary-soft)",
      }}
    >
      <Modal.Header>Generate Full-Plate Neural Analysis Report</Modal.Header>

      <Modal.Body>
        {!isProcessing ? (
          <>
            <p className="report-modal__intro">
              This will process all wells in the plate and generate a
              comprehensive CSV report.
            </p>

            <section className="report-modal__section">
              <h6 className="report-modal__section-title">Include in Report</h6>
              <FormGroup className="report-modal__option-list">
                {PLATE_OPTIONS.map(({ key, title, caption }) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={options[key]}
                        onChange={handleOptionChange(key)}
                        color="primary"
                      />
                    }
                    label={
                      <div>
                        <div className="report-modal__option-title">
                          {title}
                        </div>
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
                      color="primary"
                      disabled={!hasROIs}
                    />
                  }
                  label={
                    <div>
                      <div className="report-modal__option-title">
                        ROI Analysis
                      </div>
                      <span className="report-modal__option-caption">
                        {roiCaption}
                      </span>
                    </div>
                  }
                />
              </FormGroup>
            </section>

            <section className="report-modal__section">
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  className="report-modal__section-title"
                >
                  Parameters
                </FormLabel>
                <RadioGroup
                  value={options.parameterMode}
                  onChange={(e) =>
                    setOptions({ ...options, parameterMode: e.target.value })
                  }
                >
                  <FormControlLabel
                    value="defined"
                    control={<Radio color="primary" />}
                    label={
                      <div>
                        <div className="report-modal__option-title">
                          Use my defined parameters
                          <Tooltip
                            arrow
                            title={
                              <div style={{ lineHeight: 1.4 }}>
                                <div style={{ marginBottom: 4 }}>
                                  Use the slider values from the chart
                                  controls for every well, instead of
                                  recomputing per-well auto-suggestions:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: 18 }}>
                                  <li>
                                    <b>Prominence</b> — your current Spike
                                    Prominence slider value
                                  </li>
                                  <li>
                                    <b>Window</b> — your current Window Width
                                    slider value
                                  </li>
                                </ul>
                                <div style={{ marginTop: 4 }}>
                                  All other spike-detection parameters (Min
                                  Width, Min Distance, Cluster Separation,
                                  Noise Floor, Symmetry, Noise Window) always
                                  use your slider values regardless of this
                                  setting.
                                </div>
                              </div>
                            }
                          >
                            <InfoOutlinedIcon
                              className="report-modal__info-icon"
                              fontSize="small"
                            />
                          </Tooltip>
                        </div>
                        <span className="report-modal__option-caption">
                          Apply your current Prominence and Window slider
                          values to every well
                        </span>
                      </div>
                    }
                  />
                  <FormControlLabel
                    value="auto"
                    control={<Radio color="primary" />}
                    label={
                      <div>
                        <div className="report-modal__option-title">
                          Use auto-calculated defaults
                        </div>
                        <span className="report-modal__option-caption">
                          Compute Prominence and Window automatically for each
                          well from its raw signal
                        </span>
                      </div>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </section>

            <section className="report-modal__section report-modal__section--info">
              <h6 className="report-modal__section-title">
                Processing Information
              </h6>
              <span className="report-modal__info-line">
                This will analyze all wells with the current processing
                parameters.
              </span>
              <span className="report-modal__info-line">
                Processing time will depend on the number of wells and
                selected options.
              </span>
            </section>
          </>
        ) : (
          <div className="report-modal__progress">
            <CircularProgress size={60} />
            <h6 className="report-modal__progress-title">Processing Wells...</h6>
            <p className="report-modal__progress-status">
              Well {currentWellIndex} of {totalWells}
            </p>
            <div className="report-modal__progress-bar">
              <LinearProgress variant="determinate" value={progressPercentage} />
            </div>
            <span className="report-modal__progress-percent">
              {progressPercentage.toFixed(0)}% complete
            </span>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="ghost"
          onClick={handleCancel}
          disabled={isProcessing && isCancelled}
        >
          {isProcessing ? "Cancel" : "Close"}
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing..." : "Generate Full-Plate Report"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NeuralFullPlateReportModal;
