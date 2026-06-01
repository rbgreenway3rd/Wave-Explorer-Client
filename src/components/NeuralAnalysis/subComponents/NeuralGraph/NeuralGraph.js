import React, {
  useContext,
  useEffect,
  useState,
  useImperativeHandle,
  useRef,
  forwardRef,
  useCallback,
  useMemo,
} from "react";
import { Line } from "react-chartjs-2";
import {
  useNeuralInteraction,
  useNeuralResults,
  useNeuralSelection,
  useNeuralSettings,
} from "../../NeuralProvider";
import { DataContext } from "../../../../providers/DataProvider";
import { perf } from "../../utilities/perfLogger";
import { getSignalMedianY } from "../../utilities/detectSpikes";
import { Chart, registerables, Tooltip } from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  WAVE_STYLE,
  PEAK_STYLE,
  OUTLIER_PEAK_STYLE,
  PEAK_BASE_STYLE,
  BURST_STYLE,
  ROI_PALETTE,
  ACTIVITY_THRESHOLD_STYLE,
  BASELINE_THRESHOLD_STYLE,
  PARAM_VIZ_PROMINENCE_STYLE,
  PARAM_VIZ_WINDOW_STYLE,
  PARAM_VIZ_NOISE_STYLE,
} from "./chartStyles";

// Cap on samples drawn along the top edge of each peak's AUC polygon.
// Wide peaks (hundreds of samples between left and right base) were
// making zoom/pan grind, because every redraw walked every sample and
// did two scale lookups + a lineTo per sample. 28 samples per peak
// preserves enough curve shape for the fill to look right while
// bounding per-draw work to a constant per peak.
const AUC_FILL_MAX_TOP_SAMPLES = 28;

// Module-scope chart.js plugin: fills each peak's AUC region with a
// semi-transparent color. Polygon top = (decimated) signal samples
// from leftBaseIdx → rightBaseIdx with the apex sample always
// included; polygon bottom = the two-level baseline used by
// NeuralPeak.calculateAUC (left-base height on the left half,
// right-base height on the right half, joined by a vertical step at
// the peak apex). Visualization only — does not affect any computed
// AUC value.
//
// Live state (enabled / peaks / signal) is attached directly to the
// chart instance as `chart.$aucFill` rather than passed through
// `chart.options.plugins.aucFill`. The options route forces chart.js
// to resolve the plugin's config on every draw, and stuffing the
// 250k-element processedSignal through that resolver added noticeable
// per-frame overhead during zoom. A bare property on `chart` is read
// with no extra work.
const aucFillPlugin = {
  id: "aucFill",
  afterDatasetsDraw(chart) {
    const state = chart && chart.$aucFill;
    if (!state || !state.enabled) return;
    const peaks = state.peaks;
    const signal = state.signal;
    if (!Array.isArray(peaks) || peaks.length === 0) return;
    if (!Array.isArray(signal) || signal.length === 0) return;
    const xScale = chart.scales && chart.scales.x;
    const yScale = chart.scales && chart.scales.y;
    const { ctx, chartArea } = chart;
    if (!xScale || !yScale || !ctx || !chartArea) return;

    ctx.save();
    // Clip to the plot area so the polygons can't bleed into the axis
    // gutters when the user pans/zooms.
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top
    );
    ctx.clip();

    const signalLen = signal.length;
    for (let i = 0; i < peaks.length; i++) {
      const pk = peaks[i];
      if (!pk) continue;
      const lbIdx = pk.leftBaseIdx;
      const rbIdx = pk.rightBaseIdx;
      const apexIdx = pk.index;
      if (
        typeof lbIdx !== "number" ||
        typeof rbIdx !== "number" ||
        typeof apexIdx !== "number" ||
        rbIdx <= lbIdx
      ) {
        continue;
      }
      const lbCoords = pk.leftBaseCoords;
      const rbCoords = pk.rightBaseCoords;
      const apexCoords = pk.peakCoords;
      if (!lbCoords || !rbCoords || !apexCoords) continue;
      const lbY = lbCoords.y;
      const rbY = rbCoords.y;
      const apexX = apexCoords.x;
      if (
        typeof lbY !== "number" ||
        typeof rbY !== "number" ||
        typeof apexX !== "number"
      ) {
        continue;
      }
      const lo = lbIdx < 0 ? 0 : lbIdx >= signalLen ? signalLen - 1 : lbIdx;
      const hi = rbIdx < 0 ? 0 : rbIdx >= signalLen ? signalLen - 1 : rbIdx;
      if (hi <= lo) continue;
      const startPt = signal[lo];
      if (!startPt) continue;

      // Decimation: pick a stride so the loop touches at most
      // AUC_FILL_MAX_TOP_SAMPLES samples between the bases. The apex
      // sample and the last sample (hi) are always included, so the
      // peak shape and the right-base endpoint stay anchored.
      const span = hi - lo;
      const stride =
        span > AUC_FILL_MAX_TOP_SAMPLES
          ? Math.ceil(span / AUC_FILL_MAX_TOP_SAMPLES)
          : 1;

      ctx.beginPath();
      ctx.moveTo(
        xScale.getPixelForValue(startPt.x),
        yScale.getPixelForValue(startPt.y)
      );
      // Left half: stride samples up to (but not including) the apex.
      for (let j = lo + stride; j < apexIdx; j += stride) {
        const pt = signal[j];
        if (!pt) continue;
        ctx.lineTo(
          xScale.getPixelForValue(pt.x),
          yScale.getPixelForValue(pt.y)
        );
      }
      // Apex always present so the curve actually peaks.
      const apexPt = signal[apexIdx];
      if (apexPt) {
        ctx.lineTo(
          xScale.getPixelForValue(apexPt.x),
          yScale.getPixelForValue(apexPt.y)
        );
      }
      // Right half: stride samples after the apex, stopping short of
      // the endpoint so the explicit endpoint lineTo below isn't a
      // duplicate.
      for (let j = apexIdx + stride; j < hi; j += stride) {
        const pt = signal[j];
        if (!pt) continue;
        ctx.lineTo(
          xScale.getPixelForValue(pt.x),
          yScale.getPixelForValue(pt.y)
        );
      }
      const endPt = signal[hi];
      if (endPt) {
        ctx.lineTo(
          xScale.getPixelForValue(endPt.x),
          yScale.getPixelForValue(endPt.y)
        );
      }
      // Bottom edge — two-level baseline mirroring how calculateAUC
      // integrates: right-base height from apex → right base, vertical
      // step at the apex x, then left-base height from apex → left
      // base. closePath connects back to the moveTo point.
      const apexPx = xScale.getPixelForValue(apexX);
      ctx.lineTo(apexPx, yScale.getPixelForValue(rbY));
      ctx.lineTo(apexPx, yScale.getPixelForValue(lbY));
      ctx.closePath();

      ctx.fillStyle = pk.isOutlier
        ? "rgba(255, 165, 0, 0.32)" // semi-transparent orange
        : "rgba(255, 80, 80, 0.32)"; // semi-transparent red
      ctx.fill();
    }
    ctx.restore();
  },
};

