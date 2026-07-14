/* eslint-disable no-restricted-globals */
/**
 * plateRange.worker.js — computes the Universal (whole-plate) y-scale
 * range off the main thread.
 *
 * The Neural modal's "Universal" y-scale fixes the chart's y-axis to the
 * range of the PROCESSED signal across EVERY well, so well amplitudes are
 * directly comparable. That means running the neural pipeline once per
 * well (detection OFF) and taking the global min/max of the processed
 * trace — 96 to 384 pipeline runs. Doing that on the main thread froze
 * the modal on every processing-param change (Universal is the default),
 * so it lives here instead.
 *
 * This is a SEPARATE worker from neuralPipeline.worker.js on purpose: the
 * per-well worker serves the live chart, and a multi-second plate sweep
 * must not block it. Each worker is single-threaded.
 *
 * Wire protocol:
 *   in:  { type: "runPlateRange", reqId, wells: [{ xs, ys }, ...],
 *          control: { xs, ys }, params, noiseSuppressionActive }
 *   out: { type: "plateRange", reqId, min, max }   // min/max null if empty
 *   err: { type: "error", reqId, message }
 *
 * Inputs use Transferable typed-array buffers so postMessage doesn't
 * structured-clone every well's samples. No stage cache: each well is a
 * one-shot run with `cache: null`, mirroring the previous main-thread
 * whole-plate loop (and the full-plate report path).
 */

import { runNeuralAnalysisPipeline } from "../components/NeuralAnalysis/NeuralPipeline";

self.onmessage = (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "runPlateRange") return;
  const { reqId, wells, control, params, noiseSuppressionActive } = msg;

  try {
    // Pass the transferred typed arrays straight into the pipeline — it accepts
    // an { xs, ys } pair and never builds a per-well {x,y}[] for the input.
    // Across 96–384 wells that removes one full-N object array per well.
    const controlSignal = control
      ? { xs: control.xs, ys: control.ys }
      : [];

    let min = Infinity;
    let max = -Infinity;
    const list = Array.isArray(wells) ? wells : [];
    for (let w = 0; w < list.length; w++) {
      const well = list[w];
      if (!well || !well.ys || well.ys.length === 0) continue;
      const res = runNeuralAnalysisPipeline({
        rawSignal: { xs: well.xs, ys: well.ys },
        controlSignal,
        params,
        analysis: { runSpikeDetection: false, runBurstDetection: false },
        noiseSuppressionActive,
        cache: null,
      });
      // Read the processed Y straight off the typed array the pipeline exposes.
      const ys = res.processedYs || [];
      for (let i = 0; i < ys.length; i++) {
        const y = ys[i];
        if (y < min) min = y;
        if (y > max) max = y;
      }
    }

    const ok = isFinite(min) && isFinite(max) && max > min;
    self.postMessage({
      type: "plateRange",
      reqId,
      min: ok ? min : null,
      max: ok ? max : null,
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      reqId,
      message: err && err.message ? err.message : String(err),
    });
  }
};
