import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * NeuralInspectorContext — shared selection state for the Peak Inspector.
 *
 * Holds:
 *   - `selectedCandidateIndex` — the sample index of the currently
 *     inspected peak (or null). The Inspector panel looks the full
 *     diagnostic record up from NeuralResultsContext.pipelineResults.
 *     We don't cache the record itself because the diagnostics array
 *     rebuilds on every pipeline run; storing only the index lets the
 *     panel auto-refresh as the user drags sliders.
 *   - `selectCandidate(index)` — setter exposed to NeuralGraph's click
 *     handler. Passing null clears the selection (empty state).
 *
 * This context is intentionally separate from NeuralResultsContext to
 * avoid coupling selection state to pipeline output cache invalidation.
 */

const NeuralInspectorContext = createContext(null);

export const useNeuralInspector = () => {
  const ctx = useContext(NeuralInspectorContext);
  if (!ctx) {
    throw new Error(
      "useNeuralInspector must be used inside <NeuralInspectorProvider>"
    );
  }
  return ctx;
};

export const NeuralInspectorProvider = ({ children }) => {
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(null);

  const selectCandidate = useCallback((index) => {
    // Allow numeric index OR null/undefined to clear.
    setSelectedCandidateIndex(
      typeof index === "number" && !Number.isNaN(index) ? index : null
    );
  }, []);

  const value = useMemo(
    () => ({ selectedCandidateIndex, selectCandidate }),
    [selectedCandidateIndex, selectCandidate]
  );

  return (
    <NeuralInspectorContext.Provider value={value}>
      {children}
    </NeuralInspectorContext.Provider>
  );
};
