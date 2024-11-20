import React, { useContext, useState } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteIcon from "@mui/icons-material/Delete";
import { DataContext } from "../../../providers/DataProvider";
import { keyframes } from "@mui/system";
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

  const [isAnimating, setIsAnimating] = useState(false);

  // const handleClick = async () => {
  //   await setIsAnimating(true);
  //   handleResetAnnotations();
  // };

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
        // annotationRangeStart > annotationRangeEnd
        //   ? [annotationRangeEnd, annotationRangeStart]
        //   : [annotationRangeStart, annotationRangeEnd],

        annotations[0]
          ? [annotations[0].xMin, annotations[0].xMax]
          : [null, null],
    };
    setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
    console.log("savedMetrics: ", savedMetrics);
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
    // setAnnotations((prevAnnotations) => {
    //   const updatedAnnotation = {
    //     ...prevAnnotations[0], // Keep existing properties
    //     xMax: metric.range[1],
    //     xMin: metric.range[0],
    //   };
    //   console.log(prevAnnotations);
    //   console.log(updatedAnnotation);
    //   return [updatedAnnotation]; // Replace with updated annotation
    // });

    setAnnotations(() => {
      const updatedAnnotation = {
        type: "box",
        xMax: metric.range ? metric.range[1] : "min",
        xMin: metric.range ? metric.range[0] : "max",
        yMin: "min", // chartjs attempts to dynamically calculate min and max
        yMax: "max",
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      };

      console.log(updatedAnnotation);
      return [updatedAnnotation]; // Replace with updated annotation
    });
  };

  const handleResetAnnotations = async () => {
    await setIsAnimating(true);
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
                key={indicator.id}
                value={indicator.id}
                control={<Radio />}
                label={indicator.indicatorName}
              />
            ))}
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">Metric</FormLabel>
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
              label="Max-Min"
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
        <section className="saved-metrics-list" style={{}}>
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
                  // setSelectedMetricType(metric); // Update selected metric
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
                  {metric.metricType === "rangeOfYValues"
                    ? "Max-Min"
                    : metric.metricType}
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
              style={{ padding: 0, color: "#888", textAlign: "center" }}
            >
              No Saved Metrics
            </Typography>
          )}
        </section>
      </div>
      <Button
        // className="metrics-controls__reset-annotations"
        className={`metrics-controls__reset-annotations ${
          isAnimating ? "animate-line" : ""
        }`}
        variant="outlined"
        color="primary"
        // onClick={handleResetAnnotations}
        // onClick={handleClick}
        onClick={handleResetAnnotations}
        onAnimationEnd={() => setIsAnimating(false)} // Reset animation state
        disableRipple
      >
        <DisabledByDefaultTwoToneIcon />
        Clear Range
      </Button>
    </div>
  );
};

export default MetricsControls;
