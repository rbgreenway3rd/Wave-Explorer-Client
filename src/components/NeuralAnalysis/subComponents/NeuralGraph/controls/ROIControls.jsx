import React, { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@mui/material";
import { controlsTheme } from "../styles/controlsTheme";
import "./ROIControls.css";

/**
 * ROIControls
 * Component for managing Region of Interest (ROI) definition, editing, and deletion
 *
 * Features:
 * - Define new ROIs
 * - Edit existing ROIs
 * - Delete ROIs
 * - Color-coded ROI buttons
 * - Visual feedback for active ROI
 *
 * This component eliminates duplication between ChartControls and NeuralControls
 */
const ROIControls = ({
  defineROI,
  setDefineROI,
  roiList,
  setRoiList,
  currentRoiIndex,
  setCurrentRoiIndex,
}) => {
  const [pendingRoiIndex, setPendingRoiIndex] = useState(null);

  // Sync pending ROI index with current ROI index
  useEffect(() => {
    setPendingRoiIndex(currentRoiIndex);
  }, [currentRoiIndex]);

  // Automatically set currentRoiIndex to 0 when ROI definition is enabled and no ROIs exist
  useEffect(() => {
    if (defineROI && roiList.length === 0 && currentRoiIndex === null) {
      setCurrentRoiIndex && setCurrentRoiIndex(0);
      setPendingRoiIndex(0);
    }
  }, [defineROI, roiList.length, currentRoiIndex, setCurrentRoiIndex]);

  // Clear pending ROI index when ROI definition is disabled
  useEffect(() => {
    if (!defineROI) {
      setPendingRoiIndex(null);
      setCurrentRoiIndex && setCurrentRoiIndex(null);
    }
  }, [defineROI, setCurrentRoiIndex]);

  const handleDefineRoi = (idx) => {
    setCurrentRoiIndex && setCurrentRoiIndex(idx);
    setPendingRoiIndex(idx);
  };

  const handleDeleteRoi = (idx) => {
    const newRoiList = roiList.filter((_, i) => i !== idx);
    setRoiList && setRoiList(newRoiList);

    if (pendingRoiIndex !== null && pendingRoiIndex > idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(pendingRoiIndex - 1);
      setPendingRoiIndex(pendingRoiIndex - 1);
    } else if (pendingRoiIndex === idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(null);
      setPendingRoiIndex(null);
    }
  };

  const renderRoiButtons = () => {
    if (!defineROI) return null;

    const buttons = [];
    const numRois = roiList.length;

    for (let i = 0; i <= numRois; i++) {
      const isDefined = i < numRois;
      const isActive = pendingRoiIndex === i;
      const label = isDefined ? `Edit ROI ${i + 1}` : `Define ROI ${i + 1}`;
      const roiColor =
        controlsTheme.colors.roi[i % controlsTheme.colors.roi.length];

      buttons.push(
        <Box
          key={i}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            marginRight: `${controlsTheme.spacing.sm}px`,
            marginBottom: `${controlsTheme.spacing.xs}px`,
          }}
        >
          <button
            className={`roi-button ${isActive ? "roi-button-active" : ""} ${
              isDefined ? "roi-button-defined" : ""
            }`}
            disabled={!defineROI || (pendingRoiIndex !== null && !isActive)}
            onClick={() => handleDefineRoi(i)}
            style={{
              padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
              backgroundColor: isActive
                ? controlsTheme.colors.secondary
                : isDefined
                ? roiColor.bg
                : controlsTheme.colors.backgroundLight,
              color: isActive
                ? controlsTheme.colors.text
                : controlsTheme.colors.text,
              border: `2px solid ${
                isActive
                  ? controlsTheme.colors.secondary
                  : isDefined
                  ? roiColor.border
                  : controlsTheme.colors.border
              }`,
              borderRadius: `${controlsTheme.borderRadius.md}px`,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
              fontWeight: controlsTheme.typography.fontWeight.semiBold,
              cursor:
                !defineROI || (pendingRoiIndex !== null && !isActive)
                  ? "not-allowed"
                  : "pointer",
              opacity:
                !defineROI || (pendingRoiIndex !== null && !isActive) ? 0.5 : 1,
              transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
              marginRight: isDefined ? controlsTheme.spacing.xs : 0,
              boxShadow: controlsTheme.shadows.sm,
            }}
          >
            {label}
          </button>

          {isDefined && (
            <button
              className="roi-delete-button"
              title={`Delete ROI ${i + 1}`}
              onClick={() => handleDeleteRoi(i)}
              tabIndex={-1}
              style={{
                padding: `${controlsTheme.spacing.xs}px ${controlsTheme.spacing.sm}px`,
                background: "transparent",
                color: controlsTheme.colors.danger,
                border: "none",
                fontWeight: controlsTheme.typography.fontWeight.bold,
                fontSize: `${controlsTheme.typography.fontSize.xl}px`,
                cursor: "pointer",
                lineHeight: 1,
                transition: `all ${controlsTheme.transitions.fast} ${controlsTheme.transitions.ease}`,
              }}
            >
              ×
            </button>
          )}
        </Box>
      );
    }

    return buttons;
  };

  if (!defineROI) {
    return null;
  }

  return (
    <Paper
      className="roi-controls-container"
      elevation={2}
      sx={{
        backgroundColor: controlsTheme.colors.paper,
        padding: `${controlsTheme.spacing.md}px`,
        borderRadius: `${controlsTheme.borderRadius.lg}px`,
        border: `1px solid ${controlsTheme.colors.border}`,
        marginTop: `${controlsTheme.spacing.md}px`,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          color: controlsTheme.colors.text,
          fontWeight: controlsTheme.typography.fontWeight.bold,
          fontSize: `${controlsTheme.typography.fontSize.md}px`,
          marginBottom: `${controlsTheme.spacing.sm}px`,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Regions of Interest
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: `${controlsTheme.spacing.xs}px`,
        }}
      >
        {renderRoiButtons()}
      </Box>

      {pendingRoiIndex !== null && (
        <Typography
          variant="caption"
          sx={{
            display: "block",
            marginTop: `${controlsTheme.spacing.sm}px`,
            color: controlsTheme.colors.secondary,
            fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            fontStyle: "italic",
          }}
        >
          Click and drag on the chart to define ROI {pendingRoiIndex + 1}
        </Typography>
      )}
    </Paper>
  );
};

export default ROIControls;
