import React from "react";
import { Tooltip } from "@mui/material";
import {
  useNeuralInteraction,
  useNeuralSettings,
} from "../../NeuralProvider";
import {
  WAVE_STYLE,
  PEAK_STYLE,
  OUTLIER_PEAK_STYLE,
  PEAK_BASE_STYLE,
  BURST_STYLE,
  ROI_PALETTE,
  ACTIVITY_THRESHOLD_STYLE,
  BASELINE_THRESHOLD_STYLE,
} from "./chartStyles";

// One short description per legend element. Surfaced as a MUI Tooltip
// on hover so a new user can learn what each chart marker means
// without leaving the modal. Kept concise — the longer story lives in
// the docs.
const LEGEND_DESCRIPTIONS = {
  signal:
    "Processed neural signal — after trend flattening and Savitzky-Golay smoothing if those are enabled in Advanced Settings.",
  peaks:
    "Detected spike events on the cleaned signal. Each peak's amplitude, width, and area under the curve are recorded in the results table.",
  peakBases:
    "Left/right base points of each peak — the boundaries used to measure peak width and AUC. With Baseline Threshold enabled, these snap to where the signal crosses the baseline line.",
  outlierPeaks:
    "Extreme transients flagged before spike detection (default: top 5% by prominence AND at least 2× the median). They're excised from the signal so they don't skew the detection threshold, then re-added so you can verify they aren't real signal. Tune from Advanced Settings → Outlier Sliders.",
  bursts:
    "Groups of closely-spaced spikes meeting the burst criteria (minimum spikes per burst within a maximum inter-spike interval). Configure in Advanced Settings → Burst Sliders.",
  roi: "Region of Interest — a user-defined time window for focused analysis. Metrics are reported separately for each ROI in the results table.",
  activityThreshold:
    "Horizontal cutoff — peaks whose apex falls below this line are filtered out before burst detection and metrics. Drag the line vertically on the chart to adjust.",
  baselineThreshold:
    "Horizontal line at the signal's noise baseline. When enabled, peak width and AUC are measured between the line's intercepts with the signal on either side of each peak instead of from per-peak local minima. Drag vertically to adjust.",
};

// Swatch primitives. Each renders a small inline preview of one chart
// element using the same constants the chart itself consumes, so the
// legend cannot drift from what's drawn.

const LineSwatch = ({ color, dash }) => (
  <svg
    width="22"
    height="10"
    viewBox="0 0 22 10"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <line
      x1="1"
      y1="5"
      x2="21"
      y2="5"
      stroke={color}
      strokeWidth="2"
      strokeDasharray={dash ? dash.join(" ") : undefined}
    />
  </svg>
);

const DotSwatch = ({ fill, border, borderWidth = 0 }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle
      cx="6"
      cy="6"
      r="4"
      fill={fill}
      stroke={border}
      strokeWidth={borderWidth}
    />
  </svg>
);

const RingSwatch = ({ border, borderWidth = 2 }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle
      cx="7"
      cy="7"
      r="5"
      fill="none"
      stroke={border}
      strokeWidth={borderWidth}
    />
  </svg>
);

const BoxSwatch = ({ fill, border }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: 16,
      height: 10,
      backgroundColor: fill,
      border: `1px solid ${border}`,
      flexShrink: 0,
    }}
  />
);

const LegendItem = ({ children, label, description }) => (
  <Tooltip title={description || ""} arrow placement="bottom">
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#ddd",
        whiteSpace: "nowrap",
        cursor: description ? "help" : "default",
      }}
    >
      {children}
      <span>{label}</span>
    </span>
  </Tooltip>
);

const ChartLegend = () => {
  const {
    activityThresholdEnabled,
    baselineThresholdEnabled,
    handleOutliers,
    showBursts,
    noiseSuppressionActive,
  } = useNeuralSettings();
  const { roiList } = useNeuralInteraction();

  const hasRoi =
    Array.isArray(roiList) &&
    roiList.some(
      (r) => r && r.xMin !== undefined && r.xMax !== undefined
    );

  const waveColor = noiseSuppressionActive
    ? WAVE_STYLE.noiseSuppressedColor
    : WAVE_STYLE.rawColor;

  return (
    <div
      className="neural-chart-legend"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 16px",
        padding: "6px 10px",
        background: "rgb(0, 0, 0)",
        borderTop: "0.1em solid rgb(100, 100, 100)",
        borderLeft: "0.1em solid rgb(100, 100, 100)",
        borderRight: "0.1em solid rgb(100, 100, 100)",
        alignItems: "center",
      }}
    >
      {/* Order per Dave's spec: Signal → Activity Threshold → Baseline
       * Threshold → Peaks → Peak Bases → Outlier Peaks → ROI → Bursts. */}
      <LegendItem label="Signal" description={LEGEND_DESCRIPTIONS.signal}>
        <LineSwatch color={waveColor} />
      </LegendItem>
      {activityThresholdEnabled && (
        <LegendItem
          label="Activity Threshold"
          description={LEGEND_DESCRIPTIONS.activityThreshold}
        >
          <LineSwatch
            color={ACTIVITY_THRESHOLD_STYLE.color}
            dash={ACTIVITY_THRESHOLD_STYLE.dash}
          />
        </LegendItem>
      )}
      {baselineThresholdEnabled && (
        <LegendItem
          label="Baseline Threshold"
          description={LEGEND_DESCRIPTIONS.baselineThreshold}
        >
          <LineSwatch
            color={BASELINE_THRESHOLD_STYLE.color}
            dash={BASELINE_THRESHOLD_STYLE.dash}
          />
        </LegendItem>
      )}
      <LegendItem label="Peaks" description={LEGEND_DESCRIPTIONS.peaks}>
        <DotSwatch fill={PEAK_STYLE.fill} border={PEAK_STYLE.border} />
      </LegendItem>
      <LegendItem
        label="Peak Bases"
        description={LEGEND_DESCRIPTIONS.peakBases}
      >
        <DotSwatch
          fill={PEAK_BASE_STYLE.fill}
          border={PEAK_BASE_STYLE.border}
        />
      </LegendItem>
      {handleOutliers && (
        <LegendItem
          label="Outlier Peaks"
          description={LEGEND_DESCRIPTIONS.outlierPeaks}
        >
          <RingSwatch border={OUTLIER_PEAK_STYLE.border} />
        </LegendItem>
      )}
      {hasRoi && (
        <LegendItem label="ROI" description={LEGEND_DESCRIPTIONS.roi}>
          <BoxSwatch
            fill={ROI_PALETTE[0].bg}
            border={ROI_PALETTE[0].border}
          />
        </LegendItem>
      )}
      {showBursts && (
        <LegendItem label="Bursts" description={LEGEND_DESCRIPTIONS.bursts}>
          <BoxSwatch fill={BURST_STYLE.fill} border={BURST_STYLE.border} />
        </LegendItem>
      )}
    </div>
  );
};

export default ChartLegend;
