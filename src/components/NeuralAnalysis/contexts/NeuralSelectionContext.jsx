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
 *   - selectingControl  → true while the user is in "click a well to set
 *                         it as the control" mode
 *   - controlWellSet    → the set of wells designated as "control" for
 *                         control-well scaling (% of control). Distinct
 *                         from `controlWell` (noise subtraction) — different
 *                         purpose, so it's a separate multi-select.
 *   - selectingControlSet → true while the user is multi-selecting the
 *                         control set in the grid.
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
  const [selectingControl, setSelectingControl] = useState(false);

  // Control-well scaling: a set of wells (by reference) the user picks as
  // the "control" baseline. Kept separate from the single `controlWell`.
  const [controlWellSet, setControlWellSet] = useState([]);
  const [selectingControlSet, setSelectingControlSet] = useState(false);

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

  const value = useMemo(
    () => ({
      selectedWell,
      setSelectedWell,
      controlWell,
      setControlWell,
      selectingControl,
      setSelectingControl,
      controlWellSet,
      setControlWellSet,
      selectingControlSet,
      setSelectingControlSet,
      toggleControlSetWell,
      clearControlSet,
    }),
    [
      selectedWell,
      controlWell,
      selectingControl,
      controlWellSet,
      selectingControlSet,
      toggleControlSetWell,
      clearControlSet,
    ]
  );

  return (
    <NeuralSelectionContext.Provider value={value}>
      {children}
    </NeuralSelectionContext.Provider>
  );
};
