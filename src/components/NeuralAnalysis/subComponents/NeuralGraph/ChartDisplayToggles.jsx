import React from "react";
import { FormControlLabel, Switch, Tooltip } from "@mui/material";
import { useNeuralSettings } from "../../NeuralProvider";

// Small right-aligned toggle row that lives above the chart alongside
// ChartLegend. Purely visualization controls — none of these affect
// detection or metric calculation. Designed to sit in the same row as
// the legend so the user can flip view options without leaving the
// chart area.

// The real grey pill comes from the project's legacy MuiFormControlLabel
// global theme override (StyleProvider.js — gray-bg + uppercase +
// borderBottom hack used by older panels). The `ui-clean-forms`
// ancestor class in styles/primitives.css resets that hack with a
// (0,2,0)-specificity rule, so applying it to the container below kills
// the pill backgrounds and the uppercase transform in one shot.
//
// The Switch overrides below only color the thumb and track so the
// toggle still communicates on/off cleanly on the dark legend row.
const switchSx = {
  margin: 0,
  "& .MuiSwitch-track": {
    backgroundColor: "transparent !important",
    opacity: "1 !important",
    border: "1px solid rgba(255, 255, 255, 0.35)",
    boxSizing: "border-box",
  },
  "& .MuiSwitch-switchBase .MuiSwitch-thumb": {
    backgroundColor: "rgba(255, 255, 255, 0.65) !important",
    boxShadow: "none",
  },
  "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": {
    backgroundColor: "rgb(120, 180, 255) !important",
  },
  "& .MuiSwitch-switchBase:hover, & .MuiSwitch-switchBase.Mui-checked:hover": {
    backgroundColor: "transparent !important",
  },
};

const ChartDisplayToggles = () => {
  const {
    showPeakBases,
    setShowPeakBases,
    markAUC,
    setMarkAUC,
    showParamOverlays,
    setShowParamOverlays,
    showProminenceOverlay,
    setShowProminenceOverlay,
    showWindowOverlay,
    setShowWindowOverlay,
    showNoiseFloorOverlay,
    setShowNoiseFloorOverlay,
    noiseFloorMultiplier,
    showRejectedCandidates,
    setShowRejectedCandidates,
  } = useNeuralSettings();
  // Disable the noise-floor sub-toggle when the gate itself is off — the
  // overlay would draw at base + 0 × σ = base, which is meaningless.
  const noiseFloorGateOff = !(noiseFloorMultiplier > 0);

  return (
    <div
      className="neural-chart-display-toggles ui-clean-forms"
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "0.75rem",
        alignItems: "center",
        padding: "6px 10px",
        // Background + border owned by parent row container (shared
        // with ChartLegend). `ui-clean-forms` opts out of the legacy
        // MuiFormControlLabel global hack (see primitives.css).
      }}
    >
      <Tooltip
        title="Show or hide the white peak-base markers (left/right base of each detected peak)."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!showPeakBases}
              onChange={(_, checked) => setShowPeakBases(checked)}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Show Peak Bases
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>

      <Tooltip
        title="Fill each peak's AUC region on the chart with a semi-transparent color (red for normal peaks, orange for outliers). Visualization only — does not affect computed AUC values."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!markAUC}
              onChange={(_, checked) => setMarkAUC(checked)}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Mark AUC
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>

      {/* Vertical separator before the Parameter Overlays group. */}
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: "rgba(255, 255, 255, 0.18)",
        }}
      />

      <Tooltip
        title="Master toggle for spike-detection parameter overlays. When on, the sub-toggles draw the prominence threshold, NMS window footprint, and noise floor as overlays on each detected peak."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!showParamOverlays}
              onChange={(_, checked) => {
                setShowParamOverlays(checked);
                // When the master flips on, auto-enable every applicable
                // sub-toggle so the user immediately sees something —
                // they explicitly asked to "show overlays," not to
                // hunt for which sub-overlay to enable next. Noise
                // floor only auto-ons when its gate is actually active
                // (multiplier > 0); otherwise it stays off because
                // there'd be nothing to draw. Flipping master off does
                // NOT touch the subs — they're harmless when invisible
                // and the user's prior preferences are preserved for
                // the next on.
                if (checked) {
                  setShowProminenceOverlay(true);
                  setShowWindowOverlay(true);
                  if (noiseFloorMultiplier > 0) {
                    setShowNoiseFloorOverlay(true);
                  }
                }
              }}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Param Overlays
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>

      {showParamOverlays && (
        <>
          <Tooltip
            title="Vertical tick at each detected peak showing the prominence threshold the gate is applying. Threshold sits at max(left, right detection base) + prominence value."
            arrow
            placement="bottom"
          >
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!showProminenceOverlay}
                  onChange={(_, checked) =>
                    setShowProminenceOverlay(checked)
                  }
                  sx={switchSx}
                />
              }
              label={
                <span
                  style={{
                    fontSize: 12,
                    color: "#ddd",
                    whiteSpace: "nowrap",
                  }}
                >
                  Prominence
                </span>
              }
              sx={{ margin: 0, gap: "0.25rem" }}
            />
          </Tooltip>

          <Tooltip
            title="Translucent horizontal band around each detected peak showing the NMS center-exclusion footprint (apex ± window samples). Surviving apexes are more than `window` samples apart."
            arrow
            placement="bottom"
          >
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={!!showWindowOverlay}
                  onChange={(_, checked) => setShowWindowOverlay(checked)}
                  sx={switchSx}
                />
              }
              label={
                <span
                  style={{
                    fontSize: 12,
                    color: "#ddd",
                    whiteSpace: "nowrap",
                  }}
                >
                  Window
                </span>
              }
              sx={{ margin: 0, gap: "0.25rem" }}
            />
          </Tooltip>

          <Tooltip
            title={
              noiseFloorGateOff
                ? "Noise Floor multiplier is 0 — gate is off, so there is nothing to visualize. Raise the multiplier in Spike Detection to enable."
                : "Per-peak dashed tick at max(left, right detection base) + multiplier × σ. When Noise Window is on, σ varies per block and the ticks step accordingly."
            }
            arrow
            placement="bottom"
          >
            {/* span wrapper so the Tooltip still triggers on a disabled control */}
            <span>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={!!showNoiseFloorOverlay && !noiseFloorGateOff}
                    onChange={(_, checked) =>
                      setShowNoiseFloorOverlay(checked)
                    }
                    disabled={noiseFloorGateOff}
                    sx={switchSx}
                  />
                }
                label={
                  <span
                    style={{
                      fontSize: 12,
                      color: noiseFloorGateOff ? "#888" : "#ddd",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Noise Floor
                  </span>
                }
                sx={{ margin: 0, gap: "0.25rem" }}
              />
            </span>
          </Tooltip>
        </>
      )}

      {/* Separator before the candidate-overlay toggle. */}
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 18,
          background: "rgba(255, 255, 255, 0.18)",
        }}
      />

      <Tooltip
        title="Show rejected near-miss candidates as small ghost dots, color-coded by which gate rejected each. Kept peaks that were close to a rejection get a yellow ring (marginal-pass)."
        arrow
        placement="bottom"
      >
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={!!showRejectedCandidates}
              onChange={(_, checked) => setShowRejectedCandidates(checked)}
              sx={switchSx}
            />
          }
          label={
            <span
              style={{
                fontSize: 12,
                color: "#ddd",
                whiteSpace: "nowrap",
              }}
            >
              Rejected Candidates
            </span>
          }
          sx={{ margin: 0, gap: "0.25rem" }}
        />
      </Tooltip>
    </div>
  );
};

export default ChartDisplayToggles;
