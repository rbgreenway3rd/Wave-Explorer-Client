import React from "react";
import { Paper, Box, Slider, Typography, IconButton } from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import "./BurstDetectionControls.css";
import { controlsTheme } from "../styles/controlsTheme";

/**
 * BurstDetectionControls
 * Component for adjusting burst detection parameters
 *
 * Features:
 * - Max inter-spike interval slider (10-500ms)
 * - Min spikes per burst slider (2-10 spikes)
 * - Reset button to restore defaults
 * - Only visible when showBursts is enabled
 * - Professional scientific styling
 * - Real-time parameter updates
 */
const BurstDetectionControls = ({
  showBursts,
  maxInterSpikeInterval,
  setMaxInterSpikeInterval,
  minSpikesPerBurst,
  setMinSpikesPerBurst,
}) => {
  const DEFAULT_MAX_INTERVAL = 50;
  const DEFAULT_MIN_SPIKES = 3;

  const handleReset = () => {
    setMaxInterSpikeInterval(DEFAULT_MAX_INTERVAL);
    setMinSpikesPerBurst(DEFAULT_MIN_SPIKES);
  };

  // Don't render if burst detection is disabled
  if (!showBursts) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        padding: controlsTheme.spacing.sm,
        backgroundColor: controlsTheme.colors.paper,
        borderRadius: "0.5rem",
        border: `0.125rem solid ${controlsTheme.colors.primary}`,
        minWidth: "15rem",
        maxWidth: "20rem",
        flex: 1,
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
          Burst Detection Parameters
        </Typography>
        <IconButton
          onClick={handleReset}
          size="small"
          className="reset-burst-button"
          sx={{
            color: controlsTheme.colors.primary,
            "&:hover": {
              backgroundColor: "rgba(33, 150, 243, 0.1)",
            },
          }}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Max Inter-Spike Interval Slider */}
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
            Max Inter-Spike Interval
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.primary,
              fontWeight: 600,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            {maxInterSpikeInterval} ms
          </Typography>
        </Box>
        <Slider
          value={maxInterSpikeInterval}
          onChange={(e, value) => setMaxInterSpikeInterval(value)}
          min={0}
          max={250}
          step={5}
          marks={[
            { value: 10, label: "10ms" },
            { value: 50, label: "50ms" },
            { value: 100, label: "100ms" },
            { value: 150, label: "150ms" },
            { value: 200, label: "200ms" },
            { value: 250, label: "250ms" },
          ]}
          sx={{
            color: controlsTheme.colors.primary,
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
        {/* <Typography
          variant="caption"
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.xs}px`,
            display: "block",
            marginTop: controlsTheme.spacing.xs,
          }}
        >
          Maximum time between spikes to be grouped in the same burst (ms)
        </Typography> */}
      </Box>

      {/* Min Spikes Per Burst Slider */}
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
            Min Spikes Per Burst
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: controlsTheme.colors.primary,
              fontWeight: 600,
              fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            }}
          >
            {minSpikesPerBurst}
          </Typography>
        </Box>
        <Slider
          value={minSpikesPerBurst}
          onChange={(e, value) => setMinSpikesPerBurst(value)}
          min={2}
          max={10}
          step={1}
          marks={[
            { value: 2, label: "2" },
            { value: 4, label: "4" },
            { value: 6, label: "6" },
            { value: 8, label: "8" },
            { value: 10, label: "10" },
          ]}
          sx={{
            color: controlsTheme.colors.primary,
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
        {/* <Typography
          variant="caption"
          sx={{
            color: controlsTheme.colors.textSecondary,
            fontSize: `${controlsTheme.typography.fontSize.sm}px`,
            display: "block",
            marginTop: controlsTheme.spacing.xs,
          }}
        >
          Minimum number of spikes required to form a burst
        </Typography> */}
      </Box>
    </Paper>
  );
};

export default BurstDetectionControls;
