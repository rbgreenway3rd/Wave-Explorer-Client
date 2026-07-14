/* eslint-disable no-restricted-globals */
/**
 * neuralPipeline.worker.js — runs the Neural Analysis pipeline off the
 * main thread.
 *
 * Wire protocol:
 *   in:  { type: "run", reqId, signal: { xs, ys }, control: { xs, ys },
 *          params, analysis, noiseSuppressionActive }
 *   out: { type: "result", reqId, processedXs, processedYs, spikes,
 *          bursts, metrics }
 *   err: { type: "error", reqId, message }
 *
 * Inputs/outputs use Transferable typed-array buffers so postMessage
 * doesn't structured-clone megabytes of sample data on each call.
 *
 * Stage cache lives inside the worker and survives across requests, so
 * spike-prominence drags reuse upstream stages exactly the same way the
 * main-thread runner did pre-Tier-F.
 *
 * Worker-side stale-request handling: the main-thread side is expected
 * to coalesce rapid input bursts via yield-to-browser + stale-check
 * BEFORE posting. So in steady state the worker sees one request at a
 * time. Stale-aware result handling on the main-thread runner is the
 * defensive backstop.
 */

import { runNeuralAnalysisPipeline } from "../components/NeuralAnalysis/NeuralPipeline";
import { computeControlScaleFromSignals } from "../components/NeuralAnalysis/utilities/neuralReportBuilder/controlScaling";
import { makePipelineCache } from "../components/NeuralAnalysis/utilities/pipelineCache";
import { perf } from "../components/NeuralAnalysis/utilities/perfLogger";

const cache = makePipelineCache();

// Materialize a {x, y}[] view from parallel typed arrays. One allocation
// for the array of objects; the underlying typed arrays themselves were
// transferred (no copy on receipt).
function materialize(xs, ys) {
  if (!xs || !ys || xs.length === 0) return [];
  const n = ys.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = { x: xs[i], y: ys[i] };
  return out;
}

// Strip the `data` reference from each spike before posting back. The
// `data` field on NeuralPeak / readded outlier spikes is a reference to
// the 250K-element processedSignal array — structured clone would
// deep-copy it once per spike, killing the worker's whole purpose.
function stripSpike(p) {
  return {
    peakCoords: p.peakCoords,
    leftBaseCoords: p.leftBaseCoords,
    rightBaseCoords: p.rightBaseCoords,
    prominences: p.prominences,
    index: p.index,
    leftBaseIdx: p.leftBaseIdx,
    rightBaseIdx: p.rightBaseIdx,
    time: p.time,
    amplitude: p.amplitude,
    width: p.width,
    auc: p.auc,
    isOutlier: p.isOutlier,
    outlierSpike: p.outlierSpike,
    // Detection-side metadata used by parameter-visualization overlays.
    // Topographic bases / prominence drive the actual prominence + noise
    // floor gates; ship them so overlays can render the gate exactly as
    // the pipeline applied it. noiseSigma is the per-peak σ used by the
    // noise floor gate (local-block σ or global robustStd).
    detectionLeftBaseIdx: p.detectionLeftBaseIdx,
    detectionRightBaseIdx: p.detectionRightBaseIdx,
    detectionProminence: p.detectionProminence,
    noiseSigma: p.noiseSigma ?? null,
  };
}

