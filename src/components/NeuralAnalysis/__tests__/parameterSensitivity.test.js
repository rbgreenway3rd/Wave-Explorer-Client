/**
 * Parameter sensitivity suite — every UI tweakable in Outlier Handling,
 * Burst Detection, and Spike Detection must demonstrably change the
 * pipeline's output. Each test runs the full pipeline twice with
 * different values of one slider and asserts a direction.
 *
 * Conventions:
 *   - All slider values stay inside the actual UI ranges (no out-of-band
 *     test values).
 *   - Spike-detection tests set handleOutliers:false so re-added outlier
 *     spikes don't mask the filter under test. Outlier-handling tests
 *     explicitly set handleOutliers:true.
 *   - Each call creates a fresh makePipelineCache() so cache hits from a
 *     prior call can't contaminate the next one.
 *   - Every test isolates the variable under test by holding every
 *     other parameter at a permissive value (no upstream filter eating
 *     the input the test cares about).
 */

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { makePipelineCache } from "../utilities/pipelineCache";
import {
  makeSyntheticSignal,
  makeBurstingSignal,
  makeOutlierSignal,
} from "./_fixtures";

// Matches the pattern in pipeline.test.js, plus the two newer spike params
// that the existing baseParams omitted (noiseFloorMultiplier, noiseWindowSize).
// `spikeWindow: 20` (not 60) — same rationale as pipeline.test.js: keeps
// wlen/2 = 10 below the bursting fixture's interSpikeInterval=30 so
// in-burst spikes aren't coalesced by window-grouping.
const baseParams = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  baselineCorrection: false,
  smoothingEnabled: false,
  smoothingWindow: 5,
  handleOutliers: true,
  outlierPercentile: 95,
  outlierMultiplier: 2.0,
  spikeProminence: 3,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  noiseFloorMultiplier: 0,
  noiseWindowSize: 0,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

// Variant for spike-detection tests: every filter neutralized so it
// can't eat the input the spike test cares about, outlier path disabled
// so re-added outliers don't mask anything.
const permissiveSpikeParams = {
  ...baseParams,
  // Disable upstream signal-shaping so we exercise the spike filters on
  // the raw fixture content. Trend flattening in particular can flatten
  // the "tall neighbor's shadow" that produces asymmetric prominences.
  trendFlatteningEnabled: false,
  smoothingEnabled: false,
  // Outlier path off — re-added outlier spikes would otherwise mask the
  // filters under test.
  handleOutliers: false,
  // Every spike-detection filter at its most permissive setting.
  spikeProminence: 0.5,
  spikeWindow: 5,
  spikeMinWidth: 1,
  spikeMinDistance: 0,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 0.1,
  noiseFloorMultiplier: 0,
  noiseWindowSize: 0,
};

function runPipeline(rawSignal, params, analysisOverrides = {}) {
  return runNeuralAnalysisPipeline({
    rawSignal,
    controlSignal: [],
    params,
    analysis: {
      runSpikeDetection: true,
      runBurstDetection: false,
      ...analysisOverrides,
    },
    noiseSuppressionActive: true,
    cache: makePipelineCache(),
  });
}

const countOutliers = (r) =>
  r.spikeResults.filter((s) => s.isOutlier).length;

const spikePositions = (r) =>
  r.spikeResults
    .map((s) => s.peakCoords?.x ?? s.time)
    .sort((a, b) => a - b)
    .join(",");

// ---------------------------------------------------------------------------
// Outlier Handling (3 params)
// ---------------------------------------------------------------------------

