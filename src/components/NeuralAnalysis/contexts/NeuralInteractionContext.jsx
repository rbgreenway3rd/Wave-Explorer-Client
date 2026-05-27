import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * NeuralInteractionContext — owns the chart-interaction state that's
 * mutually exclusive (ROI definition vs pan/zoom mode vs neither) plus
 * the ROI list itself.
 *
 * Replaces the four-boolean tangle in the original modal:
 *   defineROI + enablePanZoom + zoomState + panState
 * with a single `interactionMode` enum + independent `zoom` / `pan`
 * toggles. Callers can read either the legacy-shaped derived booleans
 * (defineROI, enablePanZoom) for compatibility or the canonical
 * `interactionMode === 'none' | 'roi' | 'pan-zoom'` directly.
 *
 * Default mode is 'none' so the chart loads with no interactive
 * affordances active — users opt in to Pan/Zoom or ROI from the
 * top-bar controls.
 */

export const NeuralInteractionContext = createContext(null);

export const useNeuralInteraction = () => {
  const ctx = useContext(NeuralInteractionContext);
  if (!ctx) {
    throw new Error(
      "useNeuralInteraction must be used inside <NeuralInteractionProvider>"
    );
  }
  return ctx;
};

export const NeuralInteractionProvider = ({ children }) => {
  // 'pan-zoom' is the default — most users want to drag/wheel-zoom the
  // chart from the moment it loads. 'roi' enables click-drag ROI
  // definition; 'none' disables both. The two interactive modes are
  // mutually exclusive; turning either off returns to 'none' rather
  // than auto-flipping to the other.
  const [interactionMode, setInteractionMode] = useState("pan-zoom");
  // Sub-toggles for zoom vs pan within pan-zoom mode. Defaulted true so
  // that enabling pan-zoom mode immediately gives the user both gestures.
  const [zoomState, setZoomState] = useState(true);
  const [panState, setPanState] = useState(true);

  // ROI list + which one is currently being edited / pending definition.
  const [roiList, setRoiList] = useState([]);
  const [activeRoiIndex, setActiveRoiIndex] = useState(null);

  // Legacy-shaped setters used by the existing controls. These collapse
  // the four-boolean API onto the enum so we can migrate consumers
  // incrementally without changing call sites. Turning either off returns
  // to 'none' (not the other mode) so the chart can be in an idle state.
  const setDefineROI = useCallback((value) => {
    setInteractionMode((prev) => (value ? "roi" : prev === "roi" ? "none" : prev));
  }, []);
  const setEnablePanZoom = useCallback((value) => {
    setInteractionMode((prev) =>
      value ? "pan-zoom" : prev === "pan-zoom" ? "none" : prev,
    );
  }, []);

  const value = useMemo(() => {
    const defineROI = interactionMode === "roi";
    const enablePanZoom = interactionMode === "pan-zoom";
    return {
      // canonical
      interactionMode,
      setInteractionMode,
      zoomState,
      setZoomState,
      panState,
      setPanState,
      roiList,
      setRoiList,
      activeRoiIndex,
      setActiveRoiIndex,
      // legacy-shaped read aliases (read by existing consumers)
      defineROI,
      enablePanZoom,
      currentRoiIndex: activeRoiIndex,
      // legacy-shaped setters
      setDefineROI,
      setEnablePanZoom,
      setCurrentRoiIndex: setActiveRoiIndex,
    };
  }, [
    interactionMode,
    zoomState,
    panState,
    roiList,
    activeRoiIndex,
    setDefineROI,
    setEnablePanZoom,
  ]);

  return (
    <NeuralInteractionContext.Provider value={value}>
      {children}
    </NeuralInteractionContext.Provider>
  );
};
