import { perf } from "./perfLogger";

/**
 * pipelineCache — single-slot per-stage memoization for the Neural
 * Analysis pipeline. Each stage holds the most recent (key → value)
 * pair; on key match the cached value is returned, on key change the
 * stage recomputes and the new pair replaces the old (no eviction
 * policy needed — single slot self-evicts).
 *
 * Key construction is the caller's responsibility: pass an array of key
 * parts (object refs via cache.idOf, plus scalar params). The cache
 * joins them with '|' to form the comparable key string.
 *
 * Why this design (Codex's recommendation):
 *
 *   - Cache must live ACROSS pipeline calls (so a slider drag's repeat
 *     calls reuse upstream stages). It's owned by the runner and passed
 *     in on each run().
 *
 *   - Single-slot is sufficient because user param changes are
 *     "navigational" (one knob at a time, monotonic in well-selection
 *     and time). Multi-key LRUs would just consume memory for cases
 *     that won't recur.
 *
 *   - Reference identity (via WeakMap idOf) is sound because
 *     materializeFilteredData() caches its output on the indicator —
 *     same well → same array ref → same id.
 */

// Module-level WeakMap so identity ids are stable across cache instances.
// Each unique object gets a small integer id assigned the first time
// idOf() sees it. Primitives are returned as-is.
let nextObjId = 1;
const idMap = new WeakMap();

function idOf(obj) {
  if (obj == null) return "n";
  if (typeof obj !== "object") return String(obj);
  let id = idMap.get(obj);
  if (id === undefined) {
    id = nextObjId++;
    idMap.set(obj, id);
  }
  return `o${id}`;
}

export function makePipelineCache() {
  const slots = new Map(); // stage name → { key, value }

  return {
    /**
     * Memoize stage output. `keyParts` is an array of strings/numbers
     * /booleans/null whose `.join('|')` is the comparable key. If the
     * key matches the cached slot for this stage, return the cached
     * value; otherwise call `compute()`, cache, and return.
     */
    memo(stage, keyParts, compute) {
      const key = keyParts.join("|");
      const slot = slots.get(stage);
      if (slot && slot.key === key) {
        perf.count(`cache.${stage}.hit`);
        return slot.value;
      }
      perf.count(`cache.${stage}.miss`);
      const value = compute();
      slots.set(stage, { key, value });
      return value;
    },

    /** Drop all cached stage outputs (e.g. for explicit invalidation). */
    clear() {
      slots.clear();
    },

    idOf,
  };
}
