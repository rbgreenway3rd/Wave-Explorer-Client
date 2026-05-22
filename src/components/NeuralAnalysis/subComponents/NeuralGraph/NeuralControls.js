import React from "react";
import { Box } from "@mui/material";
import "../../styles/NeuralControls.css";

import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import SpikeDetectionControls from "./controls/SpikeDetectionControls";

/**
 * NoiseFilterControls — right-side control column for the Neural modal.
 *
 * Holds the "Advanced Tweakables" disclosure (Outlier / Burst / Spike
 * Detection). The Activity Threshold control moved to the top chart-
 * controls bar (ChartControls). The container scrolls internally when
 * Advanced is expanded so the chart row above stays at its fixed
 * viewport-anchored height.
 */
const NoiseFilterControls = () => {
  return (
    <Box className="neural-controls-container">
      <details className="neural-controls__advanced">
        <summary>Advanced Tweakables</summary>

        {/* Outlier + Burst toggles and slider panels side-by-side. */}
        <Box className="detection-controls-row">
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <HandleOutliersToggle />
            <HandleOutlierControls />
          </Box>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <ShowBurstsToggle />
            <BurstDetectionControls />
          </Box>
        </Box>

        <Box className="spike-detection-controls">
          <SpikeDetectionControls />
        </Box>
      </details>
    </Box>
  );
};

export default NoiseFilterControls;
