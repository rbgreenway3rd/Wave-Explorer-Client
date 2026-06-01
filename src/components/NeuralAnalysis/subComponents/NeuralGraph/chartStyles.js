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
