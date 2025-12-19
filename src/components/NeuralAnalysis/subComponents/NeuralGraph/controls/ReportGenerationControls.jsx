import React from "react";
import { Box, Button, Typography, Paper, Tooltip } from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import DashboardIcon from "@mui/icons-material/Dashboard";
import {
  controlsTheme,
  buttonStyles,
  createSxProps,
} from "../styles/controlsTheme";
import "./ReportGenerationControls.css";

/**
 * ReportGenerationControls
 * Component for generating CSV reports from neural analysis data
 *
 * Features:
 * - Generate single-well neural analysis report
 * - Generate full-plate report for all wells
 * - Clear visual distinction between report types
 * - Disabled states with helpful tooltips
 * - Professional scientific styling
 */
const ReportGenerationControls = ({
  selectedWell,
  peakResults,
  wellArrays,
  handleGenerateReport,
  handleGenerateFullPlateReport,
}) => {
  const isSingleWellDisabled =
    !selectedWell || !peakResults || peakResults.length === 0;
  const isFullPlateDisabled = !wellArrays || wellArrays.length === 0;

  const singleWellTooltip = isSingleWellDisabled
    ? "Select a well and run spike detection first"
    : "Generate CSV report for the currently selected well";

  const fullPlateTooltip = isFullPlateDisabled
    ? "Load a dataset with multiple wells first"
    : "Generate comprehensive CSV report for all wells in the plate";

  return (
    <Paper
      className="report-generation-controls-container"
      elevation={2}
      sx={{
        ...createSxProps(),
        backgroundColor: controlsTheme.colors.paper,
        padding: `${controlsTheme.spacing.md}px`,
        borderRadius: `${controlsTheme.borderRadius.lg}px`,
        border: `0.125rem solid ${controlsTheme.colors.border}`,
        marginBottom: `${controlsTheme.spacing.md}px`,
        marginTop: `${controlsTheme.spacing.md}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Section Header */}
      <Typography
        variant="subtitle2"
        sx={{
          color: controlsTheme.colors.text,
          fontWeight: controlsTheme.typography.fontWeight.bold,
          fontSize: `${controlsTheme.typography.fontSize.md}px`,
          marginBottom: `${controlsTheme.spacing.sm}px`,
          textTransform: "uppercase",
          letterSpacing: "0.03125rem",
        }}
      >
        Report Generation
      </Typography>

      {/* Buttons Container */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: `${controlsTheme.spacing.sm}px`,
        }}
      >
        {/* Single-Well Report Button */}
        <Tooltip title={singleWellTooltip} arrow placement="top">
          <span>
            {" "}
            {/* Span wrapper needed for tooltip on disabled button */}
            <Button
              className="single-well-report-button"
              onClick={handleGenerateReport}
              disabled={isSingleWellDisabled}
              startIcon={<DescriptionIcon />}
              fullWidth
              sx={{
                ...buttonStyles.base,
                ...buttonStyles.success,
                height: controlsTheme.components.button.height.lg,
                fontSize: `${controlsTheme.typography.fontSize.md}px`,
                "&:disabled": {
                  backgroundColor: controlsTheme.colors.disabled,
                  color: controlsTheme.colors.disabledText,
                  boxShadow: controlsTheme.shadows.none,
                  cursor: "not-allowed",
                },
              }}
            >
              Generate Single-Well Report
            </Button>
          </span>
        </Tooltip>

        {/* Full-Plate Report Button */}
        <Tooltip title={fullPlateTooltip} arrow placement="top">
          <span>
            {" "}
            {/* Span wrapper needed for tooltip on disabled button */}
            <Button
              className="full-plate-report-button"
              onClick={handleGenerateFullPlateReport}
              disabled={isFullPlateDisabled}
              startIcon={<DashboardIcon />}
              fullWidth
              sx={{
                ...buttonStyles.base,
                ...buttonStyles.primary,
                height: controlsTheme.components.button.height.lg,
                fontSize: `${controlsTheme.typography.fontSize.md}px`,
                "&:disabled": {
                  backgroundColor: controlsTheme.colors.disabled,
                  color: controlsTheme.colors.disabledText,
                  boxShadow: controlsTheme.shadows.none,
                  cursor: "not-allowed",
                },
              }}
            >
              Generate Full-Plate Report
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Info Text */}
      <Box
        sx={{
          marginTop: `${controlsTheme.spacing.sm}px`,
          padding: `${controlsTheme.spacing.md}px`,
          backgroundColor: controlsTheme.colors.backgroundLight,
          borderRadius: `${controlsTheme.borderRadius.sm}px`,
          border: `0.0625rem solid ${controlsTheme.colors.divider}`,
          alignItems: "end",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            lineHeight: controlsTheme.typography.lineHeight.relaxed,
          }}
        >
          {selectedWell && peakResults && peakResults.length > 0 ? (
            <>
              <strong>Selected Well:</strong> {selectedWell.key} (
              {peakResults.length} spikes detected)
            </>
          ) : (
            <>
              No well selected. Select a well and run spike detection to
              generate reports.
            </>
          )}
        </Typography>

        {wellArrays && wellArrays.length > 0 && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              marginTop: `${controlsTheme.spacing.xs}px`,
              color: controlsTheme.colors.textSecondary,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            <strong>Plate Data:</strong> {wellArrays.length} wells available for
            full-plate analysis
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default ReportGenerationControls;
