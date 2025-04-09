import React, { createContext, useState, useEffect } from "react";
import { findPeaks } from "./utilities/PeakFinder";
import { findBaseline } from "./utilities/FindBaseline";
import { adjustBase } from "./utilities/AdjustBase";
import { Peak } from "./classes/Peak";
import {
  prepareQuadraticData,
  quadraticRegression,
} from "./utilities/Regression";
import { calculateWindowWidth } from "./utilities/CalculateWindowWidth";
import { calculatePeakAPDs } from "./utilities/CalculateAPD";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [selectedWell, setSelectedWell] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [averageDescent, setAverageDescent] = useState([]);
  const [averageMagnitude, setAverageMagnitude] = useState(0);
  const [showVerticalLines, setShowVerticalLines] = useState(false);
  const [showDataPoints, setShowDataPoints] = useState(false);
  const [showAscentPoints, setShowAscentPoints] = useState(true);
  const [showDescentPoints, setShowDescentPoints] = useState(true);
  const [useAdjustedBases, setUseAdjustedBases] = useState(true);
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(70);
  const [optimalWindowWidth, setOptimalWindowWidth] = useState(0);
  const [peakProminence, setPeakProminence] = useState(25000);
  const [maximumMagnitude, setMaximumMagnitude] = useState(0);
  const [apdResults, setApdResults] = useState([]);
  const [apdValues, setApdValues] = useState([]);
  const [apdAscentPoints, setApdAscentPoints] = useState([]);
  const [apdDescentPoints, setApdDescentPoints] = useState([]);
  const [lineOfBestFit, setLineOfBestFit] = useState([]);
  const [magnitudeBaselines, setMagnitudeBaselines] = useState([]);
  const [adjustedPeaksData, setAdjustedPeaksData] = useState([]);
  const [leftBaseEntries, setLeftBaseEntries] = useState([]);
  const [rightBaseEntries, setRightBaseEntries] = useState([]);
  const [peakEntries, setPeakEntries] = useState([]);
  const [ApdData, setApdData] = useState([]);
  const [baselineData, setBaselineData] = useState([]);
  const [showSelectedData, setShowSelectedData] = useState(true);
  const [showBaselineData, setShowBaselineData] = useState(true);
  // const [visibleCardiacDatasets, setVisibleCardiacDatasets] = useState({});

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

    const baseline = selectedData ? findBaseline(selectedData) : null;

    setBaselineData(baseline);

    const optimalWindowWidth = calculateWindowWidth(
      baseline,
      peakProminence,
      3
    );
    // console.log(optimalWindowWidth);
    const peaksData = findPeaks(
      baseline, // Data
      peakProminence, // Prominence
      // findPeaksWindowWidth // Window Width
      optimalWindowWidth
    );

    setPeakResults(peaksData);
    // const dataToUse = selectedData;
    const dataToUse = baseline;

    // Extract peak and baseline coordinates
    const newPeakEntries = peaksData?.map((peak) => peak.peakCoords) || [];
    const newLeftBaseEntries =
      peaksData?.map((peak) => peak.leftBaseCoords) || [];
    const newRightBaseEntries =
      peaksData?.map((peak) => peak.rightBaseCoords) || [];

    setPeakEntries(newPeakEntries);
    setLeftBaseEntries(newLeftBaseEntries);
    setRightBaseEntries(newRightBaseEntries);

    // Filter data and perform quadratic regression
    const quadraticData = prepareQuadraticData(dataToUse, peaksData || []);
    const regressionCoefficients = quadraticRegression(quadraticData);

    // Generate line-of-best-fit data
    const newLineOfBestFit = quadraticData.map((point) => {
      const x = point.x;
      const y =
        regressionCoefficients.a * x ** 2 +
        regressionCoefficients.b * x +
        regressionCoefficients.c;
      return { x, y };
    });
    setLineOfBestFit(newLineOfBestFit);

    const newAdjustedPeaksData =
      peaksData?.map((peak) => {
        const adjustedLeftBase = adjustBase(
          peak.leftBaseCoords,
          newLineOfBestFit,
          dataToUse,
          true
        );
        const adjustedRightBase = adjustBase(
          peak.rightBaseCoords,
          newLineOfBestFit,
          dataToUse,
          false
        );
        return {
          ...peak,
          adjustedLeftBaseCoords: adjustedLeftBase,
          adjustedRightBaseCoords: adjustedRightBase,
        };
      }) || [];
    setAdjustedPeaksData(newAdjustedPeaksData);

    // Use the adjusted peaks data if the checkbox is checked
    const finalPeaksData = useAdjustedBases
      ? newAdjustedPeaksData
      : peaksData || [];

    // Recalculate ascent and descent analysis based on the final peaks data
    const recalculatedPeaksData = finalPeaksData.map((peak) => {
      return new Peak(
        peak.peakCoords,
        peak.leftBaseCoords,
        peak.rightBaseCoords,
        peak.prominences,
        dataToUse,
        useAdjustedBases,
        peak.adjustedLeftBaseCoords,
        peak.adjustedRightBaseCoords
      );
    });

    // Calculate magnitude baselines
    const newMagnitudeBaselines = newPeakEntries.map((peak) => {
      const x = peak.x;
      const baselineY =
        regressionCoefficients.a * x ** 2 +
        regressionCoefficients.b * x +
        regressionCoefficients.c;
      return { x: x, y: baselineY };
    });
    setMagnitudeBaselines(newMagnitudeBaselines);
  }, [selectedWell, peakProminence, findPeaksWindowWidth, useAdjustedBases]);

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
        averageMagnitude,
        setAverageMagnitude,
        showVerticalLines,
        setShowVerticalLines,
        showDataPoints,
        setShowDataPoints,
        showAscentPoints,
        setShowAscentPoints,
        showDescentPoints,
        setShowDescentPoints,
        useAdjustedBases,
        setUseAdjustedBases,
        findPeaksWindowWidth,
        setFindPeaksWindowWidth,
        peakProminence,
        setPeakProminence,
        maximumMagnitude,
        setMaximumMagnitude,
        apdResults,
        apdValues,
        apdAscentPoints,
        apdDescentPoints,
        lineOfBestFit,
        magnitudeBaselines,
        adjustedPeaksData,
        leftBaseEntries,
        rightBaseEntries,
        peakEntries,
        ApdData,
        setApdData,
        baselineData,
        showBaselineData,
        setShowBaselineData,
        showSelectedData,
        setShowSelectedData,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
