// Synthetic-signal fixtures for Neural Analysis tests. All deterministic
// (seeded RNG) so golden snapshots stay stable across runs / machines.

// CRA's default Jest testMatch picks up anything in __tests__/, so a
// no-op skipped test keeps Jest from complaining that this helper file
// has no tests.
if (typeof test !== "undefined") {
  test.skip("fixtures module: no tests", () => {});
}

// Linear congruential generator — simple, deterministic, no deps.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a signal with N samples (sample times 0..N-1 in ms-equivalent units).
 * Baseline noise is a uniform jitter in [-noiseAmp, +noiseAmp].
 * Spikes are gaussian bumps placed at the specified centers/amplitudes/widths.
 */
export function makeSyntheticSignal({
  n = 2000,
  noiseAmp = 0.5,
  baseline = 0,
  spikes = [], // [{ center, amplitude, sigma }, ...]
  seed = 1,
}) {
  const rng = mulberry32(seed);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let y = baseline + (rng() - 0.5) * 2 * noiseAmp;
    for (const { center, amplitude, sigma } of spikes) {
      const dx = i - center;
      y += amplitude * Math.exp(-(dx * dx) / (2 * sigma * sigma));
    }
    out[i] = { x: i, y };
  }
  return out;
}

/**
 * Build a signal with bursting activity: K bursts, each with M closely
 * spaced spikes (interSpikeInterval), separated by interBurstInterval.
 */
export function makeBurstingSignal({
  n = 4000,
  baseline = 0,
  noiseAmp = 0.3,
  burstCount = 3,
  spikesPerBurst = 5,
  interSpikeInterval = 30, // ms (≡ samples here)
  interBurstInterval = 600,
  burstStartOffset = 200,
  spikeAmplitude = 8,
  spikeSigma = 4,
  seed = 7,
}) {
  const spikes = [];
  for (let b = 0; b < burstCount; b++) {
    const burstStart = burstStartOffset + b * interBurstInterval;
    for (let s = 0; s < spikesPerBurst; s++) {
      spikes.push({
        center: burstStart + s * interSpikeInterval,
        amplitude: spikeAmplitude,
        sigma: spikeSigma,
      });
    }
  }
  return {
    signal: makeSyntheticSignal({ n, noiseAmp, baseline, spikes, seed }),
    expectedBursts: burstCount,
    expectedSpikesPerBurst: spikesPerBurst,
    interSpikeInterval,
    interBurstInterval,
  };
}

/**
 * Build a flat noisy baseline with a few clearly-isolated tall spikes.
 * Useful for outlier-detection round-trip tests.
 */
export function makeOutlierSignal({
  n = 1500,
  baseline = 0,
  noiseAmp = 0.3,
  outlierCenters = [300, 700, 1200],
  outlierAmplitude = 30,
  outlierSigma = 3,
  seed = 13,
}) {
  return {
    signal: makeSyntheticSignal({
      n,
      noiseAmp,
      baseline,
      spikes: outlierCenters.map((center) => ({
        center,
        amplitude: outlierAmplitude,
        sigma: outlierSigma,
      })),
      seed,
    }),
    outlierCenters,
  };
}
