// Tests for control-well scaling: the scale-factor math (median of per-well
// medians → k = 100/controlMedian) and the post-detection units transforms
// (scaleSpike / scalePipelineResults). The pipeline is mocked so the
// scale-factor math is tested in isolation; the transforms are pure.

jest.mock("../../../NeuralPipeline", () => ({
  // Each control well carries its spike amplitudes on the materialized
  // signal as `_amps`; the mock turns those into spike objects so
  // calculateSpikeAmplitude (real) computes the per-well median.
  runNeuralAnalysisPipeline: ({ rawSignal }) => ({
    spikeResults: (rawSignal._amps || []).map((a) => ({ amplitude: a })),
  }),
}));

const {
  computeControlScaleFactor,
  scaleSpike,
  scalePipelineResults,
  scaleReportedMetrics,
} = require("../controlScaling");

// Build a control well whose detection yields the given amplitudes.
function wellWithAmps(id, amps) {
  const signal = [{ x: 0, y: 0 }];
  signal._amps = amps;
  return { id, key: id, indicators: [{ filteredData: signal }] };
}

describe("computeControlScaleFactor", () => {
  test("median of per-well medians → k = 100 / controlMedian", () => {
    // per-well medians: [20, 40, 60] → median 40 → k = 2.5
    const wells = [
      wellWithAmps("A", [10, 20, 30]),
      wellWithAmps("B", [40, 40]),
      wellWithAmps("C", [60]),
    ];
    const { controlMedian, k, usedWellCount } = computeControlScaleFactor(
      wells,
      { params: {} }
    );
    expect(controlMedian).toBe(40);
    expect(k).toBeCloseTo(2.5, 10);
    expect(usedWellCount).toBe(3);
  });

  test("a control well's own median maps to 100 under k", () => {
    const wells = [wellWithAmps("A", [10, 30])]; // median 20 → k = 5
    const { k } = computeControlScaleFactor(wells, { params: {} });
    expect(20 * k).toBeCloseTo(100, 10);
  });

  test("spikeless control wells are skipped", () => {
    // B has no spikes → ignored; medians [20, 40] → median 30 → k = 100/30
    const wells = [
      wellWithAmps("A", [20]),
      wellWithAmps("B", []),
      wellWithAmps("C", [40]),
    ];
    const { controlMedian, usedWellCount } = computeControlScaleFactor(wells, {
      params: {},
    });
    expect(controlMedian).toBe(30);
    expect(usedWellCount).toBe(2);
  });

  test("empty set / all-spikeless → k null", () => {
    expect(computeControlScaleFactor([], { params: {} })).toEqual({
      controlMedian: null,
      k: null,
      usedWellCount: 0,
    });
    const allEmpty = computeControlScaleFactor([wellWithAmps("A", [])], {
      params: {},
    });
    expect(allEmpty.k).toBeNull();
    expect(allEmpty.controlMedian).toBeNull();
  });
});

describe("scaleSpike", () => {
  test("scales signal-magnitude fields by k, leaves time/width/x", () => {
    const s = {
      time: 1.5,
      width: 7,
      amplitude: 4,
      auc: 8,
      peakCoords: { x: 1.5, y: 4 },
      leftBaseCoords: { x: 1.0, y: 0.5 },
      rightBaseCoords: { x: 2.0, y: 0.5 },
      prominences: { leftProminence: 3.5, rightProminence: 4 },
    };
    const out = scaleSpike(s, 10);
    expect(out.amplitude).toBe(40);
    expect(out.auc).toBe(80);
    expect(out.peakCoords).toEqual({ x: 1.5, y: 40 });
    expect(out.leftBaseCoords).toEqual({ x: 1.0, y: 5 });
    expect(out.rightBaseCoords).toEqual({ x: 2.0, y: 5 });
    expect(out.prominences).toEqual({ leftProminence: 35, rightProminence: 40 });
    // unchanged
    expect(out.time).toBe(1.5);
    expect(out.width).toBe(7);
    // original not mutated
    expect(s.amplitude).toBe(4);
  });
});

