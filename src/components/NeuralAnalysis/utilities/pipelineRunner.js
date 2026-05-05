import { perf } from "./perfLogger";

/**
 * pipelineRunner — async wrapper around the Neural Analysis pipeline
 * that runs the compute in a Web Worker. This keeps the main thread
 * free during pipeline runs (target: slider thumb interactive even on
 * a cold-cache, multi-second pipeline run on a 250K-sample signal).
 *
 * Two layers of staleness handling:
 *
 *   1. Main-thread coalescing: each run() yields once before posting,
 *      and bails if a newer run() superseded it during the yield. This
 *      keeps rapid input bursts (e.g. a slider drag) from queueing
 *      pipeline runs in the worker — only the latest is sent.
 *
 *   2. Result-time check: when the worker posts a result, the main
 *      thread checks reqId against activeReqId. Stale results are
 *      ignored. This is the defensive backstop — under normal use,
 *      layer (1) prevents stale results from existing at all.
 *
 * Inputs use typed arrays (Float64Array xs/ys) and are Transferable so
 * postMessage is O(1) per call regardless of signal length.
 *
 * The stage cache lives inside the worker (single instance per worker,
 * survives across requests) — same caching semantics as the previous
 * main-thread runner.
 */

const STALE = Symbol("stale");

const yieldToBrowser = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Build typed-array views over a {x,y}[] for Transferable posting.
function flattenSignal(signal) {
  const n = signal ? signal.length : 0;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = signal[i].x;
    ys[i] = signal[i].y;
  }
  return { xs, ys };
}

// Materialize {x,y}[] back from typed arrays the worker returns. One
// allocation for the array of objects; no copy of the underlying
// typed-array buffers (they were transferred from the worker).
function materialize(xs, ys) {
  const n = ys ? ys.length : 0;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = { x: xs[i], y: ys[i] };
  return out;
}

export function makePipelineRunner() {
  let activeReqId = 0;
  let worker = null;
  // pending: reqId → { resolve, reject }
  const pending = new Map();

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(
      new URL("../../../workers/neuralPipeline.worker.js", import.meta.url)
    );
    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      const entry = pending.get(msg.reqId);
      if (!entry) return; // already considered stale on main side
      pending.delete(msg.reqId);
      if (msg.type === "result") entry.resolve(msg);
      else if (msg.type === "error") entry.reject(new Error(msg.message));
    };
    worker.onerror = (event) => {
      // Worker-level error: reject everything in flight.
      for (const [, entry] of pending) entry.reject(event.error || event);
      pending.clear();
    };
    return worker;
  }

  function postAndAwait(reqId, payload, transferList) {
    const w = ensureWorker();
    return new Promise((resolve, reject) => {
      pending.set(reqId, { resolve, reject });
      w.postMessage(payload, transferList);
    });
  }

  return {
    /**
     * Run the pipeline with `inputs` ({ rawSignal, controlSignal,
     * params, analysis, noiseSuppressionActive }). Returns a Promise
     * that resolves to either the pipeline result or the STALE sentinel
     * (caller should ignore stale results).
     */
    async run(inputs) {
      const reqId = ++activeReqId;

      // Yield once so React can paint the slider release / setState
      // commit before we marshal data and post to the worker. This is
      // also where rapid-drag coalescing happens — by the time we wake
      // up, a newer run() may have superseded us.
      await yieldToBrowser();
      if (reqId !== activeReqId) {
        perf.count("pipelineRunner.staleBeforeCompute");
        return STALE;
      }

      const sig = perf.time("pipelineRunner.flatten", () =>
        flattenSignal(inputs.rawSignal)
      );
      const ctl = flattenSignal(inputs.controlSignal || []);

      const transferList = [sig.xs.buffer, sig.ys.buffer];
      if (ctl.xs.buffer.byteLength > 0)
        transferList.push(ctl.xs.buffer, ctl.ys.buffer);

      let workerResult;
      try {
        workerResult = await perf.time("pipelineRunner.workerRoundtrip", () =>
          postAndAwait(
            reqId,
            {
              type: "run",
              reqId,
              signal: { xs: sig.xs, ys: sig.ys },
              control: { xs: ctl.xs, ys: ctl.ys },
              params: inputs.params,
              analysis: inputs.analysis,
              noiseSuppressionActive: inputs.noiseSuppressionActive,
            },
            transferList
          )
        );
      } catch (err) {
        if (reqId !== activeReqId) {
          perf.count("pipelineRunner.staleAfterCompute");
          return STALE;
        }
        throw err;
      }

      if (reqId !== activeReqId) {
        perf.count("pipelineRunner.staleAfterCompute");
        return STALE;
      }

      // Re-materialize {x,y}[] for downstream consumers (NeuralGraph's
      // chartPoints memo expects this shape; refactoring it to consume
      // typed arrays directly is a follow-up).
      const processedSignal = perf.time("pipelineRunner.materialize", () =>
        materialize(workerResult.processedXs, workerResult.processedYs)
      );

      return {
        processedSignal,
        spikeResults: workerResult.spikes,
        burstResults: workerResult.bursts,
        metrics: workerResult.metrics,
      };
    },

    /** Mark all in-flight runs as stale. */
    cancel() {
      activeReqId++;
    },

    /** Tear down the worker (e.g. on provider unmount). */
    dispose() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      for (const [, entry] of pending) entry.reject(new Error("disposed"));
      pending.clear();
    },
  };
}

export const PIPELINE_STALE = STALE;
