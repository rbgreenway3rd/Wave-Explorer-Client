import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * NeuralSelectionContext — owns the user's well-selection state for the
 * Neural Analysis modal:
 *   - selectedWell      → the well currently displayed in the graph
 *   - controlWell       → optional well used as the control signal for
 *                         noise subtraction
 *   - selectingControl  → true while the user is in "click a well to set
 *                         it as the control" mode
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

  const value = useMemo(
    () => ({
      selectedWell,
      setSelectedWell,
      controlWell,
      setControlWell,
      selectingControl,
      setSelectingControl,
    }),
    [selectedWell, controlWell, selectingControl]
  );

  return (
    <NeuralSelectionContext.Provider value={value}>
      {children}
    </NeuralSelectionContext.Provider>
  );
};
