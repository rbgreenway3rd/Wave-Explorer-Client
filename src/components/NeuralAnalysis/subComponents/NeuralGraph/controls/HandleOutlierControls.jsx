import React from "react";
import {
  Paper,
  Typography,
  Slider,
  Box,
  Tooltip,
  IconButton,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { controlsTheme } from "../styles/controlsTheme";
import "./HandleOutlierControls.css";

/**
 * HandleOutlierControls
 * Component for adjusting outlier detection parameters
 *
 * Features:
 * - Percentile threshold slider (50-99th percentile)
 * - Median multiplier slider (0.5-5.0×)
 * - Reset button to restore defaults
 * - Only visible when handleOutliers is enabled
 * - Professional scientific styling
 * - Real-time parameter updates
 */
const HandleOutlierControls = ({
  handleOutliers,
  outlierPercentile,
  setOutlierPercentile,
  outlierMultiplier,
  setOutlierMultiplier,
}) => {
  const DEFAULT_PERCENTILE = 95;
  const DEFAULT_MULTIPLIER = 2.0;

  const handleReset = () => {
    setOutlierPercentile(DEFAULT_PERCENTILE);
    setOutlierMultiplier(DEFAULT_MULTIPLIER);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        padding: controlsTheme.spacing.sm,
        backgroundColor: handleOutliers
          ? controlsTheme.colors.paper
          : "rgb(180, 180, 180)",
        borderRadius: "0.5rem",
        border: `0.125rem solid ${controlsTheme.colors.warning}`,
        minWidth: "15rem",
        maxWidth: "20rem",
        flex: 1,
        opacity: handleOutliers ? 1 : 0.6,
        transition: "all 0.2s ease-in-out",
      }}
    >
      {/* Header with title and reset button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: controlsTheme.spacing.sm,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: controlsTheme.colors.text,
            fontWeight: 600,
            fontSize: `${controlsTheme.typography.fontSize.md}px`,
          }}
        >
          Outlier Detection Parameters
        </Typography>
        <Tooltip title="Reset to defaults" placement="top">
          <IconButton
            onClick={handleReset}
            disabled={!handleOutliers}
            size="small"
            className="reset-outlier-button"
            sx={{
              color: controlsTheme.colors.primary,
              "&:hover": {
                backgroundColor: "rgba(33, 150, 243, 0.1)",
              },
            }}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Percentile Threshold Slider */}
      <Box sx={{ marginBottom: controlsTheme.spacing.md }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: controlsTheme.spacing.xs,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.textSecondary,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            Percentile Threshold
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.warning,
              fontWeight: 600,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            {outlierPercentile}th
          </Typography>
        </Box>
        <Slider
          value={outlierPercentile}
          onChange={(e, value) => setOutlierPercentile(value)}
          disabled={!handleOutliers}
          min={50}
          max={99}
          step={1}
          marks={[
            { value: 50, label: "50" },
            { value: 75, label: "75" },
            { value: 95, label: "95" },
            { value: 99, label: "99" },
          ]}
          sx={{
            color: controlsTheme.colors.warning,
            "& .MuiSlider-thumb": {
              width: 16,
              height: 16,
            },
            "& .MuiSlider-markLabel": {
              fontSize: "0.6875rem",
              color: controlsTheme.colors.textSecondary,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.xs}px`,
            display: "block",
            marginTop: controlsTheme.spacing.xs,
          }}
        >
          Mark peaks in top {(100 - outlierPercentile).toFixed(0)}% by
          prominence
        </Typography>
      </Box>

      {/* Median Multiplier Slider */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: controlsTheme.spacing.xs,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.textSecondary,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            Median Multiplier
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.warning,
              fontWeight: 600,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            {outlierMultiplier.toFixed(1)}×
          </Typography>
        </Box>
        <Slider
          value={outlierMultiplier}
          onChange={(e, value) => setOutlierMultiplier(value)}
          disabled={!handleOutliers}
          min={0.5}
          max={5.0}
          step={0.1}
          marks={[
            { value: 0.5, label: "0.5" },
            { value: 1.0, label: "1.0" },
            { value: 2.0, label: "2.0" },
            { value: 3.0, label: "3.0" },
            { value: 5.0, label: "5.0" },
          ]}
          sx={{
            color: controlsTheme.colors.warning,
            "& .MuiSlider-thumb": {
              width: 16,
              height: 16,
            },
            "& .MuiSlider-markLabel": {
              fontSize: "0.6875rem",
              color: controlsTheme.colors.textSecondary,
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.xs}px`,
            display: "block",
            marginTop: controlsTheme.spacing.xs,
          }}
        >
          Minimum prominence relative to median
        </Typography>
      </Box>
    </Paper>
  );
};

export default HandleOutlierControls;