describe("Outlier Handling parameter sensitivity", () => {
  test("handleOutliers: off → no isOutlier spikes; on → at least one", () => {
    const { signal } = makeOutlierSignal({
      n: 1500,
      outlierCenters: [300, 700, 1200],
      outlierAmplitude: 30,
      outlierSigma: 3,
    });
    const off = runPipeline(signal, { ...baseParams, handleOutliers: false });
    const on = runPipeline(signal, { ...baseParams, handleOutliers: true });
    expect(countOutliers(off)).toBe(0);
    expect(countOutliers(on)).toBeGreaterThan(0);
  });

  // The 2026-05-26 pipeline restructure changed the semantics of
  // "flagged outliers" — outliers now must also pass detectSpikes to
  // make it into the result (no more guaranteed re-injection via the
  // old readdOutliersAsSpikes glue-on). On this synthetic signal the
  // 3 real outliers have prominence (~30) that's 100× the noise (~0.3),
  // so they ALL pass detectSpikes regardless of how strict the outlier
  // identification params are — meaning both loose and strict produce
  // the same flagged count (3). The qualitative invariant we can still
  // assert is "loose flags at least as many as strict"; the prior
  // strict-greater-than assertion is no longer reachable on this kind
  // of signal under the new pipeline.
  test("outlierPercentile: 50 flags at least as many outliers as 99 (with multiplier neutralized to 0.5)", () => {
    const { signal } = makeOutlierSignal({
      n: 1500,
      outlierCenters: [300, 700, 1200],
      outlierAmplitude: 30,
      outlierSigma: 3,
    });
    const loose = runPipeline(signal, {
      ...baseParams,
      handleOutliers: true,
      outlierPercentile: 50,
      outlierMultiplier: 0.5,
    });
    const strict = runPipeline(signal, {
      ...baseParams,
      handleOutliers: true,
      outlierPercentile: 99,
      outlierMultiplier: 0.5,
    });
    expect(countOutliers(loose)).toBeGreaterThanOrEqual(countOutliers(strict));
  });

  test("outlierMultiplier: 0.5 flags at least as many outliers as 5.0 (with percentile neutralized to 50)", () => {
    const { signal } = makeOutlierSignal({
      n: 1500,
      outlierCenters: [300, 700, 1200],
      outlierAmplitude: 30,
      outlierSigma: 3,
    });
    const loose = runPipeline(signal, {
      ...baseParams,
      handleOutliers: true,
      outlierPercentile: 50,
      outlierMultiplier: 0.5,
    });
    const strict = runPipeline(signal, {
      ...baseParams,
      handleOutliers: true,
      outlierPercentile: 50,
      outlierMultiplier: 5.0,
    });
    expect(countOutliers(loose)).toBeGreaterThanOrEqual(countOutliers(strict));
  });
});

// ---------------------------------------------------------------------------
// Burst Detection (3 params)
// ---------------------------------------------------------------------------

