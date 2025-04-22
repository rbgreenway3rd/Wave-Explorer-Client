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
import { applyMedianFilter } from "./utilities/MedianFilter";
import {
  calculateAPDValues,
  findBaselineAndPeak,
} from "./utilities/CalculateAPD";
import { calculateMedianSignal } from "./utilities/CalculateMedianSignal";
import { calculatePeakProminence } from "./utilities/CalculatePeakProminence";
import { WellAnalysis } from "./classes/WellAnalysis";

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
  const [findPeaksWindowWidth, setFindPeaksWindowWidth] = useState(0);
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
  const [filteredMedianSignal, setFilteredMedianSignal] = useState([]);
  const [prominenceFactor, setProminenceFactor] = useState(0.5);
  const [currentWellAnalysis, setCurrentWellAnalysis] = useState(null);

  const [baseline, setBaseline] = useState(null);
  const [peak, setPeak] = useState(null);

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

    const optimalPeakProminence = calculatePeakProminence(
      baseline,
      prominenceFactor
    );
    setPeakProminence(optimalPeakProminence);

    const optimalWindowWidth = calculateWindowWidth(
      baseline,
      optimalPeakProminence,
      3
    );

    const peaksData = findPeaks(
      baseline, // Data
      optimalPeakProminence, // Prominence
      // findPeaksWindowWidth // Window Width
      optimalWindowWidth,
      setFindPeaksWindowWidth
    );
    setFindPeaksWindowWidth(optimalWindowWidth);
    console.log(findPeaksWindowWidth);
    // setPeakResults(peaksData);
    setPeakResults(peaksData);
    console.log(peakResults);
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
    console.log("New peakEntries:", newPeakEntries);
    console.log("New leftBaseEntries:", newLeftBaseEntries);
    console.log("New rightBaseEntries:", newRightBaseEntries);

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
  }, [
    selectedWell,
    peakProminence,
    findPeaksWindowWidth,
    useAdjustedBases,
    prominenceFactor,
  ]);

  const handleSelectWell = (well) => {
    setSelectedWell(well);
  };

  useEffect(() => {
    if (!selectedWell || !peakProminence || !findPeaksWindowWidth) {
      return;
    }

    // Create a new instance of WellAnalysis
    const newWellAnalysis = new WellAnalysis(
      selectedWell.key, // Well label
      selectedWell.column + 1, // Column
      selectedWell.row + 1, // Row
      peakResults.length, // Number of peaks
      peakResults.length > 1
        ? peakResults
            .slice(1)
            .reduce(
              (sum, peak, index) =>
                sum + (peak.peakCoords.x - peakResults[index].peakCoords.x),
              0
            ) /
          (peakResults.length - 1)
        : 0, // Average time between peaks
      findPeaksWindowWidth, // Window width
      peakProminence, // Peak prominence
      prominenceFactor, // Prominence factor
      apdValues // APD values
    );

    // Print the new instance to the console
    console.log("New WellAnalysis instance:", newWellAnalysis);
  }, [
    selectedWell,
    peakProminence,
    findPeaksWindowWidth,
    peakResults,
    apdValues,
    // prominenceFactor,
  ]);
  useEffect(() => {
    if (!selectedWell || !peakProminence || !findPeaksWindowWidth) {
      setCurrentWellAnalysis(null); // Reset if no well is selected
      return;
    }

    // Create a new instance of WellAnalysis
    const newWellAnalysis = new WellAnalysis(
      selectedWell.key, // Well label
      selectedWell.column + 1, // Column
      selectedWell.row + 1, // Row
      peakResults.length, // Number of peaks
      peakResults.length > 1
        ? peakResults
            .slice(1)
            .reduce(
              (sum, peak, index) =>
                sum + (peak.peakCoords.x - peakResults[index].peakCoords.x),
              0
            ) /
          (peakResults.length - 1)
        : 0, // Average time between peaks
      findPeaksWindowWidth, // Window width
      peakProminence, // Peak prominence
      prominenceFactor, // Prominence factor
      apdValues // APD values
    );

    // Update the state with the new WellAnalysis instance
    setCurrentWellAnalysis(newWellAnalysis);

    // Optionally log the instance
    console.log("New WellAnalysis instance:", newWellAnalysis);
  }, [
    selectedWell,
    peakProminence,
    findPeaksWindowWidth,
    peakResults,
    apdValues,
    prominenceFactor,
  ]);

  useEffect(() => {
    if (!selectedWell || !baselineData || peakResults.length === 0) {
      setFilteredMedianSignal([]);
      setApdValues([]);
      setBaseline(null);
      setPeak(null);
      return;
    }

    // Calculate the median signal
    const medianSignal = calculateMedianSignal(
      baselineData,
      peakResults,
      findPeaksWindowWidth
    );

    // Apply the median filter
    const filteredSignal = applyMedianFilter(medianSignal, 3);
    setFilteredMedianSignal(filteredSignal);

    // Find baseline and peak
    const { baseline: calculatedBaseline, peak: calculatedPeak } =
      findBaselineAndPeak(filteredSignal);
    setBaseline(calculatedBaseline);
    setPeak(calculatedPeak);

    // Calculate APD values
    if (calculatedBaseline && calculatedPeak) {
      const apdResults = calculateAPDValues(
        filteredSignal,
        calculatedBaseline,
        calculatedPeak,
        [10, 20, 30, 40, 50, 60, 70, 80, 90]
      );
      setApdValues(apdResults);
    }
  }, [selectedWell, baselineData, peakResults, findPeaksWindowWidth]);

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
        filteredMedianSignal,

        baseline,
        peak,
        prominenceFactor,
        setProminenceFactor,
        currentWellAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
