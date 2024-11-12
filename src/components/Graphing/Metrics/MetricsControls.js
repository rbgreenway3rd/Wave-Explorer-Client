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
// import React, { useContext, useState } from "react";
// import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
// import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
// import { DataContext } from "../../../providers/DataProvider";
// import {
//   Button,
//   Radio,
//   RadioGroup,
//   FormControlLabel,
//   FormControl,
//   FormLabel,
//   ListItem,
//   Typography,
//   InputLabel,
//   Select,
//   MenuItem,
//   IconButton,
// } from "@mui/material";
// import "./MetricsControls.css"; // Keep for custom styling, if needed
// import { DeleteOutline } from "@mui/icons-material";

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
//       id: savedMetrics.length + 1,
//       metricType: selectedMetric,
//       range:
//         annotationRangeStart > annotationRangeEnd
//           ? [annotationRangeEnd, annotationRangeStart]
//           : [annotationRangeStart, annotationRangeEnd],
//     };
//     setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
//   };

//   const handleDeleteMetric = (id) => {
//     setSavedMetrics((prevMetrics) =>
//       prevMetrics.filter((metric) => metric.id !== id)
//     );
//   };

//   const handleResetAnnotations = () => {
//     // Reset the annotationRangeStart and annotationRangeEnd
//     setAnnotationRangeStart(null);
//     setAnnotationRangeEnd(null);
//     setAnnotations([]);
//   };

//   return (
//     <div className="metrics__controls-container">
//       <div className="metrics__management">
//         <FormControl component="fieldset" className="metrics__radio-container">
//           <FormLabel component="legend">Metric Type</FormLabel>
//           <RadioGroup
//             className="metrics__radio-container"
//             aria-label="metric-type"
//             name="radio-group-metrics"
//             value={selectedMetric}
//             onChange={handleMetricChange}
//             row
//           >
//             <FormControlLabel
//               value="maxYValue"
//               control={<Radio />}
//               label="Max"
//             />
//             <FormControlLabel
//               value="minYValue"
//               control={<Radio />}
//               label="Min"
//             />
//             <FormControlLabel value="slope" control={<Radio />} label="Slope" />
//             <FormControlLabel
//               value="rangeOfYValues"
//               control={<Radio />}
//               label="Range"
//             />
//           </RadioGroup>
//         </FormControl>
//         <Button
//           variant="contained"
//           color="primary"
//           className="save-metric"
//           onClick={handleSaveMetric}
//         >
//           <BookmarkAddTwoToneIcon />
//           Save Metric
//         </Button>
//       </div>
//       <div className="saved-metrics-list">
//         <FormControl fullWidth>
//           <InputLabel id="demo-simple-select-label">Saved Metrics</InputLabel>
//           <Select
//             labelId="demo-simple-select-label"
//             id="demo-simple-select"
//             // value={metric.metricType}
//             // label="Age"
//             // onChange={handleChange}
//             >
//             {savedMetrics.length > 0 ? (
//               savedMetrics.map((metric) => (
//                 <MenuItem key={metric.id} className="saved-metric">
//                   <Typography>{metric.metricType}</Typography>
//                   <IconButton
//                     size="small"
//                     onClick={() => handleDeleteMetric(metric.id)}
//                   >
//                     <DeleteOutline fontSize="small" />
//                   </IconButton>
//                 </MenuItem>
//               ))
//             ) : (
//               <Typography className="no-saved-metrics">
//                 No Saved Metrics
//               </Typography>
//             )}
//           </Select>
//         </FormControl>
//       </div>

//       {/* <Button
//         variant="outlined"
//         color="default"
//         onClick={() => console.log(savedMetrics)}
//       >
//         Log saved metrics
//       </Button> */}

//       <Button
//         className="metrics-controls__reset-annotations"
//         variant="contained"
//         color="secondary"
//         onClick={handleResetAnnotations}
//       >
//         <DisabledByDefaultTwoToneIcon />
//         Clear Annotation
//       </Button>
//     </div>
//   );
// };

// export default MetricsControls;

import React, { useContext, useState } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataContext } from "../../../providers/DataProvider";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  FormControl,
  FormHelperText,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./MetricsControls.css";

