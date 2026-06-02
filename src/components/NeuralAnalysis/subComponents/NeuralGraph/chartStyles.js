// Centralized visual styling for the neural chart. Both NeuralGraph
// (chart.js datasets + annotations) and ChartLegend pull from this
// module so the swatches in the legend always match what's drawn.

export const WAVE_STYLE = {
  noiseSuppressedColor: "#00bcd4",
  rawColor: "rgb(0, 200, 255)",
  width: 1.5,
};

export const PEAK_STYLE = {
  fill: "#ff1744",
  border: "#fff",
  radius: 5,
  borderWidth: 0,
};

export const OUTLIER_PEAK_STYLE = {
  fill: "rgba(255, 152, 0, 0)",
  border: "#ff9800",
  radius: 6,
  borderWidth: 2,
};

export const PEAK_BASE_STYLE = {
  fill: "#ffffffff",
  border: "#fff",
  radius: 4,
  borderWidth: 0,
};

export const BURST_STYLE = {
  fill: "rgba(255, 247, 0, 0.2)",
  border: "rgba(246, 255, 0, 0.5)",
  borderWidth: 1,
};

export const ROI_PALETTE = [
  { bg: "rgba(0, 255, 0, 0.15)", border: "rgba(0, 255, 0, 0.7)" },
  { bg: "rgba(0, 0, 255, 0.12)", border: "rgba(0, 0, 255, 0.7)" },
  { bg: "rgba(255, 0, 0, 0.12)", border: "rgba(255, 0, 0, 0.7)" },
  { bg: "rgba(255, 165, 0, 0.13)", border: "rgba(255, 165, 0, 0.7)" },
  { bg: "rgba(128, 0, 128, 0.13)", border: "rgba(128, 0, 128, 0.7)" },
  { bg: "rgba(0, 206, 209, 0.13)", border: "rgba(0, 206, 209, 0.7)" },
  { bg: "rgba(255, 192, 203, 0.13)", border: "rgba(255, 192, 203, 0.7)" },
  { bg: "rgba(255, 255, 0, 0.13)", border: "rgba(255, 255, 0, 0.7)" },
];

export const ACTIVITY_THRESHOLD_STYLE = {
  color: "#fbc02d",
  width: 2,
  dash: [6, 4],
};

export const BASELINE_THRESHOLD_STYLE = {
  // Magenta — picked deliberately to stand apart from the cyan signal
  // and the gold activity threshold line, per Dave's feedback that
  // the prior light-cyan #80deea looked too similar to the signal.
  color: "#e91e63",
  width: 2,
  dash: [2, 3],
};

// Parameter-visualization overlays (prominence, window, noise floor).
// Single source of truth for both the chart plugin (NeuralGraph) and the
// legend swatches (ChartLegend) so they cannot drift out of sync.
export const PARAM_VIZ_PROMINENCE_STYLE = {
  color: "rgba(140, 240, 100, 0.95)",
  lineWidth: 2,
  capHalfPx: 9,
};
export const PARAM_VIZ_WINDOW_STYLE = {
  fill: "rgba(180, 120, 240, 0.22)",
  edge: "rgba(180, 120, 240, 0.85)",
  edgeWidth: 1.25,
};
export const PARAM_VIZ_NOISE_STYLE = {
  color: "rgba(255, 200, 100, 0.92)",
  dash: [4, 3],
  halfPx: 8,
  lineWidth: 1.5,
};

// Candidate overlay (Decision Explanation Layer, D3+).
// One color per detection gate so ghost markers self-describe which
// gate rejected each candidate. Picked so all eight colors are
// distinguishable AND distinct from existing chart colors (red peaks,
// orange outliers, cyan signal, magenta baseline, gold activity).
// Indices align with GATE_* constants from peakGeometry.js (1..9; index
// 0 = kept, which uses PEAK_STYLE).
export const CANDIDATE_GATE_PALETTE = {
  prominence: "#9aa3ad", // grey — failed to clear the prominence floor
  zone: "#7e57c2", // purple — inside an outlier zone
  noiseFloor: "#fb8c00", // orange — failed σ-based noise floor
  kmeans: "#26a69a", // teal — k-means bailout (rare; whole-well noise)
  width: "#5c6bc0", // indigo — too narrow
  symmetry: "#ec407a", // pink — failed symmetry ratio
  nms: "#ffca28", // yellow — suppressed by a taller neighbor
  minDistance: "#8d6e63", // brown — too close in time to a kept peak
  activity: "#42a5f5", // blue — below activity threshold
};

// Maps GATE_* enum (1..9) → palette color. Index 0 is unused (the
// "kept" sentinel) and falls back to null.
export const CANDIDATE_GATE_COLOR_BY_ID = [
  null,
  CANDIDATE_GATE_PALETTE.prominence,
  CANDIDATE_GATE_PALETTE.zone,
  CANDIDATE_GATE_PALETTE.noiseFloor,
  CANDIDATE_GATE_PALETTE.kmeans,
  CANDIDATE_GATE_PALETTE.width,
  CANDIDATE_GATE_PALETTE.symmetry,
  CANDIDATE_GATE_PALETTE.nms,
  CANDIDATE_GATE_PALETTE.minDistance,
  CANDIDATE_GATE_PALETTE.activity,
];

// Visual style for the ghost-marker dataset. Smaller than kept peaks so
// the kept-peak red dots dominate visually; same shape so the user
// can still parse "this is a peak candidate" at a glance.
export const CANDIDATE_MARKER_STYLE = {
  radius: 3,
  borderWidth: 0,
};

// Ring drawn around kept peaks that pass every gate but only marginally
// (tier > clear-pass). Tells the user "this peak is close to a
// rejection on at least one gate — watch it during slider drag."
export const MARGINAL_PASS_RING_STYLE = {
  color: "#ffeb3b", // bright yellow — distinct against the red peak dot
  borderWidth: 2,
};
