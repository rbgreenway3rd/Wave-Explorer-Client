// Pack/unpack helpers and orchestration glue for the filter pipeline. Lives
// on the main thread; serializes well data to typed arrays for the worker
// pool and merges results back into the existing Indicator instances
// (preserving class identity, methods, and DynamicRatio aliasing).

const filterCore = require("../workers/filterCore.js");

// Kept as a public no-op for callers that still invoke it: previously
// allocated a fresh {x,y}[] copy of rawData for filteredData (~440MB for a
// 17.6M-point dataset). The pack step now reads rawData directly, so this
// up-front copy is wasteful — and on huge files contributed to renderer-
// process OOMs. Safe to remove from callers; left in place to avoid a
// breaking API change.
function seedFilteredDataFromRaw(_wellArrays) {
  /* intentionally no-op — see comment above */
}

// Packs a contiguous slice [start, end) of wellArrays into parallel typed
// arrays for the worker. The output is independent (copied) typed arrays
// that the worker can transfer-and-mutate without disturbing the main
// thread's raw rawXs/rawYs. Reads from rawXs/rawYs (Phase C typed-array
// native storage) when present; falls back to the legacy rawData {x,y}[]
// form for any straggler caller.
//
// Used by useFilterWorkerPool's runFromRaw entry point so each shard can
// be packed inline at dispatch time, instead of allocating the entire
// plate up-front on the main thread.
function packShard(wellArrays, start, end) {
  const total = end - start;
  const packed = new Array(total);
  for (let w = 0; w < total; w++) {
    const src = wellArrays[start + w];
    const indsSrc = src.indicators;
    const indsOut = new Array(indsSrc.length);
    for (let i = 0; i < indsSrc.length; i++) {
      const ind = indsSrc[i];
      let xs;
      let ys;
      if (ind.rawXs && ind.rawYs) {
        // Phase C path: typed-array native rawXs/rawYs. .slice() makes an
        // independent copy with its own buffer (transferable later).
        xs = ind.rawXs.slice();
        ys = ind.rawYs.slice();
      } else if (Array.isArray(ind.rawData) && ind.rawData.length > 0) {
        // Legacy {x,y}[] fallback.
        const data = ind.rawData;
        const n = data.length;
        xs = new Float64Array(n);
        ys = new Float64Array(n);
        for (let j = 0; j < n; j++) {
          xs[j] = data[j].x;
          ys[j] = data[j].y;
        }
      } else {
        xs = new Float64Array(0);
        ys = new Float64Array(0);
      }
      indsOut[i] = { xs, ys };
    }
    packed[w] = {
      id: src.id,
      row: src.row,
      col: src.col,
      indicators: indsOut,
    };
  }
  return packed;
}

// Pre-Phase-D entry point: packs the entire well array. Equivalent to a
// single packShard covering all wells. Kept for tests and the
// non-sharded ControlSubtraction dispatch path.
//
// We always COPY the typed arrays (not transfer the originals): the worker
// will mutate ys in place, and the main thread must keep its raw arrays
// intact for re-runs and for any concurrent reader (DataProvider effect,
// MiniGraphOptions, etc.).
function packWellsToTypedArrays(wellArrays) {
  return packShard(wellArrays, 0, wellArrays.length);
}

// Walks the existing well array and stores typed-array filtered data on
// each Indicator. Crucially: this NO LONGER allocates {x,y}[] for
// filteredData — that would cost ~700MB transient on a 17.6M-point dataset
// (32 bytes × 17.6M objects + array slots) and OOMs the renderer.
//
// Indicator instances keep class identity (`setDisplayed()` etc. survive).
// Consumers that need point-array form on a small subset of indicators
// should call `indicator.materializeFilteredData()`. Consumers that
// iterate every well's filtered data must read `indicator.filteredYs` /
// `filteredXs` directly to avoid triggering bulk materialization.
//
// DynamicRatio aliasing: two source indicators sharing the same `ys` ref
// in the packed payload end up sharing the same Float64Array refs on the
// target Indicators.
function mergeFilteredBack(wellArrays, packedWells) {
  if (wellArrays.length !== packedWells.length) {
    throw new Error(
      `mergeFilteredBack length mismatch: ${wellArrays.length} vs ${packedWells.length}`
    );
  }
  for (let w = 0; w < wellArrays.length; w++) {
    const target = wellArrays[w];
    const source = packedWells[w];
    const tInds = target.indicators;
    const sInds = source.indicators;
    if (tInds.length !== sInds.length) {
      throw new Error(
        `indicator count mismatch at well ${w}: ${tInds.length} vs ${sInds.length}`
      );
    }
    for (let i = 0; i < sInds.length; i++) {
      const { xs, ys } = sInds[i];
      const tInd = tInds[i];
      // Prefer the class method when available (preserves invariants); fall
      // back to direct field assignment for plain-object well shapes used
      // by some legacy code paths and tests.
      if (typeof tInd.setFilteredTypedArrays === "function") {
        tInd.setFilteredTypedArrays(xs, ys);
      } else {
        tInd.filteredXs = xs;
        tInd.filteredYs = ys;
        tInd.filteredData = [];
      }
    }
  }
}

