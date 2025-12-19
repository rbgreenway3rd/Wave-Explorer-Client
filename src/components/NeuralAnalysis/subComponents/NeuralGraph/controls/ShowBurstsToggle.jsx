import React from "react";
import { Paper, FormControlLabel, Switch, Typography } from "@mui/material";
import { controlsTheme } from "../styles/controlsTheme";
import "./ShowBurstsToggle.css";

/**
 * ShowBurstsToggle
 * Component for toggling burst visualization on the neural graph
 *
 * Features:
 * - Simple ON/OFF toggle
 * - Clear visual feedback
 * - Professional scientific styling
 * - Enabled by default
 */
const ShowBurstsToggle = ({ showBursts, setShowBursts }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        padding: controlsTheme.spacing.sm,
        backgroundColor: controlsTheme.colors.paper,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: controlsTheme.spacing.sm,
        // borderRadius: controlsTheme.borderRadius.md,
        borderRadius: "0.625rem",
        minWidth: "fit-content",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: controlsTheme.colors.text,
          fontWeight: 500,
          fontSize: `${controlsTheme.typography.fontSize.md}px`,
          whiteSpace: "nowrap",
        }}
      >
        Show Bursts
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={showBursts}
            onChange={(e) => setShowBursts(e.target.checked)}
            size="small"
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
        label=""
        sx={{ margin: 0, borderRadius: "0.625rem" }}
      />
    </Paper>
  );
};

export default ShowBurstsToggle;
