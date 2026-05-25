import "../../styles/ChartControls.css";

import React from "react";

import ROIControls from "./controls/ROIControls";
import PanZoomControls from "./controls/PanZoomControls";
import ActivityThresholdControls from "./controls/ActivityThresholdControls";
import AdvancedTweakablesCard from "./AdvancedTweakablesCard";

/**
 * ChartControls — top control bar above the Neural Graph. Four cards:
 * Activity Threshold, Pan/Zoom, ROI, and Advanced Tweakables. The
 * Advanced Tweakables card owns the detection feature toggles (Handle
 * Outliers, Show Bursts) plus the accordion of every "deep" sub-panel
 * that used to live in the dropdown drawer (Spike Detection, Outlier
 * Sliders, Burst Sliders, Noise Suppression, Control Well, Data
 * Decimation). The old Advanced ▾ trigger button is gone.
 *
 * Each child control panel still self-subscribes to its relevant
 * context; ChartControls passes only `resetZoom` (an imperative ref
 * handle into NeuralGraph) down to PanZoomControls, and threads the
 * accordion-open state of the Advanced Tweakables card up to the modal
 * so it can adjust the chart-row height to compensate.
 */
const ChartControls = ({
  resetZoom,
  expandedTweakableSection,
  onExpandedTweakableChange,
}) => {
  const open = !!expandedTweakableSection;

  // Click-outside-to-collapse: when a tweakable section is expanded
  // and the user clicks anywhere in the bar that isn't inside the
  // Advanced Tweakables card itself (i.e., a neighbor card like
  // Thresholds, Chart Interaction, or Regions of Interest), collapse
  // the expanded section so the neighbor returns to its normal size.
  // Clicks inside Advanced Tweakables still bubble through this
  // handler, but `closest()` matches and we early-return.
  const handleBarClick = (e) => {
    if (!open) return;
    if (e.target.closest(".neural-advanced-tweakables-card")) return;
    onExpandedTweakableChange(null);
  };

  return (
    <div
      className={
        "neural-chart-controls" +
        (open ? " neural-chart-controls--tweakable-open" : "")
      }
      onClick={handleBarClick}
    >
      <ActivityThresholdControls />
      <PanZoomControls resetZoom={resetZoom} />
      <ROIControls />
      <AdvancedTweakablesCard
        expandedSection={expandedTweakableSection}
        onExpandedChange={onExpandedTweakableChange}
      />
    </div>
  );
};

export default ChartControls;
