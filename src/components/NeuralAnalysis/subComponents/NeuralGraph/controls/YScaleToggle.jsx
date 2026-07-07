import React from "react";
import { Tooltip, CircularProgress } from "@mui/material";
import { Text, ToggleGroup } from "../../../../ui";
import { useNeuralSettings, useNeuralResults } from "../../../NeuralProvider";

/**
 * YScaleToggle — the "Y Scale" segmented control from the main application,
 * ported into the neural chart. Lives in the always-visible legend strip.
 *   - "selected" (Relative): auto-fit the y-axis to the current well.
 *   - "all" (Universal / Absolute): fix the y-axis to the whole-plate
 *     processed range so well amplitudes are directly comparable.
 */
const YScaleToggle = () => {
  const { yScaleMode, setYScaleMode } = useNeuralSettings();
  const { isPlateRangeComputing } = useNeuralResults();
  // Spinner only matters while Universal is active and its range is computing.
  const showSpinner = isPlateRangeComputing && yScaleMode === "all";
  return (
    <Tooltip
      title="Y Scale: Universal (whole plate) or Relative (selected well only)"
      disableInteractive
      arrow
      placement="top"
    >
      <div
        className="neural-y-scale-toggle"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.15rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
          }}
        >
          <Text size="xs" tone="muted">
            Y Scale
          </Text>
          {showSpinner && (
            <CircularProgress size={11} thickness={6} aria-label="computing universal scale" />
          )}
        </div>
        <ToggleGroup
          size="sm"
          value={yScaleMode}
          onChange={(_, v) => {
            if (v) setYScaleMode(v);
          }}
          options={[
            { value: "all", label: "Universal" },
            { value: "selected", label: "Relative" },
          ]}
          aria-label="neural chart y-scale source"
        />
      </div>
    </Tooltip>
  );
};

export default YScaleToggle;