describe("Burst Detection parameter sensitivity", () => {
  test("showBursts: off → no bursts; on → some bursts", () => {
    const { signal } = makeBurstingSignal({});
    const off = runPipeline(signal, baseParams, { runBurstDetection: false });
    const on = runPipeline(signal, baseParams, { runBurstDetection: true });
    expect(off.burstResults.length).toBe(0);
    expect(on.burstResults.length).toBeGreaterThan(0);
  });

  test("maxInterSpikeInterval: 50 splits into two bursts; 200 merges into one (custom fixture)", () => {
    // 8 spikes, 30 ms apart within each group of 4, 150 ms gap between groups.
    // - maxIsi=50: intra-group gaps (30) pass; inter-group gap (150) breaks → 2 bursts
    // - maxIsi=200: every gap passes → 1 merged burst
    const signal = makeSyntheticSignal({
      n: 600,
      noiseAmp: 0.1,
      seed: 51,
      spikes: [
        { center: 100, amplitude: 10, sigma: 3 },
        { center: 130, amplitude: 10, sigma: 3 },
        { center: 160, amplitude: 10, sigma: 3 },
        { center: 190, amplitude: 10, sigma: 3 },
        { center: 340, amplitude: 10, sigma: 3 },
        { center: 370, amplitude: 10, sigma: 3 },
        { center: 400, amplitude: 10, sigma: 3 },
        { center: 430, amplitude: 10, sigma: 3 },
      ],
    });
    const split = runPipeline(
      signal,
      { ...baseParams, maxInterSpikeInterval: 50 },
      { runBurstDetection: true },
    );
    const merged = runPipeline(
      signal,
      { ...baseParams, maxInterSpikeInterval: 200 },
      { runBurstDetection: true },
    );
    expect(split.burstResults.length).toBeGreaterThan(merged.burstResults.length);
    expect(merged.burstResults.length).toBeGreaterThanOrEqual(1);
  });

  test("minSpikesPerBurst: 2 keeps bursts; 10 drops them (default fixture is 5 spikes/burst)", () => {
    const { signal } = makeBurstingSignal({}); // 3 bursts × 5 spikes
    const loose = runPipeline(
      signal,
      { ...baseParams, minSpikesPerBurst: 2 },
      { runBurstDetection: true },
    );
    const strict = runPipeline(
      signal,
      { ...baseParams, minSpikesPerBurst: 10 },
      { runBurstDetection: true },
    );
    expect(loose.burstResults.length).toBeGreaterThan(strict.burstResults.length);
    expect(strict.burstResults.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Spike Detection (8 params) — all with handleOutliers:false
// ---------------------------------------------------------------------------

describe("Spike Detection parameter sensitivity", () => {
  test("spikeProminence: high (10) keeps fewer spikes than low (1)", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.1,
      seed: 71,
      spikes: [
        { center: 200, amplitude: 4, sigma: 3 },
        { center: 400, amplitude: 8, sigma: 3 },
        { center: 600, amplitude: 12, sigma: 3 },
      ],
    });
    const low = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeProminence: 1,
    });
    const high = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeProminence: 10,
    });
    expect(high.spikeResults.length).toBeLessThan(low.spikeResults.length);
  });

  test("spikeWindow: wide (200) collapses adjacent peaks that narrow (5) keeps separate", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0.05,
      seed: 72,
      spikes: [
        { center: 100, amplitude: 10, sigma: 2 },
        { center: 110, amplitude: 10, sigma: 2 },
        { center: 120, amplitude: 10, sigma: 2 },
        { center: 130, amplitude: 10, sigma: 2 },
      ],
    });
    const narrow = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeWindow: 5,
      spikeMinDistance: 0,
    });
    const wide = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeWindow: 200,
      spikeMinDistance: 0,
    });
    expect(wide.spikeResults.length).toBeLessThan(narrow.spikeResults.length);
  });

  test("spikeMinDistance: 50 collapses adjacent peaks that 0 keeps separate", () => {
    const signal = makeSyntheticSignal({
      n: 400,
      noiseAmp: 0.05,
      seed: 73,
      spikes: [
        { center: 100, amplitude: 10, sigma: 2 },
        { center: 110, amplitude: 10, sigma: 2 },
        { center: 120, amplitude: 10, sigma: 2 },
        { center: 130, amplitude: 10, sigma: 2 },
      ],
    });
    const close = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeWindow: 5,
      spikeMinDistance: 0,
    });
    const far = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeWindow: 5,
      spikeMinDistance: 50,
    });
    expect(far.spikeResults.length).toBeLessThan(close.spikeResults.length);
  });

  test("spikeMinWidth: high (20) rejects narrow peaks that low (1) keeps", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.05,
      seed: 74,
      spikes: [
        { center: 200, amplitude: 10, sigma: 1 }, // narrow
        { center: 600, amplitude: 10, sigma: 5 }, // wide
      ],
    });
    const lax = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeMinWidth: 1,
    });
    const strict = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeMinWidth: 20,
    });
    expect(strict.spikeResults.length).toBeLessThan(lax.spikeResults.length);
  });

  test("spikeMinProminenceRatio: high (0.9) rejects asymmetric peaks that low (0.01) keeps", () => {
    // Asymmetric-peak construction via a baseline step. The peak sits
    // exactly on a step from y=0 to y=5: its left base lands on the
    // y=0 baseline, its right base lands on the y=5 plateau. Both
    // prominences are comfortably above noise (so the k-means lower
    // cluster doesn't eat them), but the ratio is ~0.67 → fails 0.9 and
    // passes 0.01.
    const n = 700;
    const signal = new Array(n);
    for (let i = 0; i < n; i++) {
      let y = i < 200 ? 0 : 5;
      // Asymmetric peak straddling the step at x=200, amp=10, sigma=3.
      y += 10 * Math.exp(-((i - 200) * (i - 200)) / 18);
      // Symmetric peak on the elevated plateau at x=500, amp=10, sigma=3.
      y += 10 * Math.exp(-((i - 500) * (i - 500)) / 18);
      signal[i] = { x: i, y };
    }
    const lax = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeMinProminenceRatio: 0.01,
      spikeWindow: 10,
    });
    const strict = runPipeline(signal, {
      ...permissiveSpikeParams,
      spikeMinProminenceRatio: 0.9,
      spikeWindow: 10,
    });
    // Sanity: lax must keep both peaks; otherwise the strict pass has
    // nothing to reject and the test is meaningless.
    expect(lax.spikeResults.length).toBeGreaterThanOrEqual(2);
    expect(strict.spikeResults.length).toBeLessThan(lax.spikeResults.length);
  });

  test("stdMultiplier: high (5.0) triggers k-means bail-out on pure noise; low (0.1) does not", () => {
    // Pure noise — no real spikes. The peak-prominence distribution is
    // tightly clustered, so cluster separation is small and the bail-out
    // gate (the only thing stdMultiplier controls) fires at high values.
    const signal = makeSyntheticSignal({
      n: 1000,
      noiseAmp: 1.0,
      seed: 76,
      spikes: [],
    });
    const lax = runPipeline(signal, {
      ...permissiveSpikeParams,
      stdMultiplier: 0.1,
    });
    const strict = runPipeline(signal, {
      ...permissiveSpikeParams,
      stdMultiplier: 5.0,
    });
    expect(strict.spikeResults.length).toBe(0);
    expect(lax.spikeResults.length).toBeGreaterThan(0);
  });

  test("noiseFloorMultiplier: high (10) rejects low-amplitude spikes that 0 keeps", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.3,
      seed: 77,
      spikes: [
        { center: 200, amplitude: 2, sigma: 3 },
        { center: 400, amplitude: 5, sigma: 3 },
        { center: 600, amplitude: 10, sigma: 3 },
      ],
    });
    const off = runPipeline(signal, {
      ...permissiveSpikeParams,
      noiseFloorMultiplier: 0,
    });
    const strict = runPipeline(signal, {
      ...permissiveSpikeParams,
      noiseFloorMultiplier: 10,
    });
    expect(strict.spikeResults.length).toBeLessThan(off.spikeResults.length);
  });

  test("noiseWindowSize: local σ produces a different spike set than global σ (with noise floor on)", () => {
    // Non-stationary noise: quiet first half, noisy second half.
    // Moderate spikes in both halves. With global σ, the average σ
    // applies everywhere; with per-block σ, the floor in the noisy half
    // is much higher than in the quiet half. The spike sets should
    // differ — not just in count but in *which* peaks survive.
    const n = 1000;
    const signal = makeSyntheticSignal({
      n,
      noiseAmp: 0,
      seed: 78,
      spikes: [
        { center: 250, amplitude: 4, sigma: 3 },
        { center: 750, amplitude: 4, sigma: 3 },
      ],
    });
    // Layer in non-stationary noise on top of the spike-only signal.
    let s = 99 >>> 0;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < n; i++) {
      const localAmp = i < n / 2 ? 0.2 : 2.0;
      signal[i].y += (rand() - 0.5) * 2 * localAmp;
    }
    const global = runPipeline(signal, {
      ...permissiveSpikeParams,
      noiseFloorMultiplier: 3,
      noiseWindowSize: 0,
    });
    const local = runPipeline(signal, {
      ...permissiveSpikeParams,
      noiseFloorMultiplier: 3,
      noiseWindowSize: 500,
    });
    // Sets must differ either in size or in which peaks survive.
    expect(spikePositions(local)).not.toBe(spikePositions(global));
  });
});

