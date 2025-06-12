// import React, { useContext, useEffect } from "react";
// import { AnalysisContext } from "../../AnalysisProvider";
// import "../../styles/AnalysisResults.css";

// const AnalysisResults = () => {
//   const { peakResults, selectedWell, currentWellAnalysis } =
//     useContext(AnalysisContext);
//   const { apdValues } = useContext(AnalysisContext);

//   const { apdResults, midpoint } = apdValues || {};

//   useEffect(() => {
//     if (!selectedWell) {
//       console.error("No well selected");
//       return;
//     }
//   });
//   let averageTimeBetweenPeaks = (peakResults) => {
//     let timeBetweenPeaks = [];
//     for (let i = 1; i < peakResults.length; i++) {
//       timeBetweenPeaks.push(
//         peakResults[i].peakCoords.x - peakResults[i - 1].peakCoords.x
//       );
//     }
//     return (
//       timeBetweenPeaks.reduce((a, b) => a + b, 0) / timeBetweenPeaks.length
//     );
//   };

//   const renderAPDValues = (apdValues) => {
//     if (!apdValues || Object.keys(apdValues).length === 0) {
//       return <p>No APD values available.</p>;
//     }

//     return (
//       <ul>
//         {Object.entries(apdValues).map(([key, apd]) => (
//           <li key={key}>
//             <strong>{key}:</strong>{" "}
//             {apd.value !== null ? (
//               <>
//                 {apd.value.toFixed(2)} ms{" "}
//                 {/* <span>
//                   (Start: {apd.start?.x?.toFixed(2)}, {apd.start?.y?.toFixed(2)}
//                   ; End: {apd.end?.x?.toFixed(2)}, {apd.end?.y?.toFixed(2)})
//                 </span> */}
//               </>
//             ) : (
//               "Not available"
//             )}
//           </li>
//         ))}
//       </ul>
//     );
//   };

//   return (
//     <div className="analysis-results-container">
//       {currentWellAnalysis ? (
//         <section>
//           <h3>Well Analysis Results</h3>
//           <p>Well: {currentWellAnalysis.wellKey}</p>
//           <p>Number of Peaks: {currentWellAnalysis.numberOfPeaks}</p>
//           <p>
//             Average Time Between Peaks:{" "}
//             {currentWellAnalysis.avgPTPTime.toFixed(2)} ms
//           </p>
//           <p>Window Width: {currentWellAnalysis.windowWidth}</p>
//           <p>Peak Prominence: {currentWellAnalysis.peakProminence}</p>
//           <p>Prominence Factor: {currentWellAnalysis.prominenceFactor}</p>
//           <p>APD Values:</p>
//           {renderAPDValues(currentWellAnalysis.APDValues)}
//         </section>
//       ) : (
//         <p>No well analysis available.</p>
//       )}
//     </div>
//   );
// };

// export default AnalysisResults;
import React, { useContext, useEffect } from "react";
import { AnalysisContext } from "../../AnalysisProvider";
import "../../styles/AnalysisResults.css";

const AnalysisResults = () => {
  const { peakResults, selectedWell, currentWellAnalysis, peak, baseline } =
    useContext(AnalysisContext);
  const { apdValues } = useContext(AnalysisContext);

  const { apdResults, midpoint } = apdValues || {};

  useEffect(() => {
    if (!selectedWell) {
      console.error("No well selected");
      return;
    }
  });

  const renderAPDValues = (apdValues) => {
    if (!apdValues || Object.keys(apdValues).length === 0) {
      return <p>No APD values available.</p>;
    }

    return (
      <ul>
        {Object.entries(apdValues).map(([key, apd]) => (
          <li key={key}>
            <strong>{key}:</strong>{" "}
            {apd.value !== null ? (
              <>{apd.value.toFixed(2)} ms </>
            ) : (
              "Not available"
            )}
          </li>
        ))}
      </ul>
    );
  };

  // Calculate amplitude using peak and baseline
  const amplitude =
    peak && baseline ? (peak.y - baseline.y).toFixed(2) : "Not available";

  return (
    <div className="analysis-results-container">
      {currentWellAnalysis ? (
        <section className="analysis-results">
          <h3 className="analysis-header">Well Analysis Results</h3>
          <div className="analysis-details">
            <div className="analysis-info">
              <p>
                <strong>Well:</strong> {currentWellAnalysis.wellKey}
              </p>
              <div>Number of Peaks: {currentWellAnalysis.numberOfPeaks}</div>
              <div>
                Average Time Between Peaks:{" "}
                {currentWellAnalysis.avgPTPTime.toFixed(2)} ms
              </div>
              <div>Window Width: {currentWellAnalysis.windowWidth}</div>
              <div>Peak Prominence: {currentWellAnalysis.peakProminence}</div>
              <div>
                Prominence Factor: {currentWellAnalysis.prominenceFactor}
              </div>
              <div>Amplitude: {amplitude}</div>
            </div>
            <div className="analysis-apd">
              <p>APD Values:</p>
              {renderAPDValues(currentWellAnalysis.APDValues)}
            </div>
          </div>
        </section>
      ) : (
        <p>No well analysis available.</p>
      )}
    </div>
  );
};

export default AnalysisResults;
