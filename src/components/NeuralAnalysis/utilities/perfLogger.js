/**
 * perfLogger — lightweight per-stage timing + event counting for the
 * Neural Analysis modal. Activated by appending `?perfMode=1` to the
 * page URL; otherwise every helper is a no-op so we can leave the
 * instrumentation in place permanently.
 *
 * Usage:
 *
 *   import { perf } from "./perfLogger";
 *
 *   // Time a synchronous block:
 *   const out = perf.time("trendFlattening", () => trendFlattening(sig));
 *
 *   // Count an event:
 *   perf.count("slider.spikeProminence");
 *
 *   // Group a related set of timings under one label, then flush:
 *   perf.group("pipeline");
 *   const r1 = perf.time("suppressNoise", ...);
 *   const r2 = perf.time("trendFlattening", ...);
 *   perf.flushGroup();   // logs a single line summarizing this group
 *
 * Gated on URL param so production builds incur ~zero cost.
 */

const ENABLED =
  typeof window !== "undefined" &&
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

function group(label) {
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

const noop = () => {};
const noopTime = (_label, fn) => fn();

export const perf = ENABLED
  ? {
      enabled: true,
      time: timeSync,
      count: logCount,
      group,
      flushGroup,
    }
  : {
      enabled: false,
      time: noopTime,
      count: noop,
      group: noop,
      flushGroup: noop,
    };

export default perf;
