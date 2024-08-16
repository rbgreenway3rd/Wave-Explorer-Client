// utilities/Helpers.js

// Handle selecting a well
export const handleSelectWell = (
  well,
  selectedWellArray,
  setSelectedWellArray
) => {
  setSelectedWellArray([...selectedWellArray, well]);
};

// Handle deselecting a well
export const handleDeselectWell = (
  wellToRemove,
  selectedWellArray,
  setSelectedWellArray
) => {
  setSelectedWellArray(
    selectedWellArray.filter((well) => well !== wellToRemove)
  );
};

// Handle clicking on a well array (toggle selection)
export const handleWellArrayClick = (
  index,
  wellArrays,
  selectedWellArray,
  setSelectedWellArray
) => {
  const well = wellArrays[index];
  if (selectedWellArray.includes(well)) {
    handleDeselectWell(well, selectedWellArray, setSelectedWellArray);
  } else {
    handleSelectWell(well, selectedWellArray, setSelectedWellArray);
  }
};

// Handle clicking the "select all" button
export const handleAllSelectorClick = (
  wellArrays,
  selectedWellArray,
  setSelectedWellArray
) => {
  const allSelected = wellArrays.every((well) =>
    selectedWellArray.includes(well)
  );
  setSelectedWellArray(allSelected ? [] : [...wellArrays]);
};

// Handle selecting a row of wells
export const handleRowSelectorClick = (
  rowLabel,
  wellArrays,
  selectedWellArray,
  setSelectedWellArray
) => {
  const wellsInRow = wellArrays.filter((well) => well.key.startsWith(rowLabel));
  const allSelected = wellsInRow.every((well) =>
    selectedWellArray.includes(well)
  );
  setSelectedWellArray(
    allSelected
      ? selectedWellArray.filter((well) => !wellsInRow.includes(well))
      : [...selectedWellArray, ...wellsInRow]
  );
};

// Handle selecting a column of wells
export const handleColumnSelectorClick = (
  colIndex,
  wellArrays,
  selectedWellArray,
  setSelectedWellArray
) => {
  const wellsInCol = wellArrays.filter((well) => well.column + 1 === colIndex);
  const allSelected = wellsInCol.every((well) =>
    selectedWellArray.includes(well)
  );
  setSelectedWellArray(
    allSelected
      ? selectedWellArray.filter((well) => !wellsInCol.includes(well))
      : [...selectedWellArray, ...wellsInCol]
  );
};

export const filterSelectedWells = (selectedCells, wellArrays) => {
  const newFilteredArray = [];
  selectedCells.forEach((selectedCell) => {
    wellArrays.forEach((well) => {
      if (well.row === selectedCell.row && well.column === selectedCell.col) {
        newFilteredArray.push(well);
      }
    });
  });
  console.log("new filtered array: ", newFilteredArray);
  return newFilteredArray;
};

// export const handleRubberbandSelection = (wellArrays, rubberbandCells, filteredWellArray, setFilteredWellArray ) => {
//   const newFilteredWellArray = [];
//   const matchedWell = wellArrays.find((well)=> )

// }
// export const handleRubberbandSelection = (wellArrays, rubberbandCells, filteredWellArray, setFilteredWellArray ) => {
//   let newFilteredWellArray = [];
//   for (let i = 0; newFilteredWellArray.length < rubberbandCells.length; i++) {

//   }
// }
