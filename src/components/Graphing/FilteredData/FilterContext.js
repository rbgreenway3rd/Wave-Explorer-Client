import React, { createContext, useState, useContext } from "react";
import { listOfFilters } from "./FilterFunctions";

export const FilterContext = createContext();

// export const useFilters = () => useContext(FilterContext);

export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState(
    listOfFilters.reduce((acc, filter) => {
      acc[filter.name] = false;
      return acc;
    }, {})
  );

  const [selectedFilters, setSelectedFilters] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);

  const addFilter = (filterName) => {
    setSelectedFilters((prevSelected) => [...prevSelected, filterName]);
  };

  const removeFilter = (filterName) => {
    setSelectedFilters((prevSelected) =>
      prevSelected.filter((name) => name !== filterName)
    );
  };

  const toggleFilter = (filterName) => {
    setFilters((prevFilters) => {
      const newFilters = {
        ...prevFilters,
        [filterName]: !prevFilters[filterName], // Toggle the filter's status
      };
      const updatedActiveFilters = Object.keys(newFilters).filter(
        (key) => newFilters[key]
      );
      setActiveFilters(updatedActiveFilters); // Update active filters based on the new filter states
      return newFilters;
    });
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        toggleFilter,
        selectedFilters,
        addFilter,
        removeFilter,
        activeFilters,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};
