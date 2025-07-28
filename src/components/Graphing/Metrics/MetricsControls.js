import React, { useContext, useState, useEffect } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DataContext } from "../../../providers/DataProvider";
import {
  Typography,
  IconButton,
  FormControl,
  ListItem,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Slider from "@mui/material/Slider";
import "./MetricsControls.css";

export const MetricsControls = ({
  setMetricType,
  metricIndicator,
  setMetricIndicator,
  setAnnotationRangeStart,
  setAnnotationRangeEnd,
}) => {
  const {
    savedMetrics,
    setSavedMetrics,
    extractedIndicators,
    annotations,
    setAnnotations,
    extractedIndicatorTimes,
  } = useContext(DataContext);
  const [selectedMetricType, setSelectedMetricType] = useState("Max");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeMetricId, setActiveMetricId] = useState(null); // Track active metric
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeMetricAnnotations, setActiveMetricAnnotations] = useState(null);
  const [spinBoxValue, setSpinBoxValue] = useState(0); // Spin box state
  const [spinBoxStart, setSpinBoxStart] = useState(0); // Start value
  const [spinBoxEnd, setSpinBoxEnd] = useState(0); // End value

  // Local state for manual input
  const [rangeStartInput, setRangeStartInput] = useState("");
  const [rangeEndInput, setRangeEndInput] = useState("");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetricType(newMetric);
    setMetricType(newMetric);
    setActiveMetricId(null); // Un-highlight metric when the type changes
  };

  const handleSaveMetric = () => {
    const newMetric = {
      id: savedMetrics.length + 1,
      metricType: selectedMetricType,
      range: annotations[0]
        ? [annotations[0].xMin, annotations[0].xMax]
        : [null, null],
    };
    setSavedMetrics((prevMetrics) => [...prevMetrics, newMetric]);
  };

  const handleDeleteMetric = (id) => {
    setSavedMetrics((prevMetrics) =>
      prevMetrics.filter((metric) => metric.id !== id)
    );
    // Reset active metric if deleted
    if (id === activeMetricId) setActiveMetricId(null);
  };

  const handleSelectMetric = (metric) => {
    setSelectedMetricType(metric.metricType);
    setMetricType(metric.metricType);
    setAnnotationRangeStart(metric.range[0]);
    setAnnotationRangeEnd(metric.range[1]);
    setAnnotations(() => {
      const updatedAnnotation = {
        type: "box",
        xMax: metric.range ? metric.range[1] : "Min",
        xMin: metric.range ? metric.range[0] : "Max",
        yMin: "Min", // chartjs attempts to dynamically calculate Min and Max
        yMax: "Max",
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      };
      setActiveMetricAnnotations([updatedAnnotation]); // Store annotations associated with the active metric
      return [updatedAnnotation]; // Replace with updated annotation
    });
    setActiveMetricId(metric.id); // Set the clicked metric as active
    setIsDropdownOpen(false); // Close dropdown after selection
  };

  const handleResetAnnotations = async () => {
    await setIsAnimating(true);
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
    setActiveMetricId(null); // Un-highlight metric when annotations are reset
  };

  const handleIndicatorChange = (e) => {
    const newIndicator = e.target.value;
    setMetricIndicator(newIndicator);
  };

  useEffect(() => {
    // If activeMetricAnnotations is set and the annotations change
    if (activeMetricAnnotations && annotations.length > 0) {
      const annotationsEqual =
        JSON.stringify(annotations) === JSON.stringify(activeMetricAnnotations);
      // If annotations differ from active metric annotations, un-highlight the active metric
      if (!annotationsEqual) {
        setActiveMetricId(null); // Un-highlight the active metric
      }
    }
  }, [annotations, activeMetricAnnotations]); // Trigger when annotations change

  // Helper to get the correct indicator times array
  const getCurrentIndicatorTimes = () => {
    if (Array.isArray(extractedIndicatorTimes)) {
      return extractedIndicatorTimes;
    } else if (
      extractedIndicatorTimes &&
      typeof extractedIndicatorTimes === "object" &&
      metricIndicator !== undefined &&
      extractedIndicators &&
      extractedIndicators[metricIndicator]
    ) {
      const indicatorName = extractedIndicators[metricIndicator].indicatorName;
      if (indicatorName && extractedIndicatorTimes[indicatorName]) {
        return extractedIndicatorTimes[indicatorName];
      }
    }
    return [];
  };

  const currentIndicatorTimes = getCurrentIndicatorTimes();
  const sliderMin = currentIndicatorTimes[0] ?? 0;
  const sliderMax =
    currentIndicatorTimes[currentIndicatorTimes.length - 1] ?? 100;

  // Sync spin boxes with annotation state, showing time values instead of index
  useEffect(() => {
    if (
      annotations &&
      annotations[0] &&
      Array.isArray(currentIndicatorTimes) &&
      currentIndicatorTimes.length > 0
    ) {
      // If xMin/xMax are valid indices, map to time value
      if (typeof annotations[0].xMin === "number") {
        const idx = annotations[0].xMin;
        setSpinBoxStart(currentIndicatorTimes[idx] ?? 0);
      }
      if (typeof annotations[0].xMax === "number") {
        const idx = annotations[0].xMax;
        setSpinBoxEnd(currentIndicatorTimes[idx] ?? 0);
      }
    }
  }, [annotations, currentIndicatorTimes]);

  const sliderMarks = currentIndicatorTimes.map((time, index) => ({
    value: index,
    label: time.toFixed(2), // Show time value on the label
  }));

  // console.log("annt", annotations);
  // console.log(currentIndicatorTimes);
  // console.log(extractedIndicatorTimes);
  // console.log("slidermin/max", sliderMin, sliderMax);
  return (
    <div className="metrics__controls-container">
      <Button
        variant="contained"
        color="primary"
        className="save-metric-button"
        onClick={handleSaveMetric}
      >
        <BookmarkAddTwoToneIcon />
        <Typography>Save Metric</Typography>
      </Button>
      <div className="metrics__management">
        <FormControl component="fieldset" className="metrics__radio-container">
          <FormLabel component="legend">
            <Typography>Indicator</Typography>
          </FormLabel>
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
          <FormLabel component="legend">
            <Typography>Metric</Typography>
          </FormLabel>
          <RadioGroup
            className="metrics__radio-container"
            aria-label="metric-type"
            name="radio-group-metrics"
            value={selectedMetricType}
            onChange={handleMetricChange}
            row
          >
            <FormControlLabel value="Max" control={<Radio />} label="Max" />
            <FormControlLabel value="Min" control={<Radio />} label="Min" />
            <FormControlLabel value="Slope" control={<Radio />} label="Slope" />
            <FormControlLabel
              value="Range"
              control={<Radio />}
              label="Max-Min"
            />
          </RadioGroup>
        </FormControl>
      </div>

      <section className="saved-metrics-list-container">
        <FormLabel>
          <Typography
            htmlFor="saved-metrics"
            sx={{ fontSize: "0.75em", fontWeight: "bold" }}
          >
            Saved Metrics:
          </Typography>
        </FormLabel>
        <div className="saved-metrics-list">
          {savedMetrics.length > 0 ? (
            savedMetrics.map((metric) => (
              <ListItem
                className={`saved-metric ${
                  metric.id === activeMetricId ? "active-metric" : ""
                }`}
                key={metric.id}
                onClick={() => handleSelectMetric(metric)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                  cursor: "pointer",
                  borderBottom: "none",
                  backgroundImage:
                    "linear-gradient(rgb(0,32,96, 0.05) 0%,rgb(48, 79.5, 143, 0.15) 50%, rgb(96, 127, 190, 0.25) 70%)",
                  boxShadow:
                    "0px -1px 2px 2px inset rgba(80, 80, 80, 0.25), 0px -1px 4px 4px inset rgb(100, 100, 100, 0.15), 0px -1px 8px 5px inset rgba(100, 100, 100, 0.07)",
                  borderTopLeftRadius: "0.25em",
                  borderTopRightRadius: "0.25em",
                }}
              >
                <Typography style={{ fontSize: "1em", paddingLeft: "0.5em" }}>
                  {metric.metricType === "Range"
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
                  <DeleteForeverTwoToneIcon
                    sx={{
                      fontSize: "1em",
                      color: "rgb(255,0,0, 0.7)",
                      paddingRight: "0.5em",
                    }}
                  />
                </IconButton>
              </ListItem>
            ))
          ) : (
            <Typography
              style={{
                display: "flex",
                padding: 0,
                color: "#888",
                textAlign: "center",
                fontSize: "0.7em",
              }}
            >
              No Saved Metrics
            </Typography>
          )}
        </div>
      </section>

      {/* Spin box for annotation start */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <TextField
          className="metrics-controls__spinbox"
          label="Start"
          type="number"
          variant="outlined"
          size="small"
          value={rangeStartInput}
          onChange={(e) => setRangeStartInput(e.target.value)}
          onBlur={() => {
            const val = Number(rangeStartInput);
            if (
              Array.isArray(currentIndicatorTimes) &&
              currentIndicatorTimes.length > 0 &&
              !isNaN(val)
            ) {
              let newIdx = currentIndicatorTimes.findIndex((t) => t === val);
              if (newIdx === -1) {
                // Snap to closest
                let closestIdx = 0;
                let minDiff = Math.abs(currentIndicatorTimes[0] - val);
                for (let i = 1; i < currentIndicatorTimes.length; i++) {
                  const diff = Math.abs(currentIndicatorTimes[i] - val);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                  }
                }
                newIdx = closestIdx;
              }
              setAnnotationRangeStart(newIdx);
              setAnnotations((prev) => {
                const ann = prev && prev[0] ? { ...prev[0] } : { type: "box" };
                ann.xMin = newIdx;
                ann.xMax = typeof ann.xMax === "number" ? ann.xMax : newIdx;
                ann.yMin = ann.yMin ?? "Min";
                ann.yMax = ann.yMax ?? "Max";
                ann.backgroundColor =
                  ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                ann.borderWidth = ann.borderWidth ?? 2;
                return [ann];
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = Number(rangeStartInput);
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                !isNaN(val)
              ) {
                let newIdx = currentIndicatorTimes.findIndex((t) => t === val);
                if (newIdx === -1) {
                  // Snap to closest
                  let closestIdx = 0;
                  let minDiff = Math.abs(currentIndicatorTimes[0] - val);
                  for (let i = 1; i < currentIndicatorTimes.length; i++) {
                    const diff = Math.abs(currentIndicatorTimes[i] - val);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestIdx = i;
                    }
                  }
                  newIdx = closestIdx;
                }
                setAnnotationRangeStart(newIdx);
                setAnnotations((prev) => {
                  const ann =
                    prev && prev[0] ? { ...prev[0] } : { type: "box" };
                  ann.xMin = newIdx;
                  ann.xMax = typeof ann.xMax === "number" ? ann.xMax : newIdx;
                  ann.yMin = ann.yMin ?? "Min";
                  ann.yMax = ann.yMax ?? "Max";
                  ann.backgroundColor =
                    ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                  ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                  ann.borderWidth = ann.borderWidth ?? 2;
                  return [ann];
                });
              }
            }
          }}
          InputProps={{
            sx: {
              "& input": {
                // paddingLeft: 1,
                // paddingTop: 0.5,
                // paddingBottom: 0.2,
                padding: 0,
                display: "flex",
                justifyContent: "center",
              },
            },
            min: sliderMin,
            max: sliderMax,
            step: 0.001,
          }}
          style={{ fontSize: "0.55em" }}
        />
        {/* Custom step-by-10 arrows */}
        <div
          style={{ display: "flex", flexDirection: "column", width: "auto" }}
        >
          <IconButton
            size="small"
            aria-label="Step up by 10"
            onClick={() => {
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                annotations &&
                annotations[0] &&
                typeof annotations[0].xMin === "number"
              ) {
                let idx = annotations[0].xMin;
                let newIdx = Math.min(
                  idx + 10,
                  currentIndicatorTimes.length - 1
                );
                if (newIdx !== idx) {
                  setAnnotationRangeStart(newIdx);
                  setAnnotations((prev) => {
                    const ann =
                      prev && prev[0] ? { ...prev[0] } : { type: "box" };
                    ann.xMin = newIdx;
                    ann.xMax = typeof ann.xMax === "number" ? ann.xMax : newIdx;
                    ann.yMin = ann.yMin ?? "Min";
                    ann.yMax = ann.yMax ?? "Max";
                    ann.backgroundColor =
                      ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                    ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                    ann.borderWidth = ann.borderWidth ?? 2;
                    return [ann];
                  });
                }
              }
            }}
            style={{ padding: 2 }}
          >
            {/* <KeyboardArrowUpIcon fontSize="small" /> */}
            <KeyboardArrowUpIcon sx={{ fontSize: "0.8em" }} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Step down by 10"
            onClick={() => {
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                annotations &&
                annotations[0] &&
                typeof annotations[0].xMin === "number"
              ) {
                let idx = annotations[0].xMin;
                let newIdx = Math.max(idx - 10, 0);
                if (newIdx !== idx) {
                  setAnnotationRangeStart(newIdx);
                  setAnnotations((prev) => {
                    const ann =
                      prev && prev[0] ? { ...prev[0] } : { type: "box" };
                    ann.xMin = newIdx;
                    ann.xMax = typeof ann.xMax === "number" ? ann.xMax : newIdx;
                    ann.yMin = ann.yMin ?? "Min";
                    ann.yMax = ann.yMax ?? "Max";
                    ann.backgroundColor =
                      ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                    ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                    ann.borderWidth = ann.borderWidth ?? 2;
                    return [ann];
                  });
                }
              }
            }}
            style={{ padding: 2 }}
          >
            {/* <KeyboardArrowDownIcon fontSize="small" /> */}
            <KeyboardArrowDownIcon sx={{ fontSize: "0.8em" }} />
          </IconButton>
        </div>
      </div>
      {/* Spin box for annotation end */}
      <div style={{ display: "flex", alignItems: "center", width: "auto" }}>
        <TextField
          className="metrics-controls__spinbox"
          label="End"
          type="number"
          variant="outlined"
          size="small"
          value={rangeEndInput}
          onChange={(e) => setRangeEndInput(e.target.value)}
          onBlur={() => {
            const val = Number(rangeEndInput);
            if (
              Array.isArray(currentIndicatorTimes) &&
              currentIndicatorTimes.length > 0 &&
              !isNaN(val)
            ) {
              let newIdx = currentIndicatorTimes.findIndex((t) => t === val);
              if (newIdx === -1) {
                // Snap to closest
                let closestIdx = 0;
                let minDiff = Math.abs(currentIndicatorTimes[0] - val);
                for (let i = 1; i < currentIndicatorTimes.length; i++) {
                  const diff = Math.abs(currentIndicatorTimes[i] - val);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = i;
                  }
                }
                newIdx = closestIdx;
              }
              setAnnotationRangeEnd(newIdx);
              setAnnotations((prev) => {
                const ann = prev && prev[0] ? { ...prev[0] } : { type: "box" };
                ann.xMax = newIdx;
                ann.xMin = typeof ann.xMin === "number" ? ann.xMin : newIdx;
                ann.yMin = ann.yMin ?? "Min";
                ann.yMax = ann.yMax ?? "Max";
                ann.backgroundColor =
                  ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                ann.borderWidth = ann.borderWidth ?? 2;
                return [ann];
              });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = Number(rangeEndInput);
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                !isNaN(val)
              ) {
                let newIdx = currentIndicatorTimes.findIndex((t) => t === val);
                if (newIdx === -1) {
                  // Snap to closest
                  let closestIdx = 0;
                  let minDiff = Math.abs(currentIndicatorTimes[0] - val);
                  for (let i = 1; i < currentIndicatorTimes.length; i++) {
                    const diff = Math.abs(currentIndicatorTimes[i] - val);
                    if (diff < minDiff) {
                      minDiff = diff;
                      closestIdx = i;
                    }
                  }
                  newIdx = closestIdx;
                }
                setAnnotationRangeEnd(newIdx);
                setAnnotations((prev) => {
                  const ann =
                    prev && prev[0] ? { ...prev[0] } : { type: "box" };
                  ann.xMax = newIdx;
                  ann.xMin = typeof ann.xMin === "number" ? ann.xMin : newIdx;
                  ann.yMin = ann.yMin ?? "Min";
                  ann.yMax = ann.yMax ?? "Max";
                  ann.backgroundColor =
                    ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                  ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                  ann.borderWidth = ann.borderWidth ?? 2;
                  return [ann];
                });
              }
            }
          }}
          InputProps={{
            sx: {
              "& input": {
                // paddingLeft: 1,
                // paddingTop: 0.5,
                // paddingBottom: 0.2,
                padding: 0,
              },
            },
            min: sliderMin,
            max: sliderMax,
            step: 0.001,
          }}
          // style={{ width: 120, padding: 0 }}
          style={{ padding: 0, fontSize: "0.5em" }}
        />
        {/* Custom step-by-10 arrows */}
        <div
          style={{ display: "flex", flexDirection: "column", width: "auto" }}
        >
          <IconButton
            size="small"
            aria-label="Step up by 10"
            onClick={() => {
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                annotations &&
                annotations[0] &&
                typeof annotations[0].xMax === "number"
              ) {
                let idx = annotations[0].xMax;
                let newIdx = Math.min(
                  idx + 10,
                  currentIndicatorTimes.length - 1
                );
                if (newIdx !== idx) {
                  setAnnotationRangeEnd(newIdx);
                  setAnnotations((prev) => {
                    const ann =
                      prev && prev[0] ? { ...prev[0] } : { type: "box" };
                    ann.xMax = newIdx;
                    ann.xMin = typeof ann.xMin === "number" ? ann.xMin : newIdx;
                    ann.yMin = ann.yMin ?? "Min";
                    ann.yMax = ann.yMax ?? "Max";
                    ann.backgroundColor =
                      ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                    ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                    ann.borderWidth = ann.borderWidth ?? 2;
                    return [ann];
                  });
                }
              }
            }}
            style={{ padding: 2 }}
          >
            {/* <KeyboardArrowUpIcon fontSize="small" /> */}
            <KeyboardArrowUpIcon sx={{ fontSize: "0.8em" }} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Step down by 10"
            onClick={() => {
              if (
                Array.isArray(currentIndicatorTimes) &&
                currentIndicatorTimes.length > 0 &&
                annotations &&
                annotations[0] &&
                typeof annotations[0].xMax === "number"
              ) {
                let idx = annotations[0].xMax;
                let newIdx = Math.max(idx - 10, 0);
                if (newIdx !== idx) {
                  setAnnotationRangeEnd(newIdx);
                  setAnnotations((prev) => {
                    const ann =
                      prev && prev[0] ? { ...prev[0] } : { type: "box" };
                    ann.xMax = newIdx;
                    ann.xMin = typeof ann.xMin === "number" ? ann.xMin : newIdx;
                    ann.yMin = ann.yMin ?? "Min";
                    ann.yMax = ann.yMax ?? "Max";
                    ann.backgroundColor =
                      ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)";
                    ann.borderColor = ann.borderColor ?? "rgba(0, 255, 0, 1)";
                    ann.borderWidth = ann.borderWidth ?? 2;
                    return [ann];
                  });
                }
              }
            }}
            style={{ padding: 2 }}
          >
            {/* <KeyboardArrowDownIcon fontSize="small" /> */}
            <KeyboardArrowDownIcon sx={{ fontSize: "0.8em" }} />
          </IconButton>
        </div>
      </div>

      <Button
        className={`metrics-controls__reset-annotations ${
          isAnimating ? "animate-line" : ""
        }`}
        variant="outlined"
        color="primary"
        onClick={handleResetAnnotations}
        onAnimationEnd={() => setIsAnimating(false)}
        disableRipple
      >
        <DisabledByDefaultTwoToneIcon />
        <Typography variant="h1">Clear Range</Typography>
      </Button>
    </div>
  );
};

export default MetricsControls;
