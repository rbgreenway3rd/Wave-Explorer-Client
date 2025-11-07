import React, { createContext, useState } from "react";

export const NeuralContext = createContext();

export const NeuralProvider = ({ children }) => {
  // Example state, adjust as needed for your modal's requirements
  const [selectedWell, setSelectedWell] = useState(null);
  const [useAdjustedBases, setUseAdjustedBases] = useState(false);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(10);
  const [peakProminence, setPeakProminence] = useState(1);
  const [peakResults, setPeakResults] = useState([]);
  const [burstResults, setBurstResults] = useState([]);
  const [showBursts, setShowBursts] = useState(true); // Default to true so burst detection runs automatically

  return (
    <NeuralContext.Provider
      value={{
        selectedWell,
        setSelectedWell,
        useAdjustedBases,
        setUseAdjustedBases,
        findPeaksWindowWidth,
        setFindPeaksWindowWidth,
        peakProminence,
        setPeakProminence,
        peakResults,
        setPeakResults,
        burstResults,
        setBurstResults,
        showBursts,
        setShowBursts,
      }}
    >
      {children}
    </NeuralContext.Provider>
  );
};

export default NeuralProvider;