// ---- phase splitting ---------------------------------------------------

const CONTROL_SUB_TYPE = "controlSubtraction";

function isControlSubFilter(f) {
  return f && (f.type === CONTROL_SUB_TYPE || f.name === "Control Subtraction");
}

// Given an ordered list of filter class instances, splits into a list of
// phases. Segments contain non-CS filters and run in one worker call.
// ControlSubtraction phases run separately so the orchestrator can compute
// the average curve from the post-prior-segment state.
function splitPhasesByControlSubtraction(filterInstances) {
  const phases = [];
  let buf = [];
  for (let i = 0; i < filterInstances.length; i++) {
    const f = filterInstances[i];
    if (isControlSubFilter(f)) {
      if (buf.length) {
        phases.push({ kind: "segment", filters: buf });
        buf = [];
      }
      phases.push({ kind: "controlSub", filter: f });
    } else {
      buf.push(f);
    }
  }
  if (buf.length) phases.push({ kind: "segment", filters: buf });
  return phases;
}

// Serializes a filter class instance to {type, params}. Each filter class is
// expected to provide .serialize(); falls back to introspection by name for
// safety during partial migration.
function serializeFilter(filterInstance) {
  if (typeof filterInstance.serialize === "function") {
    return filterInstance.serialize();
  }
  // Fallback paths — should not be hit once FilterModels.js is updated.
  switch (filterInstance.name) {
    case "Static Ratio":
      return {
        type: "staticRatio",
        params: { start: filterInstance.start, end: filterInstance.end },
      };
    case "Smoothing":
      return {
        type: "smoothing",
        params: {
          windowWidth: filterInstance.windowWidth,
          useMedian: filterInstance.useMedian,
        },
      };
    case "Control Subtraction":
      return {
        type: "controlSubtraction",
        params: {
          controlWellArray: filterInstance.controlWellArray,
          applyWellArray: filterInstance.applyWellArray,
          numberOfColumns: filterInstance.number_of_columns,
        },
      };
    case "Derivative":
      return { type: "derivative", params: {} };
    case "Outlier Removal":
      return {
        type: "outlierRemoval",
        params: {
          halfWindow: filterInstance.halfWindow,
          threshold: filterInstance.threshold,
        },
      };
    case "Flat Field Correction":
      return {
        type: "flatFieldCorrection",
        params: { correctionMatrix: filterInstance.correctionMatrix },
      };
    case "Dynamic Ratio":
      return {
        type: "dynamicRatio",
        params: {
          numerator: filterInstance.numerator,
          denominator: filterInstance.denominator,
        },
      };
    default:
      throw new Error(`Unknown filter, cannot serialize: ${filterInstance.name}`);
  }
}

// Wrapper that invokes filterCore.computeAverageCurves with the params from
// the given ControlSubtraction filter instance. Runs on the main thread
// between worker phases.
function computeControlAveragesFromPacked(packedWells, controlSubFilterInstance) {
  const spec = serializeFilter(controlSubFilterInstance);
  return filterCore.computeAverageCurves(packedWells, spec.params);
}

// ---- shard support ----------------------------------------------------

// Returns a shard-specific copy of a filter spec, slicing any per-well array
// params to the [start, end) range. Currently only FlatFieldCorrection has
// such a param (correctionMatrix indexed by local well index in the worker).
// ControlSubtraction is never invoked through a sharded path.
function sliceFilterSpecForShard(spec, start, end) {
  if (spec.type === "flatFieldCorrection") {
    const matrix = spec.params && spec.params.correctionMatrix;
    if (Array.isArray(matrix) || ArrayBuffer.isView(matrix)) {
      return {
        type: spec.type,
        params: {
          ...spec.params,
          correctionMatrix: Array.from(matrix).slice(start, end),
        },
      };
    }
  }
  return spec;
}

// Splits a packed wells array into `nShards` contiguous, near-equal slices.
// Returns an array of { wells, start, end } objects. The wells slices share
// the same typed-array buffers as the input — the caller is responsible for
// transferring them to workers.
function makeShards(packedWells, nShards) {
  const total = packedWells.length;
  const shards = [];
  if (nShards <= 1 || total === 0) {
    shards.push({ wells: packedWells, start: 0, end: total });
    return shards;
  }
  const base = Math.floor(total / nShards);
  let extra = total - base * nShards;
  let cursor = 0;
  for (let s = 0; s < nShards; s++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    if (size === 0) continue;
    const start = cursor;
    const end = cursor + size;
    shards.push({ wells: packedWells.slice(start, end), start, end });
    cursor = end;
  }
  return shards;
}