export const MetricsControls = ({
  setMetricType,
  metricIndicator,
  setMetricIndicator,
  annotations,
  setAnnotations,
  annotationRangeStart,
  annotationRangeEnd,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
}) => {
  const { savedMetrics, setSavedMetrics, extractedIndicators } =
    useContext(DataContext);
  const [selectedMetricType, setSelectedMetricType] = useState("maxYValue");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetricType(newMetric);
    setMetricType(newMetric);
  };

  const handleSaveMetric = () => {
    const newMetric = {
      id: savedMetrics.length + 1,
      metricType: selectedMetricType,
      range:
        annotationRangeStart > annotationRangeEnd
          ? [annotationRangeEnd, annotationRangeStart]
          : [annotationRangeStart, annotationRangeEnd],
    };
    setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
  };

  const handleDeleteMetric = (id) => {
    setSavedMetrics((prevMetrics) =>
      prevMetrics.filter((metric) => metric.id !== id)
    );
  };

  const handleSelectMetric = (metric) => {
    setSelectedMetricType(metric.metricType);
    setMetricType(metric.metricType);
    setAnnotationRangeStart(metric.range[0]);
    setAnnotationRangeEnd(metric.range[1]);
    setAnnotations((prevAnnotations) => {
      const updatedAnnotation = {
        ...prevAnnotations[0], // Keep existing properties
        xMax: metric.range[1],
        xMin: metric.range[0],
      };
      return [updatedAnnotation]; // Replace with updated annotation
    });
  };

  const handleResetAnnotations = () => {
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
  };

  const handleIndicatorChange = (e) => {
    const newIndicator = e.target.value;
    setMetricIndicator(newIndicator);
  };

  return (
    <div className="metrics__controls-container">
      <div className="metrics__management">
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">Indicator</FormLabel>
          <RadioGroup
            className="metrics__radio-container"
            aria-label="indicator-type"
            name="radio-group-indicator"
            value={metricIndicator}
            onChange={handleIndicatorChange}
            row
          >
            {extractedIndicators.map((indicator) => (
              <FormControlLabel
                value={indicator.id}
                control={<Radio />}
                label={indicator.indicatorName}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">Metric Type</FormLabel>
          <RadioGroup
            className="metrics__radio-container"
            aria-label="metric-type"
            name="radio-group-metrics"
            value={selectedMetricType}
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
        <Button
          variant="contained"
          color="primary"
          className="save-metric-button"
          onClick={handleSaveMetric}
        >
          <BookmarkAddTwoToneIcon />
          Save Metric
        </Button>
        <section
          className="saved-metrics-list"
          style={{
            width: "95%",
            position: "relative",
            display: "flex",
            alignSelf: "center",
          }}
        >
          {/* Dropdown Label */}
          <Typography
            variant="body1"
            htmlFor="saved-metrics"
            style={{
              display: "block",
              textAlign: "center",
              position: "sticky",
              top: 0,
              background: "rgb(180,180,180)", // MidGrey
              borderBottom: "solid 0.1em white",
              zIndex: 100,
            }}
          >
            Saved Metrics
          </Typography>
          {savedMetrics.length > 0 ? (
            savedMetrics.map((metric) => (
              <ListItem
                key={metric.id}
                onClick={() => {
                  setSelectedMetricType(metric); // Update selected metric
                  handleSelectMetric(metric);
                  setIsDropdownOpen(false); // Close dropdown after selection
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                <Typography style={{ fontSize: "0.75em" }}>
                  {metric.metricType}
                </Typography>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent click from selecting the metric
                    handleDeleteMetric(metric.id);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))
          ) : (
            <Typography
              style={{ padding: "8px", color: "#888", textAlign: "center" }}
            >
              No Saved Metrics
            </Typography>
          )}
        </section>
      </div>
      <Button
        className="metrics-controls__reset-annotations"
        variant="outlined"
        color="primary"
        onClick={handleResetAnnotations}
      >
        <DisabledByDefaultTwoToneIcon />
        Clear Range
      </Button>
    </div>
  );
};

export default MetricsControls;
