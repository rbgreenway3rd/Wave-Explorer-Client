import React from "react";
import "./Configuration/FilterControls.css";

export const FilterControls = (
  {
    //inherited data
  }
) => {
  return (
    <div className="filter-controls-container">
      <div className="filter-list-container">
        <div className="filter-save-status">unsaved</div>
        <ul className="selected-filter-list">
          <li>filter 1</li>
          <li>filter 2</li>
          <li>filter 3</li>
        </ul>
      </div>
      <div className="filter-list-order">
        <button className="add-filter-button">+</button>
        <button className="move-up-filter-button">^</button>
        <button className="move-down-filter-button">v</button>
        <button className="remove-filter-button">x</button>
      </div>
    </div>
  );
};
