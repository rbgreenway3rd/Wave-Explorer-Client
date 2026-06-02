// Tests for the client-side histogram binning helpers used by the
// Distributions panel.

import {
  binWithFreedmanDiaconis,
  deriveISIs,
} from "../subComponents/Distributions/binning";

describe("binWithFreedmanDiaconis", () => {
  test("returns empty-bin shape for empty input", () => {
    const result = binWithFreedmanDiaconis([]);
    expect(result.edges.length).toBe(2);
    expect(result.counts.length).toBe(1);
    expect(result.counts[0]).toBe(0);
  });

  test("small-N (N < 30) uses the fixed fallback bin count", () => {
    const result = binWithFreedmanDiaconis([1, 2, 3, 4, 5]);
    expect(result.counts.length).toBe(8); // smallNBins default
    expect(result.edges.length).toBe(9);
    // Counts sum to N.
    let sum = 0;
    for (const c of result.counts) sum += c;
    expect(sum).toBe(5);
  });

  test("Freedman-Diaconis kicks in for N >= 30 and respects [5, 25] clamp", () => {
    // 60 values uniformly distributed in [0, 100].
    const values = [];
    for (let i = 0; i < 60; i++) values.push(i * (100 / 59));
    const result = binWithFreedmanDiaconis(values);
    expect(result.counts.length).toBeGreaterThanOrEqual(5);
    expect(result.counts.length).toBeLessThanOrEqual(25);
    let sum = 0;
    for (const c of result.counts) sum += c;
    expect(sum).toBe(60);
    // Edges span the input range.
    expect(result.edges[0]).toBeCloseTo(0, 3);
    expect(result.edges[result.edges.length - 1]).toBeCloseTo(100, 3);
  });

  test("log-scale binning bins log10 values; range covers input span", () => {
    // ISIs from 5 ms (0.005 s) to 30 s — log10 range [-2.3, 1.48].
    const isis = [0.005, 0.05, 0.5, 5, 30, 0.1, 1, 10, 0.01, 3];
    const result = binWithFreedmanDiaconis(isis, { logScale: true });
    // Edges are in log10 space (negative values are normal for sub-1
    // ISIs in seconds).
    expect(result.edges[0]).toBeLessThan(0);
    expect(result.edges[result.edges.length - 1]).toBeGreaterThan(1);
    let sum = 0;
    for (const c of result.counts) sum += c;
    expect(sum).toBe(isis.length);
  });

  test("filters non-finite values gracefully", () => {
    const result = binWithFreedmanDiaconis([1, 2, NaN, Infinity, 3, 4]);
    let sum = 0;
    for (const c of result.counts) sum += c;
    expect(sum).toBe(4); // 1, 2, 3, 4
  });

  test("degenerate uniform input doesn't blow up (zero IQR)", () => {
    const result = binWithFreedmanDiaconis([5, 5, 5, 5, 5]);
    let sum = 0;
    for (const c of result.counts) sum += c;
    expect(sum).toBe(5);
    expect(result.edges[0]).toBe(5);
    expect(result.edges[result.edges.length - 1]).toBeGreaterThan(5);
  });
});

describe("deriveISIs", () => {
  test("returns empty array for < 2 spikes", () => {
    expect(deriveISIs([])).toEqual([]);
    expect(deriveISIs([{ peakCoords: { x: 1, y: 0.1 } }])).toEqual([]);
  });

  test("computes inter-spike intervals from sorted times", () => {
    const spikes = [
      { peakCoords: { x: 5, y: 0.1 } },
      { peakCoords: { x: 1, y: 0.2 } }, // out-of-order; should sort
      { peakCoords: { x: 3, y: 0.3 } },
    ];
    const isis = deriveISIs(spikes);
    expect(isis).toEqual([2, 2]);
  });
});
