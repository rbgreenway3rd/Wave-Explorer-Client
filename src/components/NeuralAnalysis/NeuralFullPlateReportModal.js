import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { GenerateFullPlateReport } from "./NeuralFullPlateReport";

/**
 * NeuralFullPlateReportModal
 * Modal dialog for configuring and generating full-plate neural analysis CSV reports
 * Processes all wells and combines results into a single CSV file
 */
const NeuralFullPlateReportModal = ({
  open,
  onClose,
  project,
  wellArrays,
  processingParams,
  roiList = [], // Accept roiList prop, default to empty array
}) => {
  // State for CSV generation options
  const [options, setOptions] = useState({
    includeProcessedSignal: false,
    includeSpikeData: false,
    includeOverallMetrics: false,
    includeBurstData: false,
    includeBurstMetrics: false,
    includeROIAnalysis: true,
  });

  // State for processing progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentWellIndex, setCurrentWellIndex] = useState(0);
  const [totalWells, setTotalWells] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  // Handle checkbox changes
  const handleOptionChange = (optionName) => (event) => {
    setOptions({
      ...options,
      [optionName]: event.target.checked,
    });
  };

  // Handle cancel during processing
  const handleCancelProcessing = () => {
    setIsCancelled(true);
  };

  // Handle generate full-plate report
  const handleGenerate = async () => {
    try {
      setIsProcessing(true);
      setIsCancelled(false);
      setCurrentWellIndex(0);

      console.log("[FullPlateReport] wellArrays:", wellArrays);
      console.log("[FullPlateReport] wellArrays type:", typeof wellArrays);
      console.log(
        "[FullPlateReport] wellArrays isArray:",
        Array.isArray(wellArrays)
      );
      console.log("[FullPlateReport] wellArrays length:", wellArrays?.length);

      // Get all wells from wellArrays
      const allWells = [];

      if (wellArrays && Array.isArray(wellArrays)) {
        // wellArrays is a flat array of wells
        wellArrays.forEach((well, index) => {
          if (
            well &&
            well.indicators &&
            well.indicators[0] &&
            well.indicators[0].filteredData
          ) {
            console.log(
              `[FullPlateReport] Adding well ${index}: ${
                well.key || well.id || "unknown"
              } with ${well.indicators[0].filteredData.length} data points`
            );
            allWells.push(well);
          } else {
            console.log(
              `[FullPlateReport] Skipping well ${index} - no valid data`,
              {
                hasWell: !!well,
                hasIndicators: !!well?.indicators,
                hasIndicator0: !!well?.indicators?.[0],
                hasFilteredData: !!well?.indicators?.[0]?.filteredData,
              }
            );
          }
        });
      }

      console.log(`[FullPlateReport] Total wells found: ${allWells.length}`);

      if (allWells.length === 0) {
        alert("No wells with data found.");
        setIsProcessing(false);
        return;
      }

      setTotalWells(allWells.length);

      // Progress callback for updating UI
      const handleProgress = (wellIndex, total) => {
        if (isCancelled) return;
        setCurrentWellIndex(wellIndex);
      };

      // Generate the full-plate CSV report
      const fullPlateCSV = GenerateFullPlateReport(
        project,
        allWells,
        processingParams,
        options,
        handleProgress,
        roiList // Pass roiList to the report generator
      );

      if (isCancelled) {
        alert("Report generation cancelled.");
        setIsProcessing(false);
        setIsCancelled(false);
        return;
      }

      // Create download
      const blob = new Blob([fullPlateCSV], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
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

  // Handle cancel button in dialog
  const handleCancel = () => {
    if (isProcessing) {
      handleCancelProcessing();
    } else {
      onClose();
    }
  };

  // Calculate progress percentage
  const progressPercentage =
    totalWells > 0 ? (currentWellIndex / totalWells) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose} // Prevent closing during processing
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#2196f3",
          color: "white",
          fontWeight: "bold",
          fontSize: "1.25rem",
        }}
      >
        Generate Full-Plate Neural Analysis Report
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {!isProcessing ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will process all wells in the plate and generate a
              comprehensive CSV report.
            </Typography>

            <Divider sx={{ mb: 2 }} />

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeProcessedSignal}
                    onChange={handleOptionChange("includeProcessedSignal")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Processed Signal
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Time-series data after all processing steps (may result in
                      large file)
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeSpikeData}
                    onChange={handleOptionChange("includeSpikeData")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Spike Data
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Detailed information for each detected spike
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeOverallMetrics}
                    onChange={handleOptionChange("includeOverallMetrics")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Overall Metrics
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Summary statistics for spike frequency, amplitude, width,
                      etc.
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeBurstData}
                    onChange={handleOptionChange("includeBurstData")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Burst Data
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Details of detected burst events
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeBurstMetrics}
                    onChange={handleOptionChange("includeBurstMetrics")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="medium">
                      Burst Metrics
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Summary statistics for burst duration and intervals
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={options.includeROIAnalysis}
                    onChange={handleOptionChange("includeROIAnalysis")}
                    color="primary"
                    disabled={!roiList || roiList.length === 0}
                  />
                }
                label={
                  <Box>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={
                        roiList && roiList.length > 0
                          ? "text.primary"
                          : "text.disabled"
                      }
                    >
                      ROI Analysis
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {roiList && roiList.length > 0
                        ? `Apply ${roiList.length} defined ROI${
                            roiList.length > 1 ? "s" : ""
                          } to all wells`
                        : "No ROIs defined (define ROIs in the graph above)"}
                    </Typography>
                  </Box>
                }
                sx={{ mb: 1.5 }}
              />
            </FormGroup>

            <Divider sx={{ mt: 2, mb: 2 }} />

            <Box sx={{ backgroundColor: "#e3f2fd", p: 2, borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Processing Information:
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                This will analyze all wells with the current processing
                parameters.
              </Typography>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Processing time will depend on the number of wells and selected
                options.
              </Typography>
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom>
              Processing Wells...
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Well {currentWellIndex} of {totalWells}
            </Typography>
            <Box sx={{ width: "100%", mt: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progressPercentage}
              />
            </Box>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {progressPercentage.toFixed(0)}% complete
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleCancel}
          color="inherit"
          sx={{
            fontWeight: "medium",
          }}
          disabled={isProcessing && isCancelled}
        >
          {isProcessing ? "Cancel" : "Close"}
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          color="primary"
          disabled={isProcessing}
          sx={{
            fontWeight: "bold",
            backgroundColor: "#2196f3",
            "&:hover": {
              backgroundColor: "#1976d2",
            },
          }}
        >
          {isProcessing ? "Processing..." : "Generate Full-Plate Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NeuralFullPlateReportModal;
