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
 * Build a trace that mimics real oscillation/spiking data for outlier-removal
 * tests: a noisy baseline carrying small REAL events (a few σ above noise,
 * which must survive) plus one or more TALL, narrow OUTLIER blips that sit far
 * above everything (many σ up, which must be removed and their gaps bridged).
 *
 * Amplitudes are absolute. Defaults: baseline 250, noise ±150 (≈111 robust σ),
 * real events +250 (≈+2σ apex), outliers +2750 (≈+25σ apex) — a clear gap.
 * Returns the signal plus planted centers so tests can assert what survives.
 */
export function makeSignalWithOutliers({
  n = 6000,
  baseline = 250,
  noiseAmp = 150,
  realEvents = [
    { center: 1000, amplitude: 250, sigma: 8 },
    { center: 4500, amplitude: 250, sigma: 8 },
  ],
  outliers = [{ center: 3000, amplitude: 2750, width: 3 }],
  seed = 31,
}) {
  const rng = mulberry32(seed);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let y = baseline + (rng() - 0.5) * 2 * noiseAmp;
    for (const e of realEvents) {
      const dx = i - e.center;
      y += e.amplitude * Math.exp(-(dx * dx) / (2 * e.sigma * e.sigma));
    }
    out[i] = { x: i, y };
  }
  for (const o of outliers) {
    const half = Math.max(0, Math.floor((o.width ?? 1) / 2));
    for (let i = o.center - half; i <= o.center + half; i++) {
      if (i >= 0 && i < n) out[i].y += o.amplitude;
    }
  }
  return {
    signal: out,
    baseline,
    realEventCenters: realEvents.map((e) => e.center),
    realEventApex: baseline + (realEvents[0]?.amplitude ?? 0),
    outlierCenters: outliers.map((o) => o.center),
    outlierApex: baseline + Math.max(...outliers.map((o) => o.amplitude), 0),
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
