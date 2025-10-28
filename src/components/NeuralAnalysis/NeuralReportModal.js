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
} from "@mui/material";
import { GenerateNeuralCSV } from "./NeuralReport";

/**
 * NeuralReportModal
 * Modal dialog for configuring and generating neural analysis CSV reports
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
  // State for CSV generation options
  const [options, setOptions] = useState({
    includeProcessedSignal: true,
    includeSpikeData: true,
    includeOverallMetrics: true,
    includeBurstData: true,
    includeBurstMetrics: true,
    includeROIAnalysis: true,
  });

  // Handle checkbox changes
  const handleOptionChange = (optionName) => (event) => {
    setOptions({
      ...options,
      [optionName]: event.target.checked,
    });
  };

  // Handle generate report
  const handleGenerate = () => {
    try {
      // Generate CSV with selected options
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

      // Create download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp and well name
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

      // Close modal and show success message
      onClose();
      alert("Neural analysis report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Error generating report. Check console for details.");
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          backgroundColor: "#4caf50",
          color: "white",
          fontWeight: "bold",
          fontSize: "1.25rem",
        }}
      >
        Generate Neural Analysis Report
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select which sections to include in the CSV report:
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.includeProcessedSignal}
                onChange={handleOptionChange("includeProcessedSignal")}
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Processed Signal
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Time-series data after all processing steps
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
                color="success"
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
                color="success"
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  Overall Metrics
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Summary statistics for spike frequency, amplitude, width, etc.
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
                color="success"
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
                color="success"
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
                color="success"
                disabled={!roiList || roiList.length === 0}
              />
            }
            label={
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  ROI Analysis
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {roiList && roiList.length > 0
                    ? `Per-ROI spike/burst data and metrics (${
                        roiList.length
                      } ROI${roiList.length > 1 ? "s" : ""})`
                    : "No ROIs defined"}
                </Typography>
              </Box>
            }
            sx={{ mb: 1.5 }}
          />
        </FormGroup>

        <Divider sx={{ mt: 2, mb: 2 }} />

        {/* <Box sx={{ backgroundColor: "#f5f5f5", p: 2, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="medium" gutterBottom>
            Report Information:
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Well: {selectedWell?.key || selectedWell?.label || "N/A"}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Spikes Detected: {peakResults?.length || 0}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            Bursts Detected: {burstResults?.length || 0}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary">
            ROIs Defined: {roiList?.length || 0}
          </Typography>
        </Box> */}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleCancel}
          color="inherit"
          sx={{
            fontWeight: "medium",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          color="success"
          sx={{
            fontWeight: "bold",
            backgroundColor: "#4caf50",
            "&:hover": {
              backgroundColor: "#45a049",
            },
          }}
        >
          Generate Report
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NeuralReportModal;
