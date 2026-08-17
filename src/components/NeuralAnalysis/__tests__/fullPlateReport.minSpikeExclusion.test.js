/**
 * Full-plate report: report-only min-spike well exclusion + cancellation.
 *
 * Excluded wells (fewer than minSpikeCount detected spikes) must vanish
 * from the per-well blocks AND the plate summary, and be listed in the
 * post-loop <MIN_SPIKE_EXCLUSION> block. With the option off (or the keys
 * entirely absent) the output must be byte-identical to before the
 * feature existed.
 */

import { GenerateFullPlateReport } from "../NeuralFullPlateReport";
import { makeSyntheticSignal } from "./_fixtures";

function makeWell(key, { spiky }) {
  // The quiet well is genuinely flat (no noise, no spikes) so detection
  // finds exactly zero spikes regardless of prominence settings.
  const signal = makeSyntheticSignal({
    n: 800,
    baseline: 100,
    noiseAmp: spiky ? 0.3 : 0,
    spikes: spiky
      ? [
          { center: 200, amplitude: 8, sigma: 3 },
          { center: 600, amplitude: 8, sigma: 3 },
        ]
      : [],
  });
  const ind = {
    rawYs: signal.map((p) => p.y),
    rawData: signal,
    materializeRawData: () => signal,
    materializeFilteredData: () => signal,
  };
  return { key, id: key, indicators: [ind] };
}

const baseParams = {
  noiseSuppressionActive: true,
  trendFlatteningEnabled: true,
  smoothingEnabled: false,
  baselineCorrection: false,
  handleOutliers: false,
  subtractControl: false,
  controlScalingEnabled: false,
  spikeProminence: 0.1,
  spikeProminenceRelative: true,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  maxInterSpikeInterval: 1.0,
  minSpikesPerBurst: 3,
};

const BASE_OPTIONS = {
  includeProcessedSignal: false,
  includePlateSummary: false,
  parameterMode: "defined",
};

async function generate(optionOverrides = {}, roiList = [], shouldCancel) {
  const wells = [makeWell("A1", { spiky: true }), makeWell("A2", { spiky: false })];
  const chunks = await GenerateFullPlateReport(
    null,
    wells,
    baseParams,
    { ...BASE_OPTIONS, ...optionOverrides },
    null,
    roiList,
    shouldCancel
  );
  return chunks.join("");
}

function headerValue(csv, key) {
  const line = csv.split("\n").find((l) => l.startsWith(`${key},`));
  return line ? line.slice(key.length + 1).trim() : null;
}

describe("GenerateFullPlateReport — min-spike well exclusion", () => {
  test("enabled: quiet well is dropped and listed; spiky well kept", async () => {
    const csv = await generate({ excludeLowSpikeWells: true, minSpikeCount: 1 });

    expect(csv).toContain("<WELL key=A1>");
    expect(csv).not.toContain("<WELL key=A2>");

    expect(headerValue(csv, "MinSpikeExclusionEnabled")).toBe("true");
    expect(headerValue(csv, "MinSpikeThreshold")).toBe("1");

    expect(csv).toContain("<MIN_SPIKE_EXCLUSION>");
    expect(headerValue(csv, "AttemptedWellCount")).toBe("2");
    expect(headerValue(csv, "IncludedWellCount")).toBe("1");
    expect(headerValue(csv, "ExcludedWellCount")).toBe("1");
    expect(headerValue(csv, "MinSpikesExcludedWells")).toBe("A2");
  });

  test("enabled: excluded well is absent from the plate summary", async () => {
    const csv = await generate(
      {
        excludeLowSpikeWells: true,
        minSpikeCount: 1,
        includePlateSummary: true,
      },
      // ROI spanning the whole synthetic recording so the summary has rows.
      [{ xMin: 0, xMax: 800, yMin: null, yMax: null }]
    );
    const summary = csv.split("<PLATE_SUMMARY")[1];
    expect(summary).toBeDefined();
    expect(summary).toContain("A1");
    expect(summary).not.toContain("A2");
  });

  test("threshold above both wells' counts excludes everything", async () => {
    const csv = await generate({
      excludeLowSpikeWells: true,
      minSpikeCount: 1000,
    });
    expect(csv).not.toContain("<WELL key=");
    expect(headerValue(csv, "ExcludedWellCount")).toBe("2");
    expect(headerValue(csv, "MinSpikesExcludedWells")).toBe("A1;A2");
  });

  test("disabled and keys-absent produce byte-identical output, no exclusion artifacts", async () => {
    const withKeysOff = await generate({
      excludeLowSpikeWells: false,
      minSpikeCount: 5,
    });
    const withoutKeys = await generate({});

    expect(withKeysOff).toBe(withoutKeys);
    expect(withoutKeys).not.toContain("MinSpikeExclusionEnabled");
    expect(withoutKeys).not.toContain("<MIN_SPIKE_EXCLUSION>");
    expect(withoutKeys).toContain("<WELL key=A1>");
    expect(withoutKeys).toContain("<WELL key=A2>");
  });

  test("shouldCancel stops the per-well loop between wells", async () => {
    let calls = 0;
    const csv = await generate({}, [], () => calls++ >= 1);
    expect(csv).toContain("<WELL key=A1>");
    expect(csv).not.toContain("<WELL key=A2>");
  });
});
