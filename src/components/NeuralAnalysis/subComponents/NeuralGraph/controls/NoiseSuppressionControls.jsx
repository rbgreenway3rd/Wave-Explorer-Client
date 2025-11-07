import React from "react";
import {
  Box,
  IconButton,
  FormControlLabel,
  Switch,
  Tooltip,
  Typography,
  Paper,
} from "@mui/material";
import { controlsTheme, createSxProps } from "../styles/controlsTheme";
import "./NoiseSuppressionControls.css";

/**
 * NoiseSuppressionControls
 * Component for managing noise suppression settings and preprocessing methods
 *
 * Features:
 * - ON/OFF toggle for noise suppression
 * - Switches for preprocessing methods (Trend Flattening, Subtract Control, Baseline Correction)
 * - Professional scientific styling
 *
 * Note: Control well selection has been moved to ControlWellSelector component
 */
const NoiseSuppressionControls = ({
  noiseSuppressionActive,
  setNoiseSuppressionActive,
  trendFlatteningEnabled,
  setTrendFlatteningEnabled,
  subtractControl,
  setSubtractControl,
  baselineCorrection,
  setBaselineCorrection,
  filterBaseline,
  setFilterBaseline,
}) => {
  return (
    <Paper
      className="noise-suppression-container"
      elevation={2}
      sx={{
        ...createSxProps(),
        backgroundColor: controlsTheme.colors.paper,
        padding: `${controlsTheme.spacing.md}px`,
        borderRadius: `${controlsTheme.borderRadius.lg}px`,
        border: `2px solid ${controlsTheme.colors.border}`,
        marginBottom: `${controlsTheme.spacing.md}px`,
        marginTop: `${controlsTheme.spacing.md}px`,
        // marginLeft: `${controlsTheme.spacing.md}px`,
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
        Noise Suppression
      </Typography>

      {/* ON/OFF Toggle */}
      <Box
        className="noise-suppression-toggle"
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: `${controlsTheme.spacing.xs}px`,
          marginBottom: `${controlsTheme.spacing.md}px`,
          padding: `${controlsTheme.spacing.xs}px`,
          backgroundColor: controlsTheme.colors.backgroundDark,
          borderRadius: `${controlsTheme.borderRadius.md}px`,
          border: `1px solid ${controlsTheme.colors.border}`,
        }}
      >
        <Tooltip title="Enable Noise Suppression" arrow>
          <IconButton
            className="noise-suppression-on-button"
            onClick={() => setNoiseSuppressionActive(true)}
            disabled={noiseSuppressionActive}
            sx={{
              color: noiseSuppressionActive
                ? controlsTheme.colors.primary
                : controlsTheme.colors.textSecondary,
              backgroundColor: noiseSuppressionActive
                ? controlsTheme.colors.primaryBg
                : "transparent",
              fontWeight: controlsTheme.typography.fontWeight.bold,
              fontSize: `${controlsTheme.typography.fontSize.lg}px`,
              padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
              borderRadius: `${controlsTheme.borderRadius.sm}px`,
              transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
              "&:hover": {
                backgroundColor: noiseSuppressionActive
                  ? controlsTheme.colors.primaryBg
                  : controlsTheme.colors.backgroundLight,
              },
              "&:disabled": {
                color: noiseSuppressionActive
                  ? controlsTheme.colors.primary
                  : controlsTheme.colors.textDisabled,
              },
            }}
          >
            ON
          </IconButton>
        </Tooltip>

        <Typography
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.lg}px`,
            fontWeight: controlsTheme.typography.fontWeight.medium,
          }}
        >
          /
        </Typography>

        <Tooltip title="Disable Noise Suppression" arrow>
          <IconButton
            className="noise-suppression-off-button"
            onClick={() => setNoiseSuppressionActive(false)}
            disabled={!noiseSuppressionActive}
            sx={{
              color: !noiseSuppressionActive
                ? controlsTheme.colors.danger
                : controlsTheme.colors.textSecondary,
              backgroundColor: !noiseSuppressionActive
                ? controlsTheme.colors.dangerBg
                : "transparent",
              fontWeight: controlsTheme.typography.fontWeight.bold,
              fontSize: `${controlsTheme.typography.fontSize.lg}px`,
              padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.md}px`,
              borderRadius: `${controlsTheme.borderRadius.sm}px`,
              transition: `all ${controlsTheme.transitions.normal} ${controlsTheme.transitions.ease}`,
              "&:hover": {
                backgroundColor: !noiseSuppressionActive
                  ? controlsTheme.colors.dangerBg
                  : controlsTheme.colors.backgroundLight,
              },
              "&:disabled": {
                color: !noiseSuppressionActive
                  ? controlsTheme.colors.danger
                  : controlsTheme.colors.textDisabled,
              },
            }}
          >
            OFF
          </IconButton>
        </Tooltip>
      </Box>

      {/* Preprocessing Method Switches */}
      <Box
        className="noise-suppression-methods"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: `${controlsTheme.spacing.sm}px`,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={!!trendFlatteningEnabled}
              onChange={(_, checked) => {
                if (typeof setTrendFlatteningEnabled === "function") {
                  setTrendFlatteningEnabled(checked);
                }
                if (checked) {
                  // Optionally handle mutual exclusivity or warnings
                  console.log(
                    "[NoiseSuppressionControls] Trend Flattening enabled"
                  );
                }
              }}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: controlsTheme.colors.primary,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: controlsTheme.colors.primary,
                },
              }}
            />
          }
          label={
            <Typography
              sx={{
                color: controlsTheme.colors.text,
                fontSize: `${controlsTheme.typography.fontSize.sm}px`,
                fontWeight: controlsTheme.typography.fontWeight.medium,
              }}
            >
              Trend Flattening (Detrending)
            </Typography>
          }
          sx={{
            margin: 0,
            padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.lg}px`,
          }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={subtractControl}
              onChange={(_, checked) => {
                setSubtractControl(checked);
                if (checked && typeof setFilterBaseline === "function") {
                  setFilterBaseline(false);
                }
              }}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: controlsTheme.colors.secondary,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: controlsTheme.colors.secondary,
                },
              }}
            />
          }
          label={
            <Typography
              sx={{
                color: controlsTheme.colors.text,
                fontSize: `${controlsTheme.typography.fontSize.sm}px`,
                fontWeight: controlsTheme.typography.fontWeight.medium,
              }}
            >
              Subtract Control Well Signature
            </Typography>
          }
          sx={{
            margin: 0,
            padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.lg}px`,
          }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={!!baselineCorrection}
              onChange={(_, checked) => {
                if (typeof setBaselineCorrection === "function") {
                  setBaselineCorrection(checked);
                }
                if (checked) {
                  console.log(
                    "[NoiseSuppressionControls] Baseline Correction enabled"
                  );
                }
              }}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: controlsTheme.colors.success,
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: controlsTheme.colors.success,
                },
              }}
            />
          }
          label={
            <Typography
              sx={{
                color: controlsTheme.colors.text,
                fontSize: `${controlsTheme.typography.fontSize.sm}px`,
                fontWeight: controlsTheme.typography.fontWeight.medium,
              }}
            >
              Baseline Correction
            </Typography>
          }
          sx={{
            margin: 0,
            padding: `${controlsTheme.spacing.sm}px ${controlsTheme.spacing.lg}px`,
          }}
        />
      </Box>
    </Paper>
  );
};

export default NoiseSuppressionControls;
