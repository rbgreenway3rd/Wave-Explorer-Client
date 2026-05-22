import React, { useState, useEffect, useContext } from "react";
import { Box, Typography, TextField } from "@mui/material";
import { controlsTheme } from "../styles/controlsTheme";
import { Panel } from "../../../../ui";
import { DataContext } from "../../../../../providers/DataProvider";
import { useNeuralInteraction } from "../../../NeuralProvider";
import "./ROIControls.css";
import "./NeuralControlPanel.css";

/**
 * ROIControls — managing Region of Interest definition, editing, and
 * deletion. Reads ROI list + active index + interaction-mode flag from
 * NeuralInteractionContext (no props from parent routers needed).
 *
 * Features:
 * - Define new ROIs
 * - Edit existing ROIs
 * - Delete ROIs
 * - Color-coded ROI buttons
 * - Visual feedback for active ROI
 */
const ROIControls = () => {
  const {
    defineROI,
    roiList,
    setRoiList,
    currentRoiIndex,
    setCurrentRoiIndex,
  } = useNeuralInteraction();
  const { extractedIndicatorTimes } = useContext(DataContext);
  const [pendingRoiIndex, setPendingRoiIndex] = useState(null);
  // Local state for editing ROI times (temporary values while typing)
  const [editingTimes, setEditingTimes] = useState({});
  // Local state for editing ROI durations (temporary values while typing)
  const [editingDurations, setEditingDurations] = useState({});
  // Inline-entry state for the active "Define ROI N+1" row — users can
  // commit a new ROI by typing Start + (End or Duration) and pressing
  // Enter / blurring, without needing to click-and-drag the chart.
  const [pendingNewStart, setPendingNewStart] = useState("");
  const [pendingNewEnd, setPendingNewEnd] = useState("");
  const [pendingNewDuration, setPendingNewDuration] = useState("");

  // Maximum number of ROIs we let the user define. Per client feedback:
  // "I'd be surprised if anyone ever used more than 4 ROI." Capping at
  // 6 keeps the UI bounded without being annoyingly tight.
  const MAX_ROIS = 6;

  // Convert extractedIndicatorTimes to array if it's an object
  const timeArray = React.useMemo(() => {
    if (!extractedIndicatorTimes) return null;
    if (Array.isArray(extractedIndicatorTimes)) return extractedIndicatorTimes;
    if (ArrayBuffer.isView(extractedIndicatorTimes)) return extractedIndicatorTimes;
    // If it's an object with numeric keys, convert to array
    if (typeof extractedIndicatorTimes === "object") {
      const values = Object.values(extractedIndicatorTimes);
      // Check if the first value is an array or typed-array (nested structure)
      if (values.length > 0 && (Array.isArray(values[0]) || ArrayBuffer.isView(values[0]))) {
        return values[0];
      }
      return values;
    }
    return null;
  }, [extractedIndicatorTimes]);

  // Sync pending ROI index with current ROI index
  useEffect(() => {
    setPendingRoiIndex(currentRoiIndex);
  }, [currentRoiIndex]);

  // Automatically set currentRoiIndex to 0 when ROI definition is enabled and no ROIs exist
  useEffect(() => {
    if (defineROI && roiList.length === 0 && currentRoiIndex === null) {
      setCurrentRoiIndex && setCurrentRoiIndex(0);
      setPendingRoiIndex(0);
    }
  }, [defineROI, roiList.length, currentRoiIndex, setCurrentRoiIndex]);

  // Clear pending ROI index when ROI definition is disabled
  useEffect(() => {
    if (!defineROI) {
      setPendingRoiIndex(null);
      setCurrentRoiIndex && setCurrentRoiIndex(null);
    }
  }, [defineROI, setCurrentRoiIndex]);

  const handleDefineRoi = (idx) => {
    setCurrentRoiIndex && setCurrentRoiIndex(idx);
    setPendingRoiIndex(idx);
  };

  const handleDeleteRoi = (idx) => {
    const newRoiList = roiList.filter((_, i) => i !== idx);
    setRoiList && setRoiList(newRoiList);

    if (pendingRoiIndex !== null && pendingRoiIndex > idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(pendingRoiIndex - 1);
      setPendingRoiIndex(pendingRoiIndex - 1);
    } else if (pendingRoiIndex === idx) {
      setCurrentRoiIndex && setCurrentRoiIndex(null);
      setPendingRoiIndex(null);
    }
  };

  const handleUpdateRoiTime = (idx, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const updatedRois = [...roiList];
    if (updatedRois[idx]) {
      if (field === "start") {
        updatedRois[idx] = { ...updatedRois[idx], xMin: numValue };
      } else if (field === "end") {
        updatedRois[idx] = { ...updatedRois[idx], xMax: numValue };
      }
      setRoiList && setRoiList(updatedRois);
    }
  };

  // Handle temporary input changes (while typing)
  const handleTimeInputChange = (idx, field, value) => {
    setEditingTimes((prev) => ({
      ...prev,
      [`${idx}-${field}`]: value,
    }));
  };

  // Handle temporary duration input changes (while typing)
  const handleDurationInputChange = (idx, value) => {
    setEditingDurations((prev) => ({
      ...prev,
      [idx]: value,
    }));
  };

  // Commit the edited time to ROI list (on blur or enter)
  const commitTimeEdit = (idx, field) => {
    const key = `${idx}-${field}`;
    const value = editingTimes[key];

    if (value !== undefined && value !== "") {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        handleUpdateRoiTime(idx, field, numValue);
      }
    }

    // Clear the editing state for this field
    setEditingTimes((prev) => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  // Commit the edited duration to ROI list (on blur or enter)
  const commitDurationEdit = (idx) => {
    const value = editingDurations[idx];

    if (value !== undefined && value !== "") {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 0) {
        const roi = roiList[idx];
        if (roi && roi.xMin !== undefined) {
          // Calculate new end time based on start time + duration
          const newEndTime = roi.xMin + numValue;
          handleUpdateRoiTime(idx, "end", newEndTime);
        }
      }
    }

    // Clear the editing state for this field
    setEditingDurations((prev) => {
      const newState = { ...prev };
      delete newState[idx];
      return newState;
    });
  };

  // Handle Enter key press
  const handleKeyDown = (idx, field, e) => {
    if (e.key === "Enter") {
      commitTimeEdit(idx, field);
      e.target.blur(); // Remove focus from input
    }
  };

  // Handle Enter key press for duration
  const handleDurationKeyDown = (idx, e) => {
    if (e.key === "Enter") {
      commitDurationEdit(idx);
      e.target.blur(); // Remove focus from input
    }
  };

  // Get display value for input (editing value or actual ROI value)
  const getDisplayValue = (idx, field) => {
    const key = `${idx}-${field}`;
    if (editingTimes[key] !== undefined) {
      return editingTimes[key];
    }
    const roi = roiList[idx];
    if (roi) {
      return field === "start" ? roi.xMin?.toFixed(2) : roi.xMax?.toFixed(2);
    }
    return "";
  };

  // Get display value for duration (editing value or calculated from ROI)
  const getDurationDisplayValue = (idx) => {
    if (editingDurations[idx] !== undefined) {
      return editingDurations[idx];
    }
    const roi = roiList[idx];
    if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
      const duration = roi.xMax - roi.xMin;
      return duration.toFixed(2);
    }
    return "";
  };

  // Commit the in-progress "Define ROI N+1" row into a real ROI.
  // Accepts either (Start + End) or (Start + Duration). Returns true on
  // success so keydown handlers can decide whether to blur after Enter.
  const commitPendingNewRoi = () => {
    const startTime = parseFloat(pendingNewStart);
    let endTime = parseFloat(pendingNewEnd);
    const duration = parseFloat(pendingNewDuration);

    if (
      !isNaN(startTime) &&
      !isNaN(duration) &&
      duration > 0 &&
      (isNaN(endTime) || pendingNewEnd === "")
    ) {
      endTime = startTime + duration;
    }

    if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
      return false;
    }

    const newRoi = {
      xMin: startTime,
      xMax: endTime,
      yMin: null,
      yMax: null,
    };

    setRoiList && setRoiList([...roiList, newRoi]);
    setPendingNewStart("");
    setPendingNewEnd("");
    setPendingNewDuration("");
    setCurrentRoiIndex && setCurrentRoiIndex(null);
    setPendingRoiIndex(null);
    return true;
  };

  const canCommitPendingNewRoi = () => {
    const startTime = parseFloat(pendingNewStart);
    if (pendingNewStart === "" || isNaN(startTime)) return false;

    const endTime = parseFloat(pendingNewEnd);
    const duration = parseFloat(pendingNewDuration);
    const hasEndTime = !isNaN(endTime) && pendingNewEnd !== "";
    const hasDuration =
      !isNaN(duration) && duration > 0 && pendingNewDuration !== "";

    if (hasEndTime) return startTime < endTime;
    return hasDuration;
  };

  // Inline-entry handlers for the active "Define ROI N+1" row. Mirror
  // the per-row commit-on-blur / commit-on-Enter UX used by existing
  // ROI rows.
  const handlePendingNewKeyDown = (e) => {
    if (e.key === "Enter" && canCommitPendingNewRoi()) {
      const committed = commitPendingNewRoi();
      if (committed) e.target.blur();
    }
  };

  const renderRoiButtons = () => {
    const buttons = [];
    const numRois = roiList.length;

    // Cap at MAX_ROIS — the next "Define" row only renders when we
    // haven't hit the cap. Existing ROIs beyond the cap (e.g. loaded
    // from an older session) keep rendering so the user can delete
    // them, but no new slot is offered.
    const lastIdx = Math.min(numRois, MAX_ROIS - 1);

    for (let i = 0; i <= lastIdx; i++) {
      const isDefined = i < numRois;
      const isActive = pendingRoiIndex === i;
      const label = isDefined ? `Edit ROI ${i + 1}` : `Define ROI ${i + 1}`;
      const roiColor =
        controlsTheme.colors.roi[i % controlsTheme.colors.roi.length];

      // Per-ROI accent — only the bg + border color vary; everything else
      // is in `.roi-button` / `.roi-button-active` in ROIControls.css.
      const accentBg = isActive
        ? controlsTheme.colors.secondary
        : isDefined
        ? roiColor.bg
        : controlsTheme.colors.backgroundLight;
      const accentBorder = isActive
        ? controlsTheme.colors.secondary
        : isDefined
        ? roiColor.border
        : controlsTheme.colors.border;

      buttons.push(
        <Box key={i} className="roi-row">
          <Box className="roi-row__button-cell">
            <button
              className={`roi-button ${isActive ? "roi-button-active" : ""} ${
                isDefined ? "roi-button-defined" : ""
              }`}
              disabled={!defineROI || (pendingRoiIndex !== null && !isActive)}
              onClick={() => handleDefineRoi(i)}
              style={{
                backgroundColor: accentBg,
                border: `0.125rem solid ${accentBorder}`,
                color: controlsTheme.colors.text,
              }}
            >
              {label}
            </button>

            {isDefined && (
              <button
                className="roi-delete-button"
                title={`Delete ROI ${i + 1}`}
                onClick={() => handleDeleteRoi(i)}
                tabIndex={-1}
              >
                ×
              </button>
            )}
          </Box>

          {isDefined && (
            <Box className="roi-row__inputs">
              <TextField
                className="neural-text-field"
                label="Start Time"
                type="number"
                size="small"
                value={getDisplayValue(i, "start")}
                onChange={(e) =>
                  handleTimeInputChange(i, "start", e.target.value)
                }
                onBlur={() => commitTimeEdit(i, "start")}
                onKeyDown={(e) => handleKeyDown(i, "start", e)}
                disabled={pendingRoiIndex !== null && pendingRoiIndex !== i}
                inputProps={{ step: 0.1, min: 0 }}
              />
              <TextField
                className="neural-text-field"
                label="End Time"
                type="number"
                size="small"
                value={getDisplayValue(i, "end")}
                onChange={(e) =>
                  handleTimeInputChange(i, "end", e.target.value)
                }
                onBlur={() => commitTimeEdit(i, "end")}
                onKeyDown={(e) => handleKeyDown(i, "end", e)}
                disabled={pendingRoiIndex !== null && pendingRoiIndex !== i}
                inputProps={{ step: 0.1, min: 0 }}
              />
              <TextField
                className="neural-text-field"
                label="Duration"
                type="number"
                size="small"
                value={getDurationDisplayValue(i)}
                onChange={(e) => handleDurationInputChange(i, e.target.value)}
                onBlur={() => commitDurationEdit(i)}
                onKeyDown={(e) => handleDurationKeyDown(i, e)}
                disabled={pendingRoiIndex !== null && pendingRoiIndex !== i}
                inputProps={{ step: 0.1, min: 0.01 }}
              />
            </Box>
          )}

          {/* Inline-entry inputs for the pending "Define ROI N+1" row:
            * users can commit a new ROI by typing Start + (End or
            * Duration) and pressing Enter / Tab. The click-and-drag
            * chart flow still works in parallel. */}
          {!isDefined && isActive && (
            <Box className="roi-row__inputs">
              <TextField
                className="neural-text-field"
                label="Start Time"
                type="number"
                size="small"
                value={pendingNewStart}
                onChange={(e) => setPendingNewStart(e.target.value)}
                onBlur={() => {
                  if (canCommitPendingNewRoi()) commitPendingNewRoi();
                }}
                onKeyDown={handlePendingNewKeyDown}
                inputProps={{ step: 0.1, min: 0 }}
              />
              <TextField
                className="neural-text-field"
                label="End Time"
                type="number"
                size="small"
                value={pendingNewEnd}
                onChange={(e) => setPendingNewEnd(e.target.value)}
                onBlur={() => {
                  if (canCommitPendingNewRoi()) commitPendingNewRoi();
                }}
                onKeyDown={handlePendingNewKeyDown}
                inputProps={{ step: 0.1, min: 0 }}
              />
              <TextField
                className="neural-text-field"
                label="Duration"
                type="number"
                size="small"
                value={pendingNewDuration}
                onChange={(e) => setPendingNewDuration(e.target.value)}
                onBlur={() => {
                  if (canCommitPendingNewRoi()) commitPendingNewRoi();
                }}
                onKeyDown={handlePendingNewKeyDown}
                inputProps={{ step: 0.1, min: 0.01 }}
              />
            </Box>
          )}
        </Box>
      );
    }

    return buttons;
  };

  return (
    <Panel
      variant="dark"
      className="neural-control-panel roi-controls-container"
    >
      <Typography variant="subtitle2" className="roi-section-heading">
        Regions of Interest
      </Typography>

      <Typography variant="caption" className="roi-section-helper">
        {timeArray && timeArray.length > 0
          ? `Available time range: ${timeArray[0].toFixed(2)}s - ${timeArray[
              timeArray.length - 1
            ].toFixed(2)}s`
          : "Available time range: No data loaded"}
      </Typography>

      <Box className="roi-row-list">{renderRoiButtons()}</Box>

      {pendingRoiIndex !== null && (
        <Typography
          variant="caption"
          className="roi-section-helper roi-section-helper--pending"
        >
          {pendingRoiIndex < roiList.length
            ? `Click and drag on the chart to redefine ROI ${pendingRoiIndex + 1}`
            : `Click and drag on the chart, or type Start + End (or Duration), to define ROI ${pendingRoiIndex + 1}`}
        </Typography>
      )}
    </Panel>
  );
};

export default ROIControls;
