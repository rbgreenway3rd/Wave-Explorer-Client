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
          <li className="filter-list-item">
            <input
              className="filter-list-item-checkbox"
              type="checkbox"
              name="filter"
              id="filter1"
            />
            <label className="filter-list-item-label" for="filter1">
              filter 1
            </label>

            <button className="filter-list-item-settings-button">.</button>
          </li>
          <li className="filter-list-item">
            <input
              className="filter-list-item-checkbox"
              type="checkbox"
              name="filter"
              id="filter2"
            />
            <label className="filter-list-item-label" for="filter2">
              filter 2
            </label>

            <button className="filter-list-item-settings-button">.</button>
          </li>
          <li className="filter-list-item">
            <input
              className="filter-list-item-checkbox"
              type="checkbox"
              name="filter"
              id="filter3"
            />
            <label className="filter-list-item-label" for="filter3">
              filter 3
            </label>

            <button className="filter-list-item-settings-button">.</button>
          </li>
        </ul>
      </div>
      <div className="filter-list-order">
        <button className="add-filter-button filter-list-order-edit-button">
          +
        </button>
        <button className="move-up-filter-button filter-list-order-edit-button">
          ^
        </button>
        <button className="move-down-filter-button filter-list-order-edit-button">
          v
        </button>
        <button className="remove-filter-button filter-list-order-edit-button">
          x
        </button>
      </div>
    </div>
  );
};
