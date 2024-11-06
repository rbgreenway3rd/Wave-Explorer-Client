// import React, { useContext, useState } from "react";
// import { DataContext } from "../../../providers/DataProvider";
// import "./MetricsControls.css";

// export const MetricsControls = ({
//   setMetricType,
//   annotations,
//   setAnnotations,
//   annotationRangeStart,
//   annotationRangeEnd,
//   setAnnotationRangeStart,
//   setAnnotationRangeEnd,
// }) => {
//   const { savedMetrics, setSavedMetrics } = useContext(DataContext);
//   const [selectedMetric, setSelectedMetric] = useState("maxYValue");

//   const handleMetricChange = (e) => {
//     const newMetric = e.target.value;
//     setSelectedMetric(newMetric);
//     setMetricType(newMetric);
//   };

//   const handleSaveMetric = () => {
//     const newMetric = {
//       metricType: selectedMetric,
//       range:
//         annotationRangeStart > annotationRangeEnd
//           ? [annotationRangeEnd, annotationRangeStart]
//           : [annotationRangeStart, annotationRangeEnd],
//     };
//     setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
//   };

//   const handleResetAnnotations = () => {
//     // Reset the annotationRangeStart and annotationRangeEnd
//     setAnnotationRangeStart(null);
//     setAnnotationRangeEnd(null);
//     setAnnotations([]);
//   };

//   return (
//     <div className="metrics__controls-container">
//       <div className="metrics__radio-container">
//         Metric Type:
//         <div className="radio__show-max">
//           <input
//             type="radio"
//             id="show-max"
//             className="radio__show-max-radio"
//             value="maxYValue"
//             name="radio-group-metrics"
//             checked={selectedMetric === "maxYValue"}
//             onChange={handleMetricChange}
//           />
//           <label htmlFor="show-max">Max</label>
//         </div>
//         <div className="radio__show-min">
//           <input
//             type="radio"
//             id="show-min"
//             className="radio__show-min-radio"
//             value="minYValue"
//             name="radio-group-metrics"
//             checked={selectedMetric === "minYValue"}
//             onChange={handleMetricChange}
//           />
//           <label htmlFor="show-min">Min</label>
//         </div>
//         <div className="radio__show-slope">
//           <input
//             type="radio"
//             id="show-slope"
//             className="radio__show-slope-radio"
//             value="slope"
//             name="radio-group-metrics"
//             checked={selectedMetric === "slope"}
//             onChange={handleMetricChange}
//           />
//           <label htmlFor="show-slope">Slope</label>
//         </div>
//         <div className="radio__show-range">
//           <input
//             type="radio"
//             id="show-range"
//             className="radio__show-range-radio"
//             value="rangeOfYValues"
//             name="radio-group-metrics"
//             checked={selectedMetric === "rangeOfYValues"}
//             onChange={handleMetricChange}
//           />
//           <label htmlFor="show-range">Range</label>
//         </div>
//       </div>
//       <button className="save-metric" onClick={handleSaveMetric}>
//         Save Metric
//       </button>
//       <button onClick={() => console.log(savedMetrics)}>
//         log saved metrics
//       </button>
//       <button
//         className="metrics-controls__reset-annotations"
//         variant="contained"
//         color="secondary"
//         onClick={handleResetAnnotations}
//       >
//         Reset Annotation
//       </button>
//     </div>
//   );
// };

// export default MetricsControls;

// MATERIAL UI THEME USAGE
import React, { useContext, useState } from "react";
import { DataContext } from "../../../providers/DataProvider";
import {
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from "@mui/material";
import "./MetricsControls.css"; // Keep for custom styling, if needed

export const MetricsControls = ({
  setMetricType,
  annotations,
  setAnnotations,
  annotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
}) => {
  const { savedMetrics, setSavedMetrics } = useContext(DataContext);
  const [selectedMetric, setSelectedMetric] = useState("maxYValue");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetric(newMetric);
    setMetricType(newMetric);
  };

  const handleSaveMetric = () => {
    const newMetric = {
      metricType: selectedMetric,
      range:
        annotationRangeStart > annotationRangeEnd
          ? [annotationRangeEnd, annotationRangeStart]
          : [annotationRangeStart, annotationRangeEnd],
    };
    setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
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
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">Metric Type</FormLabel>
          <RadioGroup
            aria-label="metric-type"
            name="radio-group-metrics"
            value={selectedMetric}
            onChange={handleMetricChange}
            row
          >
            <FormControlLabel
              value="maxYValue"
              control={<Radio />}
              label="Max"
            />
            <FormControlLabel
              value="minYValue"
              control={<Radio />}
              label="Min"
            />
            <FormControlLabel value="slope" control={<Radio />} label="Slope" />
            <FormControlLabel
              value="rangeOfYValues"
              control={<Radio />}
              label="Range"
            />
          </RadioGroup>
        </FormControl>
      </div>

      <Button
        variant="contained"
        color="primary"
        className="save-metric"
        onClick={handleSaveMetric}
      >
        Save Metric
      </Button>

      {/* <Button
        variant="outlined"
        color="default"
        onClick={() => console.log(savedMetrics)}
      >
        Log saved metrics
      </Button> */}

      <Button
        className="metrics-controls__reset-annotations"
        variant="contained"
        color="secondary"
        onClick={handleResetAnnotations}
      >
        Reset Annotation
      </Button>
    </div>
  );
};

export default MetricsControls;
