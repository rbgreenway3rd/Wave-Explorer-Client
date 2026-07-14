// Savitzky-Golay smoothing for {x, y} signals.
// Polynomial order 2, supported window sizes 5 / 7 / 9 (odd).
// Mirror-padded at the boundaries so output length matches input and
// edges aren't dropped or biased.

const SG_COEFFS = {
  5: { coeffs: [-3, 12, 17, 12, -3], norm: 35 },
  7: { coeffs: [-2, 3, 6, 7, 6, 3, -2], norm: 21 },
  9: { coeffs: [-21, 14, 39, 54, 59, 54, 39, 14, -21], norm: 231 },
};

function reflect(idx, n) {
  if (idx < 0) return -idx;
  if (idx >= n) return 2 * (n - 1) - idx;
  return idx;
}

// Typed core: convolve a Float64Array of y-values, return a new Float64Array.
// The neural pipeline calls this directly so smoothing never allocates a
// {x,y}[] between stages; the wrapper below keeps the original signature.
export function savitzkyGolayYs(ys, windowSize = 5) {
  const n = ys.length;
  if (n === 0) return new Float64Array(0);

  let cfg = SG_COEFFS[windowSize];
  if (!cfg) {
    // eslint-disable-next-line no-console
    console.warn(
      `[savitzkyGolay] unsupported windowSize=${windowSize}; falling back to 5`
    );
    cfg = SG_COEFFS[5];
  }

  const half = (cfg.coeffs.length - 1) >> 1;
  const out = new Float64Array(n);
  const norm = cfg.norm;
  const c = cfg.coeffs;

  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -half; k <= half; k++) {
      const idx = reflect(i + k, n);
      acc += ys[idx] * c[k + half];
    }
    out[i] = acc / norm;
  }
  return out;
}

export function savitzkyGolay(signal, windowSize = 5) {
  if (!Array.isArray(signal) || signal.length === 0) return [];
  const n = signal.length;
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) ys[i] = signal[i].y;
  const out = savitzkyGolayYs(ys, windowSize);
  const result = new Array(n);
  for (let i = 0; i < n; i++) result[i] = { x: signal[i].x, y: out[i] };
  return result;
}
