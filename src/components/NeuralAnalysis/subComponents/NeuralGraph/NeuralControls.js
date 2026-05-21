import React from "react";
import { Box, FormGroup } from "@mui/material";
import "../../styles/NeuralControls.css";

import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import SpikeDetectionControls from "./controls/SpikeDetectionControls";
import ActivityThresholdControls from "./controls/ActivityThresholdControls";

/**
 * NoiseFilterControls — right-side control column for the Neural modal.
 *
 * Layout:
 *   - ActivityThresholdControls — always visible at the top.
 *   - <details> "Advanced Tweakables" — collapsed by default; expanding
 *     reveals the Outlier toggle+panel, Burst toggle+panel, and Spike
 *     Detection panel. Most users won't need to touch these.
 *
 * Each child panel still self-subscribes to its context, so this
 * component takes zero props.
 */
const NoiseFilterControls = () => {
  return (
    <Box className="neural-controls-container">
      <FormGroup>
        <Box className="spike-detection-controls">
          <ActivityThresholdControls />
        </Box>

        <details className="neural-controls__advanced">
          <summary>Advanced Tweakables</summary>

          {/* Outlier + Burst toggles and their slider panels side-by-side. */}
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
      </FormGroup>
    </Box>
  );
};

export default NoiseFilterControls;
