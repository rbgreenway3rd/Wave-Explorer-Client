/**
 * Tall-outlier removal.
 *
 * removeOutliers finds points that sit FAR ABOVE the rest of the data (blips
 * that skew the y-scale), removes each blip's WHOLE excursion down to baseline
 * and bridges the gap with a straight line — while the small real events that
 * sit only a few σ above the noise always survive. Detection is a robust
 * median + MAD cutoff, so the outliers cannot contaminate the reference.
 */

import { removeOutliers } from "../utilities/outlierRemoval";
import { detectSpikes } from "../utilities/detectSpikes";
import { makeSignalWithOutliers } from "./_fixtures";

const maxY = (sig) => sig.reduce((m, p) => (p.y > m ? p.y : m), -Infinity);
const near = (sig, center, radius = 12) => {
  let m = -Infinity;
  for (let i = center - radius; i <= center + radius; i++) {
    if (i >= 0 && i < sig.length && sig[i].y > m) m = sig[i].y;
  }
  return m;
};

describe("removeOutliers — tall outliers vs real signal", () => {
  test("fully removes the blip (down to baseline), not just its tip", () => {
    const { signal, outlierCenters, outlierApex, realEventApex } =
      makeSignalWithOutliers({});
    const { cleanedSignal, regions, cutoff } = removeOutliers(signal);

    expect(cleanedSignal.length).toBe(signal.length);
    expect(regions.length).toBe(1);

    // Before: the outlier towered far above everything.
    expect(maxY(signal)).toBeGreaterThan(outlierApex * 0.9);
    // After: the peak where the outlier was is gone — pulled all the way down
    // to near baseline, NOT left as a stub near the cutoff.
    const cleanedAtOutlier = near(cleanedSignal, outlierCenters[0]);
    expect(cleanedAtOutlier).toBeLessThan(realEventApex * 1.2);
    // And the overall y-scale now reflects the real signal, not the blip.
    expect(maxY(cleanedSignal)).toBeLessThan(realEventApex * 1.5);
    expect(cutoff).toBeLessThan(outlierApex); // cutoff sits well below the blip
  });

  test("preserves the small real events (they are only a few σ up)", () => {
    const { signal, realEventCenters, realEventApex } = makeSignalWithOutliers(
      {}
    );
    const { cleanedSignal, removedIndices } = removeOutliers(signal);
    const removed = new Set(removedIndices);
    for (const c of realEventCenters) {
      // Not removed, and still at (roughly) full height.
      expect(removed.has(c)).toBe(false);
      expect(near(cleanedSignal, c)).toBeGreaterThan(realEventApex * 0.8);
    }
  });

  test("x-values and length preserved (index alignment)", () => {
    const { signal } = makeSignalWithOutliers({});
    const { cleanedSignal } = removeOutliers(signal);
    for (let i = 0; i < signal.length; i++) {
      expect(cleanedSignal[i].x).toBe(signal[i].x);
    }
  });

  test("outlierPoints report each blip at its ORIGINAL height (show-back)", () => {
    const { signal, outlierApex } = makeSignalWithOutliers({});
    const { outlierPoints } = removeOutliers(signal);
    expect(outlierPoints.length).toBe(1);
    expect(outlierPoints[0].y).toBeGreaterThan(outlierApex * 0.9);
  });

  test("removes the blip across the sensitivity range (it is far above)", () => {
    // Across a sensible range the far-above blip is always pulled down. (At
    // very low sensitivity the small real events get caught too — that's the
    // documented 'lower removes more' behavior; the default keeps them.)
    const { signal, outlierCenters, realEventApex } = makeSignalWithOutliers(
      {}
    );
    for (const sensitivity of [5, 8, 12]) {
      const { cleanedSignal } = removeOutliers(signal, { sensitivity });
      expect(near(cleanedSignal, outlierCenters[0])).toBeLessThan(
        realEventApex * 1.3
      );
    }
  });

  test("multiple blips of differing height: all fully removed, events kept", () => {
    const { signal, realEventCenters } = makeSignalWithOutliers({
      outliers: [
        { center: 1600, amplitude: 1800, width: 1 },
        { center: 3000, amplitude: 3200, width: 4 },
        { center: 5200, amplitude: 2200, width: 2 },
      ],
    });
    const { cleanedSignal, regions, removedIndices } = removeOutliers(signal);
    expect(regions.length).toBe(3);
    const removed = new Set(removedIndices);
    for (const c of [1600, 3000, 5200]) {
      expect(near(cleanedSignal, c)).toBeLessThan(1200);
    }
    for (const c of realEventCenters) expect(removed.has(c)).toBe(false);
  });

  test("scale invariance: identical removal when the signal is ×0.001", () => {
    const big = makeSignalWithOutliers({});
    const small = big.signal.map((p) => ({ x: p.x, y: p.y * 0.001 }));
    expect(removeOutliers(small).removedIndices).toEqual(
      removeOutliers(big.signal).removedIndices
    );
  });

  test("no outlier → original array reference returned, nothing removed", () => {
    const { signal } = makeSignalWithOutliers({ outliers: [] });
    const r = removeOutliers(signal);
    expect(r.removedIndices).toEqual([]);
    expect(r.regions.length).toBe(0);
    expect(r.cleanedSignal).toBe(signal); // same ref → memo identity preserved
  });

  test("detection on the cleaned signal never counts a spike at an outlier", () => {
    const { signal, outlierCenters } = makeSignalWithOutliers({});
    const { cleanedSignal } = removeOutliers(signal);
    const peaks = detectSpikes(cleanedSignal, {
      prominence: 200,
      window: 40,
      minDistance: 5,
      stdMultiplier: 1,
      minProminenceRatio: 0,
      minWidth: 2,
    });
    for (const c of outlierCenters) {
      expect(peaks.some((p) => Math.abs(p.index - c) <= 4)).toBe(false);
    }
  });
});
