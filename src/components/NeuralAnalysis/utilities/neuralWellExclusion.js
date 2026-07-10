// F/Fo well exclusion — the well-set operations behind the "exclude wells
// from the plate F₀ calculation" feature. Kept pure and framework-free so
// the same logic serves the live modal (NeuralResultsContext), the
// full-plate report (NeuralFullPlateReport), and the control panel's
// "select edge wells" button — and can be unit-tested directly.
//
// Exclusion only ever drops wells from the two PLATE-WIDE pooled
// computations (the F₀ median and the Universal y-scale sweep). Each well's
// own ΔF/F₀ uses only its own F₀, so an excluded well is still analyzed and
// still appears in the graph and report — it just doesn't influence its
// neighbors' normalization.

/**
 * Remove wells whose id is in `excludedIds` from `wells`. Returns the
 * ORIGINAL array reference when there's nothing to exclude, so callers keep
 * a stable identity (no needless re-render / recompute) in the common case.
 *
 * @param {Array<{id:*}>} wells
 * @param {Set<*>|null|undefined} excludedIds
 * @returns {Array}
 */
export function excludeWellsById(wells, excludedIds) {
  if (!excludedIds || excludedIds.size === 0) return wells;
  return (wells || []).filter((w) => !excludedIds.has(w.id));
}

/**
 * The plate's outer ring: every well in the first or last row OR the first
 * or last column. Derived from the actual min/max row & column across the
 * wells, so it's correct for any plate size and any indexing convention
 * (0- or 1-based) without needing the declared row/column counts.
 *
 * Wells missing numeric row/column are ignored (they can't be positioned).
 *
 * @param {Array<{row:number, column:number}>} wells
 * @returns {Array} the subset of `wells` on the perimeter
 */
export function computeEdgeWells(wells) {
  if (!Array.isArray(wells) || wells.length === 0) return [];
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (const w of wells) {
    if (!Number.isFinite(w?.row) || !Number.isFinite(w?.column)) continue;
    if (w.row < minR) minR = w.row;
    if (w.row > maxR) maxR = w.row;
    if (w.column < minC) minC = w.column;
    if (w.column > maxC) maxC = w.column;
  }
  if (!Number.isFinite(minR) || !Number.isFinite(minC)) return [];
  return wells.filter(
    (w) =>
      Number.isFinite(w?.row) &&
      Number.isFinite(w?.column) &&
      (w.row === minR ||
        w.row === maxR ||
        w.column === minC ||
        w.column === maxC)
  );
}
