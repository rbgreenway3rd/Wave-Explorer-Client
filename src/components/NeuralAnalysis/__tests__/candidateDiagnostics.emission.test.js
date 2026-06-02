// Tests for the candidate-diagnostics emission added to detectSpikes
// (Decision Explanation Layer, D2). Each test exercises a specific
// gate's rejection path and verifies the diagnostic record carries
// the right rejectedBy + tier + metric/threshold info.

import { detectSpikes } from "../utilities/detectSpikes";
import {
  GATE_KEPT,
  GATE_PROMINENCE,
  GATE_NOISE_FLOOR,
  GATE_WIDTH,
  GATE_SYMMETRY,
  GATE_NMS,
  TIER_CLEAR_PASS,
  TIER_MARGINAL_PASS,
  TIER_MARGINAL_FAIL,
  TIER_CLEAR_FAIL,
} from "../utilities/peakGeometry";
import { makeSyntheticSignal } from "./_fixtures";

describe("detectSpikes candidate diagnostics emission", () => {
  test("kept peaks are tagged GATE_KEPT and have prominence gate entry", () => {
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.01,
      seed: 901,
      spikes: [
        { center: 1000, amplitude: 0.5, sigma: 20 },
        { center: 2500, amplitude: 0.5, sigma: 20 },
      ],
    });
    const diagnostics = new Map();
    const spikes = detectSpikes(signal, {
      prominence: 0.05,
      window: 50,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      diagnostics,
    });
    expect(spikes.length).toBeGreaterThanOrEqual(1);
    for (const sp of spikes) {
      const rec = diagnostics.get(sp.index);
      expect(rec).toBeDefined();
      expect(rec.rejectedBy).toBe(GATE_KEPT);
      const promGate = rec.gates.find((g) => g.id === GATE_PROMINENCE);
      expect(promGate).toBeDefined();
      expect(promGate.status).toBe("pass");
    }
  });

  test("prominence rejections carry GATE_PROMINENCE with marginal-fail tier (near-miss survives the cap)", () => {
    // Clean signal so the Gaussian's measured prominence lands tightly
    // around its amplitude. Narrow sigma=5 so the detection-base walk
    // (searchRange = window = 30) finds true ground level on either
    // side — topographic prominence ≈ amplitude. 0.047 vs threshold
    // 0.05 → margin −0.003, relative −0.06 → marginal-fail.
    const signal = makeSyntheticSignal({
      n: 3000,
      noiseAmp: 0.0005,
      seed: 902,
      spikes: [{ center: 1500, amplitude: 0.047, sigma: 5 }],
    });
    const diagnostics = new Map();
    detectSpikes(signal, {
      prominence: 0.050,
      window: 30,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      diagnostics,
    });
    const promFails = Array.from(diagnostics.values()).filter(
      (r) => r.rejectedBy === GATE_PROMINENCE
    );
    expect(promFails.length).toBeGreaterThan(0);
    for (const rec of promFails) {
      const gateEntry = rec.gates.find((g) => g.id === GATE_PROMINENCE);
      expect(gateEntry).toBeDefined();
      expect(gateEntry.status).toBe("fail");
      expect(gateEntry.tier).toBe(TIER_MARGINAL_FAIL);
    }
  });

  test("width gate emits a per-candidate entry on every kept peak", () => {
    // The width gate compares the NeuralPeak's measurement width
    // against minWidth. On an isolated Gaussian in a clean signal,
    // measurement bases extend to the signal edges (no other events to
    // bound them), so width is always >> minWidth — fail cases require
    // adjacent events that bound the bases. Here we just verify that
    // GATE_WIDTH is recorded with status='pass' on every kept peak.
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.005,
      seed: 903,
      spikes: [
        { center: 1000, amplitude: 0.5, sigma: 20 },
        { center: 2500, amplitude: 0.5, sigma: 20 },
      ],
    });
    const diagnostics = new Map();
    const spikes = detectSpikes(signal, {
      prominence: 0.05,
      window: 50,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      diagnostics,
    });
    expect(spikes.length).toBeGreaterThan(0);
    for (const sp of spikes) {
      const rec = diagnostics.get(sp.index);
      expect(rec).toBeDefined();
      const widthGate = rec.gates.find((g) => g.id === GATE_WIDTH);
      expect(widthGate).toBeDefined();
      expect(widthGate.status).toBe("pass");
      expect(widthGate.value).toBeGreaterThanOrEqual(widthGate.threshold);
    }
  });

  test("noise-floor rejections carry GATE_NOISE_FLOOR + noiseSigma", () => {
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.02,
      seed: 904,
      spikes: [
        { center: 1000, amplitude: 0.08, sigma: 20 },
        { center: 2500, amplitude: 0.08, sigma: 20 },
      ],
    });
    const diagnostics = new Map();
    detectSpikes(signal, {
      prominence: 0.01, // low so noise-floor is the deciding gate
      window: 30,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      noiseFloorMultiplier: 10, // aggressive
      diagnostics,
    });
    const nfFails = Array.from(diagnostics.values()).filter(
      (r) => r.rejectedBy === GATE_NOISE_FLOOR
    );
    // The signal has plenty of low-prominence noise wiggles that pass
    // the prominence gate but should fail the aggressive noise floor.
    expect(nfFails.length).toBeGreaterThan(0);
    for (const rec of nfFails) {
      const gateEntry = rec.gates.find((g) => g.id === GATE_NOISE_FLOOR);
      expect(gateEntry).toBeDefined();
      expect(gateEntry.status).toBe("fail");
      expect(typeof gateEntry.noiseSigma).toBe("number");
      expect(gateEntry.noiseSigma).toBeGreaterThan(0);
    }
  });

  test("NMS rejections carry GATE_NMS + suppressor info", () => {
    // Two distinct spikes with a trough between them. Centers 20 apart
    // give two separable local maxima (sigma=5 → FWHM ≈ 11.8), but a
    // window=25 NMS footprint catches the smaller one. Window must
    // exceed peak separation to trigger NMS.
    const signal = makeSyntheticSignal({
      n: 4000,
      noiseAmp: 0.005,
      seed: 905,
      spikes: [
        { center: 1500, amplitude: 0.5, sigma: 5 },
        { center: 1520, amplitude: 0.3, sigma: 5 },
      ],
    });
    const diagnostics = new Map();
    detectSpikes(signal, {
      prominence: 0.05,
      window: 25,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      diagnostics,
    });
    const nmsFails = Array.from(diagnostics.values()).filter(
      (r) => r.rejectedBy === GATE_NMS
    );
    expect(nmsFails.length).toBeGreaterThan(0);
    for (const rec of nmsFails) {
      expect(rec.nmsSuppressor).not.toBeNull();
      expect(typeof rec.nmsSuppressor.index).toBe("number");
    }
  });

  test("classifyMargin tier assignment matches expectations", () => {
    // Build a fixture where one event passes comfortably (clear-pass),
    // one passes marginally, one fails marginally, one fails clearly.
    // Verify tier classification matches the gate's status.
    const signal = makeSyntheticSignal({
      n: 6000,
      noiseAmp: 0.005,
      seed: 906,
      spikes: [
        { center: 1000, amplitude: 0.5, sigma: 20 }, // way above threshold
        { center: 2500, amplitude: 0.11, sigma: 20 }, // marginal pass
        { center: 4000, amplitude: 0.095, sigma: 20 }, // marginal fail
      ],
    });
    const diagnostics = new Map();
    detectSpikes(signal, {
      prominence: 0.1,
      window: 30,
      minWidth: 5,
      minDistance: 0,
      minProminenceRatio: 0.01,
      stdMultiplier: 3,
      diagnostics,
    });
    const tiersByStatus = { pass: new Set(), fail: new Set() };
    for (const rec of diagnostics.values()) {
      const prom = rec.gates.find((g) => g.id === GATE_PROMINENCE);
      if (prom) tiersByStatus[prom.status].add(prom.tier);
    }
    // Pass entries should never be tier 2 or 3.
    for (const t of tiersByStatus.pass) {
      expect([TIER_CLEAR_PASS, TIER_MARGINAL_PASS]).toContain(t);
    }
    // Fail entries should never be tier 0 or 1.
    for (const t of tiersByStatus.fail) {
      expect([TIER_MARGINAL_FAIL, TIER_CLEAR_FAIL]).toContain(t);
    }
  });
});
