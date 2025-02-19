import { display } from "@mui/system";

export const getChartOptions = (extractedIndicatorTimes, chartData) => ({
  normalized: true,
  maintainAspectRatio: true,
  responsive: true,
  devicePixelRatio: window.devicePixelRatio || 1, // Match screen pixel density

  spanGaps: false,
  events: [
    "onHover",
    "mousemove",
    "mouseout",
    "click",
    "touchstart",
    "touchmove",
  ],

  parsing: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: "white",
        filter: (legendItem, chartData) => {
          // Exclude datasets with the label "vertical" from the legend
          return legendItem.text !== "vertical";
        },
      },
    },
    decimation: {
      enabled: false,
      algorithm: "lttb",
      samples: 40,
      threshold: 80,
    },
    // interaction: { mode: "index" },
    tooltip: {
      enabled: false, // Ensure tooltips are enabled
      mode: "nearest",
      intersect: true,
      titleFont: {
        size: 14,
        weight: "bold",
        color: "#fff",
      },
      callbacks: {
        // title: function (tooltipItems) {
        //   // Customize the title content
        //   const item = tooltipItems[0];
        //   return `Peak at ${item.parsed.x.toFixed(2)} ms`;
        // },
        title: function () {
          // Return an empty string to remove the title
          return "";
        },
        label: function (context) {
          let label = context.dataset.label || "";

          if (label) {
            label += ": ";
          }
          if (context.parsed.x !== null && context.parsed.y !== null) {
            label += `X: ${context.parsed.x.toFixed(
              2
            )}, Y: ${context.parsed.y.toFixed(2)}`;
          }
          return label;
        },
        filter: function (tooltipItem) {
          // Exclude elements with the label "vertical" from tooltips
          return tooltipItem.dataset.label !== "vertical" || "Raw Signal";
        },
      },
    },
  },
  elements: {
    point: {
      radius: 0,
    },
    line: {
      borderWidth: 1.5,
    },
  },
  scales: {
    x: {
      type: "linear",
      position: "bottom",
      min: Math.min(extractedIndicatorTimes[0]),
      max: Math.max(extractedIndicatorTimes[0]),
      ticks: {
        display: true,
        color: "white",
      },
      grid: {
        display: false,
        color: "grey",
      },
      title: {
        display: true,
        text: "miliseconds",
      },
    },
    y: {
      ticks: {
        display: true,
        color: "white",
      },
      grid: {
        display: false,
        color: "grey",
      },
      title: {
        display: true,
        text: "intensity",
      },
    },
  },
});
