/**
 * perfLogger — lightweight per-stage timing + event counting for the
 * Neural Analysis modal. Activated by appending `?perfMode=1` to the
 * page URL on the main thread; otherwise every helper is a no-op so we
 * can leave the instrumentation in place permanently.
 *
 * Worker context: a worker has no `window` and its `self.location` is
 * the worker URL (not the parent page's), so the URL gate can't decide
 * by itself. The runner reads its perf state on the main thread and
 * passes the flag through with each pipeline message; the worker calls
 * `perf.setEnabled(flag)` before running the pipeline. After that,
 * worker-side `perf.time(...)` calls log to the parent's console
 * exactly like main-thread calls.
 *
 * Usage:
 *
 *   import { perf } from "./perfLogger";
 *
 *   const out = perf.time("trendFlattening", () => trendFlattening(sig));
 *   perf.count("slider.spikeProminence");
 *
 *   // Worker entry — call once per message before running pipeline:
 *   perf.setEnabled(message.perfMode === true);
 */

// Auto-detect on module load (main thread only): respect ?perfMode=1.
// Workers always start disabled; the runner toggles them on per message.
let enabled =
  typeof window !== "undefined" &&
  typeof window.location !== "undefined" &&
  /[?&]perfMode=1(?:&|$)/.test(window.location.search);

const counts = new Map();
const flushTimers = new Map(); // counter label → debounced timer

let activeGroupLabel = null;
let activeGroupTimings = null;

function logCount(label) {
  // Coalesce rapid-fire counters (e.g. 60-event slider drag) into one
  // log line per ~250 ms idle window.
  const now = counts.get(label) || 0;
  counts.set(label, now + 1);
  if (flushTimers.has(label)) clearTimeout(flushTimers.get(label));
  flushTimers.set(
    label,
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log(`[perf] count ${label}: ${counts.get(label)}`);
      counts.delete(label);
      flushTimers.delete(label);
    }, 250)
  );
}

function timeSync(label, fn) {
  const t0 = performance.now();
  let result;
  try {
    result = fn();
  } finally {
    const dt = performance.now() - t0;
    if (activeGroupTimings) {
      activeGroupTimings.push([label, dt]);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[perf] ${label}: ${dt.toFixed(1)} ms`);
    }
  }
  return result;
}

function groupStart(label) {
  activeGroupLabel = label;
  activeGroupTimings = [];
}

function flushGroup() {
  if (!activeGroupTimings || activeGroupTimings.length === 0) {
    activeGroupLabel = null;
    activeGroupTimings = null;
    return;
  }
  const total = activeGroupTimings.reduce((s, [, dt]) => s + dt, 0);
  const parts = activeGroupTimings
    .map(([l, dt]) => `${l}=${dt.toFixed(0)}`)
    .join(" ");
  // eslint-disable-next-line no-console
  console.log(
    `[perf] ${activeGroupLabel} total=${total.toFixed(1)} ms { ${parts} }`
  );
  activeGroupLabel = null;
  activeGroupTimings = null;
}

// Stable object whose methods check the current `enabled` flag at call
// time. Replaces the previous "two-frozen-objects" approach so worker
// callers can flip the flag at runtime via setEnabled().
export const perf = {
  get enabled() {
    return enabled;
  },
  setEnabled(value) {
    enabled = !!value;
  },
  time(label, fn) {
    if (!enabled) return fn();
    return timeSync(label, fn);
  },
  count(label) {
    if (!enabled) return;
    logCount(label);
  },
  group(label) {
    if (!enabled) return;
    groupStart(label);
  },
  flushGroup() {
    if (!enabled) return;
    flushGroup();
  },
};

export default perf;
