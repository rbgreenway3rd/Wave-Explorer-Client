import React, { useContext, useEffect, useState, useRef } from "react";

export const MetricsControls = () => {
  return (
    <div className="metrics__controls-container">
      <div className="metrics__radio-container">
        Show
        <div className="radio__show-max">
          <input
            type="radio"
            id="show-max"
            className="radio__show-max-radio"
            value="showMax"
            name="radio-group-metrics"
            // defaultChecked={true}
          />
          <label htmlFor="show-raw">Max</label>
        </div>
      </div>
    </div>
  );
};
