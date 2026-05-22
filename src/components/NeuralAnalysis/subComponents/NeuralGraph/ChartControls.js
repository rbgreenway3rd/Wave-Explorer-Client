import "../../styles/ChartControls.css";

import React from "react";
import TuneIcon from "@mui/icons-material/Tune";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import ROIControls from "./controls/ROIControls";
import PanZoomControls from "./controls/PanZoomControls";
import ActivityThresholdControls from "./controls/ActivityThresholdControls";
import { Button } from "../../../ui";

/**
 * ChartControls — top control bar above the Neural Graph. Pared down to
 * the three controls the client wants in immediate reach (Activity
 * Threshold, Pan/Zoom, ROI) plus the Advanced trigger that opens the
 * AdvancedDrawer underneath the bar. Everything else (Noise Suppression,
 * Control Well, Decimation, Outlier/Burst/Spike Tweakables) lives in
 * the drawer.
 *
 * Each child control panel still self-subscribes to its relevant
 * context; ChartControls passes only `resetZoom` (an imperative ref
 * handle into NeuralGraph) down to PanZoomControls.
 */
const ChartControls = ({ resetZoom, advancedOpen, onToggleAdvanced }) => {
  return (
    <div className="neural-chart-controls">
      <ActivityThresholdControls />
      <PanZoomControls resetZoom={resetZoom} />
      <ROIControls />
      <div className="neural-chart-controls__advanced-trigger">
        <Button
          variant={advancedOpen ? "primary" : "secondary"}
          size="sm"
          startIcon={<TuneIcon />}
          endIcon={
            <ExpandMoreIcon
              className={
                "neural-chart-controls__advanced-chevron" +
                (advancedOpen
                  ? " neural-chart-controls__advanced-chevron--open"
                  : "")
              }
            />
          }
          onClick={onToggleAdvanced}
          aria-expanded={advancedOpen}
        >
          Advanced
        </Button>
      </div>
    </div>
  );
};

export default ChartControls;