// Parameter-visualization overlay: draws the three Phase-1 gates
// (prominence, window, noise floor) on top of detected peaks so the
// user can see what the slider value means in signal coordinates.
//
// Lives on `chart.$paramViz` like the AUC plugin to avoid the per-draw
// option-resolver overhead — overlays are tied to live-drag slider
// state and may rewrite this every frame.
//
// Shape:
//   chart.$paramViz = {
//     master:    boolean,            // gate everything
//     prom:      boolean,            // draw prominence ticks
//     win:       boolean,            // draw window bands
//     noise:     boolean,            // draw noise-floor ticks
//     promValue: number,             // current prominence (draft or committed)
//     winValue:  number,             // current window radius (samples)
//     noiseMult: number,             // current noise-floor multiplier
//     peaks:     NeuralPeak-shaped[],// must carry detection bases + noiseSigma
//     signal:    { x, y }[],         // processedSignal for index → coord lookup
//   }
//
// Geometry references the *detection* bases that the gate itself uses
// (peakY − max(leftDetBaseY, rightDetBaseY) ≥ value), not the
// measurement bases — otherwise the overlay would lie under Baseline
// Threshold mode where measurement bases differ wildly from detection
// bases.
// Param-viz palette + geometry imported from chartStyles so the legend
// swatches and the chart-plugin drawing always stay in lock-step.
const paramVizPlugin = {
  id: "paramViz",
  afterDatasetsDraw(chart) {
    const s = chart && chart.$paramViz;
    if (!s || !s.master) return;
    const drawProm = !!s.prom && typeof s.promValue === "number" && s.promValue > 0;
    const drawWin =
      !!s.win && typeof s.winValue === "number" && s.winValue > 0;
    const drawNoise =
      !!s.noise &&
      typeof s.noiseMult === "number" &&
      s.noiseMult > 0;
    if (!drawProm && !drawWin && !drawNoise) return;
    const peaks = s.peaks;
    const signal = s.signal;
    if (!Array.isArray(peaks) || peaks.length === 0) return;
    if (!Array.isArray(signal) || signal.length === 0) return;
    const xScale = chart.scales && chart.scales.x;
    const yScale = chart.scales && chart.scales.y;
    const { ctx, chartArea } = chart;
    if (!xScale || !yScale || !ctx || !chartArea) return;
    const signalLen = signal.length;
    const xMin = xScale.min;
    const xMax = xScale.max;

    ctx.save();
    // Clip so overlays never bleed into axis gutters.
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      chartArea.right - chartArea.left,
      chartArea.bottom - chartArea.top
    );
    ctx.clip();

    // Window bands: violet fill with crisp vertical edges. Drawn first
    // so prominence + noise ticks render on top. Edges are batched into
    // a single stroke after all the fills.
    if (drawWin) {
      const w = Math.max(1, Math.floor(s.winValue));
      const topPx = chartArea.top;
      const heightPx = chartArea.bottom - chartArea.top;
      // Track edges so we can stroke them all in one pass.
      const edgeXs = [];
      ctx.fillStyle = PARAM_VIZ_WINDOW_STYLE.fill;
      for (let i = 0; i < peaks.length; i++) {
        const pk = peaks[i];
        if (!pk || typeof pk.index !== "number") continue;
        const px = pk.peakCoords ? pk.peakCoords.x : null;
        if (typeof px !== "number" || px < xMin || px > xMax) continue;
        const loIdx = pk.index - w < 0 ? 0 : pk.index - w;
        const hiIdx =
          pk.index + w >= signalLen ? signalLen - 1 : pk.index + w;
        const loPt = signal[loIdx];
        const hiPt = signal[hiIdx];
        if (!loPt || !hiPt) continue;
        const loPx = xScale.getPixelForValue(loPt.x);
        const hiPx = xScale.getPixelForValue(hiPt.x);
        const widthPx = hiPx - loPx;
        if (widthPx <= 0) continue;
        ctx.fillRect(loPx, topPx, widthPx, heightPx);
        edgeXs.push(loPx, hiPx);
      }
      if (edgeXs.length > 0) {
        ctx.beginPath();
        for (let j = 0; j < edgeXs.length; j++) {
          const ex = edgeXs[j];
          ctx.moveTo(ex, topPx);
          ctx.lineTo(ex, topPx + heightPx);
        }
        ctx.strokeStyle = PARAM_VIZ_WINDOW_STYLE.edge;
        ctx.lineWidth = PARAM_VIZ_WINDOW_STYLE.edgeWidth;
        ctx.setLineDash([]);
        ctx.stroke();
      }
    }

    // Prominence I-beams: one batched path covering every kept peak.
    // Bottom cap sits on max(left, right detection base) → "this is
    // where the gate measures from." Vertical line goes up by promValue.
    // Top cap sits at the threshold → "the peak top must clear this."
    // Cap widths exceed the cyan data line's stroke so the shape pops
    // even when the peak is on a steep slope.
    if (drawProm) {
      const cap = PARAM_VIZ_PROMINENCE_STYLE.capHalfPx;
      ctx.beginPath();
      for (let i = 0; i < peaks.length; i++) {
        const pk = peaks[i];
        if (!pk || !pk.peakCoords) continue;
        const px = pk.peakCoords.x;
        if (typeof px !== "number" || px < xMin || px > xMax) continue;
        const lIdx = pk.detectionLeftBaseIdx;
        const rIdx = pk.detectionRightBaseIdx;
        if (typeof lIdx !== "number" || typeof rIdx !== "number") continue;
        const lPt = signal[lIdx];
        const rPt = signal[rIdx];
        if (!lPt || !rPt) continue;
        const baseY = lPt.y > rPt.y ? lPt.y : rPt.y;
        const thresholdY = baseY + s.promValue;
        const xPx = xScale.getPixelForValue(px);
        const basePxY = yScale.getPixelForValue(baseY);
        const thresholdPxY = yScale.getPixelForValue(thresholdY);
        // Bottom cap (the reference base).
        ctx.moveTo(xPx - cap, basePxY);
        ctx.lineTo(xPx + cap, basePxY);
        // Vertical riser.
        ctx.moveTo(xPx, basePxY);
        ctx.lineTo(xPx, thresholdPxY);
        // Top cap (the threshold the peak must clear).
        ctx.moveTo(xPx - cap, thresholdPxY);
        ctx.lineTo(xPx + cap, thresholdPxY);
      }
      ctx.strokeStyle = PARAM_VIZ_PROMINENCE_STYLE.color;
      ctx.lineWidth = PARAM_VIZ_PROMINENCE_STYLE.lineWidth;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // Noise-floor ticks: dashed; per-peak threshold = max(left, right
    // detection base) + multiplier × σ_i. Outliers bypass the gate, so
    // skip them — drawing the gate on a peak that didn't have to clear
    // it would mislead.
    if (drawNoise) {
      ctx.beginPath();
      for (let i = 0; i < peaks.length; i++) {
        const pk = peaks[i];
        if (!pk || !pk.peakCoords) continue;
        if (pk.isOutlier) continue;
        const px = pk.peakCoords.x;
        if (typeof px !== "number" || px < xMin || px > xMax) continue;
        const lIdx = pk.detectionLeftBaseIdx;
        const rIdx = pk.detectionRightBaseIdx;
        const sigma = pk.noiseSigma;
        if (
          typeof lIdx !== "number" ||
          typeof rIdx !== "number" ||
          typeof sigma !== "number" ||
          !(sigma > 0)
        ) {
          continue;
        }
        const lPt = signal[lIdx];
        const rPt = signal[rIdx];
        if (!lPt || !rPt) continue;
        const baseY = lPt.y > rPt.y ? lPt.y : rPt.y;
        const tickY = baseY + s.noiseMult * sigma;
        const xPx = xScale.getPixelForValue(px);
        const tickPxY = yScale.getPixelForValue(tickY);
        ctx.moveTo(xPx - PARAM_VIZ_NOISE_STYLE.halfPx, tickPxY);
        ctx.lineTo(xPx + PARAM_VIZ_NOISE_STYLE.halfPx, tickPxY);
      }
      ctx.strokeStyle = PARAM_VIZ_NOISE_STYLE.color;
      ctx.lineWidth = PARAM_VIZ_NOISE_STYLE.lineWidth;
      ctx.setLineDash(PARAM_VIZ_NOISE_STYLE.dash);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  },
};

Chart.register(
  ...registerables,
  Tooltip,
  zoomPlugin,
  annotationPlugin,
  aucFillPlugin,
  paramVizPlugin
);

/**
 * NeuralGraph — chart.js Line wrapper. After Tier B reads everything from
 * the four narrower contexts:
 *   - selectedWell    → NeuralSelectionContext
 *   - settings (noise/decimation/spike-display) → NeuralSettingsContext
 *   - interaction (ROI list, pan/zoom mode)     → NeuralInteractionContext
 *   - pipelineResults (processedSignal, spikes, bursts) → NeuralResultsContext
 *
 * Only the imperative chart-instance ref is forwarded from the parent
 * (NeuralAnalysisModal) so it can call resetZoom() from elsewhere.
 *
 * `className` stays as a prop for layout flexibility.
 */
const NeuralGraph = forwardRef(({ className }, ref) => {
    const { selectedWell } = useNeuralSelection();
    const {
      noiseSuppressionActive,
      decimationEnabled,
      decimationSamples,
      showBursts,
      activityThresholdRatio,
      activityThresholdEnabled,
      setActivityThresholdRatio,
      baselineThresholdRatio,
      baselineThresholdEnabled,
      setBaselineThresholdRatio,
      showPeakBases,
      markAUC,
      // Parameter-visualization overlays.
      showParamOverlays,
      showProminenceOverlay,
      showWindowOverlay,
      showNoiseFloorOverlay,
      draftSpikeProminence,
      draftSpikeWindow,
      draftNoiseFloorMultiplier,
      noiseFloorMultiplier,
    } = useNeuralSettings();
    const {
      defineROI,
      enablePanZoom,
      zoomState,
      panState,
      roiList,
      setRoiList,
      currentRoiIndex,
      setCurrentRoiIndex,
    } = useNeuralInteraction();
    const {
      pipelineResults,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
    } = useNeuralResults();
    const processedSignal = pipelineResults.processedSignal;
    const peakResults = pipelineResults.spikeResults;
    const burstResults = pipelineResults.burstResults;
    const { globalMaxY } = useContext(DataContext);
    const [chartData, setChartData] = useState(null);
    // ROI selection state. roiEnd / annotationKey are set during click-drag
    // for their re-render side-effect only — the values themselves are not
    // read anywhere, so we discard the value half of the tuple.
    const [roiStart, setRoiStart] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [, setRoiEnd] = useState(null);
    const [isSelectingROI, setIsSelectingROI] = useState(false);
    const [roiAnnotation, setRoiAnnotation] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [, setAnnotationKey] = useState(0); // for forcing re-render
    // Pan/Zoom and ROI mode toggles are now props
    // zoomState, panState, defineROI, enablePanZoom, setZoomState, setPanState are now props
    // decimationEnabled is now a prop
    const neuralGraphRef = useRef(null);

    // Explicit loop instead of Math.{min,max}(...arr.map(...)) — spread
    // into a function call blows V8's argument limit on a 250K-point
    // signal. The y-extents feed the Activity Threshold ratio→Y
    // conversion. Computed inline (not memoized) because the y range
    // does change every time the pipeline produces a new signal and the
    // ratio→Y conversion needs to follow that.
    let localMaxY;
    let localMinY;
    if (processedSignal && processedSignal.length > 0) {
      let yMax = -Infinity;
      let yMin = Infinity;
      for (let i = 0; i < processedSignal.length; i++) {
        const pt = processedSignal[i];
        if (pt.y > yMax) yMax = pt.y;
        if (pt.y < yMin) yMin = pt.y;
      }
      localMaxY = isFinite(yMax) ? yMax : globalMaxY;
      localMinY = isFinite(yMin) ? yMin : 0;
    } else {
      localMaxY = globalMaxY;
      localMinY = 0;
    }

    // Padded scale bounds — visual breathing room around the signal so
    // peaks don't sit flush against the chart border. `chart.js`'s
    // `grace` option is ignored when min/max are explicit (and they
    // have to be explicit to stop the auto-fit during pan/zoom), so we
    // pad manually. The raw localMin/Max values are still used for
    // threshold-ratio math and peak detection — only the displayed
    // scale gets padding.
    const Y_SCALE_PAD = 0.05; // 5% headroom top and bottom
    const X_SCALE_PAD = 0.01; // 1% gutter left and right
    const yRange = localMaxY - localMinY;
    const paddedYMin =
      isFinite(localMinY) && yRange > 0
        ? localMinY - yRange * Y_SCALE_PAD
        : localMinY;
    const paddedYMax =
      isFinite(localMaxY) && yRange > 0
        ? localMaxY + yRange * Y_SCALE_PAD
        : localMaxY;

    // X extents — memoized on processedSignal reference. Critical: even
    // when the user toggles noise suppression and the pipeline produces
    // a new processedSignal *reference*, the x values themselves are
    // unchanged (same time samples, only y values differ). chartOptions
    // below depends on these primitives, not on processedSignal, so its
    // memo skips the recompute when noise suppression toggles. That's
    // what keeps the x-axis bounds (and the user's zoom state) stable
    // across pipeline updates.
    const { localMinX, localMaxX, paddedXMin, paddedXMax } = useMemo(() => {
      if (!processedSignal || processedSignal.length === 0) {
        return {
          localMinX: undefined,
          localMaxX: undefined,
          paddedXMin: undefined,
          paddedXMax: undefined,
        };
      }
      let xMin = Infinity;
      let xMax = -Infinity;
      for (let i = 0; i < processedSignal.length; i++) {
        const x = processedSignal[i].x;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
      const min = isFinite(xMin) ? xMin : undefined;
      const max = isFinite(xMax) ? xMax : undefined;
      const range = isFinite(min) && isFinite(max) ? max - min : 0;
      const pad = range > 0 ? range * X_SCALE_PAD : 0;
      return {
        localMinX: min,
        localMaxX: max,
        paddedXMin: isFinite(min) ? min - pad : min,
        paddedXMax: isFinite(max) ? max + pad : max,
      };
      // X_SCALE_PAD is a module-scope-style constant defined above;
      // intentionally not in deps.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processedSignal]);

    const roiColors = ROI_PALETTE;

    // Initialize chart data once when a well is selected and the
    // pipeline produces its first result. Builds the *complete* initial
    // datasets list — line + spike scatter + bases + outliers — so the
    // chart is created already containing the spike markers. Without
    // this, the chart would mount with only the line, and the
    // imperative-update effect below would have to add spike scatter
    // after react-chartjs-2 has finished syncing its own data.datasets
    // effect; that race meant the very first detection result wouldn't
    // render until the user nudged a slider.
    useEffect(() => {
      if (
        !processedSignal ||
        !Array.isArray(processedSignal) ||
        processedSignal.length === 0
      ) {
        // Only unmount the chart when there's truly no well selected.
        // During a well-switch the upstream pipeline briefly returns no
        // processedSignal between the click and the new worker result;
        // nulling chartData here would unmount <Line>, leaving the user
        // staring at "No well selected" until the next paint. Keeping
        // chartData (stale datasets are replaced by the imperative-
        // update effect below as soon as the new data arrives).
        if (!selectedWell) setChartData(null);
        return;
      }

      if (!chartData) {
        const initialChartPoints = processedSignal.map((pt) => ({
          x: pt.x,
          y: pt.y,
        }));
        const initialBaseScatter =
          Array.isArray(peakResults) && peakResults.length > 0
            ? peakResults.flatMap((pk) => [
                { x: pk.leftBaseCoords.x, y: pk.leftBaseCoords.y },
                { x: pk.rightBaseCoords.x, y: pk.rightBaseCoords.y },
              ])
            : [];
        const initialPeakScatter =
          Array.isArray(peakResults) && peakResults.length > 0
            ? peakResults
                .filter((pk) => !pk.isOutlier)
                .map((pk) => ({ x: pk.peakCoords.x, y: pk.peakCoords.y }))
            : [];
        const initialOutlierScatter =
          Array.isArray(peakResults) && peakResults.length > 0
            ? peakResults
                .filter((pk) => pk.isOutlier)
                .map((pk) => ({ x: pk.peakCoords.x, y: pk.peakCoords.y }))
            : [];

        const datasets = [];
        // Peak base markers are gated by the user-visible "Show Peak
        // Bases" toggle (Chart Display Toggles strip). Default ON,
        // but the user can hide them to declutter the chart.
        if (showPeakBases && initialBaseScatter.length > 0) {
          datasets.push({
            type: "scatter",
            label: "Spike Bases",
            data: initialBaseScatter,
            pointBackgroundColor: PEAK_BASE_STYLE.fill,
            pointBorderColor: PEAK_BASE_STYLE.border,
            pointRadius: PEAK_BASE_STYLE.radius,
            showLine: false,
            borderWidth: PEAK_BASE_STYLE.borderWidth,
          });
        }
        datasets.push({
          label: noiseSuppressionActive
            ? "Noise Suppressed Data"
            : "Neural Data",
          data: initialChartPoints,
          borderColor: noiseSuppressionActive
            ? WAVE_STYLE.noiseSuppressedColor
            : WAVE_STYLE.rawColor,
          borderWidth: WAVE_STYLE.width,
          fill: false,
        });
        if (initialPeakScatter.length > 0) {
          datasets.push({
            type: "scatter",
            label: "Detected Spikes",
            data: initialPeakScatter,
            pointBackgroundColor: PEAK_STYLE.fill,
            pointBorderColor: PEAK_STYLE.border,
            pointRadius: PEAK_STYLE.radius,
            showLine: false,
            borderWidth: PEAK_STYLE.borderWidth,
          });
        }
        if (initialOutlierScatter.length > 0) {
          datasets.push({
            type: "scatter",
            label: "Outlier Spikes",
            data: initialOutlierScatter,
            pointBackgroundColor: OUTLIER_PEAK_STYLE.fill,
            pointBorderColor: OUTLIER_PEAK_STYLE.border,
            pointRadius: OUTLIER_PEAK_STYLE.radius,
            pointStyle: "circle",
            showLine: false,
            borderWidth: OUTLIER_PEAK_STYLE.borderWidth,
          });
        }
        setChartData({ datasets });
      }
    }, [processedSignal, chartData, peakResults, noiseSuppressionActive, showPeakBases, selectedWell]);

    // Memoized chart-data projections. Each useMemo skips its allocation
    // when its single source of truth is reference-stable across renders
    // — critical because spike-prominence drags trigger pipeline re-runs
    // that change peakResults but reuse the same processedSignal (Tier E
    // cache hits upstream stages), so we should NOT re-allocate the
    // 250K-element chartPoints just because peakResults updated.
    const chartPoints = useMemo(
      () =>
        processedSignal && processedSignal.length > 0
          ? processedSignal.map((pt) => ({ x: pt.x, y: pt.y }))
          : [],
      [processedSignal]
    );
    // Ordinary spikes — regular detection result. Drawn as solid red dots.
    const peakScatter = useMemo(
      () =>
        Array.isArray(peakResults) && peakResults.length > 0
          ? peakResults
              .filter((pk) => !pk.isOutlier)
              .map((pk) => ({ x: pk.peakCoords.x, y: pk.peakCoords.y }))
          : [],
      [peakResults]
    );
    // Outlier spikes — re-added by the outlier-removal stage with
    // isOutlier:true. Drawn as orange hollow rings so the Outlier
    // Handling sliders have a visible effect on the chart.
    const outlierScatter = useMemo(
      () =>
        Array.isArray(peakResults) && peakResults.length > 0
          ? peakResults
              .filter((pk) => pk.isOutlier)
              .map((pk) => ({ x: pk.peakCoords.x, y: pk.peakCoords.y }))
          : [],
      [peakResults]
    );
    const baseScatter = useMemo(
      () =>
        Array.isArray(peakResults) && peakResults.length > 0
          ? peakResults.flatMap((pk) => [
              { x: pk.leftBaseCoords.x, y: pk.leftBaseCoords.y },
              { x: pk.rightBaseCoords.x, y: pk.rightBaseCoords.y },
            ])
          : [],
      [peakResults]
    );

    // Attach the AUC-fill plugin's live state directly to the chart
    // instance. The plugin reads from `chart.$aucFill` on every draw,
    // so writing the bare object + calling `chart.update("none")` is
    // enough to flip the fill on/off and refresh it. Going through
    // `chart.options.plugins.aucFill` would route the 250k-element
    // signal through chart.js's option resolver on every draw — same
    // visual result, much more per-frame work during zoom.
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;
      chart.$aucFill = {
        enabled: !!markAUC,
        peaks: Array.isArray(peakResults) ? peakResults : [],
        signal: Array.isArray(processedSignal) ? processedSignal : [],
      };
      chart.update("none");
    }, [markAUC, peakResults, processedSignal]);

    // Parameter-visualization overlay state. Same imperative pattern as
    // AUC above — writes to `chart.$paramViz` and triggers a no-anim
    // redraw. Draft slider values (published mid-drag by useDraftSlider)
    // are preferred so the overlay tracks the thumb in real time;
    // fall back to the committed effective value otherwise. The pipeline
    // does NOT re-run on draft changes — that only fires on slider
    // release via onChangeCommitted in SpikeDetectionControls.
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;
      chart.$paramViz = {
        master: !!showParamOverlays,
        prom: !!showProminenceOverlay,
        win: !!showWindowOverlay,
        noise: !!showNoiseFloorOverlay,
        promValue:
          draftSpikeProminence != null
            ? draftSpikeProminence
            : effectiveSpikeProminence,
        winValue:
          draftSpikeWindow != null ? draftSpikeWindow : effectiveSpikeWindow,
        noiseMult:
          draftNoiseFloorMultiplier != null
            ? draftNoiseFloorMultiplier
            : noiseFloorMultiplier,
        peaks: Array.isArray(peakResults) ? peakResults : [],
        signal: Array.isArray(processedSignal) ? processedSignal : [],
      };
      chart.update("none");
    }, [
      showParamOverlays,
      showProminenceOverlay,
      showWindowOverlay,
      showNoiseFloorOverlay,
      draftSpikeProminence,
      draftSpikeWindow,
      draftNoiseFloorMultiplier,
      effectiveSpikeProminence,
      effectiveSpikeWindow,
      noiseFloorMultiplier,
      peakResults,
      processedSignal,
    ]);

    // Update chart data imperatively to preserve zoom state.
    //
    // `chartData` is in the deps because the Chart component only mounts
    // when chartData is truthy (see render below). On the first pipeline
    // result, the initializer effect above transitions chartData
    // null → set; the Chart then mounts on the next render. We need to
    // re-fire this effect at that point so it finds neuralGraphRef.current
    // populated and can write the full datasets (including spike scatter).
    // Without `chartData` here, the first set of spikes never gets
    // imperatively applied — the chart shows the basic Neural Data line
    // from chartData but no spikes until the user adjusts a slider.
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart || !processedSignal || processedSignal.length === 0) return;

      const newDatasets = [
        // Peak base markers — gated by the "Show Peak Bases" toggle in
        // the Chart Display Toggles strip. Default ON; turn off to
        // declutter the chart when the user only cares about apexes.
        ...(showPeakBases && baseScatter.length > 0
          ? [
              {
                type: "scatter",
                label: "Spike Bases",
                data: baseScatter,
                pointBackgroundColor: PEAK_BASE_STYLE.fill,
                pointBorderColor: PEAK_BASE_STYLE.border,
                pointRadius: PEAK_BASE_STYLE.radius,
                showLine: false,
                borderWidth: PEAK_BASE_STYLE.borderWidth,
              },
            ]
          : []),
        {
          label: noiseSuppressionActive
            ? "Noise Suppressed Data"
            : "Neural Data",
          data: chartPoints,
          borderColor: noiseSuppressionActive
            ? WAVE_STYLE.noiseSuppressedColor
            : WAVE_STYLE.rawColor,
          borderWidth: WAVE_STYLE.width,
          fill: false,
        },
        ...(peakScatter.length > 0
          ? [
              {
                type: "scatter",
                label: "Detected Spikes",
                data: peakScatter,
                pointBackgroundColor: PEAK_STYLE.fill,
                pointBorderColor: PEAK_STYLE.border,
                pointRadius: PEAK_STYLE.radius,
                showLine: false,
                borderWidth: PEAK_STYLE.borderWidth,
              },
            ]
          : []),
        ...(outlierScatter.length > 0
          ? [
              {
                type: "scatter",
                label: "Outlier Spikes",
                data: outlierScatter,
                pointBackgroundColor: OUTLIER_PEAK_STYLE.fill,
                pointBorderColor: OUTLIER_PEAK_STYLE.border,
                pointRadius: OUTLIER_PEAK_STYLE.radius,
                pointStyle: "circle",
                showLine: false,
                borderWidth: OUTLIER_PEAK_STYLE.borderWidth,
              },
            ]
          : []),
      ];

      // Mutate chart data imperatively without triggering re-render
      chart.data.datasets = newDatasets;
      perf.time("chart.update (data)", () => chart.update("none"));
    }, [processedSignal, noiseSuppressionActive, chartPoints, peakScatter, outlierScatter, baseScatter, chartData, showPeakBases]);

    // Memoize chartOptions - recalculate when processedSignal changes to update axis ranges
    // Initialize with pan/zoom enabled based on initial props
    const initialPanZoomEnabled = enablePanZoom && !defineROI;
    const chartOptions = useMemo(
      () => ({
        normalized: true,
        maintainAspectRatio: false,
        responsive: true,
        devicePixelRatio: window.devicePixelRatio || 1,
        spanGaps: false,
        events: initialPanZoomEnabled
          ? [
              "mousedown",
              "mousemove",
              "mouseup",
              "mouseout",
              "click",
              "touchstart",
              "touchmove",
              "wheel",
            ]
          : ["mousemove", "mouseout", "click", "touchstart", "touchmove"],
        animation: { duration: 0 },
        parsing: false,
        plugins: {
          legend: false,
          decimation: {
            enabled: decimationEnabled,
            algorithm: "lttb",
            samples: decimationSamples,
            threshold: 50,
          },
          tooltip: {
            // Hover-only tooltips on the scatter markers (peaks, outlier
            // peaks, peak bases) — never on the 250k-point signal line.
            // `mode: 'point'` with `intersect: true` is the lightest hit
            // test (cursor must be directly over a rendered marker), so
            // the line dataset's million-point distance scan is avoided.
            // `filter` is a defense-in-depth: even if a point on the line
            // happens to be the nearest, skip it.
            enabled: true,
            mode: "point",
            intersect: true,
            displayColors: false,
            filter: (tooltipItem) =>
              tooltipItem.dataset && tooltipItem.dataset.type === "scatter",
            callbacks: {
              title: (items) => {
                if (!items || items.length === 0) return "";
                const label = items[0].dataset && items[0].dataset.label;
                // User-friendly singular names for the three marker
                // datasets; fall back to the dataset label if anything
                // else (e.g., a future scatter type) sneaks through.
                if (label === "Detected Spikes") return "Peak";
                if (label === "Outlier Spikes") return "Outlier Peak";
                if (label === "Spike Bases") return "Peak Base";
                return label || "";
              },
              label: (context) => {
                const x = context.parsed && context.parsed.x;
                const y = context.parsed && context.parsed.y;
                if (typeof x !== "number" || typeof y !== "number") return "";
                return `x: ${x.toFixed(2)}, y: ${y.toFixed(2)}`;
              },
            },
          },
          annotation: {
            annotations: {},
          },
          zoom: {
            limits: {
              x: { minRange: 0 },
            },
            pan: {
              /* IMPORTANT: this must start `true` even when the user has
               * pan/zoom mode off. chartjs-plugin-zoom v2 only installs
               * the Hammer Pan recognizer inside `startHammer` if
               * `pan.enabled` is truthy at chart-creation time. Once
               * installed, the recognizer's `enable` callback (set by
               * the plugin) reads `state.options.pan.enabled` live, so
               * the mutation effect below can still gate runtime
               * behavior by toggling this flag. Initialize to `false`
               * and the recognizer is never registered, leaving pan
               * permanently dead. The same logic applies to `pinch`
               * below. */
              enabled: true,
              mode: "x",
              onPanStart: () => !isDraggingThresholdRef.current,
            },
            zoom: {
              wheel: { enabled: initialPanZoomEnabled && zoomState },
              /* Always-on at startup so Hammer registers the Pinch
               * recognizer; runtime gating happens via the mutation
               * effect mirroring the live state. */
              pinch: { enabled: true },
              mode: "x",
              onZoomStart: () => !isDraggingThresholdRef.current,
            },
          },
        },
        elements: {
          point: { radius: 0 },
          line: { borderWidth: 1.5 },
        },
        layout: {
          padding: { left: 10, right: 10, top: 10, bottom: 10 },
        },
        scales: {
          x: {
            type: "linear",
            // Explicit bounds so chart.js doesn't scan all 250K points
            // to auto-fit on each options update, and so `grace` is
            // suppressed (no empty space on either side of the curve).
            // The chartOptions useMemo below depends on these primitives
            // (not on `processedSignal`), so the options object only
            // rebuilds when the bounds actually change — i.e. when the
            // user switches wells — not when noise suppression toggles
            // re-runs the pipeline on the same time samples. That's how
            // the user's zoom state survives across pipeline updates.
            min: paddedXMin,
            max: paddedXMax,
            ticks: {
              display: true,
              color: "#666666",
              font: {
                size: 11,
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              maxRotation: 0,
              autoSkipPadding: 10,
            },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
            title: {
              display: true,
              text: "Time (s)",
              color: "#333333",
              font: {
                size: 14,
                weight: "bold",
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              padding: { top: 8 },
            },
          },
          y: {
            // Explicit Y bounds are required to stop chart.js from
            // auto-refitting the y axis during pan/zoom. Without these,
            // when the user zooms in and the original max-Y sample
            // leaves the viewport, chart.js shrinks the y range to fit
            // only the visible samples — the scale visibly jumps. The
            // mutation effect below keeps these bounds in sync with the
            // currently displayed processedSignal so noise-suppression
            // toggles still update them.
            min: paddedYMin,
            max: paddedYMax,
            ticks: {
              display: true,
              color: "#666666",
              font: {
                size: 11,
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              maxTicksLimit: 8,
            },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
            title: {
              display: true,
              text: "Signal Intensity",
              color: "#333333",
              font: {
                size: 14,
                weight: "bold",
                family: "'Roboto', 'Helvetica Neue', 'Arial', sans-serif",
              },
              padding: { bottom: 8 },
            },
          },
          yRight: {
            position: "right",
            ticks: { display: false },
            grid: { display: false },
            border: { display: true, color: "#333333", width: 1 },
          },
        },
        transitions: {
          zoom: {
            animation: {
              duration: 0,
            },
          },
        },
      }),
      // Intentional: the dynamic options (decimation, pan/zoom, events,
      // initialPanZoomEnabled) are mutated in place on chart.options by
      // the effect below. Including them in the deps here would cause
      // useMemo to recompute the entire options object, which would
      // force chart.js to re-create the chart instance and lose the
      // user's current zoom/pan state. Recompute only when the signal's
      // x extents actually shift — which is when the user changes wells,
      // not when noise suppression / SG window / decimation toggles
      // re-run the pipeline on the same time samples.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [localMinX, localMaxX]
    );

    // Mutate chart options in place when controls change (preserves zoom)
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;

      // Mutate decimation settings
      chart.options.plugins.decimation.enabled = decimationEnabled;
      chart.options.plugins.decimation.samples = decimationSamples;

      // Mutate zoom/pan settings
      const isPanZoomEnabled = enablePanZoom && !defineROI;
      chart.options.plugins.zoom.pan.enabled = isPanZoomEnabled && panState;
      chart.options.plugins.zoom.pan.mode =
        isPanZoomEnabled && panState ? "x" : false;
      chart.options.plugins.zoom.zoom.wheel.enabled =
        isPanZoomEnabled && zoomState;
      chart.options.plugins.zoom.zoom.pinch.enabled =
        isPanZoomEnabled && zoomState;
      chart.options.plugins.zoom.zoom.mode =
        isPanZoomEnabled && zoomState ? "x" : false;

      // Mutate event handlers based on ROI mode
      chart.options.events = defineROI
        ? ["mousedown", "mousemove", "mouseup", "mouseout"]
        : isPanZoomEnabled
        ? [
            "mousedown",
            "mousemove",
            "mouseup",
            "mouseout",
            "click",
            "touchstart",
            "touchmove",
            "wheel",
          ]
        : ["mousemove", "mouseout", "click", "touchstart", "touchmove"];

      // Use regular update() to reinitialize zoom plugin event handlers
      // This is necessary for pan/zoom to work properly when enabled
      perf.time("chart.update (full)", () => chart.update());
    }, [
      defineROI,
      enablePanZoom,
      panState,
      zoomState,
      decimationEnabled,
      decimationSamples,
    ]);

    // Keep the y-axis bounds in sync with the current processedSignal
    // without rebuilding chartOptions (which would recreate the chart
    // and lose the user's pan/zoom state). The explicit bounds set in
    // chartOptions only take effect at first creation; this effect
    // applies any subsequent changes (well switch, noise-suppression
    // toggle that shifts amplitude) via in-place mutation. Padded
    // values are used so peaks don't sit flush against the top edge.
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;
      if (!isFinite(paddedYMin) || !isFinite(paddedYMax)) return;
      chart.options.scales.y.min = paddedYMin;
      chart.options.scales.y.max = paddedYMax;
      chart.update("none");
    }, [paddedYMin, paddedYMax]);

    // Mutate annotation options in place for ROI and burst visualizations
    useEffect(() => {
      const chart = neuralGraphRef.current;
      if (!chart) return;

      // Build annotations object
      const allRoiAnnotations = {};

      // Add ROI boxes from roiList. Y bounds always come from the
      // chart's *current* y scale so the box spans the full visible
      // height even after the user switches wells. Previously we
      // honored `roi.yMin` / `roi.yMax` from the stored ROI object,
      // but those values were captured at draw time from the original
      // well's scale and never updated — switching wells left the box
      // sized to the old well's amplitude range and no longer
      // covering the new chart's full height.
      if (Array.isArray(roiList)) {
        roiList.forEach((roi, idx) => {
          if (roi && roi.xMin !== undefined && roi.xMax !== undefined) {
            const color = roiColors[idx % roiColors.length];
            allRoiAnnotations[`roi${idx + 1}`] = {
              type: "box",
              xMin: roi.xMin,
              xMax: roi.xMax,
              yMin: chart.scales.y.min,
              yMax: chart.scales.y.max,
              backgroundColor: color.bg,
              borderColor: color.border,
              borderWidth: 2,
            };
          }
        });
      }

      // Add burst annotations if enabled
      if (showBursts && Array.isArray(burstResults)) {
        burstResults.forEach((burst, idx) => {
          allRoiAnnotations[`burst${idx + 1}`] = {
            type: "box",
            xMin: burst.startTime,
            xMax: burst.endTime,
            backgroundColor: BURST_STYLE.fill,
            borderColor: BURST_STYLE.border,
            borderWidth: BURST_STYLE.borderWidth,
          };
        });
      }

      // Add the currently drawn ROI (if any)
      if (roiAnnotation) {
        allRoiAnnotations[`roiCurrent`] = roiAnnotation;
      }

      // Activity Threshold line — horizontal floor positioned at the
      // ratio (0–1) of the well's Y range. Drawn only when the user has
      // enabled the threshold from its control panel.
      const yRangeValid =
        isFinite(localMinY) && isFinite(localMaxY) && localMaxY > localMinY;
      if (activityThresholdEnabled && yRangeValid) {
        const absoluteThreshold =
          localMinY + activityThresholdRatio * (localMaxY - localMinY);
        allRoiAnnotations.activityThreshold = {
          type: "line",
          yMin: absoluteThreshold,
          yMax: absoluteThreshold,
          borderColor: ACTIVITY_THRESHOLD_STYLE.color,
          borderWidth: ACTIVITY_THRESHOLD_STYLE.width,
          borderDash: ACTIVITY_THRESHOLD_STYLE.dash,
          label: {
            display: true,
            content: `≥ ${Math.round(activityThresholdRatio * 100)}%`,
            position: "end",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: ACTIVITY_THRESHOLD_STYLE.color,
            font: { size: 10 },
          },
        };
      }

      // Baseline Threshold line — same drag mechanics as Activity, but
      // its Y value also feeds peak base detection (see findBases'
      // baseline mode in detectSpikes). Different color/dash so the two
      // lines are distinguishable when both are enabled.
      if (baselineThresholdEnabled && yRangeValid) {
        const absBaseline =
          localMinY + baselineThresholdRatio * (localMaxY - localMinY);
        allRoiAnnotations.baselineThreshold = {
          type: "line",
          yMin: absBaseline,
          yMax: absBaseline,
          borderColor: BASELINE_THRESHOLD_STYLE.color,
          borderWidth: BASELINE_THRESHOLD_STYLE.width,
          borderDash: BASELINE_THRESHOLD_STYLE.dash,
          label: {
            display: true,
            content: `baseline ${Math.round(baselineThresholdRatio * 100)}%`,
            position: "start",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: BASELINE_THRESHOLD_STYLE.color,
            font: { size: 10 },
          },
        };
      }

      // Mutate annotations in place
      chart.options.plugins.annotation.annotations = allRoiAnnotations;
      perf.time("chart.update (annotations)", () => chart.update("none"));
    }, [
      roiList,
      showBursts,
      burstResults,
      roiAnnotation,
      roiColors,
      localMaxY,
      localMinY,
      activityThresholdEnabled,
      activityThresholdRatio,
      baselineThresholdEnabled,
      baselineThresholdRatio,
    ]);

    // Mouse event handlers for ROI selection (only active if defineROI is true and currentRoiIndex is set)
    const handleMouseDown = (event) => {
      if (!defineROI || currentRoiIndex === null) return;
      const chart = neuralGraphRef.current;
      if (!chart) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      setIsSelectingROI(true);
      setRoiStart(x);
      setRoiEnd(null);
    };

    const handleMouseMove = useCallback(
      (event) => {
        if (!defineROI || !isSelectingROI || currentRoiIndex === null) return;
        const chart = neuralGraphRef.current;
        if (!chart) return;
        const rect = chart.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        setRoiEnd(x);

        // Draw annotation box dynamically with color based on currentRoiIndex
        const xMin = Math.min(roiStart, x);
        const xMax = Math.max(roiStart, x);
        const yMin = chart.scales.y.min;
        const yMax = chart.scales.y.max;
        const xMinVal = chart.scales.x.getValueForPixel(xMin);
        const xMaxVal = chart.scales.x.getValueForPixel(xMax);

        // Use the color for the current ROI being defined
        const currentColor =
          currentRoiIndex !== null
            ? roiColors[currentRoiIndex % roiColors.length]
            : roiColors[0]; // Fallback to first color

        setRoiAnnotation({
          type: "box",
          xMin: xMinVal,
          xMax: xMaxVal,
          yMin,
          yMax,
          backgroundColor: currentColor.bg,
          borderColor: currentColor.border,
          borderWidth: 2,
        });
        setAnnotationKey((k) => k + 1); // force re-render
      },
      [defineROI, isSelectingROI, roiStart, currentRoiIndex, roiColors]
    );

    const handleMouseUp = (event) => {
      if (!defineROI || !isSelectingROI) return;
      setIsSelectingROI(false);

      // Only process ROI if currentRoiIndex is set
      if (currentRoiIndex === null) {
        // Clear any temporary annotation
        setRoiAnnotation(null);
        setAnnotationKey((k) => k + 1);
        return;
      }

      const chart = neuralGraphRef.current;
      if (!chart) return;
      const rect = chart.canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let xMin = Math.min(roiStart, x);
      let xMax = Math.max(roiStart, x);
      // Convert to data values
      let xMinVal = chart.scales.x.getValueForPixel(xMin);
      let xMaxVal = chart.scales.x.getValueForPixel(xMax);

      // Add ROI to list and clear currentRoiIndex
      if (
        typeof setRoiList === "function" &&
        typeof setCurrentRoiIndex === "function"
      ) {
        const newRoi = {
          xMin: xMinVal,
          xMax: xMaxVal,
          yMin: chart.scales.y.min,
          yMax: chart.scales.y.max,
        };
        const updatedRois = [...roiList];
        updatedRois[currentRoiIndex] = newRoi;
        setRoiList(updatedRois);
        setCurrentRoiIndex(null);
        // Clear temporary annotation since it's now in roiList
        setRoiAnnotation(null);
        setAnnotationKey((k) => k + 1);
      }
    };

    // Pointer-event dispatcher. ROI mode wins when active; otherwise we
    // hit-test each enabled threshold line and start a drag if the
    // cursor lands within ~8px of it. Using pointer events (not mouse
    // events) lets us call setPointerCapture so a drag that escapes the
    // canvas still commits cleanly.
    //
    // `activeDragRef` holds the descriptor of whichever line the user
    // grabbed, or null. The pan-zoom plugin reads it via `onPanStart` /
    // `onZoomStart` to cancel its own gesture during a threshold drag.
    const activeDragRef = useRef(null);

    // Seed the Baseline Threshold ratio from the well's noise median
    // the first time the user enables it for a given well. Without
    // this, the line lands wherever the previous well left it (or at
    // the initial 0.1 default), which can be visually nonsense on a
    // well whose noise floor sits far from that point. Tracked by well
    // key so re-enabling on the same well keeps the user's last drag,
    // but switching wells re-seeds on the next enable.
    const baselineSeededWellRef = useRef({ wellKey: null, seeded: false });
    useEffect(() => {
      const wellKey = selectedWell?.key ?? null;
      if (baselineSeededWellRef.current.wellKey !== wellKey) {
        baselineSeededWellRef.current = { wellKey, seeded: false };
      }
      if (!baselineThresholdEnabled) return;
      if (baselineSeededWellRef.current.seeded) return;
      if (!processedSignal || processedSignal.length === 0) return;
      if (!isFinite(localMinY) || !isFinite(localMaxY) || localMaxY <= localMinY) {
        return;
      }
      const median = getSignalMedianY(processedSignal);
      if (median === null || !isFinite(median)) return;
      const range = localMaxY - localMinY;
      const ratio = Math.max(0, Math.min(1, (median - localMinY) / range));
      setBaselineThresholdRatio(ratio);
      baselineSeededWellRef.current.seeded = true;
    }, [
      baselineThresholdEnabled,
      selectedWell?.key,
      processedSignal,
      localMinY,
      localMaxY,
      setBaselineThresholdRatio,
    ]);

    // Drag descriptors — one per threshold line. Each describes the
    // annotation it targets and the setter that commits the final ratio
    // on pointerup. Centralizing here keeps the down/move/up handlers
    // generic so adding more horizontal-line controls in the future is
    // just another descriptor.
    const thresholdDrags = [
      activityThresholdEnabled && {
        key: "activity",
        annotationKey: "activityThreshold",
        ratio: activityThresholdRatio,
        commit: setActivityThresholdRatio,
        label: (r) => `≥ ${Math.round(r * 100)}%`,
      },
      baselineThresholdEnabled && {
        key: "baseline",
        annotationKey: "baselineThreshold",
        ratio: baselineThresholdRatio,
        commit: setBaselineThresholdRatio,
        label: (r) => `baseline ${Math.round(r * 100)}%`,
      },
    ].filter(Boolean);

    // Back-compat: the chartOptions pan/zoom guards (onPanStart /
    // onZoomStart) reference `isDraggingThresholdRef` from before the
    // second line existed. Keep the ref name and have it mirror the
    // generic activeDragRef so the existing guards still work.
    const isDraggingThresholdRef = useRef(false);
    const draftRatioRef = useRef(0);

    const handlePointerDown = (event) => {
      // Threshold hit-test runs first, regardless of ROI mode. Threshold
      // drag is vertical and ROI drag is horizontal, so they never
      // genuinely conflict — but if defineROI short-circuits the handler
      // (as it did originally), the user can never grab a threshold line
      // while ROI mode is on. Hit-test gives threshold drag priority
      // when the cursor is within ~8 px of a line; otherwise we fall
      // through to ROI horizontal drag.
      const chart = neuralGraphRef.current;
      if (
        thresholdDrags.length > 0 &&
        chart &&
        isFinite(localMinY) &&
        isFinite(localMaxY)
      ) {
        const rect = event.currentTarget.getBoundingClientRect();
        const py = event.clientY - rect.top;
        const range = localMaxY - localMinY;
        let best = null;
        let bestDist = 8;
        for (const drag of thresholdDrags) {
          const absT = localMinY + drag.ratio * range;
          const linePy = chart.scales.y.getPixelForValue(absT);
          const dist = Math.abs(py - linePy);
          if (dist < bestDist) {
            best = drag;
            bestDist = dist;
          }
        }
        if (best) {
          activeDragRef.current = best;
          isDraggingThresholdRef.current = true;
          draftRatioRef.current = best.ratio;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch (_e) {
            // setPointerCapture can throw if the pointer has already
            // moved; harmless — the drag still works via the React
            // pointermove handler below.
          }
          event.preventDefault();
          return;
        }
      }
      if (defineROI) {
        handleMouseDown(event);
      }
    };

    const handlePointerMove = (event) => {
      // Threshold drag in flight always wins, even in ROI mode, so the
      // user can drag a line vertically while the ROI tool is armed
      // (ROI selection is horizontal — they don't truly conflict).
      const drag = activeDragRef.current;
      if (!drag) {
        if (defineROI) handleMouseMove(event);
        return;
      }
      const chart = neuralGraphRef.current;
      if (!chart || !isFinite(localMinY) || !isFinite(localMaxY)) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const py = event.clientY - rect.top;
      const absT = chart.scales.y.getValueForPixel(py);
      const range = localMaxY - localMinY;
      const rawRatio = range > 0 ? (absT - localMinY) / range : 0.5;
      const ratio = Math.max(0, Math.min(1, rawRatio));
      draftRatioRef.current = ratio;
      // Live-update the line annotation imperatively. Avoid calling the
      // committer during drag — committing on pointerup means the
      // pipeline only re-runs once, after release.
      const ann = chart.options?.plugins?.annotation?.annotations;
      const a = ann?.[drag.annotationKey];
      if (a) {
        const newAbs = localMinY + ratio * range;
        a.yMin = newAbs;
        a.yMax = newAbs;
        if (a.label) a.label.content = drag.label(ratio);
        chart.update("none");
      }
    };

    const handlePointerUp = (event) => {
      // Matching symmetry with handlePointerDown / handlePointerMove:
      // commit an in-flight threshold drag before deferring to ROI mode.
      const drag = activeDragRef.current;
      if (!drag) {
        if (defineROI) handleMouseUp(event);
        return;
      }
      activeDragRef.current = null;
      isDraggingThresholdRef.current = false;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (_e) {
        // ignore — capture may have already been released
      }
      drag.commit(draftRatioRef.current);
    };

    useImperativeHandle(ref, () => ({
      resetZoom() {
        if (neuralGraphRef.current) {
          neuralGraphRef.current.resetZoom();
        }
      },
    }));

    return (
      <>
        {selectedWell && chartData ? (
          <Line
            className={className}
            data={chartData}
            options={chartOptions}
            ref={neuralGraphRef}
            style={{
              background: "rgb(0, 0, 0)",
              width: "100%",
              border: "0.1em solid rgb(100, 100, 100)",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        ) : (
          <p className="no-well-selected">
            No well selected or no chart data available
          </p>
        )}
      </>
    );
  }
);
export default NeuralGraph;
