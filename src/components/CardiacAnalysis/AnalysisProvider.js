// import React, { createContext, useState } from "react";

// export const AnalysisContext = createContext();

// export const AnalysisProvider = ({ children }) => {
//   const [selectedWell, setSelectedWell] = useState(null);
//   const [peakResults, setPeakResults] = useState([]);
//   const [averageDescent, setAverageDescent] = useState([]);
//   const [peakMagnitudes, setPeakMagnitudes] = useState([]);
//   const [averageMagnitude, setAverageMagnitude] = useState(0);
//   const [showVerticalLines, setShowVerticalLines] = useState(false);
//   const handleSelectWell = (well) => {
//     console.log(well);
//     setSelectedWell(well);
//   };

//   return (
//     <AnalysisContext.Provider
//       value={{
//         selectedWell,
//         setSelectedWell,
//         handleSelectWell,
//         peakResults,
//         setPeakResults,
//         averageDescent,
//         setAverageDescent,
//         peakMagnitudes,
//         setPeakMagnitudes,
//         averageMagnitude,
//         setAverageMagnitude,
//         showVerticalLines,
//         setShowVerticalLines,
//       }}
//     >
//       {children}
//     </AnalysisContext.Provider>
//   );
// };
import React, { createContext, useState, useEffect } from "react";
import { findPeaks } from "./utilities/PeakFinder";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [selectedWell, setSelectedWell] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [averageDescent, setAverageDescent] = useState([]);
  // const [peakMagnitudes, setPeakMagnitudes] = useState([]);
  const [averageMagnitude, setAverageMagnitude] = useState(0);
  const [showVerticalLines, setShowVerticalLines] = useState(false);
  const [useAdjustedBases, setUseAdjustedBases] = useState(true);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(80);
  const [peakProminence, setPeakProminence] = useState(25000);
  const [maximumMagnitude, setMaximumMagnitude] = useState(0);
  useEffect(() => {
    if (!selectedWell) {
      setPeakResults([]);
      return;
    }

    const selectedData = selectedWell.indicators[0].filteredData;

    if (!selectedData || selectedData.length === 0) {
      console.error("Selected data is empty or undefined");
      return;
    }

    const peaksData = findPeaks(
      selectedData, // Data
      peakProminence, // Prominence
      findPeaksWindowWidth // Window Width
    );

    setPeakResults(peaksData);
  }, [selectedWell, peakProminence, findPeaksWindowWidth]);

  const handleSelectWell = (well) => {
    setSelectedWell(well);
  };

  return (
    <AnalysisContext.Provider
      value={{
        selectedWell,
        setSelectedWell,
        handleSelectWell,
        peakResults,
        setPeakResults,
        averageDescent,
        setAverageDescent,
        // peakMagnitudes,
        // setPeakMagnitudes,
        averageMagnitude,
        setAverageMagnitude,
        showVerticalLines,
        setShowVerticalLines,
        useAdjustedBases,
        setUseAdjustedBases,
        findPeaksWindowWidth,
        setFindPeaksWindowWidth,
        peakProminence,
        setPeakProminence,
        maximumMagnitude,
        setMaximumMagnitude,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
