import React from "react";
import { Paper, FormControlLabel, Switch, Typography } from "@mui/material";
import { controlsTheme } from "../styles/controlsTheme";

/**
 * HandleOutliersToggle
 * Component for toggling outlier detection on the neural graph
 *
 * Features:
 * - Simple ON/OFF toggle
 * - Clear visual feedback
 * - Professional scientific styling
 * - Disabled by default
 */
const HandleOutliersToggle = ({ handleOutliers, setHandleOutliers }) => {
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
        Handle Outliers
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={handleOutliers}
            onChange={(e) => setHandleOutliers(e.target.checked)}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: controlsTheme.colors.warning,
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: controlsTheme.colors.warning,
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

export default HandleOutliersToggle;
