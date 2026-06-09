import { display } from "@mui/system";

export const getChartOptions = (
  extractedIndicatorTimes,
  chartData,
  zoomState,
  zoomMode,
  panState,
  panMode
) => ({
  // `normalized: true` deliberately NOT enabled here — cardiac filtered
  // data sortedness by x is incidental (file load order), not enforced
  // by an analysis pipeline. Revisit if/when the cardiac pipeline takes
  // ownership of the sortedness contract the way detectSpikes does for
  // the neural side.
  // normalized: true,
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
  // `false` so chart.js skips the animator entirely. Previously there
  // was no `animation` config, so chart.js used its default 1000 ms
  // ease-in-out animation on every chart update — every slider drag,
  // every well switch, every parameter tweak triggered a one-second
  // animation. That was the biggest single-chart regression in the
  // codebase.
  animation: false,
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
    zoom: {
      pan: {
        enabled: panState,
        mode: panMode,
        threshold: 50,
      },
      zoom: {
        wheel: {
          enabled: zoomState,
        },
        pinch: {
          enabled: false,
        },
        drag: {
          enabled: false,
          modifierKey: "shift",
        },
        mode: zoomMode,
        // rangeMin: {
        //   x: minXValue,
        //   y: minYValue,
        // },
        // rangeMax: {
        //   x: maxXValue,
        //   y: maxYValue,
        // },
      },
    },
    // interaction: { mode: "index" },
    tooltip: {
      enabled: true, // Ensure tooltips are enabled
      mode: "nearest",
      intersect: true,
      titleFont: {
        size: 14,
        weight: "bold",
        color: "#fff",
      },
      callbacks: {
        title: function () {
          // Return an empty string to remove the title
          return "";
        },
        label: function (context) {
          const excludedLabels = ["vertical", "Raw Signal", "Raw Points"]; // Add any other labels you want to exclude
          if (excludedLabels.includes(context.dataset.label)) {
            return null; // Exclude this dataset from the tooltip
          }

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
    // y: {
    //   ticks: {
    //     display: true,
    //     color: "white",
    //   },
    //   grid: {
    //     display: false,
    //     color: "grey",
    //   },
    //   title: {
    //     display: true,
    //     text: "intensity",
    //   },
    // },
    y: {
      beginAtZero: true,
      grid: {
        display: false,
        color: "grey",
      },
      title: {
        display: true,
        text: "intensity",
      },
      ticks: {
        display: true,
        color: "white",
        // Include a dollar sign in the ticks
        callback: function (value, index, values) {
          return value;
        },
      },
      // Automatically adjust the scale based on the visible data
      suggestedMin: chartData
        ? Math.min(
            ...chartData.datasets
              .filter((dataset) => dataset.showLine || dataset.pointRadius > 0)
              .flatMap((dataset) => dataset.data.map((point) => point.y))
          )
        : undefined,
      suggestedMax: chartData
        ? Math.max(
            ...chartData.datasets
              .filter((dataset) => dataset.showLine || dataset.pointRadius > 0)
              .flatMap((dataset) => dataset.data.map((point) => point.y))
          )
        : undefined,
    },
  },
});
