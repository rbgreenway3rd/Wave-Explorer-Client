import React, { useEffect, useRef } from "react";
import { Panel } from "../../../ui";
import { useNeuralSettings } from "../../NeuralProvider";
import HandleOutliersToggle from "./controls/HandleOutliersToggle";
import ShowBurstsToggle from "./controls/ShowBurstsToggle";
import SpikeDetectionControls from "./controls/SpikeDetectionControls";
import HandleOutlierControls from "./controls/HandleOutlierControls";
import BurstDetectionControls from "./controls/BurstDetectionControls";
import NoiseSuppressionControls from "./controls/NoiseSuppressionControls";
import ControlWellSelector from "./controls/ControlWellSelector";
import ControlSetScalingPanel from "./controls/ControlSetScalingPanel";
import NormalizationPanel from "./controls/NormalizationPanel";
import DecimationControls from "./controls/DecimationControls";
import DocsHelpButton from "../../docs/DocsHelpButton";
import "./AdvancedTweakablesCard.css";

// AdvancedTweakablesCard — fourth top-bar card. Replaces the prior
// "Advanced ▾" trigger + dropdown drawer. Two-pane layout:
//
//   LEFT rail (always visible)
//     · Card title
//     · Always-visible detection toggles (Handle Outliers, Show Bursts)
//     · Section selector list — buttons for six sub-panels
//   RIGHT content pane (only rendered when a section is selected)
//     · The selected section's full controls component
//
// When a section is selected, the card expands *horizontally* — the
// parent grid in ChartControls switches to a "tweakable-open" template
// that shrinks the three neighbor cards and gives this card the rest
// of the row. The chart row also shrinks (see
// NeuralAnalysisModal.css's `--tweakable-open` variable bump).
//
// Toggle ↔ section coupling: flipping Handle Outliers on auto-selects
// the Outliers section; flipping it off auto-deselects Outliers if it
// was active. Same for Show Bursts ↔ Bursts. Manual deselection while
// a toggle is still on is honored — we don't fight the user.

// `docId` deep-links the section's [?] into the interactive docs
// (neuralDocsContent.js section ids).
const SECTIONS = [
  {
    key: "spike",
    label: "Spike Detection",
    Component: SpikeDetectionControls,
    docId: "step-spike-detection",
  },
  {
    key: "outliers",
    label: "Outlier Sliders",
    Component: HandleOutlierControls,
    docId: "step-outliers",
  },
  {
    key: "bursts",
    label: "Burst Sliders",
    Component: BurstDetectionControls,
    docId: "step-bursts",
  },
  {
    key: "noise",
    label: "Noise Suppression",
    Component: NoiseSuppressionControls,
    docId: "step-noise-suppression",
  },
  {
    key: "controlwell",
    label: "Control Well",
    Component: ControlWellSelector,
    docId: "step-noise-suppression",
  },
  {
    key: "normalization",
    label: "F/Fo Normalization",
    Component: NormalizationPanel,
    docId: "step-normalization",
  },
  {
    key: "controlscaling",
    label: "Control Scaling",
    Component: ControlSetScalingPanel,
    docId: "step-control-scaling",
  },
  {
    key: "decimation",
    label: "Data Decimation",
    Component: DecimationControls,
    docId: "param-decimation",
  },
];

const AdvancedTweakablesCard = ({ expandedSection, onExpandedChange }) => {
  const { handleOutliers, showBursts, noiseSuppressionActive } =
    useNeuralSettings();

  // Track prior values of the two coupling toggles so we only react to
  // *transitions* — otherwise the section would re-select itself on
  // every render after the user manually deselected it.
  const prevHandleOutliers = useRef(handleOutliers);
  const prevShowBursts = useRef(showBursts);

  useEffect(() => {
    if (handleOutliers && !prevHandleOutliers.current) {
      onExpandedChange("outliers");
    } else if (!handleOutliers && prevHandleOutliers.current) {
      if (expandedSection === "outliers") onExpandedChange(null);
    }
    prevHandleOutliers.current = handleOutliers;
  }, [handleOutliers, expandedSection, onExpandedChange]);

  useEffect(() => {
    if (showBursts && !prevShowBursts.current) {
      onExpandedChange("bursts");
    } else if (!showBursts && prevShowBursts.current) {
      if (expandedSection === "bursts") onExpandedChange(null);
    }
    prevShowBursts.current = showBursts;
  }, [showBursts, expandedSection, onExpandedChange]);

  const handleSectionClick = (key) => {
    onExpandedChange(expandedSection === key ? null : key);
  };

  const activeSection = SECTIONS.find((s) => s.key === expandedSection);
  const ActiveComponent = activeSection?.Component;
  const activeComponentProps =
    expandedSection === "controlwell"
      ? { disabled: !noiseSuppressionActive }
      : {};

  return (
    <Panel
      variant="dark"
      className={
        "neural-control-panel neural-advanced-tweakables-card" +
        (expandedSection ? " neural-advanced-tweakables-card--open" : "")
      }
    >
      <div className="neural-advanced-tweakables-card__left">
        <div className="neural-control-panel__header">
          <h4 className="neural-control-panel__title">Advanced Settings</h4>
        </div>

        <div className="neural-advanced-tweakables-card__body">
          <div className="neural-advanced-tweakables-card__section-list">
            {SECTIONS.map(({ key, label }) => {
              const active = expandedSection === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={
                    "neural-advanced-tweakables-card__section-button" +
                    (active
                      ? " neural-advanced-tweakables-card__section-button--active"
                      : "")
                  }
                  onClick={() => handleSectionClick(key)}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="neural-advanced-tweakables-card__toggles">
            <HandleOutliersToggle />
            <ShowBurstsToggle />
          </div>
        </div>
      </div>

      {ActiveComponent && (
        <div className="neural-advanced-tweakables-card__right">
          {activeSection?.docId && (
            <div className="neural-docs-help-row">
              <DocsHelpButton
                sectionId={activeSection.docId}
                label={`What does "${activeSection.label}" do?`}
              />
            </div>
          )}
          <ActiveComponent {...activeComponentProps} />
        </div>
      )}
    </Panel>
  );
};

export default AdvancedTweakablesCard;
