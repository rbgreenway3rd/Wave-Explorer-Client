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
  const [showBursts, setShowBursts] = useState(false); // Default to false
  const [handleOutliers, setHandleOutliers] = useState(true); // Default to true so outlier handling runs automatically

  // Outlier detection parameters
  const [outlierPercentile, setOutlierPercentile] = useState(95); // 95th percentile (top 5%)
  const [outlierMultiplier, setOutlierMultiplier] = useState(2.0); // 2.0× median prominence

  // Burst detection parameters
  const [maxInterSpikeInterval, setMaxInterSpikeInterval] = useState(50); // 50ms default
  const [minSpikesPerBurst, setMinSpikesPerBurst] = useState(3); // 3 spikes minimum

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
        handleOutliers,
        setHandleOutliers,
        outlierPercentile,
        setOutlierPercentile,
        outlierMultiplier,
        setOutlierMultiplier,
        maxInterSpikeInterval,
        setMaxInterSpikeInterval,
        minSpikesPerBurst,
        setMinSpikesPerBurst,
      }}
    >
      {children}
    </NeuralContext.Provider>
  );
};

export default NeuralProvider;
