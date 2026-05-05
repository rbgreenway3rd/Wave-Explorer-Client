import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

/**
 * NeuralInteractionContext — owns the chart-interaction state that's
 * mutually exclusive (ROI definition vs pan/zoom mode) plus the ROI list
 * itself.
 *
 * Replaces the four-boolean tangle in the original modal:
 *   defineROI + enablePanZoom + zoomState + panState
 * with a single `interactionMode` enum + independent `zoom` / `pan`
 * toggles. Callers can read either the legacy-shaped derived booleans
 * (defineROI, enablePanZoom) for compatibility or the canonical
 * `interactionMode === 'roi' | 'pan-zoom'` directly.
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
  // 'pan-zoom' is the default working mode; 'roi' switches the chart into
  // click-drag ROI definition.
  const [interactionMode, setInteractionMode] = useState("pan-zoom");
  const [zoomState, setZoomState] = useState(true);
  const [panState, setPanState] = useState(true);

  // ROI list + which one is currently being edited / pending definition.
  const [roiList, setRoiList] = useState([]);
  const [activeRoiIndex, setActiveRoiIndex] = useState(null);

  // Legacy-shaped setters used by the existing controls. These collapse
  // the four-boolean API onto the enum so we can migrate consumers
  // incrementally without changing call sites.
  const setDefineROI = useCallback((value) => {
    setInteractionMode(value ? "roi" : "pan-zoom");
  }, []);
  const setEnablePanZoom = useCallback((value) => {
    setInteractionMode(value ? "pan-zoom" : "roi");
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
