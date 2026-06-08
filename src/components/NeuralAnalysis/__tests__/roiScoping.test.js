// Tests for the canonical ROI filters used by the report builder.
// The contained-fully rule (NeuralAnalysisModal.js#L132-L140) is the
// canonical truth — what the live UI shows the user. The previous
// Full-Plate "overlap" rule was the divergence bug, and this test set
// pins the fully-contained semantics into a regression check so any
// future drift fails loudly.

import {
  filterSpikesInROI,
  filterBurstsInROI,
} from "../utilities/neuralReportBuilder/roiScoping";

const roi = { xMin: 10, xMax: 20 };

describe("filterSpikesInROI", () => {
  test("includes spikes whose time falls inside [xMin, xMax]", () => {
    const spikes = [
      { time: 5 },
      { time: 10 }, // boundary in
      { time: 15 },
      { time: 20 }, // boundary in
      { time: 21 },
    ];
    const filtered = filterSpikesInROI(spikes, roi);
    expect(filtered.map((s) => s.time)).toEqual([10, 15, 20]);
  });

  test("falls back to peakCoords.x when .time is absent", () => {
    const spikes = [{ peakCoords: { x: 12 } }, { peakCoords: { x: 50 } }];
    const filtered = filterSpikesInROI(spikes, roi);
    expect(filtered.length).toBe(1);
    expect(filtered[0].peakCoords.x).toBe(12);
  });

  test("returns empty for malformed inputs", () => {
    expect(filterSpikesInROI(null, roi)).toEqual([]);
    expect(filterSpikesInROI([], null)).toEqual([]);
    expect(filterSpikesInROI([{ time: 15 }], { xMin: NaN, xMax: 20 })).toEqual([]);
  });
});

describe("filterBurstsInROI (fully-contained)", () => {
  test("burst fully inside the ROI is kept", () => {
    const bursts = [{ startTime: 12, endTime: 18 }];
    expect(filterBurstsInROI(bursts, roi).length).toBe(1);
  });

  test("burst that starts before the ROI is dropped", () => {
    const bursts = [{ startTime: 8, endTime: 18 }];
    expect(filterBurstsInROI(bursts, roi).length).toBe(0);
  });

  test("burst that ends after the ROI is dropped (the contained-vs-overlap regression)", () => {
    // The prior Full-Plate "overlap" rule would have INCLUDED this
    // burst (endTime > xMax). The canonical rule REJECTS it.
    const bursts = [{ startTime: 15, endTime: 25 }];
    expect(filterBurstsInROI(bursts, roi).length).toBe(0);
  });

  test("burst touching the boundaries exactly is kept", () => {
    const bursts = [{ startTime: 10, endTime: 20 }];
    expect(filterBurstsInROI(bursts, roi).length).toBe(1);
  });

  test("burst entirely outside is dropped", () => {
    const bursts = [
      { startTime: 0, endTime: 5 },
      { startTime: 100, endTime: 200 },
    ];
    expect(filterBurstsInROI(bursts, roi).length).toBe(0);
  });
});
