import React, { createContext, useState } from "react";

export const AnalysisContext = createContext();

export const AnalysisProvider = ({ children }) => {
  const [selectedWell, setSelectedWell] = useState(null);

  const handleSelectWell = (well) => {
    console.log(well);
    setSelectedWell(well);
  };

  return (
    <AnalysisContext.Provider
      value={{ selectedWell, setSelectedWell, handleSelectWell }}
    >
      {children}
    </AnalysisContext.Provider>
  );
};