// Control-well scale factor, off the main thread. `wells` is an array of
// { xs, ys } typed-array pairs (one per control well); `control` is the
// optional noise-subtraction signal. Runs the same per-well detection +
// median-of-medians as the synchronous computeControlScaleFactor and posts
// back { controlMedian, k, usedWellCount }. Keeps the modal's main thread
// free when control scaling is enabled on large plates.
function handleControlScale(msg) {
  const { reqId, wells, control, params, noiseSuppressionActive } = msg;
  try {
    const signals = (wells || []).map((w) => materialize(w.xs, w.ys));
    const controlSignal = materialize(control?.xs, control?.ys);
    const { controlMedian, k, usedWellCount } = computeControlScaleFromSignals(
      signals,
      { params, controlSignal, noiseSuppressionActive }
    );
    self.postMessage({
      type: "controlScale",
      reqId,
      controlMedian,
      k,
      usedWellCount,
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      reqId,
      message: err && err.message ? err.message : String(err),
    });
  }
}

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg) return;
  if (msg.type === "controlScale") {
    handleControlScale(msg);
    return;
  }
  if (msg.type !== "run") return;
  const {
    reqId,
    signal,
    control,
    params,
    analysis,
    noiseSuppressionActive,
    perfMode,
  } = msg;

  // Mirror main-thread perf state into the worker so per-stage timings
  // surface in the parent console when ?perfMode=1 is enabled.
  perf.setEnabled(perfMode === true);

  try {
    // Pass the transferred typed arrays straight into the pipeline — it now
    // accepts an { xs, ys } pair and threads typed arrays internally, so no
    // {x,y}[] object array is ever built for the input (the largest per-run
    // allocation). Empty { xs, ys } (length-0) means "no control".
    const rawSignal = { xs: signal.xs, ys: signal.ys };
    const controlSignal = control
      ? { xs: control.xs, ys: control.ys }
      : [];

    // One-shot diagnostic: prints the per-call signal size + the keys
    // present on `analysis` and `params`. Lets us see immediately
    // whether the worker is being called with the inputs we expect
    // (or e.g. an empty rawSignal that would explain a < 1 ms run).
    if (perf.enabled) {
      // eslint-disable-next-line no-console
      console.log(
        `[worker] run reqId=${reqId} rawSignal.length=${signal.ys?.length ?? 0} controlSignal.length=${control?.ys?.length ?? 0} analysis=${JSON.stringify(
          analysis
        )} params.spikeProminence=${params?.spikeProminence} params.smoothingEnabled=${params?.smoothingEnabled}`
      );
    }

    const result = runNeuralAnalysisPipeline({
      rawSignal,
      controlSignal,
      params,
      analysis,
      noiseSuppressionActive,
      cache,
    });

    if (perf.enabled) {
      // eslint-disable-next-line no-console
      console.log(
        `[worker] run reqId=${reqId} done — spikes=${result.spikeResults?.length ?? 0} bursts=${result.burstResults?.length ?? 0} processedSignal.length=${result.processedSignal?.length ?? 0}`
      );
    }

    // The pipeline already exposes the processed signal as typed arrays (the
    // shared X + final-stage Y) — transfer them directly instead of flattening
    // the {x,y}[] back into typed arrays. `slice()` detaches from any buffer
    // that was transferred IN (the input xs/ys) so we never post a
    // double-transferred or aliased buffer.
    const processedXs =
      result.processedXs instanceof Float64Array
        ? result.processedXs.slice()
        : new Float64Array(0);
    const processedYs =
      result.processedYs instanceof Float64Array
        ? result.processedYs.slice()
        : new Float64Array(0);
    const wireSpikes = (result.spikeResults || []).map(stripSpike);

    // Candidate diagnostics for the Decision Explanation Layer. Records
    // already trimmed to the cap (≤1500) in the pipeline; structuredClone
    // through postMessage handles the per-record object shape fine at
    // this size (~300KB worst case). No transferable optimization here
    // yet — profile first if it becomes a hot path.
    const candidateDiagnostics = result.candidateDiagnostics || {
      records: [],
      truncatedCount: 0,
      totalCandidates: 0,
    };
    // Compact candidate-distribution histograms (typed arrays). Used by
    // the Distributions panel's prominence chart; pre-binned in the
    // pipeline so the wire payload is fixed-size (~600 B) regardless of
    // input size. Survives structuredClone — the typed arrays clone
    // cheaply at this size, no transferables needed.
    const candidateDistributions = result.candidateDistributions || {
      prominence: {
        edges: new Float32Array([0, 1]),
        counts: new Uint32Array([0]),
        max: 0,
      },
    };

    self.postMessage(
      {
        type: "result",
        reqId,
        processedXs,
        processedYs,
        spikes: wireSpikes,
        bursts: result.burstResults || [],
        metrics: result.metrics || {},
        candidateDiagnostics,
        candidateDistributions,
        outlierRemoval: result.outlierRemoval || {
          count: 0,
          regions: [],
          outlierPoints: [],
        },
      },
      [processedXs.buffer, processedYs.buffer]
    );
  } catch (err) {
    self.postMessage({
      type: "error",
      reqId,
      message: err && err.message ? err.message : String(err),
    });
  }
};
