// Control-well scaling: express peak height / AUC (and the displayed signal)
// as a percentage of the untreated "control" wells, so the control wells'
// median peak height reads 100 and everything else is a % of it.
//
// The scale factor k = 100 / controlMedian is inherently POST-detection:
// controlMedian is the median (across control wells) of each control well's
// median peak height, which is only known after spike detection runs. So
// detection always runs in NATIVE units (with the user's prominence in
// native units), and k is applied afterward as a pure units transform to
// signal-magnitude quantities (amplitude, AUC, peak/base Y, signal Y).
// Scaling before detection would be circular (k comes from detection) and
// would make detection sensitivity depend on which wells are controls.
//
// Shared by the live modal (NeuralResultsContext) and the report builders
// so the same control set yields the same number everywhere.

import { runNeuralAnalysisPipeline } from "../../NeuralPipeline";
import { calculateSpikeAmplitude } from "./reportMetrics";

// Median of a plain numeric array; null on empty.
function medianOf(values) {
  const n = values.length;
  if (n === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = n >> 1;
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Materialize a well's signal as {x,y}[] (post-Phase-C the {x,y}[] form is
// lazy; fall back to whatever the well carries). When `useRaw` is set —
// i.e. ΔF/F₀ normalization is on — source the RAW signal, matching what
// the live modal feeds the pipeline (the selected well also switches to
// raw). Otherwise the control wells would be detected on filtered data
// while the selected well runs on raw, and the scale factor would be
// computed in mismatched units.
function materializeWellSignal(well, useRaw = false) {
  const ind = well?.indicators?.[0];
  if (!ind) return [];
  if (useRaw) {
    return typeof ind.materializeRawData === "function"
      ? ind.materializeRawData()
      : ind.rawData || [];
  }
  return typeof ind.materializeFilteredData === "function"
    ? ind.materializeFilteredData()
    : ind.filteredData || [];
}

/**
 * Compute the control-well scale factor.
 *
 * For each control well: run the SAME pipeline (same global params) and
 * take that well's median peak height (`calculateSpikeAmplitude(...).median`).
 * Then take the median of those per-well medians → `controlMedian`.
 * Wells with no detected spikes are skipped (they'd otherwise drag the
 * median to 0).
 *
 * @param {Array} controlWells well objects designated as controls
 * @param {object} opts
 * @param {object} opts.params  pipeline params (same shape the live run uses)
 * @param {Array}  [opts.controlSignal] noise-subtraction control signal
 * @param {boolean} [opts.noiseSuppressionActive]
 * @returns {{controlMedian: number|null, k: number|null, usedWellCount: number}}
 */
export function computeControlScaleFactor(
  controlWells,
  { params, controlSignal = [], noiseSuppressionActive = false } = {}
) {
  if (!Array.isArray(controlWells) || controlWells.length === 0) {
    return { controlMedian: null, k: null, usedWellCount: 0 };
  }
  const signals = controlWells
    .map((well) =>
      materializeWellSignal(well, !!params?.neuralNormalizationEnabled)
    )
    .filter((sig) => Array.isArray(sig) && sig.length > 0);
  return computeControlScaleFromSignals(signals, {
    params,
    controlSignal,
    noiseSuppressionActive,
  });
}

/**
 * Core of the control-scale computation, decoupled from well objects: takes
 * already-materialized control-well signals ({x,y}[] each) and runs the same
 * per-well detection + median-of-medians as computeControlScaleFactor. Shared
 * by the synchronous main-thread path (reports/tests, via
 * computeControlScaleFactor) and the worker path (neuralPipeline.worker.js),
 * so both yield an identical scale factor for the same inputs.
 *
 * @param {Array<Array<{x:number,y:number}>>} signals per-control-well signals
 * @returns {{controlMedian: number|null, k: number|null, usedWellCount: number}}
 */
export function computeControlScaleFromSignals(
  signals,
  { params, controlSignal = [], noiseSuppressionActive = false } = {}
) {
  const perWellMedians = [];
  for (const rawSignal of signals || []) {
    if (!rawSignal || rawSignal.length === 0) continue;
    const result = runNeuralAnalysisPipeline({
      rawSignal,
      controlSignal,
      params,
      analysis: { runSpikeDetection: true, runBurstDetection: false },
      noiseSuppressionActive,
      cache: null,
    });
    const spikes = result.spikeResults || [];
    if (spikes.length === 0) continue;
    const m = calculateSpikeAmplitude(spikes).median;
    if (typeof m === "number" && Number.isFinite(m) && m > 0) {
      perWellMedians.push(m);
    }
  }
  const controlMedian = medianOf(perWellMedians);
  const k =
    typeof controlMedian === "number" && controlMedian > 0
      ? 100 / controlMedian
      : null;
  return { controlMedian, k, usedWellCount: perWellMedians.length };
}

// Scale one spike's signal-magnitude fields by k, returning a plain copy.
// Consumers read precomputed fields (amplitude/auc/coords) — never methods —
// so a plain spread clone is safe (verified against NeuralGraph/NeuralResults).
export function scaleSpike(s, k) {
  const out = { ...s };
  if (typeof s.amplitude === "number") out.amplitude = s.amplitude * k;
  if (typeof s.auc === "number") out.auc = s.auc * k;
  if (s.peakCoords) out.peakCoords = { ...s.peakCoords, y: s.peakCoords.y * k };
  if (s.leftBaseCoords) {
    out.leftBaseCoords = { ...s.leftBaseCoords, y: s.leftBaseCoords.y * k };
  }
  if (s.rightBaseCoords) {
    out.rightBaseCoords = { ...s.rightBaseCoords, y: s.rightBaseCoords.y * k };
  }
  if (s.prominences) {
    out.prominences = {
      ...s.prominences,
      leftProminence: s.prominences.leftProminence * k,
      rightProminence: s.prominences.rightProminence * k,
    };
  }
  return out;
}

function scaleAmpStat(stat, k) {
  if (!stat) return stat;
  return {
    ...stat,
    average: stat.average * k,
    median: stat.median * k,
    min: stat.min * k,
    max: stat.max * k,
  };
}

/**
 * Return a scaled copy of a pipeline result (the live-modal transform).
 * Scales signal-magnitude quantities by k and leaves time / width /
 * frequency / count untouched. Detection already ran in native units.
 *
 * NOTE: `metrics.signalRange` / `signalYMin` / `signalYMax` / `robustStd`
 * are intentionally LEFT NATIVE — they drive the prominence slider's range
 * (SpikeDetectionControls), which operates in native detection units. The
 * graph derives its own y-bounds from the scaled `processedSignal`, so the
 * waveform, peaks, and threshold lines stay mutually consistent.
 */
export function scalePipelineResults(results, k) {
  if (!results || typeof k !== "number" || !Number.isFinite(k)) return results;
  const processedSignal = Array.isArray(results.processedSignal)
    ? results.processedSignal.map((p) => ({ x: p.x, y: p.y * k }))
    : results.processedSignal;
  const spikeResults = Array.isArray(results.spikeResults)
    ? results.spikeResults.map((s) => scaleSpike(s, k))
    : results.spikeResults;
  const burstResults = Array.isArray(results.burstResults)
    ? results.burstResults.map((b) =>
        typeof b.auc === "number" ? { ...b, auc: b.auc * k } : b
      )
    : results.burstResults;
  const m = results.metrics || {};
  const metrics = {
    ...m,
    spikeAmplitude: scaleAmpStat(m.spikeAmplitude, k),
    spikeAUC: scaleAmpStat(m.spikeAUC, k),
  };
  return { ...results, processedSignal, spikeResults, burstResults, metrics };
}

/**
 * Live-modal transform for control-well scaling — scales ONLY the reported
 * magnitude numbers (per-spike amplitude / AUC and their aggregates), and
 * leaves ALL geometry native: `processedSignal`, peak/base coordinates,
 * prominences, and the signal-range fields.
 *
 * Why (vs scalePipelineResults, which scales the signal too): the graph
 * derives its y-axis from `processedSignal` and places peak markers from
 * the coordinates. Scaling those makes the whole axis lurch whenever the
 * scale factor k changes — and k is recomputed from the control wells'
 * detected peaks every time a detection parameter (e.g. prominence) moves,
 * so the axis jumped around as the user tuned prominence. Keeping geometry
 * native pins the axis; the metric cards read the scaled `.amplitude` /
 * `.auc` fields and so still read as "% of control". Overlays (prominence /
 * noise lines) stay in native units too, consistent with the native trace.
 */
export function scaleReportedMetrics(results, k) {
  if (!results || typeof k !== "number" || !Number.isFinite(k)) return results;
  const spikeResults = Array.isArray(results.spikeResults)
    ? results.spikeResults.map((s) => {
        const out = { ...s };
        if (typeof s.amplitude === "number") out.amplitude = s.amplitude * k;
        if (typeof s.auc === "number") out.auc = s.auc * k;
        return out;
      })
    : results.spikeResults;
  const burstResults = Array.isArray(results.burstResults)
    ? results.burstResults.map((b) =>
        typeof b.auc === "number" ? { ...b, auc: b.auc * k } : b
      )
    : results.burstResults;
  const m = results.metrics || {};
  const metrics = {
    ...m,
    spikeAmplitude: scaleAmpStat(m.spikeAmplitude, k),
    spikeAUC: scaleAmpStat(m.spikeAUC, k),
  };
  // processedSignal + coordinates intentionally untouched (native).
  return { ...results, spikeResults, burstResults, metrics };
}
