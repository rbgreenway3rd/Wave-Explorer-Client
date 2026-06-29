/**
 * Repro for the "prominence value jumps on F/Fo toggle" bug.
 *
 * Scenario from the user's report: with a static-ratio'd signal the modal
 * shows y≈0–2838; toggling F/Fo normalization collapses the signal to
 * y≈0–0.20. The prominence PARAMETER must not change on its own — only the
 * slider's visual track should rescale. This test drives that scale switch
 * (prominence held at 1, signalRange 2838 → 0.20) and asserts nothing is
 * committed back and the displayed value stays put.
 */

import React from "react";
import { render } from "@testing-library/react";

let mockResults;
let mockSettings;

jest.mock("../../../../NeuralProvider", () => ({
  useNeuralResults: () => mockResults,
  useNeuralSettings: () => mockSettings,
}));

const SpikeDetectionControls =
  require("../SpikeDetectionControls").default;

function makeSettings(commitSpy) {
  const noop = () => {};
  return {
    spikeMinDistance: 0,
    setSpikeMinDistance: noop,
    stdMultiplier: 1,
    setStdMultiplier: noop,
    noiseFloorMultiplier: 0,
    setNoiseFloorMultiplier: noop,
    spikeMinWidth: 5,
    setSpikeMinWidth: noop,
    spikeMinProminenceRatio: 0.01,
    setSpikeMinProminenceRatio: noop,
    noiseWindowSize: 0,
    setNoiseWindowSize: noop,
    handleSpikeProminenceChange: commitSpy,
    handleSpikeWindowChange: noop,
    handleResetSpikeParams: noop,
    showParamOverlays: false,
    showProminenceOverlay: false,
    showWindowOverlay: false,
    showNoiseFloorOverlay: false,
    setDraftSpikeProminence: noop,
    setDraftSpikeWindow: noop,
    setDraftNoiseFloorMultiplier: noop,
  };
}

function makeResults(prominence, signalRange) {
  return {
    effectiveSpikeProminence: prominence,
    effectiveSpikeWindow: 20,
    pipelineResults: { metrics: { signalRange, robustStd: 0 } },
  };
}

// First "Prominence" field value text.
function prominenceText(container) {
  return container.querySelector(".neural-control-panel__field-value")
    ?.textContent;
}

// Prominence is now a FRACTION of signal range, displayed as a percent.
// (No range animation any more — the track is fixed — so renders are sync.)
test("toggling scale (2838 → 0.20) does NOT change the prominence param", () => {
  const commit = jest.fn();
  mockSettings = makeSettings(commit);
  mockResults = makeResults(0.1, 2838); // 10% of range, static-ratio'd scale

  const { container, rerender } = render(<SpikeDetectionControls />);
  expect(prominenceText(container)).toBe("10.0%");

  // F/Fo normalization toggled on: same fraction, signal collapses.
  mockResults = makeResults(0.1, 0.2);
  rerender(<SpikeDetectionControls />);

  expect(commit).not.toHaveBeenCalled();
  expect(prominenceText(container)).toBe("10.0%");
});

test("remount at the collapsed scale (switch tab away+back) keeps prominence", () => {
  const commit = jest.fn();
  mockSettings = makeSettings(commit);

  mockResults = makeResults(0.1, 2838);
  const { container: c1, unmount } = render(<SpikeDetectionControls />);
  expect(prominenceText(c1)).toBe("10.0%");
  unmount();

  mockResults = makeResults(0.1, 0.2);
  const { container: c2 } = render(<SpikeDetectionControls />);
  expect(commit).not.toHaveBeenCalled();
  expect(prominenceText(c2)).toBe("10.0%");
});

test("the displayed prominence is scale-invariant (same % at any signal scale)", () => {
  const commit = jest.fn();
  mockSettings = makeSettings(commit);

  mockResults = makeResults(0.1, 2838);
  const { container: cBig, unmount } = render(<SpikeDetectionControls />);
  expect(prominenceText(cBig)).toBe("10.0%");
  unmount();

  mockResults = makeResults(0.1, 0.0002); // ΔF/F₀-scale signal
  const { container: cSmall } = render(<SpikeDetectionControls />);
  expect(prominenceText(cSmall)).toBe("10.0%"); // unchanged
  expect(commit).not.toHaveBeenCalled();
});
