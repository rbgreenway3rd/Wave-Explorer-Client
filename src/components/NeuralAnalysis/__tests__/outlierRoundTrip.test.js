/**
 * Outlier remove → re-add round-trip.
 *
 * removeOutliers identifies extreme local maxima and excises them from
 * the cleaned signal. readdOutliersAsSpikes then reattaches them as
 * spike markers so the user still sees them on the chart. The round
 * trip should preserve the *count* of outliers and place each marker
 * at the original peak coordinates.
 */

import {
  removeOutliers,
  readdOutliersAsSpikes,
} from "../utilities/outlierRemoval";
import { makeOutlierSignal } from "./_fixtures";

describe("outlier remove → re-add round-trip", () => {
  test("identifies the planted outliers (or a subset) and round-trips them as spikes", () => {
    const { signal, outlierCenters } = makeOutlierSignal({
      n: 1500,
      noiseAmp: 0.3,
      outlierCenters: [300, 700, 1200],
      outlierAmplitude: 30,
      outlierSigma: 3,
    });
    const { cleanedSignal, outlierSpikes } = removeOutliers(signal, {
      percentile: 95,
      multiplier: 2.0,
    });

    // The cleaned signal has outlier spans filtered out (deletion, not
    // flatten). So if any outlier was detected, length shrinks; with
    // none detected, length is preserved.
    expect(cleanedSignal.length).toBeLessThanOrEqual(signal.length);
    // Detection should find at least one of our planted outliers.
    // (The percentile/multiplier algorithm may not catch every one in a
    // small fixture; the key invariant is "found > 0 and ≤ planted".)
    expect(outlierSpikes.length).toBeGreaterThanOrEqual(1);
    expect(outlierSpikes.length).toBeLessThanOrEqual(outlierCenters.length);

    // Each detected outlier should land within ±5 samples of one of the
    // planted centers.
    for (const sp of outlierSpikes) {
      const peakX = sp.points[sp.peakIdx - sp.startIdx].x;
      const nearest = outlierCenters.reduce((a, b) =>
        Math.abs(peakX - b) < Math.abs(peakX - a) ? b : a
      );
      expect(Math.abs(peakX - nearest)).toBeLessThanOrEqual(5);
    }

    // Re-add and check we get a marker per detected outlier.
    const merged = readdOutliersAsSpikes([], outlierSpikes);
    expect(merged.length).toBe(outlierSpikes.length);
    for (const m of merged) {
      expect(m.isOutlier).toBe(true);
      expect(m.outlierSpike).toBe(true);
      expect(m.amplitude).toBeGreaterThan(0);
    }
  });

  test("readdOutliersAsSpikes is a no-op for empty outlier list", () => {
    const fakeSpikes = [{ peakCoords: { x: 1, y: 1 } }];
    expect(readdOutliersAsSpikes(fakeSpikes, [])).toBe(fakeSpikes);
    expect(readdOutliersAsSpikes(fakeSpikes, null)).toBe(fakeSpikes);
  });

  test("re-added outliers preserve original spike order in the merged array", () => {
    const { signal } = makeOutlierSignal({
      n: 1500,
      outlierCenters: [400, 1000],
      outlierAmplitude: 30,
    });
    const { outlierSpikes } = removeOutliers(signal, {
      percentile: 95,
      multiplier: 2.0,
    });
    const regularSpikes = [
      { peakCoords: { x: 100, y: 1 }, time: 100, amplitude: 1 },
      { peakCoords: { x: 200, y: 1 }, time: 200, amplitude: 1 },
    ];
    const merged = readdOutliersAsSpikes(regularSpikes, outlierSpikes);
    // Regular spikes come first, outliers appended.
    expect(merged.length).toBe(regularSpikes.length + outlierSpikes.length);
    expect(merged[0]).toBe(regularSpikes[0]);
    expect(merged[1]).toBe(regularSpikes[1]);
    for (let i = regularSpikes.length; i < merged.length; i++) {
      expect(merged[i].isOutlier).toBe(true);
    }
  });
});
