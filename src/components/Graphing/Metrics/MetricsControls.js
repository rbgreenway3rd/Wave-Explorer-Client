import React, { useState } from "react";
import "./MetricsControls.css";

export const MetricsControls = ({
  setMetricType,
  annotations,
  setAnnotations,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
}) => {
  const [selectedMetric, setSelectedMetric] = useState("maxYValue");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetric(newMetric);
    setMetricType(newMetric);
  };

  const handleResetAnnotations = () => {
    // Reset the annotationRangeStart and annotationRangeEnd
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
  };

  return (
    <div className="metrics__controls-container">
      <div className="metrics__radio-container">
        Metric Type:
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
      <button
        className="metrics-controls__reset-annotations"
        variant="contained"
        color="secondary"
        onClick={handleResetAnnotations}
      >
        Reset Annotation
      </button>
    </div>
  );
};

export default MetricsControls;
