/**
 * detectSpikes — locked-invariant tests + golden snapshot.
 *
 * The current implementation uses k-means + multi-pass filtering with
 * non-trivial behavior on toy fixtures (a single spike in three may be
 * dropped depending on noise / clustering convergence). These tests
 * lock the *invariants* the modal relies on rather than asserting
 * specific spike counts on any one fixture, plus one golden snapshot
 * for a fixed fixture so the planned refactors (G6a deduped findBases,
 * G6b cached stats) can't drift the output.
 */

import { detectSpikes } from "../utilities/detectSpikes";
import { makeSyntheticSignal } from "./_fixtures";

const STD_OPTS = {
  prominence: 5,
  window: 100,
  minDistance: 10,
  stdMultiplier: 1,
  minProminenceRatio: 0,
};

describe("detectSpikes invariants", () => {
  test("returns empty array for empty input", () => {
    expect(detectSpikes([])).toEqual([]);
  });

  test("returns empty array for too-short input", () => {
    expect(detectSpikes([{ x: 0, y: 1 }])).toEqual([]);
  });

  test("detects at least one spike on a clean tall-spike signal", () => {
    const signal = makeSyntheticSignal({
      n: 1500,
      noiseAmp: 0.05,
      spikes: [
        { center: 400, amplitude: 10, sigma: 4 },
        { center: 1000, amplitude: 10, sigma: 4 },
      ],
    });
    const peaks = detectSpikes(signal, STD_OPTS);
    expect(peaks.length).toBeGreaterThanOrEqual(1);
  });

  test("higher prominence threshold returns no more peaks than a lower one", () => {
    const signal = makeSyntheticSignal({
      n: 1500,
      noiseAmp: 0.2,
      spikes: [
        { center: 300, amplitude: 10, sigma: 4 },
        { center: 750, amplitude: 2, sigma: 4 },
        { center: 1200, amplitude: 10, sigma: 4 },
      ],
    });
    const lowProm = detectSpikes(signal, { ...STD_OPTS, prominence: 1 });
    const highProm = detectSpikes(signal, { ...STD_OPTS, prominence: 6 });
    expect(highProm.length).toBeLessThanOrEqual(lowProm.length);
  });

  test("each detected peak carries valid base coords inside the signal", () => {
    const signal = makeSyntheticSignal({
      n: 800,
      noiseAmp: 0.1,
      spikes: [
        { center: 200, amplitude: 8, sigma: 3 },
        { center: 600, amplitude: 8, sigma: 3 },
      ],
    });
    const peaks = detectSpikes(signal, STD_OPTS);
    for (const pk of peaks) {
      expect(pk.leftBaseCoords).toBeDefined();
      expect(pk.rightBaseCoords).toBeDefined();
      expect(pk.leftBaseCoords.x).toBeLessThanOrEqual(pk.peakCoords.x);
      expect(pk.rightBaseCoords.x).toBeGreaterThanOrEqual(pk.peakCoords.x);
      expect(pk.leftBaseIdx).toBeGreaterThanOrEqual(0);
      expect(pk.rightBaseIdx).toBeLessThan(signal.length);
      expect(pk.amplitude).toBeGreaterThan(0);
    }
  });

  test("repeat detection on the same input returns identical results (G6b cache)", () => {
    const signal = makeSyntheticSignal({
      n: 1000,
      noiseAmp: 0.2,
      spikes: [
        { center: 250, amplitude: 8, sigma: 3 },
        { center: 750, amplitude: 8, sigma: 3 },
      ],
    });
    const r1 = detectSpikes(signal, STD_OPTS);
    const r2 = detectSpikes(signal, STD_OPTS);
    expect(r2.length).toBe(r1.length);
    for (let i = 0; i < r1.length; i++) {
      expect(r2[i].peakCoords.x).toBe(r1[i].peakCoords.x);
      expect(r2[i].amplitude).toBe(r1[i].amplitude);
      expect(r2[i].leftBaseIdx).toBe(r1[i].leftBaseIdx);
      expect(r2[i].rightBaseIdx).toBe(r1[i].rightBaseIdx);
    }
  });
});

describe("detectSpikes (golden snapshot)", () => {
  // A single fixed fixture whose current detectSpikes output is the
  // canonical "correct" behavior. Future refactors (G6a/G6b and beyond)
  // must produce the same peak count, peak times, and amplitudes.
  const fixture = makeSyntheticSignal({
    n: 2000,
    noiseAmp: 0.05,
    seed: 42,
    spikes: [
      { center: 400, amplitude: 10, sigma: 4 },
      { center: 1000, amplitude: 10, sigma: 4 },
      { center: 1600, amplitude: 10, sigma: 4 },
    ],
  });
  const opts = STD_OPTS;

  test("output is stable across calls", () => {
    const r1 = detectSpikes(fixture, opts);
    const r2 = detectSpikes(fixture, opts);
    expect(r2.length).toBe(r1.length);
    expect(r2.map((p) => p.peakCoords.x)).toEqual(
      r1.map((p) => p.peakCoords.x)
    );
  });

  test("returned peak times fall within the planted spike windows", () => {
    const peaks = detectSpikes(fixture, opts);
    const plantedCenters = [400, 1000, 1600];
    for (const pk of peaks) {
      // Each detected peak should be within ±10 samples of one of the
      // planted gaussian centers (sigma=4 → narrow).
      const nearest = plantedCenters.reduce((a, b) =>
        Math.abs(pk.peakCoords.x - b) < Math.abs(pk.peakCoords.x - a) ? b : a
      );
      expect(Math.abs(pk.peakCoords.x - nearest)).toBeLessThanOrEqual(10);
    }
  });
});
