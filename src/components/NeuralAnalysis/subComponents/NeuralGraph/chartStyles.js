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
  color: "#80deea",
  width: 2,
  dash: [2, 3],
};
