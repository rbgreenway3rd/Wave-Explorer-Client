import React, { useContext, useState, useEffect } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DataContext } from "../../../providers/DataProvider";
import {
  FormControl,
  ListItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import TextField from "@mui/material/TextField";
import { Button, IconButton, Text } from "../../ui";
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
  const [activeMetricId, setActiveMetricId] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeMetricAnnotations, setActiveMetricAnnotations] = useState(null);
  const [spinBoxStart, setSpinBoxStart] = useState(0);
  const [spinBoxEnd, setSpinBoxEnd] = useState(0);

  // Local state for manual input
  const [rangeStartInput, setRangeStartInput] = useState("");
  const [rangeEndInput, setRangeEndInput] = useState("");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetricType(newMetric);
    setMetricType(newMetric);
    setActiveMetricId(null);
  };

  const handleSaveMetric = () => {
    const newMetric = {
      id: savedMetrics.length + 1,
      metricType: selectedMetricType,
      range: annotations[0]
        ? [annotations[0].xMin, annotations[0].xMax]
        : [null, null],
    };
    setSavedMetrics((prev) => [...prev, newMetric]);
  };

  const handleDeleteMetric = (id) => {
    setSavedMetrics((prev) => prev.filter((metric) => metric.id !== id));
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
        yMin: "Min",
        yMax: "Max",
        backgroundColor: "rgba(0, 255, 0, 0.2)",
        borderColor: "rgba(0, 255, 0, 1)",
        borderWidth: 2,
      };
      setActiveMetricAnnotations([updatedAnnotation]);
      return [updatedAnnotation];
    });
    setActiveMetricId(metric.id);
  };

  const handleResetAnnotations = async () => {
    await setIsAnimating(true);
    setAnnotationRangeStart(null);
    setAnnotationRangeEnd(null);
    setAnnotations([]);
    setActiveMetricId(null);
  };

  const handleIndicatorChange = (e) => {
    const newIndicator = e.target.value;
    setMetricIndicator(newIndicator);
  };

  useEffect(() => {
    if (activeMetricAnnotations && annotations.length > 0) {
      const annotationsEqual =
        JSON.stringify(annotations) === JSON.stringify(activeMetricAnnotations);
      if (!annotationsEqual) {
        setActiveMetricId(null);
      }
    }
  }, [annotations, activeMetricAnnotations]);

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

  // ---- Helpers shared by Start/End spin-box handlers ------------------

  const snapToClosestIndex = (val) => {
    if (
      !Array.isArray(currentIndicatorTimes) ||
      currentIndicatorTimes.length === 0 ||
      isNaN(val)
    ) {
      return null;
    }
    let newIdx = currentIndicatorTimes.findIndex((t) => t === val);
    if (newIdx === -1) {
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
    return { idx: newIdx, value: currentIndicatorTimes[newIdx] };
  };

  const updateAnnotationField = (field, value) => {
    setAnnotations((prev) => {
      const ann = prev && prev[0] ? { ...prev[0] } : { type: "box" };
      const next = {
        ...ann,
        [field]: value,
        yMin: ann.yMin ?? "Min",
        yMax: ann.yMax ?? "Max",
        backgroundColor: ann.backgroundColor ?? "rgba(0, 255, 0, 0.2)",
        borderColor: ann.borderColor ?? "rgba(0, 255, 0, 1)",
        borderWidth: ann.borderWidth ?? 2,
      };
      // Mirror the missing endpoint when only one is set, matching the
      // pre-restyle behavior.
      if (field === "xMin" && typeof next.xMax !== "number") next.xMax = value;
      if (field === "xMax" && typeof next.xMin !== "number") next.xMin = value;
      return [next];
    });
  };

  const commitRangeStart = () => {
    const snap = snapToClosestIndex(Number(rangeStartInput));
    if (!snap) return;
    setAnnotationRangeStart(snap.value);
    updateAnnotationField("xMin", snap.value);
  };

  const commitRangeEnd = () => {
    const snap = snapToClosestIndex(Number(rangeEndInput));
    if (!snap) return;
    setAnnotationRangeEnd(snap.value);
    updateAnnotationField("xMax", snap.value);
  };

  const stepBy = (field, delta) => {
    if (
      !Array.isArray(currentIndicatorTimes) ||
      currentIndicatorTimes.length === 0 ||
      !annotations?.[0] ||
      typeof annotations[0][field] !== "number"
    ) {
      return;
    }
    const idx = annotations[0][field];
    const newIdx =
      delta > 0
        ? Math.min(idx + delta, currentIndicatorTimes.length - 1)
        : Math.max(idx + delta, 0);
    if (newIdx === idx) return;
    if (field === "xMin") setAnnotationRangeStart(newIdx);
    else setAnnotationRangeEnd(newIdx);
    updateAnnotationField(field, newIdx);
  };

  const renderSpinbox = ({ label, value, onChange, onCommit, field }) => (
    <div className="metrics-controls__spinbox-row">
      <TextField
        className="metrics-controls__spinbox"
        label={label}
        type="number"
        variant="outlined"
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
        }}
        InputProps={{
          inputProps: {
            min: sliderMin,
            max: sliderMax,
            step: 0.001,
          },
        }}
      />
      <div className="metrics-controls__spinbox-arrows">
        <IconButton
          variant="subtle"
          size="sm"
          aria-label={`Step ${label} up by 10`}
          onClick={() => stepBy(field, 10)}
        >
          <KeyboardArrowUpIcon fontSize="inherit" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="sm"
          aria-label={`Step ${label} down by 10`}
          onClick={() => stepBy(field, -10)}
        >
          <KeyboardArrowDownIcon fontSize="inherit" />
        </IconButton>
      </div>
    </div>
  );

  return (
    <div className="metrics__controls-container quadrant-controls ui-surface ui-surface--panel ui-clean-forms">
      <Button
        className="save-metric-button"
        variant="primary"
        block
        startIcon={<BookmarkAddTwoToneIcon />}
        onClick={handleSaveMetric}
      >
        Save Metric
      </Button>

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
            <FormControlLabel value="Max" control={<Radio />} label="Max" />
            <FormControlLabel value="Min" control={<Radio />} label="Min" />
            <FormControlLabel value="Slope" control={<Radio />} label="Slope" />
            <FormControlLabel value="Range" control={<Radio />} label="Max-Min" />
          </RadioGroup>
        </FormControl>
      </div>

      <section className="saved-metrics-list-container">
        <FormLabel className="saved-metrics-list__heading">Saved Metrics:</FormLabel>
        <div className="saved-metrics-list">
          {savedMetrics.length > 0 ? (
            savedMetrics.map((metric) => (
              <ListItem
                className={`saved-metric ${
                  metric.id === activeMetricId ? "saved-metric--active" : ""
                }`}
                key={metric.id}
                onClick={() => handleSelectMetric(metric)}
              >
                <Text size="sm" className="saved-metric__label">
                  {metric.metricType === "Range" ? "Max-Min" : metric.metricType}
                </Text>
                <IconButton
                  variant="subtle"
                  size="sm"
                  className="saved-metric__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMetric(metric.id);
                  }}
                  aria-label={`delete metric ${metric.metricType}`}
                >
                  <DeleteForeverTwoToneIcon fontSize="inherit" />
                </IconButton>
              </ListItem>
            ))
          ) : (
            <Text size="xs" tone="muted" align="center" className="saved-metrics-list__empty">
              No Saved Metrics
            </Text>
          )}
        </div>
      </section>

      {renderSpinbox({
        label: "Start",
        value: rangeStartInput,
        onChange: setRangeStartInput,
        onCommit: commitRangeStart,
        field: "xMin",
      })}
      {renderSpinbox({
        label: "End",
        value: rangeEndInput,
        onChange: setRangeEndInput,
        onCommit: commitRangeEnd,
        field: "xMax",
      })}

      <Button
        className={`metrics-controls__reset-annotations ${
          isAnimating ? "animate-line" : ""
        }`}
        variant="primary"
        block
        startIcon={<DisabledByDefaultTwoToneIcon />}
        onClick={handleResetAnnotations}
        onAnimationEnd={() => setIsAnimating(false)}
      >
        Clear Range
      </Button>
    </div>
  );
};

export default MetricsControls;
