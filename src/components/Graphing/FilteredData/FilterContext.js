import React, { createContext, useState, useContext } from "react";
import {
  StaticRatio_Filter,
  DynamicRatio_Filter,
  Div_Filter,
} from "./FilterModels";

export const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  return <FilterContext.Provider value={{}}>{children}</FilterContext.Provider>;
};
