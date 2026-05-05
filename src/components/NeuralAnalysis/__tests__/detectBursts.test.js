/**
 * detectBursts — behavioral tests for spike-cluster grouping.
 *
 * The current implementation uses 1D DBSCAN. Tier G6d will replace it
 * with a linear sweep over already-sorted spike times. These tests
 * lock the *user-facing* semantics ("a burst is a run of spikes whose
 * inter-spike intervals are all ≤ maxInterSpikeInterval, with at least
 * minSpikesPerBurst members") so the rewrite produces the same answer.
 */

import { detectBursts } from "../utilities/burstDetection";

// Helper: build the NeuralPeak-shaped input expected by detectBursts.
function fakePeaks(times) {
  return times.map((t, i) => ({
    peakCoords: { x: t, y: 1 },
    index: i,
  }));
}

describe("detectBursts", () => {
  test("empty input yields no bursts", () => {
    expect(detectBursts([])).toEqual([]);
  });

  test("input below minSpikesPerBurst yields no bursts", () => {
    const peaks = fakePeaks([100, 110]);
    expect(
      detectBursts(peaks, { maxInterSpikeInterval: 50, minSpikesPerBurst: 3 })
    ).toEqual([]);
  });

  test("five tightly-spaced spikes form one burst", () => {
    const peaks = fakePeaks([100, 130, 160, 190, 220]);
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(1);
    expect(bursts[0].spikeCount).toBe(5);
    expect(bursts[0].startTime).toBe(100);
    expect(bursts[0].endTime).toBe(220);
    expect(bursts[0].duration).toBe(120);
  });

  test("two clusters separated by a wide gap form two bursts", () => {
    const peaks = fakePeaks([
      100, 120, 140, 160, // burst 1 (4 spikes, ISI=20)
      // gap
      900, 920, 940, 960, 980, // burst 2 (5 spikes, ISI=20)
    ]);
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(2);
    expect(bursts[0].spikeCount).toBe(4);
    expect(bursts[1].spikeCount).toBe(5);
    expect(bursts[0].endTime).toBe(160);
    expect(bursts[1].startTime).toBe(900);
    // interBurstInterval should be set on burst 2 (= start2 - end1).
    expect(bursts[1].interBurstInterval).toBe(900 - 160);
    // burst 1 has no preceding burst, so interBurstInterval is null.
    expect(bursts[0].interBurstInterval).toBeNull();
  });

  test("isolated spike between clusters is dropped (below minSpikesPerBurst)", () => {
    const peaks = fakePeaks([
      100, 120, 140, // burst 1
      500, // isolated
      900, 920, 940, // burst 2
    ]);
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(2);
    expect(bursts[0].spikeCount).toBe(3);
    expect(bursts[1].spikeCount).toBe(3);
  });

  test("a tighter maxInterSpikeInterval splits one burst into two", () => {
    const peaks = fakePeaks([100, 140, 180, 280, 320, 360]);
    // ISIs: 40, 40, 100, 40, 40
    // Threshold 50 → break at the 100 gap → two bursts of 3 each.
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(2);
    expect(bursts[0].spikeCount).toBe(3);
    expect(bursts[1].spikeCount).toBe(3);
  });

  test("a looser maxInterSpikeInterval merges into one burst", () => {
    const peaks = fakePeaks([100, 140, 180, 280, 320, 360]);
    // ISIs: 40, 40, 100, 40, 40 — threshold 150 absorbs the 100 gap.
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 150,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(1);
    expect(bursts[0].spikeCount).toBe(6);
  });

  test("unsorted input is normalized internally", () => {
    const peaks = fakePeaks([180, 100, 220, 140, 160, 190]);
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    // Should still identify the single dense cluster, with start/end
    // coming from the time-sorted ordering.
    expect(bursts.length).toBe(1);
    expect(bursts[0].startTime).toBe(100);
    expect(bursts[0].endTime).toBe(220);
  });

  test("spikeIndices points back into the original peaks array", () => {
    const peaks = fakePeaks([100, 130, 160, 190, 220]);
    const bursts = detectBursts(peaks, {
      maxInterSpikeInterval: 50,
      minSpikesPerBurst: 3,
    });
    expect(bursts.length).toBe(1);
    // indices were 0..4 in the input order. Burst should reference
    // those exact indices (sorted by time).
    expect(bursts[0].spikeIndices.sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });
});
