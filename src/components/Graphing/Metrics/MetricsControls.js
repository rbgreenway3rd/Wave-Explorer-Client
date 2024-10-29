import React, { useState } from "react";
import "./MetricsControls.css";

export const MetricsControls = ({ setMetricType }) => {
  const [selectedMetric, setSelectedMetric] = useState("maxYValue");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetric(newMetric);
    setMetricType(newMetric); // Prop to notify Heatmap of the change
  };

  return (
    <div className="metrics__controls-container">
      <div className="metrics__radio-container">
        Show
        <div className="radio__show-max">
          <input
            type="radio"
            id="show-max"
            className="radio__show-max-radio"
            value="maxYValue"
            name="radio-group-metrics"
            checked={selectedMetric === "maxYValue"}
            onChange={handleMetricChange}
          />
          <label htmlFor="show-max">Max</label>
        </div>
        <div className="radio__show-min">
          <input
            type="radio"
            id="show-min"
            className="radio__show-min-radio"
            value="minYValue"
            name="radio-group-metrics"
            checked={selectedMetric === "minYValue"}
            onChange={handleMetricChange}
          />
          <label htmlFor="show-min">Min</label>
        </div>
        <div className="radio__show-slope">
          <input
            type="radio"
            id="show-slope"
            className="radio__show-slope-radio"
            value="slope"
            name="radio-group-metrics"
            checked={selectedMetric === "slope"}
            onChange={handleMetricChange}
          />
          <label htmlFor="show-slope">Slope</label>
        </div>
        <div className="radio__show-range">
          <input
            type="radio"
            id="show-range"
            className="radio__show-range-radio"
            value="rangeOfYValues"
            name="radio-group-metrics"
            checked={selectedMetric === "rangeOfYValues"}
            onChange={handleMetricChange}
          />
          <label htmlFor="show-range">Range</label>
        </div>
      </div>
    </div>
  );
};

export default MetricsControls;
