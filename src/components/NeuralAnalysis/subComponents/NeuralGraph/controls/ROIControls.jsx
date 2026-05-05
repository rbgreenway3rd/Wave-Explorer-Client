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
  // State for creating new ROI from time inputs
  const [newRoiStart, setNewRoiStart] = useState("");
  const [newRoiEnd, setNewRoiEnd] = useState("");
  const [newRoiDuration, setNewRoiDuration] = useState("");

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

  // Create new ROI from time inputs
  const handleCreateRoiFromTimes = () => {
    const startTime = parseFloat(newRoiStart);
    let endTime = parseFloat(newRoiEnd);
    const duration = parseFloat(newRoiDuration);

    // If duration is provided but end time is not, calculate end time from duration
    if (
      !isNaN(startTime) &&
      !isNaN(duration) &&
      duration > 0 &&
      (isNaN(endTime) || newRoiEnd === "")
    ) {
      endTime = startTime + duration;
    }

    // Validate inputs
    if (isNaN(startTime) || isNaN(endTime)) {
      alert(
        "Please enter valid numbers for start time and either end time or duration"
      );
      return;
    }

    if (startTime >= endTime) {
      alert("Start time must be less than end time");
      return;
    }

    // Create new ROI with time range (yMin and yMax will be set by the graph)
    const newRoi = {
      xMin: startTime,
      xMax: endTime,
      yMin: null, // Will be set by graph's y-axis range
      yMax: null, // Will be set by graph's y-axis range
    };

    // Add to ROI list
    const updatedRois = [...roiList, newRoi];
    setRoiList && setRoiList(updatedRois);

    // Clear inputs
    setNewRoiStart("");
    setNewRoiEnd("");
    setNewRoiDuration("");
  };

  // Check if create button should be enabled
  const isCreateButtonEnabled = () => {
    const startTime = parseFloat(newRoiStart);
    const endTime = parseFloat(newRoiEnd);
    const duration = parseFloat(newRoiDuration);

    // Valid if we have start time and either (end time OR duration)
    const hasEndTime = !isNaN(endTime) && newRoiEnd !== "";
    const hasDuration =
      !isNaN(duration) && duration > 0 && newRoiDuration !== "";

    if (newRoiStart === "" || isNaN(startTime)) {
      return false;
    }

    if (hasEndTime) {
      return startTime < endTime;
    }

    return hasDuration;
  };

  const renderRoiButtons = () => {
    const buttons = [];
    const numRois = roiList.length;

    for (let i = 0; i <= numRois; i++) {
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

      {/* Create ROI from Time Inputs */}
      <Box className="roi-create-card">
        <Typography variant="caption" className="roi-create-card__heading">
          Create ROI from Time Range
        </Typography>
        <Box className="roi-create-card__row">
          <TextField
            className="neural-text-field neural-text-field--paper"
            label="Start Time"
            type="number"
            size="small"
            value={newRoiStart}
            onChange={(e) => setNewRoiStart(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isCreateButtonEnabled()) {
                handleCreateRoiFromTimes();
              }
            }}
            inputProps={{ step: 0.1, min: 0 }}
          />
          <TextField
            className="neural-text-field neural-text-field--paper"
            label="Duration"
            type="number"
            size="small"
            value={newRoiDuration}
            onChange={(e) => setNewRoiDuration(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isCreateButtonEnabled()) {
                handleCreateRoiFromTimes();
              }
            }}
            inputProps={{ step: 0.1, min: 0.01 }}
          />
          <TextField
            className="neural-text-field neural-text-field--paper"
            label="End Time"
            type="number"
            size="small"
            value={newRoiEnd}
            onChange={(e) => setNewRoiEnd(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isCreateButtonEnabled()) {
                handleCreateRoiFromTimes();
              }
            }}
            inputProps={{ step: 0.1, min: 0 }}
          />

          <button
            className="roi-create-button"
            onClick={handleCreateRoiFromTimes}
            disabled={!isCreateButtonEnabled()}
          >
            Create ROI
          </button>
        </Box>
      </Box>

      <Box className="roi-row-list">{renderRoiButtons()}</Box>

      {pendingRoiIndex !== null && (
        <Typography
          variant="caption"
          className="roi-section-helper roi-section-helper--pending"
        >
          Click and drag on the chart to define ROI {pendingRoiIndex + 1}
        </Typography>
      )}
    </Panel>
  );
};

export default ROIControls;
