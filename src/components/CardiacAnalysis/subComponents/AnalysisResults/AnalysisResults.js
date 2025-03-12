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
  const {
    peakResults,
    selectedWell,
    averageMagnitude,
    setAverageMagnitude,
    maximumMagnitude,
    setMaximumMagnitude,
  } = useContext(AnalysisContext);

  useEffect(() => {
    if (!selectedWell) {
      console.error("No well selected");
      return;
    }

    // quantify all peak magnitudes
    const magnitudes = peakResults.map((peak) => peak.amplitude);

    // Calculate average amplitude
    const totalMagnitude = magnitudes.reduce((acc, curr) => acc + curr, 0);
    // console.log(magnitudes);
    const averageMagnitude =
      magnitudes.length > 0
        ? (totalMagnitude / magnitudes.length).toFixed(2)
        : 0;
    // console.log(averageMagnitude);
    setAverageMagnitude(averageMagnitude);

    const maximumMagnitude =
      magnitudes.length > 0 ? Math.max(...magnitudes) : 0;
    setMaximumMagnitude(maximumMagnitude);
  }, [selectedWell, peakResults]);

  // Calculate average descent at each percentage
  const averageDescent = Array.from({ length: 9 }, (_, i) => {
    const totalDescent = peakResults.reduce((sum, peak) => {
      const descent = peak.descentAnalysis[i];
      return sum + (descent ? descent.x - peak.peakCoords.x : 0);
    }, 0);
    return totalDescent / peakResults.length;
  });
  // Calculate average ascent at each percentage
  const averageAscent = Array.from({ length: 9 }, (_, i) => {
    const totalAscent = peakResults.reduce((sum, peak) => {
      const ascent = peak.ascentAnalysis[i];
      return sum + (ascent ? peak.peakCoords.x - ascent.x : 0);
    }, 0);
    return totalAscent / peakResults.length;
  });
  // Calculate time differences between peaks
  const timeDifferences = peakResults
    .map((peak, index) => {
      if (index === 0) return null; // Skip the first peak
      const previousPeak = peakResults[index - 1];
      return peak.peakCoords.x - previousPeak.peakCoords.x;
    })
    .filter((time) => time !== null); // Remove the null value for the first peak
  // console.log(timeDifferences);

  const sumOfTimeDifferences = timeDifferences.reduce(
    (acc, curr) => acc + curr,
    0
  );
  const averageTimeDifference = (
    sumOfTimeDifferences / timeDifferences.length
  ).toFixed(2);

  // const selectedData = selectedWell.indicators[0].filteredData;

  return (
    <div className="analysis-results-container">
      {/* <div className="peaks"> */}
      <section className="peak-results">
        <h2>Peaks: {peakResults.length}</h2>
        <ul className="list-group">
          {peakResults.map((peak, index) => (
            <li key={index} className="list-group-item">
              Peak {index + 1}: at {peak.peakCoords.x.toFixed(2)}ms
              <div key={index}>Amplitude: {peak.amplitude}</div>
              <section>
                Descent Time:
                {peak.descentAnalysis.map((descent, index) => (
                  <div key={index} style={{ fontSize: 12 }}>
                    at {(index + 1) * 10}%:{" "}
                    {(descent.x - peak.peakCoords.x).toFixed(2)}
                  </div>
                ))}
                <div style={{ fontSize: 12 }}>
                  at baseline:{" "}
                  {(peak.rightBaseCoords.x - peak.peakCoords.x).toFixed(2)}
                </div>
              </section>
            </li>
          ))}
        </ul>
      </section>
      {/* </div> */}
      {/* <section className="peak-times">
        <h3>Time Between Peaks</h3>
        <section>Avg. Time Between Peaks: {averageTimeDifference}</section>
        <ul className="list-group">
          {timeDifferences.map((time, index) => (
            <li key={index}>
              From peak {index + 1} to peak {index + 2}: {time.toFixed(2)}
            </li>
          ))}
        </ul>
      </section> */}
      {/* <section className="descent-results">
        <h3>Average Descent Times</h3>
        <ul className="list-group">
          {averageDescent.map((descent, index) => (
            <li key={index}>
              {(index + 1) * 10}%: {descent.toFixed(2)}
            </li>
          ))}
        </ul>
      </section> */}
      {/* <section className="ascent-results">
        <h3>Average Ascent Times</h3>
        <ul className="list-group">
          {averageAscent.map((ascent, index) => (
            <li key={index}>
              {(index + 1) * 10}%: {ascent.toFixed(2)}
            </li>
          ))}
        </ul>
      </section> */}
      {/* {peakResults ? (
        <section className="amplitude-results">
          <h3>Magnitudes</h3>
          <div>Maximum: {maximumMagnitude}</div>
          <div>Average: {averageMagnitude}</div>
        </section>
      ) : (
        ""
      )} */}
    </div>
  );
};

export default AnalysisResults;
