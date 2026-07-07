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

// ---- HMR-aware worker recycling ---------------------------------------
// Webpack bundles the worker as a separate chunk; iterative dev edits
// rebuild the chunk but the running Worker instance keeps executing the
// chunk it loaded at first creation. Symptom: pipeline params added in
// recent edits get sent from the main thread but ignored by the worker.
//
// Each makePipelineRunner() instance registers itself with a module-level
// Set on creation. On `module.hot.accept`, we mark every live runner so
// the next .run() call disposes its stale worker and ensureWorker()
// creates a fresh one against the latest bundle.
//
// Production builds: `module.hot` is undefined, the registry sits unused,
// zero-cost.
const liveRunners = new Set();

if (typeof module !== "undefined" && module.hot) {
  const recycleAll = () => {
    // Mark every live runner stale; ensureWorker() will recycle on the
    // next run().
    for (const r of liveRunners) r.markWorkerStale();
  };
  module.hot.accept("../../../workers/neuralPipeline.worker.js", recycleAll);
  module.hot.accept("../../../workers/plateRange.worker.js", recycleAll);
}

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
  let workerStale = false;
  // pending: reqId → { resolve, reject }
  const pending = new Map();

  function ensureWorker() {
    if (worker && !workerStale) return worker;
    if (worker && workerStale) {
      // Dispose the stale worker before creating a fresh one against the
      // latest bundle. In-flight requests would have been rejected by
      // the HMR teardown if any.
      try {
        worker.terminate();
      } catch (_e) {
        // ignore
      }
      worker = null;
      workerStale = false;
      perf.count("pipelineRunner.workerRecycled");
    }
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

  const api = {
    /** Internal: HMR uses this to flag the worker for recycle on next run. */
    markWorkerStale() {
      workerStale = true;
      // Cancel anything in flight — those results would come from the
      // stale worker and are no longer trusted.
      activeReqId++;
      for (const [, entry] of pending) entry.reject(new Error("worker recycled"));
      pending.clear();
    },
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
              // Worker has no window.location to gate on. Pass the
              // main-thread perf state so worker-side logs surface in
              // the parent console when ?perfMode=1 is set.
              perfMode: perf.enabled,
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
        candidateDiagnostics:
          workerResult.candidateDiagnostics || {
            records: [],
            truncatedCount: 0,
            totalCandidates: 0,
          },
        candidateDistributions:
          workerResult.candidateDistributions || {
            prominence: {
              edges: new Float32Array([0, 1]),
              counts: new Uint32Array([0]),
              max: 0,
            },
          },
        outlierRemoval: workerResult.outlierRemoval || {
          count: 0,
          regions: [],
          outlierPoints: [],
        },
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
      liveRunners.delete(api);
    },
  };
  liveRunners.add(api);
  return api;
}

/**
 * makePlateRangeRunner — async wrapper around plateRange.worker.js, which
 * computes the Universal (whole-plate) y-scale range off the main thread.
 *
 * Same stale discipline as makePipelineRunner: each run() bumps a reqId,
 * yields once before posting (coalescing rapid param bursts), and ignores
 * results from superseded requests. One worker instance, lazily created,
 * recycled on HMR alongside the pipeline worker.
 *
 * `run({ wells, control, params, noiseSuppressionActive })` takes wells as
 * an array of already-built `{ xs, ys }` Float64Array pairs (the caller
 * flattens straight from the indicators' canonical typed arrays, so no
 * {x,y}[] is materialized on the main thread). All buffers are Transferable.
 * Resolves to `{ min, max }` (either null when the plate is empty) or the
 * STALE sentinel.
 */
export function makePlateRangeRunner() {
  let activeReqId = 0;
  let worker = null;
  let workerStale = false;
  const pending = new Map();

  function ensureWorker() {
    if (worker && !workerStale) return worker;
    if (worker && workerStale) {
      try {
        worker.terminate();
      } catch (_e) {
        // ignore
      }
      worker = null;
      workerStale = false;
    }
    worker = new Worker(
      new URL("../../../workers/plateRange.worker.js", import.meta.url)
    );
    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      const entry = pending.get(msg.reqId);
      if (!entry) return;
      pending.delete(msg.reqId);
      if (msg.type === "plateRange")
        entry.resolve({ min: msg.min, max: msg.max });
      else if (msg.type === "error") entry.reject(new Error(msg.message));
    };
    worker.onerror = (event) => {
      for (const [, entry] of pending) entry.reject(event.error || event);
      pending.clear();
    };
    return worker;
  }

  const api = {
    markWorkerStale() {
      workerStale = true;
      activeReqId++;
      for (const [, entry] of pending)
        entry.reject(new Error("worker recycled"));
      pending.clear();
    },

    async run(inputs) {
      const reqId = ++activeReqId;

      // Yield once so a burst of param changes coalesces to the latest.
      await yieldToBrowser();
      if (reqId !== activeReqId) return STALE;

      const wells = Array.isArray(inputs.wells) ? inputs.wells : [];
      const control = inputs.control || { xs: new Float64Array(0), ys: new Float64Array(0) };

      const transferList = [];
      for (const w of wells) {
        if (w?.xs?.buffer) transferList.push(w.xs.buffer);
        if (w?.ys?.buffer) transferList.push(w.ys.buffer);
      }
      if (control.xs?.buffer?.byteLength > 0)
        transferList.push(control.xs.buffer, control.ys.buffer);

      const w = ensureWorker();
      let result;
      try {
        result = await new Promise((resolve, reject) => {
          pending.set(reqId, { resolve, reject });
          w.postMessage(
            {
              type: "runPlateRange",
              reqId,
              wells,
              control,
              params: inputs.params,
              noiseSuppressionActive: inputs.noiseSuppressionActive,
            },
            transferList
          );
        });
      } catch (err) {
        if (reqId !== activeReqId) return STALE;
        throw err;
      }

      if (reqId !== activeReqId) return STALE;
      return result;
    },

    cancel() {
      activeReqId++;
    },

    dispose() {
      if (worker) {
        worker.terminate();
        worker = null;
      }
      for (const [, entry] of pending) entry.reject(new Error("disposed"));
      pending.clear();
      liveRunners.delete(api);
    },
  };
  liveRunners.add(api);
  return api;
}

export const PIPELINE_STALE = STALE;
