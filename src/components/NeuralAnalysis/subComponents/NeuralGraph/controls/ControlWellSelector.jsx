import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { controlsTheme, createSxProps } from "../styles/controlsTheme";
import "./ControlWellSelector.css";

/**
 * ControlWellSelector
 * Component for selecting a control well for noise suppression
 *
 * Features:
 * - Select control well button (3 states: selecting, selected, not selected)
 * - Clear control well by clicking when already selected
 * - Display control well and target well information
 * - Visual feedback for selection mode
 * - Professional scientific styling
 */
const ControlWellSelector = ({
  controlWell,
  setControlWell,
  selectingControl,
  setSelectingControl,
  selectedWell,
  disabled = false,
}) => {
  const handleButtonClick = () => {
    if (disabled || controlWell) return;

    // Toggle selection mode (only when no control well is selected)
    setSelectingControl(!selectingControl);
  };

  return (
    <Paper
      className="control-well-selector-container"
      elevation={2}
      sx={{
        ...createSxProps(),
        backgroundColor: controlsTheme.colors.paper,
        padding: `${controlsTheme.spacing.md}px`,
        borderRadius: `${controlsTheme.borderRadius.lg}px`,

        marginBottom: `${controlsTheme.spacing.md}px`,
        marginTop: `${controlsTheme.spacing.md}px`,
        marginLeft: `${controlsTheme.spacing.md}px`,
        border: `2px solid ${controlsTheme.colors.border}`,
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
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
          letterSpacing: "0.5px",
        }}
      >
        Control Well Selection
      </Typography>

      {/* Control Well Selector Button */}
      <Box sx={{ marginTop: `${controlsTheme.spacing.sm}px` }}>
        <button
          className={
            selectingControl
              ? "control-well-button control-well-button-active"
              : "control-well-button"
          }
          onClick={handleButtonClick}
          disabled={disabled}
          style={{
            width: "100%",
            padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
            backgroundColor: selectingControl
              ? controlsTheme.colors.secondary
              : controlWell
              ? controlsTheme.colors.successBg
              : controlsTheme.colors.backgroundLight,
            color: selectingControl
              ? controlsTheme.colors.text
              : controlWell
              ? controlsTheme.colors.successDark
              : controlsTheme.colors.text,
            border: `2px solid ${
              selectingControl
                ? controlsTheme.colors.secondary
                : controlWell
                ? controlsTheme.colors.success
                : controlsTheme.colors.border
            }`,
            borderRadius: `${controlsTheme.borderRadius.md}px`,
            fontSize: `${controlsTheme.typography.fontSize.lg}px`,
            fontWeight: controlsTheme.typography.fontWeight.semiBold,
            cursor: disabled
              ? "not-allowed"
              : controlWell
              ? "default"
              : "pointer",
            transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
            boxShadow: controlsTheme.shadows.sm,
          }}
        >
          {selectingControl
            ? "Click a well to set as Control"
            : controlWell
            ? `Control: ${controlWell.key}`
            : "Select Control Well"}
        </button>

        {/* Reset Control Well Button (shown when control well is selected) */}
        {controlWell && !selectingControl && (
          <button
            className="reset-control-well-button"
            onClick={() => {
              setControlWell(null);
              console.log("[ControlWellSelector] Control well reset");
            }}
            disabled={disabled}
            style={{
              width: "100%",
              marginTop: `${controlsTheme.spacing.sm}px`,
              padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
              backgroundColor: controlsTheme.colors.dangerBg,
              color: controlsTheme.colors.danger,
              border: `2px solid ${controlsTheme.colors.danger}`,
              borderRadius: `${controlsTheme.borderRadius.md}px`,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
              fontWeight: controlsTheme.typography.fontWeight.semiBold,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
              boxShadow: controlsTheme.shadows.sm,
            }}
          >
            Reset Control Well
          </button>
        )}
      </Box>

      {/* Control Well Information Display */}
      {controlWell && (
        <Box
          className="control-well-info-box"
          sx={{
            marginTop: "auto",
            padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
            backgroundColor: controlsTheme.colors.backgroundDark,
            borderRadius: `${controlsTheme.borderRadius.md}px`,
            border: `1px solid ${controlsTheme.colors.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            sx={{
              color: controlsTheme.colors.text,
              fontSize: `${controlsTheme.typography.fontSize.md}px`,
              fontWeight: controlsTheme.typography.fontWeight.medium,
              marginBottom: `${controlsTheme.spacing.xs}px`,
            }}
          >
            Control Well:{" "}
            <span
              style={{
                color: controlsTheme.colors.secondary,
                fontWeight: controlsTheme.typography.fontWeight.semiBold,
              }}
            >
              {controlWell.key}
            </span>
          </Typography>
          {selectedWell && (
            <Typography
              sx={{
                color: controlsTheme.colors.text,
                fontSize: `${controlsTheme.typography.fontSize.md}px`,
                fontWeight: controlsTheme.typography.fontWeight.medium,
              }}
            >
              Subtracting from:{" "}
              <span
                style={{
                  color: controlsTheme.colors.primary,
                  fontWeight: controlsTheme.typography.fontWeight.semiBold,
                }}
              >
                {selectedWell.key}
              </span>
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ControlWellSelector;
