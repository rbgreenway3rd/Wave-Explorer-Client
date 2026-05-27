import React from "react";
import { FormControlLabel, Switch, Tooltip } from "@mui/material";
import { useNeuralSettings } from "../../NeuralProvider";

// Small right-aligned toggle row that lives above the chart alongside
// ChartLegend. Purely visualization controls — none of these affect
// detection or metric calculation. Designed to sit in the same row as
// the legend so the user can flip view options without leaving the
// chart area.

// The real grey pill comes from the project's legacy MuiFormControlLabel
// global theme override (StyleProvider.js — gray-bg + uppercase +
// borderBottom hack used by older panels). The `ui-clean-forms`
// ancestor class in styles/primitives.css resets that hack with a
// (0,2,0)-specificity rule, so applying it to the container below kills
// the pill backgrounds and the uppercase transform in one shot.
//
// The Switch overrides below only color the thumb and track so the
// toggle still communicates on/off cleanly on the dark legend row.
const switchSx = {
  margin: 0,
  "& .MuiSwitch-track": {
    backgroundColor: "transparent !important",
    opacity: "1 !important",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    boxSizing: "border-box",
  },
  "& .MuiSwitch-switchBase .MuiSwitch-thumb": {
    backgroundColor: "rgba(255, 255, 255, 0.65) !important",
    boxShadow: "none",
  },
  "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": {
    backgroundColor: "rgb(120, 180, 255) !important",
  },
  "& .MuiSwitch-switchBase:hover, & .MuiSwitch-switchBase.Mui-checked:hover": {
    backgroundColor: "transparent !important",
  },
};

const ChartDisplayToggles = () => {
  const {
    showPeakBases,
    setShowPeakBases,
    markAUC,
    setMarkAUC,
  } = useNeuralSettings();

  return (
    <div
      className="neural-chart-display-toggles ui-clean-forms"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "0.75rem",
        alignItems: "center",
        padding: "6px 10px",
        // Background + border owned by parent row container (shared
        // with ChartLegend). `ui-clean-forms` opts out of the legacy
        // MuiFormControlLabel global hack (see primitives.css).
      }}
    >
      <Tooltip
        title="Show or hide the white peak-base markers (left/right base of each detected peak)."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!showPeakBases}
              onChange={(_, checked) => setShowPeakBases(checked)}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Show Peak Bases
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>

      <Tooltip
        title="Fill each peak's AUC region on the chart with a semi-transparent color (red for normal peaks, orange for outliers). Visualization only — does not affect computed AUC values."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!markAUC}
              onChange={(_, checked) => setMarkAUC(checked)}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Mark AUC
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>
    </div>
  );
};

export default ChartDisplayToggles;
