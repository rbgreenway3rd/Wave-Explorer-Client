import React, { useState } from "react";
import WellSelectionModal from "./WellSelectionModal";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import FilterSelectionModal from "./FilterSelectionModal";
// import { DataFilter, TestFilter } from "./FilterModels";
// import { filterSelectedWells } from "../../../utilities/Helpers";

export const FilterControls = ({ wellArrays, onFilterUpdate }) => {
  const [selectedWells, setSelectedWells] = useState([]);

  const handleFilterApply = (wells) => {
    console.log("selected cells: ", wells);
  };

  const filterSelectedWells = (selectedCells) => {
    const newFilteredArray = wellArrays.filter((well) => {
      return selectedCells.some(
        (selectedCell) =>
          well.row === selectedCell.row && well.column === selectedCell.col
      );
    });
    console.log("new filtered array: ", newFilteredArray);
    setSelectedWells(newFilteredArray); // Set the filtered wells into state
    onFilterUpdate(newFilteredArray); // Update the filteredWellArray in CombinedComponent.js
    return newFilteredArray;
  };
  // const handleFilterApply = (wells, filterType) => {
  //   setSelectedWells(wells);
  //   console.log("selected cells: ", wells);
  //   // perform additional logic with selectedWells here
  //   const newFilteredData = new TestFilter(
  //     "test",
  //     "halve data",
  //     "halves data",
  //     true,
  //     [],
  //     []
  //   );
  // };

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
        <FilterSelectionModal />
        <button>^</button>
        <button>v</button>
        <button>x</button>
      </div>
      <Box sx={{ mb: 0 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setSelectedWells([])}
        >
          Reset Filters
        </Button>
      </Box>
      <WellSelectionModal onFilterApply={filterSelectedWells} />
      {/* Additional filter controls or components can be added here */}
      <Typography variant="7" gutterBottom>
        <div>
          {selectedWells.map((well, index) => (
            <div>
              col: {well.column}, row: {well.row}
            </div>
          ))}
        </div>
      </Typography>
    </Box>
  );
};

export default FilterControls;
