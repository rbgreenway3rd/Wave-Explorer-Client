// utilities/Helpers.js
import html2canvas from "html2canvas";

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

export const handleRowSelectorClick = (
  rowLabel,
  wellArrays,
  selectedWellArray,
  handleSelectWell,
  handleDeselectWell
) => {
  const wellsInRow = wellArrays.filter((well) => well.key.startsWith(rowLabel));
  const selectedWellIds = selectedWellArray.map((well) => well.id); // Extract selected well IDs

  const allSelected = wellsInRow.every((well) =>
    selectedWellIds.includes(well.id)
  );

  if (allSelected) {
    wellsInRow.forEach((well) => handleDeselectWell(well.id)); // Deselect by ID
  } else {
    wellsInRow.forEach((well) => {
      if (!selectedWellIds.includes(well.id)) {
        handleSelectWell(well); // Select the well
      }
    });
  }
};

export const handleColumnSelectorClick = (
  colIndex,
  wellArrays,
  selectedWellArray,
  handleSelectWell,
  handleDeselectWell
) => {
  const wellsInCol = wellArrays.filter((well) => well.column + 1 === colIndex);
  const selectedWellIds = selectedWellArray.map((well) => well.id); // Extract selected well IDs

  const allSelected = wellsInCol.every((well) =>
    selectedWellIds.includes(well.id)
  );

  if (allSelected) {
    wellsInCol.forEach((well) => handleDeselectWell(well.id)); // Deselect by ID
  } else {
    wellsInCol.forEach((well) => {
      if (!selectedWellIds.includes(well.id)) {
        handleSelectWell(well); // Select the well
      }
    });
  }
};

export const handleScreenshot = async (componentRef) => {
  if (componentRef.current) {
    const canvas = await html2canvas(componentRef.current);
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = "component.png";
    link.click();
  }
};