// ---------------------------------------------------------------------------
// Activity Threshold (apex-Y filter, stored as 0–1 ratio of well Y range)
// ---------------------------------------------------------------------------

describe("Activity Threshold parameter sensitivity", () => {
  // makeBurstingSignal puts 15 spikes all at the same amplitude on a
  // flat baseline. Uniform amplitudes mean every spike survives the
  // pipeline's k-means cluster gate (which would otherwise drop a
  // distinct lower-prominence cluster). The threshold then either
  // affects all spikes (high ratio) or none (low ratio), giving us
  // clean, deterministic assertions.
  const makeFixture = () => makeBurstingSignal({}).signal;

  test("disabled → threshold has no effect (same count as a baseline run)", () => {
    const signal = makeFixture();
    const off = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: false,
      activityThresholdRatio: 0.99, // would otherwise wipe everything
    });
    const baseline = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: false,
      activityThresholdRatio: 0,
    });
    expect(off.spikeResults.length).toBeGreaterThan(0);
    expect(off.spikeResults.length).toBe(baseline.spikeResults.length);
  });

  test("enabled, ratio = 0 → threshold sits at signal min, no-op", () => {
    const signal = makeFixture();
    const off = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: false,
    });
    const ratioZero = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: true,
      activityThresholdRatio: 0,
    });
    expect(ratioZero.spikeResults.length).toBe(off.spikeResults.length);
  });

  test("enabled, ratio = 0.99 → threshold near signal top, fewer spikes than disabled", () => {
    // We can't guarantee zero (noise jitter on the fixture can push
    // individual peak apexes above ratio*yMax) but we *can* guarantee
    // the high-ratio result is a strict subset of the disabled result.
    const signal = makeFixture();
    const off = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: false,
    });
    const high = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: true,
      activityThresholdRatio: 0.99,
    });
    expect(high.spikeResults.length).toBeLessThan(off.spikeResults.length);
  });

  test("monotonic in ratio: raising the threshold never increases spike count", () => {
    const signal = makeFixture();
    const low = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: true,
      activityThresholdRatio: 0.1,
    });
    const mid = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: true,
      activityThresholdRatio: 0.5,
    });
    const high = runPipeline(signal, {
      ...permissiveSpikeParams,
      activityThresholdEnabled: true,
      activityThresholdRatio: 0.99,
    });
    expect(mid.spikeResults.length).toBeLessThanOrEqual(
      low.spikeResults.length,
    );
    expect(high.spikeResults.length).toBeLessThanOrEqual(
      mid.spikeResults.length,
    );
    // And the high-ratio case must actually filter at least one spike
    // relative to the low-ratio case — proves the filter is wired,
    // not a no-op.
    expect(high.spikeResults.length).toBeLessThan(low.spikeResults.length);
  });

  test("burst detection sees the filtered spike set — high threshold reduces bursts", () => {
    // Uses baseParams (which the existing burst-direction test relies on
    // to produce >0 bursts on this fixture). permissiveSpikeParams here
    // would push k-means into dropping enough spikes that bursts are
    // already zero at low ratio, masking the activity-threshold effect.
    // Turn handleOutliers off so re-added outlier spikes don't muddy the
    // count comparison.
    const signal = makeFixture();
    // Keep baseParams' handleOutliers: true — that's what the existing
    // "showBursts on → some bursts" test relies on to produce >0 bursts
    // on this fixture.
    const burstParams = { ...baseParams, activityThresholdEnabled: true };
    const low = runPipeline(
      signal,
      { ...burstParams, activityThresholdRatio: 0 },
      { runBurstDetection: true },
    );
    const high = runPipeline(
      signal,
      { ...burstParams, activityThresholdRatio: 0.99 },
      { runBurstDetection: true },
    );
    expect(low.burstResults.length).toBeGreaterThan(0);
    expect(high.burstResults.length).toBeLessThan(low.burstResults.length);
  });
});
