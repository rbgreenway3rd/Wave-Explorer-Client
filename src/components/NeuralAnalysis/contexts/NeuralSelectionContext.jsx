import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * NeuralSelectionContext — owns the user's well-selection state for the
 * Neural Analysis modal:
 *   - selectedWell      → the well currently displayed in the graph
 *   - controlWell       → optional well used as the control signal for
 *                         noise subtraction
 *   - controlWellSet    → the set of wells designated as "control" for
 *                         control-well scaling (% of control). Distinct
 *                         from `controlWell` (noise subtraction) — different
 *                         purpose, so it's a separate multi-select.
 *   - foExcludedWellSet → the set of wells dropped from the plate-wide F₀
 *                         median and Universal y-scale sweep.
 *
 * The control/exclusion sets are populated via NeuralWellPickerModal (a
 * dedicated well-selection dialog), so this context only holds the picked
 * results — there's no in-grid "selecting mode" flag anymore.
 *
 * Kept narrow on purpose: changing a slider in the Settings context must
 * NOT re-render NeuralWellSelector. NeuralWellSelector subscribes only
 * here, so a slider drag never touches it.
 */

export const NeuralSelectionContext = createContext(null);

export const useNeuralSelection = () => {
  const ctx = useContext(NeuralSelectionContext);
  if (!ctx) {
    throw new Error(
      "useNeuralSelection must be used inside <NeuralSelectionProvider>"
    );
  }
  return ctx;
};

export const NeuralSelectionProvider = ({ children }) => {
  const [selectedWell, setSelectedWell] = useState(null);
  const [controlWell, setControlWell] = useState(null);

  // Control-well scaling: a set of wells (by reference) the user picks as
  // the "control" baseline. Kept separate from the single `controlWell`.
  const [controlWellSet, setControlWellSet] = useState([]);

  // F/Fo well exclusion: a set of wells (by reference) the user drops from
  // the plate-wide F₀ median AND the Universal y-scale sweep — e.g. flat
  // edge wells whose baseline would skew the normalization. Separate from
  // the control set (different purpose, different math). Not persisted
  // (well refs are plate-specific); the on/off toggle lives in Settings.
  const [foExcludedWellSet, setFoExcludedWellSet] = useState([]);

  // Toggle a well's membership in the control set, matched by id (the
  // grid passes the same Well objects, but match by id to be robust to
  // wellArrays being rebuilt with fresh shallow copies after a filter run).
  const toggleControlSetWell = useCallback((well) => {
    if (!well) return;
    setControlWellSet((prev) => {
      const exists = prev.some((w) => w.id === well.id);
      return exists ? prev.filter((w) => w.id !== well.id) : [...prev, well];
    });
  }, []);
  const clearControlSet = useCallback(() => setControlWellSet([]), []);

  // Same toggle-by-id membership for the F/Fo exclusion set.
  const toggleFoExcludedWell = useCallback((well) => {
    if (!well) return;
    setFoExcludedWellSet((prev) => {
      const exists = prev.some((w) => w.id === well.id);
      return exists ? prev.filter((w) => w.id !== well.id) : [...prev, well];
    });
  }, []);
  const clearFoExcluded = useCallback(() => setFoExcludedWellSet([]), []);

  const value = useMemo(
    () => ({
      selectedWell,
      setSelectedWell,
      controlWell,
      setControlWell,
      controlWellSet,
      setControlWellSet,
      toggleControlSetWell,
      clearControlSet,
      foExcludedWellSet,
      setFoExcludedWellSet,
      toggleFoExcludedWell,
      clearFoExcluded,
    }),
    [
      selectedWell,
      controlWell,
      controlWellSet,
      toggleControlSetWell,
      clearControlSet,
      foExcludedWellSet,
      toggleFoExcludedWell,
      clearFoExcluded,
    ]
  );

  return (
    <NeuralSelectionContext.Provider value={value}>
      {children}
    </NeuralSelectionContext.Provider>
  );
};
