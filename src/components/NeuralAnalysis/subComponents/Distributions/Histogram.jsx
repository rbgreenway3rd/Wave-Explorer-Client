import React, { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { PARAM_VIZ_PROMINENCE_STYLE } from "../NeuralGraph/chartStyles";

/**
 * Histogram — small Chart.js bar chart for the Distributions panel.
 *
 * Designed to also serve the Phase 2 plate-wide distribution panel —
 * the prop shape covers both single-well and plate-wide use cases
 * without further changes.
 *
 * Inputs:
 *   bins       { edges: number[]|Float32Array, counts: number[]|Uint32Array }
 *              edges length = counts.length + 1
 *   threshold  optional number — vertical line on the bar chart
 *   marker     optional { value, color } — secondary vertical line
 *              (Phase 2: highlight the selected well's value)
 *   title      panel sub-heading rendered above the chart
 *   xFormat    (number) => string used by tick labels + tooltip
 *   yLabel     y-axis caption
 *   logScale   if true, edges are interpreted as log10 values and the
 *              tick formatter exponentiates for display. The binning
 *              math itself happens upstream — this just changes labels.
 *   emptyMessage string — shown when there's no data to plot
 */

const BAR_COLOR = "rgba(120, 180, 255, 0.65)";
const BAR_BORDER = "rgba(120, 180, 255, 0.95)";

const Histogram = ({
  bins,
  threshold = null,
  marker = null,
  title,
  xFormat = (v) => `${v}`,
  yLabel = "count",
  logScale = false,
  emptyMessage = "No data",
}) => {
  const totalCount = useMemo(() => {
    if (!bins || !bins.counts) return 0;
    let s = 0;
    for (let i = 0; i < bins.counts.length; i++) s += bins.counts[i];
    return s;
  }, [bins]);

  // Build the {x, y} data points and matching bar widths so each bar
  // visually covers its own bin. Chart.js's linear x-scale + the
  // annotation plugin then place threshold/marker lines at the correct
  // domain position (the annotation plugin keys off raw x values, which
  // requires the linear scale and {x, y} data shape we're using here).
  const { dataPoints, barWidth, xMin, xMax } = useMemo(() => {
    if (!bins || totalCount === 0) {
      return {
        dataPoints: [],
        barWidth: 1,
        xMin: 0,
        xMax: 1,
      };
    }
    const pts = new Array(bins.counts.length);
    for (let i = 0; i < bins.counts.length; i++) {
      const mid = (bins.edges[i] + bins.edges[i + 1]) / 2;
      pts[i] = { x: mid, y: bins.counts[i] };
    }
    const lo = bins.edges[0];
    const hi = bins.edges[bins.edges.length - 1];
    const stepWidth = (hi - lo) / bins.counts.length;
    return {
      dataPoints: pts,
      barWidth: stepWidth,
      xMin: lo,
      xMax: hi,
    };
  }, [bins, totalCount]);

  const chartData = useMemo(
    () => ({
      datasets: [
        {
          label: "",
          data: dataPoints,
          backgroundColor: BAR_COLOR,
          borderColor: BAR_BORDER,
          borderWidth: 1,
          // Width tied to the underlying domain so a 50-bin chart with
          // a 0.5-unit range gets 0.01-wide bars (touching, no gaps).
          barThickness: "flex",
          categoryPercentage: 1.0,
          barPercentage: 1.0,
        },
      ],
    }),
    [dataPoints]
  );

  const annotations = useMemo(() => {
    const out = {};
    if (typeof threshold === "number" && Number.isFinite(threshold)) {
      const t = logScale ? Math.log10(threshold) : threshold;
      out.threshold = {
        type: "line",
        xMin: t,
        xMax: t,
        borderColor: PARAM_VIZ_PROMINENCE_STYLE.color,
        borderWidth: 2,
        borderDash: [4, 3],
      };
    }
    if (marker && typeof marker.value === "number") {
      const m = logScale ? Math.log10(marker.value) : marker.value;
      out.marker = {
        type: "line",
        xMin: m,
        xMax: m,
        borderColor: marker.color || "#80deea",
        borderWidth: 2,
      };
    }
    return out;
  }, [threshold, marker, logScale]);

  const chartOptions = useMemo(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      animation: { duration: 0 },
      // Bars positioned by their `x` field; we want a continuous linear
      // axis so the annotation plugin's xMin/xMax in domain units land
      // at the right pixel.
      parsing: { xAxisKey: "x", yAxisKey: "y" },
      scales: {
        x: {
          type: "linear",
          min: xMin,
          max: xMax,
          offset: false,
          ticks: {
            color: "#aaa",
            font: { size: 10 },
            callback: (val) =>
              logScale ? xFormat(Math.pow(10, val)) : xFormat(val),
            maxTicksLimit: 6,
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          beginAtZero: true,
          title: {
            display: !!yLabel,
            text: yLabel,
            color: "#888",
            font: { size: 10 },
          },
          ticks: {
            color: "#aaa",
            font: { size: 10 },
            precision: 0,
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              if (!items || items.length === 0 || !bins) return "";
              const idx = items[0].dataIndex;
              if (idx == null || idx >= bins.counts.length) return "";
              const lo = logScale
                ? Math.pow(10, bins.edges[idx])
                : bins.edges[idx];
              const hi = logScale
                ? Math.pow(10, bins.edges[idx + 1])
                : bins.edges[idx + 1];
              return `${xFormat(lo)} – ${xFormat(hi)}`;
            },
            label: (item) => `${item.formattedValue} ${yLabel}`,
          },
        },
        annotation: { annotations },
      },
    }),
    [bins, annotations, logScale, xFormat, yLabel, xMin, xMax]
  );

  if (totalCount === 0) {
    return (
      <div className="distribution-histogram">
        {title && <div className="distribution-histogram__title">{title}</div>}
        <div className="distribution-histogram__empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="distribution-histogram">
      {title && <div className="distribution-histogram__title">{title}</div>}
      <div className="distribution-histogram__canvas">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default Histogram;
