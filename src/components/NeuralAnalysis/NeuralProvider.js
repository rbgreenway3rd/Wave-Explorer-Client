import React from "react";
import { NeuralSelectionProvider } from "./contexts/NeuralSelectionContext";
import { NeuralSettingsProvider } from "./contexts/NeuralSettingsContext";
import { NeuralInteractionProvider } from "./contexts/NeuralInteractionContext";
import { NeuralResultsProvider } from "./contexts/NeuralResultsContext";
import { NeuralInspectorProvider } from "./contexts/NeuralInspectorContext";

/**
 * NeuralProvider — composes the four narrower Neural-modal contexts.
 *
 *   NeuralSelectionProvider  → selectedWell / controlWell / selectingControl
 *   NeuralSettingsProvider   → every analysis slider/toggle (depends on selection)
 *   NeuralInteractionProvider → ROI list + pan/zoom mode (UI state)
 *   NeuralResultsProvider    → pipelineResults computed from selection + settings
 *
 * The split exists for re-render isolation: dragging a Settings slider
 * re-runs the pipeline (Results re-renders → graph + table update), but
 * does NOT re-render NeuralWellSelector (selection-only) or the
 * pan/zoom controls (interaction-only).
 *
 * Mount points and external API are unchanged: NavBar still wraps
 * <NeuralAnalysisModal /> with this single component.
 */
export const NeuralProvider = ({ children }) => (
  <NeuralSelectionProvider>
    <NeuralSettingsProvider>
      <NeuralInteractionProvider>
        <NeuralResultsProvider>
          <NeuralInspectorProvider>{children}</NeuralInspectorProvider>
        </NeuralResultsProvider>
      </NeuralInteractionProvider>
    </NeuralSettingsProvider>
  </NeuralSelectionProvider>
);

export default NeuralProvider;

// Re-export the four hooks from one place so consumers have a single
// import surface. Each hook subscribes only to its own context, so
// components stay re-render-isolated even though everything is exposed
// here.
export { useNeuralSelection } from "./contexts/NeuralSelectionContext";
export { useNeuralSettings } from "./contexts/NeuralSettingsContext";
export { useNeuralInteraction } from "./contexts/NeuralInteractionContext";
export { useNeuralResults } from "./contexts/NeuralResultsContext";
export { useNeuralInspector } from "./contexts/NeuralInspectorContext";
