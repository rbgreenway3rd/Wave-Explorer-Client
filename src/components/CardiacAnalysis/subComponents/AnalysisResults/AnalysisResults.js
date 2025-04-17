import React, { useContext, useEffect } from "react";
import { AnalysisContext } from "../../AnalysisProvider";
import "../../styles/AnalysisResults.css";
import { Peak } from "../../classes/Peak";
import {
  prepareQuadraticData,
  quadraticRegression,
} from "../../utilities/Regression";
import { calculatePeakAPDs } from "../../utilities/CalculateAPD";
const AnalysisResults = () => {
  const { peakResults, selectedWell } = useContext(AnalysisContext);

  useEffect(() => {
    if (!selectedWell) {
      console.error("No well selected");
      return;
    }
  });
  let averageTimeBetweenPeaks = (peakResults) => {
    let timeBetweenPeaks = [];
    for (let i = 1; i < peakResults.length; i++) {
      timeBetweenPeaks.push(
        peakResults[i].peakCoords.x - peakResults[i - 1].peakCoords.x
      );
    }
    return (
      timeBetweenPeaks.reduce((a, b) => a + b, 0) / timeBetweenPeaks.length
    );
  };
  return (
    <div className="analysis-results-container">
      <section>
        average time between peaks:{" "}
        {averageTimeBetweenPeaks(peakResults).toFixed(2)}ms
      </section>
    </div>
  );
};

export default AnalysisResults;
