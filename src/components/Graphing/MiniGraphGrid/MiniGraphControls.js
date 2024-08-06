import React from "react";

export const MiniGraphControls = (
  {
    //inherited data
  }
) => {
  return (
    <div className="minigraph-controls-container">
      <div className="show-raw-or-filtered">
        Show
        <input
          type="radio"
          id="show-raw"
          className="raw-radio"
          value="showRaw"
        />
        <label for="show-raw">Raw</label>
        <input
          type="radio"
          id="show-filtered"
          className="filtered-radio"
          value="showFiltered"
        />
        <label for="show-filtered">Raw</label>
      </div>
      <div className="visibility">
        Visibility
        <input
          type="checkbox"
          id="visibility-selector"
          className="visibility-selector"
          value="visibility-selector1"
        />
        <label for="visibility-selector">Green</label>
      </div>
    </div>
  );
};
