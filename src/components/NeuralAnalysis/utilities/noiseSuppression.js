// Noise suppression utility for WaveExplorer Neural Analysis (REBUILT)
// This function will be rebuilt step-by-step for clarity and robust data structure.

/**
 * Suppress noise in a signal using optional control well and smoothing.
 * Always returns a clean array of numbers, same length as input.
 *
 * @param {Array<number>} signal - The raw signal data (array of numbers)
 * @param {Array<number>} [controlSignal] - The control well signal (optional)
 * @param {Object} [options] - Options for filtering
 * @returns {Array<number>} - The filtered signal
 */
/**
 * Typed core used by the neural pipeline: subtract the control (matched by
 * x-value) from `ys`, returning a new Float64Array — or the SAME `ys`
 * reference when there is nothing to subtract (no allocation, and the
 * downstream stage cache keys on the unchanged identity). Mirrors the {x,y}[]
 * `suppressNoise` below exactly for the values it produces.
 *
 * @param {Float64Array} xs shared x-values
 * @param {Float64Array} ys y-values to suppress
 * @param {Float64Array|null} controlXs control x-values (or null/empty)
 * @param {Float64Array|null} controlYs control y-values (or null/empty)
 * @param {boolean} subtractControl
 * @returns {Float64Array}
 */
export function suppressNoiseYs(xs, ys, controlXs, controlYs, subtractControl) {
  const hasControl = controlYs && controlYs.length > 0;
  if (!subtractControl || !hasControl) return ys; // no-op → same reference
  const controlMap = new Map();
  for (let i = 0; i < controlYs.length; i++) {
    const cy = controlYs[i];
    if (!Number.isNaN(cy)) controlMap.set(controlXs[i], cy);
  }
  const n = ys.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    out[i] = controlMap.has(x) ? ys[i] - controlMap.get(x) : ys[i];
  }
  return out;
}

export function suppressNoise(signal, controlSignal = [], options = {}) {
  // Step 1: Validate input (expect array of {x, y})
  if (!Array.isArray(signal) || signal.length === 0) {
    console.warn(
      "suppressNoise: signal must be a non-empty array of {x, y} objects"
    );
    return [];
  }

  const { subtractControl = true } = options;
  const hasControl = Array.isArray(controlSignal) && controlSignal.length > 0;

  // Fast path: no subtraction to perform. The output would be a byte-for-byte
  // clone of the input, so return the input reference directly — skipping the
  // O(N) validation `.every` scan and the O(N) `.map` clone. This is the
  // common modal case (control subtraction off). Returning the same reference
  // also lets the downstream stage cache key on the raw signal's identity,
  // improving hit rates.
  if (!subtractControl || !hasControl) {
    return signal;
  }

  // Step 2: Subtraction path — validate, build a control lookup by x, subtract.
  if (
    !signal.every(
      (v) =>
        v &&
        typeof v.x !== "undefined" &&
        typeof v.y === "number" &&
        !isNaN(v.y)
    )
  ) {
    console.warn("suppressNoise: signal contains invalid {x, y} objects");
    return [];
  }
  const controlMap = new Map();
  for (const pt of controlSignal) {
    if (
      pt &&
      typeof pt.x !== "undefined" &&
      typeof pt.y === "number" &&
      !isNaN(pt.y)
    ) {
      controlMap.set(pt.x, pt.y);
    }
  }
  return signal.map((pt) => {
    let y = pt.y;
    if (controlMap.has(pt.x)) y = y - controlMap.get(pt.x);
    return { x: pt.x, y };
  });
}
