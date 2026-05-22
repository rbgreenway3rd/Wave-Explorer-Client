import "../../styles/ChartControls.css";

import React from "react";

import NoiseSuppressionControls from "./controls/NoiseSuppressionControls";
import ControlWellSelector from "./controls/ControlWellSelector";
import ROIControls from "./controls/ROIControls";
import PanZoomControls from "./controls/PanZoomControls";
import DecimationControls from "./controls/DecimationControls";
import ActivityThresholdControls from "./controls/ActivityThresholdControls";

import { useNeuralSettings } from "../../NeuralProvider";

/**
 * ChartControls — top control bar above the Neural Graph. A thin layout
 * shell: each child control panel self-subscribes to the relevant
 * context. ChartControls passes only `resetZoom` (an imperative ref
 * handle into NeuralGraph) down to PanZoomControls.
 *
 * Report-generation buttons + their state + the report modals
 * themselves live on `NeuralAnalysisModal` now (in the modal header,
 * below the Selected Well section); this bar is purely chart-control
 * panels.
 */
const ChartControls = ({ resetZoom }) => {
  const settings = useNeuralSettings();

  // ControlWellSelector is meaningful when noise suppression is on.
  // The "Subtract Control" toggle now lives INSIDE the selector, so
  // we no longer gate the panel on it (gating on a switch the panel
  // itself owns would lock the user out of turning it back on).
  // Rendered always (so the bar's column count stays stable) but
  // disabled when noise suppression is off — its `disabled` prop also
  // applies the `.neural-control-panel--inert` class so the whole
  // card dims out without layout shift.
  const controlWellDisabled = !settings.noiseSuppressionActive;

  return (
    <div className="neural-chart-controls">
      <ControlWellSelector disabled={controlWellDisabled} />
      <NoiseSuppressionControls />
      <ActivityThresholdControls />
      <PanZoomControls resetZoom={resetZoom} />
      <ROIControls />
      <DecimationControls />
    </div>
  );
};

export default ChartControls;
