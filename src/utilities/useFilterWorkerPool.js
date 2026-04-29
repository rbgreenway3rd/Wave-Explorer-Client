// React hook exposing a pool of filter Workers with optional sharding.
// `run({wells, filters, avgCurves, onProgress, shardable})` either dispatches
// a single worker call or fans out across the pool, splitting wells into
// contiguous shards. ControlSubtraction phases must pass shardable:false
// because their apply-well lookups use global plate row/col indices.
//
// Lifecycle mirrors useDecimateWorker.js: workers created on mount,
// terminated on unmount.

import { useRef, useEffect, useCallback } from "react";
import {
  collectTransferables,
  makeShards,
  packShard,
  packWellsToTypedArrays,
  sliceFilterSpecForShard,
} from "./filterPack";

const POOL_SIZE = Math.max(
  1,
  Math.min(
    4,
    ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2) -
      1
  )
);

const useFilterWorkerPool = () => {
  const workersRef = useRef(null);
  const pendingRef = useRef(new Map());
  const nextIdRef = useRef(1);

  useEffect(() => {
    const pending = pendingRef.current;
    const workers = [];
    const handleMessage = (e) => {
      const { id, kind } = e.data || {};
      const slot = pending.get(id);
      if (!slot) return;
      if (kind === "progress") {
        if (slot.onProgress) slot.onProgress(e.data);
      } else if (kind === "done") {
        pending.delete(id);
        slot.resolve(e.data.wells);
      } else if (kind === "error") {
        pending.delete(id);
        slot.reject(new Error(e.data.message || "Filter worker error"));
      }
    };
    const handleError = (event) => {
      const err = new Error(event.message || "Filter worker fatal error");
      pending.forEach((p) => p.reject(err));
      pending.clear();
    };
    for (let i = 0; i < POOL_SIZE; i++) {
      const worker = new Worker(
        new URL("../workers/filterWorker.js", import.meta.url)
      );
      worker.onmessage = handleMessage;
      worker.onerror = handleError;
      workers.push(worker);
    }
    workersRef.current = workers;
    return () => {
      workers.forEach((w) => w.terminate());
      workersRef.current = null;
      pending.forEach((p) =>
        p.reject(new Error("Filter worker terminated"))
      );
      pending.clear();
    };
  }, []);

  // Dispatch one wells payload to a specific worker by index.
  const sendToWorker = useCallback(
    (workerIdx, payload) =>
      new Promise((resolve, reject) => {
        const workers = workersRef.current;
        if (!workers || !workers[workerIdx]) {
          reject(new Error("Filter worker not initialized"));
          return;
        }
        const id = nextIdRef.current++;
        pendingRef.current.set(id, {
          resolve,
          reject,
          onProgress: payload.onProgress,
        });
        const transfer = collectTransferables(payload.wells);
        workers[workerIdx].postMessage(
          {
            id,
            wells: payload.wells,
            filters: payload.filters,
            avgCurves: payload.avgCurves,
          },
          transfer
        );
      }),
    []
  );

  const run = useCallback(
    ({ wells, filters, avgCurves, onProgress, shardable = true }) => {
      const workers = workersRef.current;
      const numWorkers = workers ? workers.length : 0;
      // Require at least 2 wells per shard so that pathological tiny inputs
      // don't get split for no benefit.
      const useSharding =
        shardable && numWorkers > 1 && wells.length >= numWorkers * 2;

      if (!useSharding) {
        return sendToWorker(0, {
          wells,
          filters,
          avgCurves,
          onProgress,
        });
      }

      const shards = makeShards(wells, numWorkers);
      let shardsDone = 0;
      const promises = shards.map((shard, idx) => {
        const shardFilters = filters.map((spec) =>
          sliceFilterSpecForShard(spec, shard.start, shard.end)
        );
        return sendToWorker(idx, {
          wells: shard.wells,
          filters: shardFilters,
          avgCurves,
          onProgress: () => {
            // Aggregate per-shard progress into per-shard completion.
            // Filter-level granularity within a shard is not surfaced.
          },
        }).then((result) => {
          shardsDone++;
          if (onProgress) {
            onProgress({
              kind: "progress",
              shardsDone,
              totalShards: shards.length,
            });
          }
          return result;
        });
      });
      return Promise.all(promises).then((results) => {
        const merged = new Array(wells.length);
        let cursor = 0;
        for (let i = 0; i < results.length; i++) {
          const arr = results[i];
          for (let j = 0; j < arr.length; j++) merged[cursor++] = arr[j];
        }
        return merged;
      });
    },
    [sendToWorker]
  );

  // Like `run`, but starts from the original wellArrays and packs each shard
  // inline at dispatch time. This avoids the ~770MB pack-everything-upfront
  // spike on main during phase 1 of applyEnabledFilters: with 4 shards, peak
  // shard pack size is ~770MB / 4 ≈ ~200MB, and that memory is transferred
  // into the worker on dispatch (so main releases it before the next shard's
  // pack runs).
  //
  // Only valid for phase 1 (the very first segment dispatch). Phase 2+ work
  // off the evolving packed result and must use `run`.
  //
  // For non-sharded paths (numWorkers <= 1 or wells.length < 2 * numWorkers
  // or shardable === false), this falls back to packing the whole array
  // once and dispatching to worker 0 — equivalent to the pre-Phase-D
  // packWellsToTypedArrays + run flow.
  const runFromRaw = useCallback(
    ({ wellArrays, filters, avgCurves, onProgress, shardable = true }) => {
      const workers = workersRef.current;
      const numWorkers = workers ? workers.length : 0;
      const useSharding =
        shardable &&
        numWorkers > 1 &&
        wellArrays.length >= numWorkers * 2;

      if (!useSharding) {
        const packed = packWellsToTypedArrays(wellArrays);
        return sendToWorker(0, {
          wells: packed,
          filters,
          avgCurves,
          onProgress,
        });
      }

      // Build shard ranges from wellArrays length WITHOUT slicing the array
      // itself yet. We pack each range only at the moment we dispatch it,
      // so prior shards' buffers can have been transferred-and-freed by
      // the time later shards allocate their copies.
      const total = wellArrays.length;
      const ranges = [];
      const base = Math.floor(total / numWorkers);
      let extra = total - base * numWorkers;
      let cursor = 0;
      for (let s = 0; s < numWorkers; s++) {
        const size = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra--;
        if (size === 0) continue;
        ranges.push({ start: cursor, end: cursor + size });
        cursor += size;
      }

      let shardsDone = 0;
      const promises = ranges.map((range, idx) => {
        const shardFilters = filters.map((spec) =>
          sliceFilterSpecForShard(spec, range.start, range.end)
        );
        // Pack inline at dispatch — the typed-array copies live just long
        // enough to be transferred to the worker, then main releases them.
        const packedShard = packShard(wellArrays, range.start, range.end);
        return sendToWorker(idx, {
          wells: packedShard,
          filters: shardFilters,
          avgCurves,
          onProgress: () => {},
        }).then((result) => {
          shardsDone++;
          if (onProgress) {
            onProgress({
              kind: "progress",
              shardsDone,
              totalShards: ranges.length,
            });
          }
          return result;
        });
      });
      return Promise.all(promises).then((results) => {
        const merged = new Array(total);
        let writeCursor = 0;
        for (let i = 0; i < results.length; i++) {
          const arr = results[i];
          for (let j = 0; j < arr.length; j++) merged[writeCursor++] = arr[j];
        }
        return merged;
      });
    },
    [sendToWorker]
  );

  return { run, runFromRaw };
};

export default useFilterWorkerPool;
