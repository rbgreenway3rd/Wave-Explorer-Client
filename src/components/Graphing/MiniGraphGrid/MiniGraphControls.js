import React, { useContext, useState } from "react";
import { DataContext } from "../../FileHandling/DataProvider";
// import "../../../styles/MiniGraphControls.css";

export const MiniGraphControls = ({}) => {
  const {
    project,
    analysisData,
    showFiltered,
    setShowFiltered,
    selectedWellArray,
    handleSelectWell,
    handleDeselectWell,
    handleClearSelectedWells,
  } = useContext(DataContext);

  // Local state for managing which data to show
  const [isFiltered, setIsFiltered] = useState(false); // Default is raw data (false)

  const plate = project?.plate || [];
  const experiment = plate[0]?.experiments[0] || {};
  const wellArrays = experiment.wells || [];

  const handleToggleDataShown = () => {
    setIsFiltered((prev) => !prev); // Toggle the filter state
    setShowFiltered((prev) => !prev); // Update context state as well
  };

  return (
    <div className="minigraph-and-controls__controls-container">
      <div className="minigraph-and-controls__show-raw-or-filtered">
        Show
        <div className="minigraph-and-controls__show-raw">
          <input
            type="radio"
            id="show-raw"
            className="minigraph-and-controls__raw-radio"
            value="showRaw"
            name="radio-group-1"
            checked={!isFiltered}
            onChange={() => handleToggleDataShown()}
          />
          <label htmlFor="show-raw">Raw</label>
        </div>
        <div className="minigraph-and-controls__show-filtered">
          <input
            type="radio"
            id="show-filtered"
            className="minigraph-and-controls__filtered-radio"
            value="showFiltered"
            name="radio-group-1"
            checked={isFiltered}
            onChange={() => handleToggleDataShown()}
          />
          <label htmlFor="show-filtered">Filtered</label>
        </div>
      </div>
      <div className="minigraph-and-controls__visibility">
        Visibility
        <div className="minigraph-and-controls__visibility-selector1">
          <input
            type="checkbox"
            id="visibility-selector"
            className="minigraph-and-controls__visibility-selector"
            value="visibility-selector1"
          />
          <label htmlFor="visibility-selector">Green</label>
        </div>
      </div>
    </div>
  );
};
