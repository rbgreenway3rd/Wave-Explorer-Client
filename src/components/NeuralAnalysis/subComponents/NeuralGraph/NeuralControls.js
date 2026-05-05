import React from "react";
import { Box, FormGroup } from "@mui/material";
import "../../styles/NeuralControls.css";

import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import SpikeDetectionControls from "./controls/SpikeDetectionControls";

/**
 * NoiseFilterControls — right-side control column for the Neural modal.
 * After Tier B this is a thin layout shell: each child panel
 * self-subscribes to its context, so this component takes zero props.
 *
 * Pre-Tier-B it received 24 props.
 */
const NoiseFilterControls = () => {
  return (
    <Box className="neural-controls-container">
      <FormGroup>
        <Box className="spike-detection-controls">
          <SpikeDetectionControls />
        </Box>

        {/* Detection Controls — toggles stacked above their control panels. */}
        <Box className="detection-controls-row">
          {/* Outlier Detection Column */}
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

          {/* Burst Detection Column */}
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
      </FormGroup>
    </Box>
  );
};

export default NoiseFilterControls;
