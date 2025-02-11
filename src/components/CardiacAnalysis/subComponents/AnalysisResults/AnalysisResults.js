import React from "react";

const AnalysisResults = ({ peakResults, averageDescent }) => {
  return (
    <section className="cardiac-graph-results">
      <div>
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
      </div>
      <div>
        <h3>Average Descent Times</h3>
        <ul>
          {averageDescent.map((descent, index) => (
            <li key={index}>
              {(index + 1) * 10}%: {descent.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default AnalysisResults;
