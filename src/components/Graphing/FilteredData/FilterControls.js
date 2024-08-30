// import React, { useState, useEffect } from "react";
// import WellSelectionModal from "./WellSelectionModal";
// import Box from "@mui/material/Box";
// import Button from "@mui/material/Button";
// import Typography from "@mui/material/Typography";
// import FilterSelectionModal from "./FilterSelectionModal";
// import { useFilters } from "./FilterContext";

// export const FilterControls = ({
//   wellArrays,
//   onFilterUpdate,
//   onSelectedWellsUpdate,
// }) => {
//   const [selectedWells, setSelectedWells] = useState([]);
//   const [activeFilters, setActiveFilters] = useState([]);
//   const [selectedFilters, setSelectedFilters] = useState([]);
//   const [highlightedFilters, setHighlightedFilters] = useState([]);
//   const { filters, toggleFilter } = useFilters();

//   useEffect(() => {
//     // Initialize activeFilters based on selectedFilters and filters
//     const newActiveFilters = selectedFilters.filter(
//       (filterName) => filters[filterName]
//     );
//     setActiveFilters(newActiveFilters);
//   }, [filters, selectedFilters]);

//   const handleFilterApply = (selectedFilterNames) => {
//     // Add filters to selectedFilters
//     setSelectedFilters(selectedFilterNames);
//   };

//   const handleCheckboxChange = (filterName) => {
//     if (activeFilters.includes(filterName)) {
//       setActiveFilters((prevActiveFilters) =>
//         prevActiveFilters.filter((name) => name !== filterName)
//       );
//     } else {
//       setActiveFilters((prevActiveFilters) => [
//         ...prevActiveFilters,
//         filterName,
//       ]);
//     }
//     toggleFilter(filterName); // Ensure filters are toggled correctly
//     updateGraphData(); // Update graph data after toggling
//   };

//   const handleFilterHighlight = (filterName) => {
//     setHighlightedFilters((prevHighlightedFilters) => {
//       if (prevHighlightedFilters.includes(filterName)) {
//         return prevHighlightedFilters.filter((name) => name !== filterName);
//       } else {
//         return [...prevHighlightedFilters, filterName];
//       }
//     });
//   };

//   const handleRemoveHighlightedFilters = () => {
//     setHighlightedFilters((prevHighlightedFilters) => {
//       prevHighlightedFilters.forEach((filterName) => {
//         // Deactivate the filter if it is active
//         if (activeFilters.includes(filterName)) {
//           toggleFilter(filterName);
//         }

//         // Remove the filter from the selected filters and active filters
//         setSelectedFilters((prevSelectedFilters) =>
//           prevSelectedFilters.filter((name) => name !== filterName)
//         );
//         setActiveFilters((prevActiveFilters) =>
//           prevActiveFilters.filter((name) => name !== filterName)
//         );
//       });

//       // Reapply remaining active filters to update the graph data
//       updateGraphData();

//       // Clear highlighted filters after removing them
//       return [];
//     });
//   };

//   const updateGraphData = () => {
//     // Start with the original selected wells data
//     let filteredData = selectedWells;

//     // Only apply filters if there are any active filters
//     if (activeFilters.length > 0) {
//       activeFilters.forEach((filterName) => {
//         const filter = filters[filterName];
//         if (filter && typeof filter.apply === "function") {
//           filteredData = filter.apply(filteredData);
//         }
//       });
//     }

//     // Update the graph with the newly filtered data
//     onFilterUpdate(filteredData);
//   };

//   const filterSelectedWells = (selectedCells) => {
//     const newFilteredArray = wellArrays.filter((well) => {
//       return selectedCells.some(
//         (selectedCell) =>
//           well.row === selectedCell.row && well.column === selectedCell.col
//       );
//     });
//     setSelectedWells(newFilteredArray);
//     onFilterUpdate(newFilteredArray); // Update the filteredWellArray in CombinedComponent.js
//     return selectedWells;
//   };

//   return (
//     <Box
//       sx={{
//         padding: 0,
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//       }}
//     >
//       <Typography variant="h5" gutterBottom>
//         Filter Controls
//       </Typography>
//       <div className="filter-selection-buttons">
//         <FilterSelectionModal onFilterApply={handleFilterApply} />
//         <button className="filter-order-button-up">^</button>
//         <button className="filter-order-button-down">v</button>
//         <button
//           className="filter-order-button-remove"
//           onClick={handleRemoveHighlightedFilters}
//         >
//           x
//         </button>
//         <div>
//           <h3>Selected Filters</h3>
//           {selectedFilters.length > 0 ? (
//             selectedFilters.map((filterName) => (
//               <div
//                 key={filterName}
//                 style={{
//                   backgroundColor: highlightedFilters.includes(filterName)
//                     ? "yellow"
//                     : "transparent",
//                 }}
//                 onClick={() => handleFilterHighlight(filterName)}
//               >
//                 <input
//                   type="checkbox"
//                   checked={activeFilters.includes(filterName)} // Control filter enabling/disabling
//                   onChange={() => handleCheckboxChange(filterName)} // Toggle filter state
//                 />
//                 <label>{filterName}</label>
//               </div>
//             ))
//           ) : (
//             <Typography variant="body2">No filters selected.</Typography>
//           )}
//         </div>
//       </div>
//       <Box sx={{ mb: 0 }}>
//         <Button
//           variant="contained"
//           color="primary"
//           onClick={() => {
//             setSelectedWells([]);
//             onSelectedWellsUpdate([]);
//             setActiveFilters([]); // Clear active filters on reset
//             onFilterUpdate([]); // Update graph data after reset
//           }}
//         >
//           Reset Filters
//         </Button>
//       </Box>
//       <WellSelectionModal onFilterApply={filterSelectedWells} />
//       {/* Additional filter controls or components can be added here */}
//     </Box>
//   );
// };

