import React from "react";
import {
  Box,
  Button,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
} from "@mui/material";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import CropFreeIcon from "@mui/icons-material/CropFree";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  controlsTheme,
  buttonStyles,
  createSxProps,
} from "../styles/controlsTheme";
import "./PanZoomControls.css";

/**
 * PanZoomControls
 * Component for managing chart interaction modes (pan/zoom, ROI definition)
 *
 * Features:
 * - Enable/disable pan and zoom functionality
 * - Toggle ROI definition mode
 * - Reset zoom to default view
 * - Mutually exclusive modes (pan/zoom vs ROI definition)
 * - Professional scientific styling
 */
const PanZoomControls = ({
  defineROI,
  setDefineROI,
  enablePanZoom,
  setEnablePanZoom,
  zoomState,
  setZoomState,
  panState,
  setPanState,
  resetZoom,
}) => {
  const handlePanZoomToggle = (checked) => {
    setEnablePanZoom?.(checked);
    setZoomState?.(checked);
    setPanState?.(checked);

    if (checked) {
      // Disable ROI when enabling pan/zoom
      setDefineROI?.(false);
    }
  };

  const handleDefineROIToggle = (checked) => {
    setDefineROI?.(checked);

    if (checked) {
      // Disable pan/zoom when enabling ROI
      setEnablePanZoom?.(false);
      setZoomState?.(false);
      setPanState?.(false);
    }
  };

  return (
    <Paper
      className="pan-zoom-controls-container"
      elevation={2}
      sx={{
        ...createSxProps(),
        backgroundColor: controlsTheme.colors.paper,
        padding: `${controlsTheme.spacing.md}px`,
        borderRadius: `${controlsTheme.borderRadius.lg}px`,
        border: `2px solid ${controlsTheme.colors.border}`,
        marginBottom: `${controlsTheme.spacing.md}px`,
        marginTop: `${controlsTheme.spacing.md}px`,
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
        Chart Interaction
      </Typography>

      {/* Toggle Switches */}
      <FormGroup
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: `${controlsTheme.spacing.sm}px`,
          marginBottom: `${controlsTheme.spacing.md}px`,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={!!enablePanZoom && !!zoomState && !!panState}
              onChange={(_, checked) => handlePanZoomToggle(checked)}
              // icon={<ZoomOutMapIcon />}
              // checkedIcon={<ZoomOutMapIcon />}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ZoomOutMapIcon
                sx={{
                  fontSize: `${controlsTheme.typography.fontSize.lg}px`,
                  color:
                    enablePanZoom && zoomState && panState
                      ? controlsTheme.colors.primary
                      : controlsTheme.colors.textSecondary,
                }}
              />
              <Typography
                sx={{
                  color: controlsTheme.colors.text,
                  fontSize: `${controlsTheme.typography.fontSize.sm}px`,
                  fontWeight: controlsTheme.typography.fontWeight.medium,
                }}
              >
                Enable Pan/Zoom
              </Typography>
            </Box>
          }
          sx={{ margin: 0 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={!!defineROI}
              onChange={(_, checked) => handleDefineROIToggle(checked)}
              // icon={<CropFreeIcon />}
              // checkedIcon={<CropFreeIcon />}
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CropFreeIcon
                sx={{
                  fontSize: `${controlsTheme.typography.fontSize.lg}px`,
                  color: defineROI
                    ? controlsTheme.colors.secondary
                    : controlsTheme.colors.textSecondary,
                }}
              />
              <Typography
                sx={{
                  color: controlsTheme.colors.text,
                  fontSize: `${controlsTheme.typography.fontSize.sm}px`,
                  fontWeight: controlsTheme.typography.fontWeight.medium,
                }}
              >
                Define ROI
              </Typography>
            </Box>
          }
          sx={{ margin: 0 }}
        />
      </FormGroup>

      {/* Reset Zoom Button */}
      <Button
        className="reset-zoom-button"
        onClick={resetZoom}
        startIcon={<RestartAltIcon />}
        fullWidth
        sx={{
          ...buttonStyles.base,
          ...buttonStyles.secondary,
          backgroundColor: controlsTheme.colors.backgroundLight,
          color: controlsTheme.colors.text,
          border: `1px solid ${controlsTheme.colors.border}`,
          "&:hover": {
            backgroundColor: controlsTheme.colors.backgroundDark,
            borderColor: controlsTheme.colors.secondary,
          },
        }}
      >
        Reset Zoom
      </Button>

      {/* Mode Indicator */}
      {(defineROI || (enablePanZoom && zoomState && panState)) && (
        <Box
          sx={{
            marginTop: `${controlsTheme.spacing.sm}px`,
            padding: `${controlsTheme.spacing.sm}px`,
            backgroundColor: defineROI
              ? controlsTheme.colors.secondaryBg
              : controlsTheme.colors.primaryBg,
            borderRadius: `${controlsTheme.borderRadius.sm}px`,
            border: `1px solid ${
              defineROI
                ? controlsTheme.colors.secondary
                : controlsTheme.colors.primary
            }`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: defineROI
                ? controlsTheme.colors.secondaryDark
                : controlsTheme.colors.primaryDark,
              fontSize: `${controlsTheme.typography.fontSize.xs}px`,
              fontWeight: controlsTheme.typography.fontWeight.medium,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {defineROI ? (
              <>
                <CropFreeIcon sx={{ fontSize: 14 }} />
                ROI Definition Mode Active
              </>
            ) : (
              <>
                <ZoomOutMapIcon sx={{ fontSize: 14 }} />
                Pan & Zoom Mode Active
              </>
            )}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PanZoomControls;