// ---- transferable buffer collection ------------------------------------

// Walks a packed wells payload and collects the unique ArrayBuffer instances
// referenced by xs/ys typed arrays — so the worker pool can pass them in
// the postMessage transfer list. Deduplicates so DynamicRatio-aliased
// buffers aren't transferred twice.
function collectTransferables(packedWells) {
  const seen = new Set();
  const buffers = [];
  for (let w = 0; w < packedWells.length; w++) {
    const inds = packedWells[w].indicators;
    for (let i = 0; i < inds.length; i++) {
      const xs = inds[i].xs;
      const ys = inds[i].ys;
      if (xs && !seen.has(xs.buffer)) {
        seen.add(xs.buffer);
        buffers.push(xs.buffer);
      }
      if (ys && !seen.has(ys.buffer)) {
        seen.add(ys.buffer);
        buffers.push(ys.buffer);
      }
    }
  }
  return buffers;
}

// ---- typed-array-aware accessors --------------------------------------
//
// Helpers for consumers that need filtered y/x values without forcing the
// {x,y}[] materialization path. Use these in places that iterate every
// well — e.g. globalMaxY computation, heatmap metrics. For consumers that
// genuinely need point-array form (Chart.js datasets), call
// indicator.materializeFilteredData() directly.

function filteredYsView(indicator) {
  if (indicator && indicator.filteredYs) return indicator.filteredYs;
  // Fallback: derive from {x,y}[] if that's all we have.
  const fd = indicator && indicator.filteredData;
  if (Array.isArray(fd) && fd.length > 0) {
    const out = new Float64Array(fd.length);
    for (let i = 0; i < fd.length; i++) out[i] = fd[i] && fd[i].y;
    return out;
  }
  return null;
}

function filteredXsView(indicator) {
  if (indicator && indicator.filteredXs) return indicator.filteredXs;
  const fd = indicator && indicator.filteredData;
  if (Array.isArray(fd) && fd.length > 0) {
    const out = new Float64Array(fd.length);
    for (let i = 0; i < fd.length; i++) out[i] = fd[i] && fd[i].x;
    return out;
  }
  return null;
}

function filteredLength(indicator) {
  if (indicator && indicator.filteredYs) return indicator.filteredYs.length;
  if (indicator && Array.isArray(indicator.filteredData)) return indicator.filteredData.length;
  return 0;
}

// Returns the indicator's filtered xs/ys restricted to xs[i] in [startX, endX]
// (inclusive). When startX or endX is null/undefined, returns the full data.
// Reads the typed-array form when available so the all-wells consumers in
// Heatmap.js stay typed-array-clean. Returns Float64Array views (subarrays)
// — no copies — when typed arrays are present.
function filteredXyInRange(indicator, startX, endX) {
  const xs = indicator && indicator.filteredXs;
  const ys = indicator && indicator.filteredYs;
  const empty = { xs: new Float64Array(0), ys: new Float64Array(0) };
  if (xs && ys && xs.length === ys.length) {
    if (startX == null || endX == null || isNaN(startX) || isNaN(endX) || startX >= endX) {
      return { xs, ys };
    }
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      if (startIdx === -1 && x >= startX) startIdx = i;
      if (x <= endX) endIdx = i;
    }
    if (startIdx === -1 || endIdx < startIdx) return empty;
    return {
      xs: xs.subarray(startIdx, endIdx + 1),
      ys: ys.subarray(startIdx, endIdx + 1),
    };
  }
  const fd = indicator && indicator.filteredData;
  if (Array.isArray(fd) && fd.length > 0) {
    const filtered =
      startX == null || endX == null || isNaN(startX) || isNaN(endX) || startX >= endX
        ? fd
        : fd.filter((p) => p && p.x >= startX && p.x <= endX);
    const n = filtered.length;
    const xsOut = new Float64Array(n);
    const ysOut = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xsOut[i] = filtered[i].x;
      ysOut[i] = filtered[i].y;
    }
    return { xs: xsOut, ys: ysOut };
  }
  return empty;
}

const _exports = {
  seedFilteredDataFromRaw,
  packWellsToTypedArrays,
  packShard,
  mergeFilteredBack,
  splitPhasesByControlSubtraction,
  serializeFilter,
  computeControlAveragesFromPacked,
  collectTransferables,
  isControlSubFilter,
  sliceFilterSpecForShard,
  makeShards,
  filteredYsView,
  filteredXsView,
  filteredLength,
  filteredXyInRange,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = _exports;
}
