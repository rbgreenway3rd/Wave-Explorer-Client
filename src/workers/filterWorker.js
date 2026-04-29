/* eslint-disable no-restricted-globals */

// Web Worker shell for the filter pipeline. Receives a packed segment
// payload, dispatches to filterCore.runSegment, and posts the result
// back with all typed-array buffers transferred to avoid copying.
//
// Message in:  { id, wells, filters, avgCurves? }
// Progress out: { id, kind: 'progress', filterIndex, totalFilters }
// Done out:    { id, kind: 'done', wells }
// Error out:   { id, kind: 'error', message, stack }

const { runSegment } = require("./filterCore.js");

function collectBuffers(wells) {
  const seen = new Set();
  const buffers = [];
  for (let w = 0; w < wells.length; w++) {
    const inds = wells[w].indicators;
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

self.onmessage = function (e) {
  const { id, wells, filters, avgCurves } = e.data;
  try {
    runSegment({
      wells,
      filters,
      avgCurves,
      onProgress: ({ filterIndex, totalFilters }) => {
        self.postMessage({ id, kind: "progress", filterIndex, totalFilters });
      },
    });
    self.postMessage({ id, kind: "done", wells }, collectBuffers(wells));
  } catch (err) {
    self.postMessage({
      id,
      kind: "error",
      message: err && err.message ? err.message : String(err),
      stack: err && err.stack ? err.stack : null,
    });
  }
};
