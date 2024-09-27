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
  const well = wellArrays[index - 1];
  if (selectedWellArray.includes(well)) {
    handleDeselectWell(well, selectedWellArray, setSelectedWellArray);
  } else {
    handleSelectWell(well, selectedWellArray, setSelectedWellArray);
  }
};

export const handleAllSelectorClick = (
  wellArrays,
  selectedWellArray,
  handleSelectWell,
  handleClearSelectedWells
) => {
  const allSelected = wellArrays.every((well) =>
    selectedWellArray.includes(well)
  );
  if (allSelected) {
    handleClearSelectedWells();
  } else {
    wellArrays.forEach((well) => {
      if (!selectedWellArray.includes(well)) {
        handleSelectWell(well);
      }
    });
  }
};

// Handle selecting a row of wells
export const handleRowSelectorClick = (
  rowLabel,
  wellArrays,
  selectedWellArray,
  handleSelectWell,
  handleDeselectWell
) => {
  const wellsInRow = wellArrays.filter((well) => well.key.startsWith(rowLabel));
  const allSelected = wellsInRow.every((well) =>
    selectedWellArray.includes(well)
  );

  if (allSelected) {
    wellsInRow.forEach((well) => handleDeselectWell(well));
  } else {
    wellsInRow.forEach((well) => {
      if (!selectedWellArray.includes(well)) {
        handleSelectWell(well);
      }
    });
  }
};

// Handle selecting a column of wells
export const handleColumnSelectorClick = (
  colIndex,
  wellArrays,
  selectedWellArray,
  handleSelectWell,
  handleDeselectWell
) => {
  const wellsInCol = wellArrays.filter((well) => well.column + 1 === colIndex);
  const allSelected = wellsInCol.every((well) =>
    selectedWellArray.includes(well)
  );

  if (allSelected) {
    wellsInCol.forEach((well) => handleDeselectWell(well));
  } else {
    wellsInCol.forEach((well) => {
      if (!selectedWellArray.includes(well)) {
        handleSelectWell(well);
      }
    });
  }
};