// export default FilterControls;
import React, { useState, useEffect } from "react";
import WellSelectionModal from "./WellSelectionModal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FilterSelectionModal from "./FilterSelectionModal";
import { useFilters } from "./FilterContext";

export const FilterControls = ({
  wellArrays,
  onFilterUpdate,
  onSelectedWellsUpdate,
}) => {
  const [selectedWells, setSelectedWells] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [highlightedFilters, setHighlightedFilters] = useState([]);
  const { filters, toggleFilter } = useFilters();

  useEffect(() => {
    // Initialize activeFilters based on selectedFilters and filters
    const newActiveFilters = selectedFilters.filter(
      (filterName) => filters[filterName]
    );
    setActiveFilters(newActiveFilters);
  }, [filters, selectedFilters]);

  useEffect(() => {
    // Update graph data whenever activeFilters or selectedWells change
    let filteredData = selectedWells;

    if (activeFilters.length > 0) {
      activeFilters.forEach((filterName) => {
        const filter = filters[filterName];
        if (filter && typeof filter.apply === "function") {
          filteredData = filter.apply(filteredData);
        }
      });
    }

    // Update the graph with the newly filtered data
    onFilterUpdate(filteredData);
  }, [activeFilters, selectedWells, filters, onFilterUpdate]);

  const handleFilterApply = (selectedFilterNames) => {
    // Add filters to selectedFilters
    setSelectedFilters(selectedFilterNames);
  };

  const handleCheckboxChange = (filterName) => {
    if (activeFilters.includes(filterName)) {
      setActiveFilters((prevActiveFilters) =>
        prevActiveFilters.filter((name) => name !== filterName)
      );
    } else {
      setActiveFilters((prevActiveFilters) => [
        ...prevActiveFilters,
        filterName,
      ]);
    }
    toggleFilter(filterName); // Ensure filters are toggled correctly
  };

  const handleFilterHighlight = (filterName) => {
    setHighlightedFilters((prevHighlightedFilters) => {
      if (prevHighlightedFilters.includes(filterName)) {
        return prevHighlightedFilters.filter((name) => name !== filterName);
      } else {
        return [...prevHighlightedFilters, filterName];
      }
    });
  };

  const handleRemoveHighlightedFilters = () => {
    if (highlightedFilters.length > 0) {
      highlightedFilters.forEach((filterName) => {
        // Deactivate the filter if it is active
        if (activeFilters.includes(filterName)) {
          setActiveFilters((prevActiveFilters) =>
            prevActiveFilters.filter((name) => name !== filterName)
          );
          toggleFilter(filterName);
        }

        // Remove the filter from the selected filters
        setSelectedFilters((prevSelectedFilters) =>
          prevSelectedFilters.filter((name) => name !== filterName)
        );
      });

      // Clear highlighted filters after removing them
      setHighlightedFilters([]);
    }
  };

  const filterSelectedWells = (selectedCells) => {
    const newFilteredArray = wellArrays.filter((well) => {
      return selectedCells.some(
        (selectedCell) =>
          well.row === selectedCell.row && well.column === selectedCell.col
      );
    });
    setSelectedWells(newFilteredArray);
    return selectedWells;
  };

  return (
    <Box
      sx={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h5" gutterBottom>
        Filter Controls
      </Typography>
      <div className="filter-selection-buttons">
        <FilterSelectionModal onFilterApply={handleFilterApply} />
        <button className="filter-order-button-up">^</button>
        <button className="filter-order-button-down">v</button>
        <button
          className="filter-order-button-remove"
          onClick={handleRemoveHighlightedFilters}
        >
          x
        </button>
        <div>
          <h3>Selected Filters</h3>
          {selectedFilters.length > 0 ? (
            selectedFilters.map((filterName) => (
              <div
                key={filterName}
                style={{
                  backgroundColor: highlightedFilters.includes(filterName)
                    ? "yellow"
                    : "transparent",
                }}
                onClick={() => handleFilterHighlight(filterName)}
              >
                <input
                  type="checkbox"
                  checked={activeFilters.includes(filterName)} // Control filter enabling/disabling
                  onChange={() => handleCheckboxChange(filterName)} // Toggle filter state
                />
                <label>{filterName}</label>
              </div>
            ))
          ) : (
            <Typography variant="body2">No filters selected.</Typography>
          )}
        </div>
      </div>
      <Box sx={{ mb: 0 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setSelectedWells([]);
            onSelectedWellsUpdate([]);
            setActiveFilters([]); // Clear active filters on reset
            onFilterUpdate([]); // Update graph data after reset
          }}
        >
          Reset Filters
        </Button>
      </Box>
      <WellSelectionModal onFilterApply={filterSelectedWells} />
      {/* Additional filter controls or components can be added here */}
    </Box>
  );
};

export default FilterControls;
