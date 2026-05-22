import React from "react";
import NoiseSuppressionControls from "./controls/NoiseSuppressionControls";
import ControlWellSelector from "./controls/ControlWellSelector";
import DecimationControls from "./controls/DecimationControls";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import SpikeDetectionControls from "./controls/SpikeDetectionControls";
import { useNeuralSettings } from "../../NeuralProvider";
import "./AdvancedDrawer.css";

/**
 * AdvancedDrawer — collapsible region rendered between the chart top
 * bar and the chart itself. Hosts every analysis control that isn't
 * needed during routine use: Noise Suppression, Control Well Selection,
 * Data Decimation, plus the "Advanced Tweakables" sub-section
 * (Outlier/Burst/Spike detection).
 *
 * Pure presentation — `open` is owned by NeuralAnalysisModal so the
 * modal can toggle a body-level class that reclaims chart-row height
 * when the drawer is closed.
 */
const AdvancedDrawer = ({ open }) => {
  const { noiseSuppressionActive } = useNeuralSettings();
  const controlWellDisabled = !noiseSuppressionActive;

  if (!open) return null;

  return (
    <section className="neural-advanced-drawer" aria-label="Advanced settings">
      <div className="neural-advanced-drawer__primary">
        <NoiseSuppressionControls />
        <ControlWellSelector disabled={controlWellDisabled} />
        <DecimationControls />
      </div>

      <details className="neural-advanced-drawer__tweakables">
        <summary>Advanced Tweakables</summary>
        <div className="neural-advanced-drawer__tweakables-row">
          <div className="neural-advanced-drawer__tweakables-col">
            <HandleOutliersToggle />
            <HandleOutlierControls />
          </div>
          <div className="neural-advanced-drawer__tweakables-col">
            <ShowBurstsToggle />
            <BurstDetectionControls />
          </div>
        </div>
        <div className="neural-advanced-drawer__tweakables-spikes">
          <SpikeDetectionControls />
        </div>
      </details>
    </section>
  );
};

export default AdvancedDrawer;
