import React, { useContext, useState, useEffect } from "react";
import BookmarkAddTwoToneIcon from "@mui/icons-material/BookmarkAddTwoTone";
import DisabledByDefaultTwoToneIcon from "@mui/icons-material/DisabledByDefaultTwoTone";
import DeleteForeverTwoToneIcon from "@mui/icons-material/DeleteForeverTwoTone";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { DataContext } from "../../../providers/DataProvider";
import {
  FormControl,
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

  // Controlled text inputs for the Start / End spin boxes. Kept as strings
  // so the user can type intermediate values ("1.", "-") without the input
  // fighting them. Committed to annotations on blur / Enter.
  const [rangeStartInput, setRangeStartInput] = useState("");
  const [rangeEndInput, setRangeEndInput] = useState("");

  const handleMetricChange = (e) => {
    const newMetric = e.target.value;
    setSelectedMetricType(newMetric);
    setMetricType(newMetric);
    setActiveMetricId(null);
  };

  const handleSaveMetric = () => {
    const a = annotations[0] ? Number(annotations[0].xMin) : null;
    const b = annotations[0] ? Number(annotations[0].xMax) : null;
    let range;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      range = [Math.min(a, b), Math.max(a, b)];
    } else if (
      (Array.isArray(currentIndicatorTimes) ||
        ArrayBuffer.isView(currentIndicatorTimes)) &&
      currentIndicatorTimes.length > 0
    ) {
      // No annotation — save the full time range so the saved metric is
      // self-descriptive in the list and in any downstream report.
      range = [
        currentIndicatorTimes[0],
        currentIndicatorTimes[currentIndicatorTimes.length - 1],
      ];
    } else {
      range = [null, null];
    }
    const newMetric = {
      id: savedMetrics.length + 1,
      metricType: selectedMetricType,
      range,
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
    // After clearing, the sync effect repopulates the inputs with the
    // full time range so the user can see what "no range" actually means
    // (a metric saved now will run across the entire trace).
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

  // Indicator times can be either a plain Array (TXT load) or a Float64Array
  // (DAT load via the extractor worker — see DataProvider.js:472-499). All
  // checks below need to accept both.
  const isNumericSeq = (t) =>
    (Array.isArray(t) || ArrayBuffer.isView(t)) && t.length > 0;

  // Helper to get the correct indicator times array
  const getCurrentIndicatorTimes = () => {
    if (isNumericSeq(extractedIndicatorTimes)) {
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

  // Sync spin-box inputs from annotation state. annotations[0].xMin/xMax are
  // time values (snapped by FilteredGraph during drag) — bind them straight
  // to the text inputs. Without this the inputs only reflect typed values
  // and never update after a mouse drag. When no annotation is set, default
  // the inputs to the full trace range so the user can see what "no range"
  // resolves to (saved metrics in that state run across the whole trace).
  useEffect(() => {
    if (annotations && annotations[0]) {
      if (typeof annotations[0].xMin === "number") {
        setRangeStartInput(String(annotations[0].xMin));
      }
      if (typeof annotations[0].xMax === "number") {
        setRangeEndInput(String(annotations[0].xMax));
      }
      return;
    }
    if (isNumericSeq(currentIndicatorTimes)) {
      setRangeStartInput(String(currentIndicatorTimes[0]));
      setRangeEndInput(
        String(currentIndicatorTimes[currentIndicatorTimes.length - 1])
      );
    } else {
      setRangeStartInput("");
      setRangeEndInput("");
    }
  }, [annotations, currentIndicatorTimes]);

  // ---- Helpers shared by Start/End spin-box handlers ------------------

  const snapToClosestIndex = (val) => {
    if (!isNumericSeq(currentIndicatorTimes) || isNaN(val)) {
      return null;
    }
    let closestIdx = 0;
    let minDiff = Math.abs(currentIndicatorTimes[0] - val);
    for (let i = 1; i < currentIndicatorTimes.length; i++) {
      const diff = Math.abs(currentIndicatorTimes[i] - val);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    return { idx: closestIdx, value: currentIndicatorTimes[closestIdx] };
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
      // If only one endpoint is set, anchor the other to the trace bounds so
      // the box has a visible width instead of collapsing to zero. Don't
      // normalize xMin > xMax here — keep the writer steady so typing Start
      // > End doesn't visibly swap the inputs on the next sync. Consumers
      // (report, heatmap, save) normalize at read/save time.
      if (field === "xMin" && typeof next.xMax !== "number") {
        next.xMax = currentIndicatorTimes[currentIndicatorTimes.length - 1] ?? value;
      }
      if (field === "xMax" && typeof next.xMin !== "number") {
        next.xMin = currentIndicatorTimes[0] ?? value;
      }
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
      !isNumericSeq(currentIndicatorTimes) ||
      !annotations?.[0] ||
      typeof annotations[0][field] !== "number"
    ) {
      return;
    }
    // annotations[0][field] is a time value, not an index. Convert to an
    // index via the snap helper, step by delta indices, then write the new
    // *time* back so the annotation contract stays time-domain everywhere.
    const snap = snapToClosestIndex(annotations[0][field]);
    if (!snap) return;
    const lastIdx = currentIndicatorTimes.length - 1;
    const newIdx = Math.min(lastIdx, Math.max(0, snap.idx + delta));
    if (newIdx === snap.idx) return;
    const newTime = currentIndicatorTimes[newIdx];
    if (field === "xMin") setAnnotationRangeStart(newTime);
    else setAnnotationRangeEnd(newTime);
    updateAnnotationField(field, newTime);
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
            savedMetrics.map((metric) => {
              const label =
                metric.metricType === "Range" ? "Max-Min" : metric.metricType;
              const chipMod = `saved-metric__chip--${metric.metricType.toLowerCase()}`;
              const [r0, r1] = metric.range || [];
              // Older saved metrics may carry [null, null] for "full range".
              // Fall back to the currently loaded indicator's first/last
              // time so the row still shows a meaningful range.
              const hasRange =
                Number.isFinite(r0) && Number.isFinite(r1);
              const fallbackR0 =
                isNumericSeq(currentIndicatorTimes)
                  ? currentIndicatorTimes[0]
                  : null;
              const fallbackR1 =
                isNumericSeq(currentIndicatorTimes)
                  ? currentIndicatorTimes[currentIndicatorTimes.length - 1]
                  : null;
              const lo = hasRange ? r0 : fallbackR0;
              const hi = hasRange ? r1 : fallbackR1;
              const rangeText =
                Number.isFinite(lo) && Number.isFinite(hi)
                  ? `${lo.toFixed(2)}–${hi.toFixed(2)}`
                  : "—";
              return (
                <div
                  className={`saved-metric ${
                    metric.id === activeMetricId ? "saved-metric--active" : ""
                  }`}
                  key={metric.id}
                  onClick={() => handleSelectMetric(metric)}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className={`saved-metric__chip ${chipMod}`}
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                  <span className="saved-metric__range">{rangeText}</span>
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
                </div>
              );
            })
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
