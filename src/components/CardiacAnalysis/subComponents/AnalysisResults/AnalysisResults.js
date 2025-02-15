import React, { useContext } from "react";
import { AnalysisContext } from "../../AnalysisProvider";
import "../../styles/AnalysisResults.css";
const AnalysisResults = (
  {
    // peakResults, averageDescent
  }
) => {
  const { peakResults } = useContext(AnalysisContext);
  // Calculate average descent at each percentage
  const averageDescent = Array.from({ length: 9 }, (_, i) => {
    // const percentage = (i + 1) * 10;
    const totalDescent = peakResults.reduce((sum, peak) => {
      const descent = peak.descentAnalysis[i];
      return sum + (descent ? descent.x - peak.peakCoords.x : 0);
    }, 0);
    return totalDescent / peakResults.length;
  });
  return (
    <div className="analysis-results-container">
      <section className="peak-results">
        <h2>Peaks:</h2>
        <ul>
          {peakResults.map((peak, index) => (
            <li key={index}>
              Peak {index + 1}: {peak.peakCoords.x.toFixed(2)}
              <section>
                Descent Time:
                {peak.descentAnalysis.map((descent, index) => (
                  <div key={index}>
                    at {(index + 1) * 10}%:{" "}
                    {(descent.x - peak.peakCoords.x).toFixed(2)}
                  </div>
                ))}
                <div>
                  at baseline:{" "}
                  {(peak.rightBaseCoords.x - peak.peakCoords.x).toFixed(2)}
                </div>
              </section>
            </li>
          ))}
        </ul>
      </section>
      <section className="descent-results">
        <h3>Average Descent Times</h3>
        <ul>
          {averageDescent.map((descent, index) => (
            <li key={index}>
              {(index + 1) * 10}%: {descent.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AnalysisResults;
