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

// Convert {x, y}[] back to parallel typed arrays for Transferable post.
function flatten(points) {
  const n = points ? points.length : 0;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = points[i].x;
    ys[i] = points[i].y;
  }
  return { xs, ys };
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
  };
}

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "run") return;
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
    const rawSignal = materialize(signal.xs, signal.ys);
    const controlSignal = materialize(control?.xs, control?.ys);

    // One-shot diagnostic: prints the per-call signal size + the keys
    // present on `analysis` and `params`. Lets us see immediately
    // whether the worker is being called with the inputs we expect
    // (or e.g. an empty rawSignal that would explain a < 1 ms run).
    if (perf.enabled) {
      // eslint-disable-next-line no-console
      console.log(
        `[worker] run reqId=${reqId} rawSignal.length=${rawSignal.length} controlSignal.length=${controlSignal.length} analysis=${JSON.stringify(
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

    const { xs: processedXs, ys: processedYs } = flatten(result.processedSignal);
    const wireSpikes = (result.spikeResults || []).map(stripSpike);

    self.postMessage(
      {
        type: "result",
        reqId,
        processedXs,
        processedYs,
        spikes: wireSpikes,
        bursts: result.burstResults || [],
        metrics: result.metrics || {},
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
