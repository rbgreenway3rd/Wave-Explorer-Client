import React from "react";
import { Tooltip } from "@mui/material";
import {
  useNeuralInteraction,
  useNeuralSettings,
} from "../../NeuralProvider";
import {
  WAVE_STYLE,
  PEAK_STYLE,
  OUTLIER_REGION_STYLE,
  OUTLIER_POINT_STYLE,
  PEAK_BASE_STYLE,
  BURST_STYLE,
  ROI_PALETTE,
  ACTIVITY_THRESHOLD_STYLE,
  BASELINE_THRESHOLD_STYLE,
  PARAM_VIZ_PROMINENCE_STYLE,
  PARAM_VIZ_WINDOW_STYLE,
  PARAM_VIZ_NOISE_STYLE,
  CANDIDATE_GATE_PALETTE,
  MARGINAL_PASS_RING_STYLE,
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
  removedOutlierRegions:
    "Regions where a tall outlier — a point far above the real signal that would otherwise skew the y-scale and every parameter — was removed before spike detection and the gap bridged with a straight line. Tune from Advanced Settings → Outlier Handling.",
  removedOutlierMarkers:
    "Each removed outlier drawn at its ORIGINAL height, so you can see how tall the removed blips were. Purely visual (toggle: Show removed outliers); it does not affect detection or the y-scale.",
  bursts:
    "Groups of closely-spaced spikes meeting the burst criteria (minimum spikes per burst within a maximum inter-spike interval). Configure in Advanced Settings → Burst Sliders.",
  roi: "Region of Interest — a user-defined time window for focused analysis. Metrics are reported separately for each ROI in the results table.",
  activityThreshold:
    "Horizontal cutoff — peaks whose apex falls below this line are filtered out before burst detection and metrics. Drag the line vertically on the chart to adjust.",
  baselineThreshold:
    "Horizontal line that auto-centers on each well's baseline noise (the robust median of its trace), so it sits in the same place relative to the noise on every well. When enabled, peak width and AUC are measured between the line's intercepts with the signal instead of from per-peak local minima. Nudge it with the Baseline Offset slider (in σ) or by dragging vertically.",
  paramVizProminence:
    "Prominence overlay — an I-beam at each detected peak. Bottom cap sits on the higher of the peak's two detection bases; top cap sits at the threshold the peak top must reach. Vertical distance = current Prominence slider value. Red peak dots above the top cap pass the gate; if the top cap rises above a dot the peak is rejected on slider release.",
  paramVizWindow:
    "Window overlay — translucent violet band around each peak showing the NMS center-exclusion footprint (apex ± window samples). Surviving apexes are more than `window` samples apart in the final spike set. Note: this shows the *exclusion* radius, not the event width.",
  paramVizNoiseFloor:
    "Noise Floor overlay — per-peak dashed tick at max(left, right detection base) + multiplier × σ. The tick shows the per-peak threshold the noise-floor gate is applying. When Noise Window is on, σ varies block-by-block so ticks step accordingly. Outliers bypass this gate and have no tick.",
  rejectedCandidates:
    "Near-miss candidates that fell within 10% of some gate's threshold. Color encodes which gate rejected each: grey=prominence, purple=zone, orange=noise floor, teal=k-means, indigo=width, pink=symmetry, yellow=NMS, brown=min distance, blue=activity threshold. Kept peaks that are barely passing get a yellow ring.",
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

// I-beam swatch for the prominence overlay. Mirrors the shape the
// plugin draws on each peak: bottom cap on the higher detection base,
// vertical riser the height of the prominence value, top cap at the
// threshold.
const IBeamSwatch = ({ color, lineWidth = 2 }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    {/* Top cap */}
    <line
      x1="3"
      y1="2.5"
      x2="11"
      y2="2.5"
      stroke={color}
      strokeWidth={lineWidth}
    />
    {/* Vertical riser */}
    <line
      x1="7"
      y1="2.5"
      x2="7"
      y2="11.5"
      stroke={color}
      strokeWidth={lineWidth}
    />
    {/* Bottom cap */}
    <line
      x1="3"
      y1="11.5"
      x2="11"
      y2="11.5"
      stroke={color}
      strokeWidth={lineWidth}
    />
  </svg>
);

// Compact palette swatch — three small circles in distinct gate colors
// surrounded by a yellow ring. Communicates "rejected candidates,
// color-coded by gate" + "marginal-pass ring" without needing nine
// separate legend rows.
const CandidatePaletteSwatch = ({ ringColor }) => (
  <svg
    width="24"
    height="14"
    viewBox="0 0 24 14"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="4" cy="7" r="2.5" fill={CANDIDATE_GATE_PALETTE.prominence} />
    <circle cx="10" cy="7" r="2.5" fill={CANDIDATE_GATE_PALETTE.noiseFloor} />
    <circle cx="16" cy="7" r="2.5" fill={CANDIDATE_GATE_PALETTE.symmetry} />
    <circle
      cx="21"
      cy="7"
      r="2.5"
      fill="#ff1744"
      stroke={ringColor}
      strokeWidth="1.6"
    />
  </svg>
);

// Band swatch for the window overlay. Filled rectangle with crisp
// vertical edges, mirroring how the plugin draws the NMS footprint.
const BandSwatch = ({ fill, edge, edgeWidth = 1.25 }) => (
  <svg
    width="18"
    height="12"
    viewBox="0 0 18 12"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <rect x="3" y="1" width="12" height="10" fill={fill} />
    <line x1="3" y1="1" x2="3" y2="11" stroke={edge} strokeWidth={edgeWidth} />
    <line
      x1="15"
      y1="1"
      x2="15"
      y2="11"
      stroke={edge}
      strokeWidth={edgeWidth}
    />
  </svg>
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
    showRemovedOutliers,
    showBursts,
    noiseSuppressionActive,
    showParamOverlays,
    showProminenceOverlay,
    showWindowOverlay,
    showNoiseFloorOverlay,
    noiseFloorMultiplier,
    showRejectedCandidates,
  } = useNeuralSettings();
  // Param-viz legend entries only render when the corresponding overlay
  // is actually being drawn. The noise-floor sub-toggle is gated on the
  // multiplier > 0 in ChartDisplayToggles, so mirror that here.
  const showProminenceLegend = !!(showParamOverlays && showProminenceOverlay);
  const showWindowLegend = !!(showParamOverlays && showWindowOverlay);
  const showNoiseFloorLegend = !!(
    showParamOverlays &&
    showNoiseFloorOverlay &&
    noiseFloorMultiplier > 0
  );
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
        alignItems: "center",
        // Background + border are owned by the parent row container
        // (which also holds ChartDisplayToggles) so the seam between
        // the two doesn't double up styles.
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
          label="Removed Outliers"
          description={LEGEND_DESCRIPTIONS.removedOutlierRegions}
        >
          <BoxSwatch
            fill={OUTLIER_REGION_STYLE.fill}
            border={OUTLIER_REGION_STYLE.edge}
          />
        </LegendItem>
      )}
      {handleOutliers && showRemovedOutliers && (
        <LegendItem
          label="Outlier (original height)"
          description={LEGEND_DESCRIPTIONS.removedOutlierMarkers}
        >
          <RingSwatch border={OUTLIER_POINT_STYLE.border} />
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
      {showProminenceLegend && (
        <LegendItem
          label="Prominence"
          description={LEGEND_DESCRIPTIONS.paramVizProminence}
        >
          <IBeamSwatch
            color={PARAM_VIZ_PROMINENCE_STYLE.color}
            lineWidth={PARAM_VIZ_PROMINENCE_STYLE.lineWidth}
          />
        </LegendItem>
      )}
      {showWindowLegend && (
        <LegendItem
          label="Window"
          description={LEGEND_DESCRIPTIONS.paramVizWindow}
        >
          <BandSwatch
            fill={PARAM_VIZ_WINDOW_STYLE.fill}
            edge={PARAM_VIZ_WINDOW_STYLE.edge}
            edgeWidth={PARAM_VIZ_WINDOW_STYLE.edgeWidth}
          />
        </LegendItem>
      )}
      {showNoiseFloorLegend && (
        <LegendItem
          label="Noise Floor"
          description={LEGEND_DESCRIPTIONS.paramVizNoiseFloor}
        >
          <LineSwatch
            color={PARAM_VIZ_NOISE_STYLE.color}
            dash={PARAM_VIZ_NOISE_STYLE.dash}
          />
        </LegendItem>
      )}
      {showRejectedCandidates && (
        <LegendItem
          label="Rejected Candidates"
          description={LEGEND_DESCRIPTIONS.rejectedCandidates}
        >
          <CandidatePaletteSwatch ringColor={MARGINAL_PASS_RING_STYLE.color} />
        </LegendItem>
      )}
    </div>
  );
};

export default ChartLegend;
