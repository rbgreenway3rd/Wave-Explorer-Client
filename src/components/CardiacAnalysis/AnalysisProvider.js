// import React, { createContext, useState } from "react";

// export const AnalysisContext = createContext();

// export const AnalysisProvider = ({ children }) => {
//   const [selectedWell, setSelectedWell] = useState(null);

//   const handleSelectWell = (well) => {
//     console.log(well);
//     setSelectedWell(well);
//   };

//   return (
//     <AnalysisContext.Provider
//       value={{ selectedWell, setSelectedWell, handleSelectWell }}
//     >
//       {children}
//     </AnalysisContext.Provider>
//   );
// };
import React, { createContext, useState } from "react";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [selectedWell, setSelectedWell] = useState(null);
  const [peakResults, setPeakResults] = useState([]);
  const [averageDescent, setAverageDescent] = useState([]);

  const handleSelectWell = (well) => {
    console.log(well);
    setSelectedWell(well);
  };

  // Calculate average descent at each percentage
  // const calculateAverageDescent = Array.from({ length: 9 }, (_, i) => {
  //   // const percentage = (i + 1) * 10;
  //   const totalDescent = peakResults.reduce((sum, peak) => {
  //     const descent = peak.descentAnalysis[i];
  //     return sum + (descent ? descent.x - peak.peakCoords.x : 0);
  //   }, 0);
  //   // return totalDescent / peakResults.length;
  //   setAverageDescent(totalDescent / peakResults.length);
  // });

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
        // calculateAverageDescent
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
