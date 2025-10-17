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
export function suppressNoise(signal, controlSignal = [], options = {}) {
  // Step 1: Validate input (expect array of {x, y})
  if (!Array.isArray(signal) || signal.length === 0) {
    console.warn(
      "suppressNoise: signal must be a non-empty array of {x, y} objects"
    );
    return [];
  }
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
  if (controlSignal && !Array.isArray(controlSignal)) {
    console.warn("suppressNoise: controlSignal must be an array if provided");
    controlSignal = [];
  }
  // Step 2: Build a map for fast controlSignal lookup by x
  let controlMap = null;
  if (Array.isArray(controlSignal) && controlSignal.length > 0) {
    controlMap = new Map();
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
  }
  // Step 3: Subtract control well if provided and enabled
  const { subtractControl = true } = options;
  let result = signal.map((pt) => {
    let y = pt.y;
    if (subtractControl && controlMap && controlMap.has(pt.x)) {
      y = y - controlMap.get(pt.x);
    }
    return { x: pt.x, y };
  });
  // (Next: smoothing can be added here)
  return result;
}
