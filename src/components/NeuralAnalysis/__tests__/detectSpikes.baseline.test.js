/**
 * detectSpikes — Baseline Threshold override.
 *
 * When the user enables the chart's Baseline Threshold line, peak
 * bases must be the signal's intersections with that absolute Y line,
 * not the lowest local minima. These tests pin the behavior down on
 * synthetic single-peak signals where the expected base positions are
 * computable from the fixture rather than left to k-means luck.
 *
 * Per project convention (see feedback_test_design memory): use
 * UI-valid parameter ranges, isolate the variable under test (only
 * useBaselineForBases / baselineY change between the on/off pair),
 * exercise real behavior (assert width / AUC math, not just "the
 * function returned something").
 */

import { detectSpikes } from "../utilities/detectSpikes";
import { makeSyntheticSignal } from "./_fixtures";

const STD_OPTS = {
  prominence: 1,
  window: 200,
  minDistance: 10,
  stdMultiplier: 1,
  minProminenceRatio: 0,
  minWidth: 1,
};

describe("detectSpikes — Baseline Threshold override", () => {
  test("bases land at the baseline crossings, not local minima", () => {
    // Single tall gaussian on a clean baseline. With noise the local
    // minima can wander; with baseline mode, bases are fixed by the
    // line's Y value regardless.
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.02,
      spikes: [{ center: 400, amplitude: 10, sigma: 8 }],
    });

    // Baseline Y = 2. The gaussian y(i) = 10·exp(-(i-400)²/(2·64))
    // crosses y=2 at i = 400 ± 8·sqrt(2·ln(5)) ≈ 400 ± 14.36
    // → expected bases near samples 386 and 414.
    const peaks = detectSpikes(signal, {
      ...STD_OPTS,
      useBaselineForBases: true,
      baselineY: 2,
    });

    expect(peaks.length).toBe(1);
    const pk = peaks[0];
    expect(pk.leftBaseIdx).toBeGreaterThanOrEqual(382);
    expect(pk.leftBaseIdx).toBeLessThanOrEqual(390);
    expect(pk.rightBaseIdx).toBeGreaterThanOrEqual(410);
    expect(pk.rightBaseIdx).toBeLessThanOrEqual(418);
    // Width in samples should match intercept-to-intercept distance
    // (roughly 28 samples), not the wider local-minimum span the
    // non-baseline path would give on a long clean tail.
    expect(pk.width).toBeGreaterThanOrEqual(22);
    expect(pk.width).toBeLessThanOrEqual(34);
  });

  test("higher baseline shrinks measured width (intercepts closer to apex)", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.02,
      spikes: [{ center: 400, amplitude: 10, sigma: 8 }],
    });

    const lowBase = detectSpikes(signal, {
      ...STD_OPTS,
      useBaselineForBases: true,
      baselineY: 1,
    });
    const highBase = detectSpikes(signal, {
      ...STD_OPTS,
      useBaselineForBases: true,
      baselineY: 5,
    });

    expect(lowBase.length).toBe(1);
    expect(highBase.length).toBe(1);
    // Higher baseline → narrower span between intercepts → smaller
    // width and AUC.
    expect(highBase[0].width).toBeLessThan(lowBase[0].width);
    expect(highBase[0].auc).toBeLessThan(lowBase[0].auc);
  });

  test("baseline above the peak apex falls back to local-minima bases", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.02,
      spikes: [{ center: 400, amplitude: 10, sigma: 8 }],
    });

    // baselineY = 50 sits above the 10-unit-tall gaussian, so the
    // baseline-crossing search never finds intercepts above the peak.
    // Previously this collapsed bases to peakIdx (width 0, AUC 0).
    // After the 2026-05-26 silent-zero fix, `basesFor` falls back to
    // the standard non-baseline `findBases` ladder when baseline mode
    // returns degenerate bases — so the user always gets real width /
    // AUC measurements regardless of where they dragged the line.
    const peaks = detectSpikes(signal, {
      ...STD_OPTS,
      useBaselineForBases: true,
      baselineY: 50,
    });

    expect(peaks.length).toBeGreaterThan(0);
    for (const pk of peaks) {
      // Width is rightBaseIdx - leftBaseIdx via the local-minima
      // fallback — must be a positive number of samples.
      expect(pk.width).toBeGreaterThan(0);
      // AUC integrates over a non-empty interval and must be positive
      // for a real (non-degenerate) peak.
      expect(pk.auc).toBeGreaterThan(0);
    }
  });

  test("baseline disabled matches the existing per-peak base path", () => {
    // Regression guard: detection without the override flag must
    // produce the same output as before — same peaks, same width/AUC.
    const signal = makeSyntheticSignal({
      n: 1000,
      noiseAmp: 0.1,
      spikes: [
        { center: 300, amplitude: 8, sigma: 4 },
        { center: 700, amplitude: 8, sigma: 4 },
      ],
    });

    const without = detectSpikes(signal, STD_OPTS);
    const explicitOff = detectSpikes(signal, {
      ...STD_OPTS,
      useBaselineForBases: false,
      baselineY: 99,
    });

    expect(explicitOff.length).toBe(without.length);
    for (let i = 0; i < without.length; i++) {
      expect(explicitOff[i].leftBaseIdx).toBe(without[i].leftBaseIdx);
      expect(explicitOff[i].rightBaseIdx).toBe(without[i].rightBaseIdx);
      expect(explicitOff[i].width).toBe(without[i].width);
    }
  });
});