describe("scalePipelineResults", () => {
  const results = {
    processedSignal: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ],
    spikeResults: [{ amplitude: 2, auc: 4, peakCoords: { x: 1, y: 2 } }],
    burstResults: [{ startTime: 0, endTime: 1, spikeCount: 1, auc: 6 }],
    metrics: {
      spikeAmplitude: { average: 2, median: 2, min: 2, max: 2 },
      spikeAUC: { average: 4, median: 4, min: 4, max: 4 },
      signalRange: 1, // native — must NOT be scaled (drives the slider)
      robustStd: 0.1,
      spikeWidth: { average: 5, median: 5, min: 5, max: 5 },
    },
  };

  test("scales signal/peaks/AUC by k; leaves signalRange + width native", () => {
    const out = scalePipelineResults(results, 50);
    expect(out.processedSignal).toEqual([
      { x: 0, y: 50 },
      { x: 1, y: 100 },
    ]);
    expect(out.spikeResults[0].amplitude).toBe(100);
    expect(out.spikeResults[0].auc).toBe(200);
    expect(out.spikeResults[0].peakCoords.y).toBe(100);
    expect(out.burstResults[0].auc).toBe(300);
    expect(out.metrics.spikeAmplitude).toEqual({
      average: 100,
      median: 100,
      min: 100,
      max: 100,
    });
    expect(out.metrics.spikeAUC.median).toBe(200);
    // native: drives the prominence slider, must stay unscaled
    expect(out.metrics.signalRange).toBe(1);
    // width is not a signal-magnitude quantity
    expect(out.metrics.spikeWidth).toEqual({
      average: 5,
      median: 5,
      min: 5,
      max: 5,
    });
  });

  test("non-finite k returns the original results untouched", () => {
    expect(scalePipelineResults(results, null)).toBe(results);
    expect(scalePipelineResults(results, Infinity)).toBe(results);
  });
});

describe("scaleReportedMetrics (axis-stable control scaling)", () => {
  const results = {
    processedSignal: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ],
    spikeResults: [
      {
        amplitude: 2,
        auc: 4,
        peakCoords: { x: 1, y: 2 },
        leftBaseCoords: { x: 0, y: 0 },
        prominences: { leftProminence: 1, rightProminence: 1 },
      },
    ],
    burstResults: [{ startTime: 0, endTime: 1, spikeCount: 1, auc: 6 }],
    metrics: {
      spikeAmplitude: { average: 2, median: 2, min: 2, max: 2 },
      spikeAUC: { average: 4, median: 4, min: 4, max: 4 },
      signalRange: 1,
      signalYMin: 0,
      signalYMax: 2,
      robustStd: 0.1,
    },
  };

  test("scales reported amplitude/AUC + aggregates only", () => {
    const out = scaleReportedMetrics(results, 50);
    expect(out.spikeResults[0].amplitude).toBe(100);
    expect(out.spikeResults[0].auc).toBe(200);
    expect(out.burstResults[0].auc).toBe(300);
    expect(out.metrics.spikeAmplitude.median).toBe(100);
    expect(out.metrics.spikeAUC.median).toBe(200);
  });

  test("leaves signal + coordinates NATIVE (so the y-axis can't move)", () => {
    const out = scaleReportedMetrics(results, 50);
    // The trace drives the chart's y-axis — must be untouched.
    expect(out.processedSignal).toEqual([
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ]);
    // Marker coordinates + prominences stay native so markers/overlays
    // sit correctly on the native trace.
    expect(out.spikeResults[0].peakCoords.y).toBe(2);
    expect(out.spikeResults[0].leftBaseCoords.y).toBe(0);
    expect(out.spikeResults[0].prominences.leftProminence).toBe(1);
    expect(out.metrics.signalRange).toBe(1);
    expect(out.metrics.signalYMax).toBe(2);
  });

  test("non-finite k returns the original results untouched", () => {
    expect(scaleReportedMetrics(results, null)).toBe(results);
    expect(scaleReportedMetrics(results, Infinity)).toBe(results);
  });
});
