/**
 * Full-plate report: ΔF/F₀ normalization + well-to-well rescale wiring.
 *
 * The live modal and the CSV report must agree. These tests prove the
 * report path (GenerateFullPlateReport):
 *   - sources the RAW signal when normalization is on (not filtered)
 *   - computes the plate-median F₀ across the report's wells
 *   - records normalization state + units + plate median in the header
 *   - falls back to native units (filtered source) when normalization off
 */

import { GenerateFullPlateReport } from "../NeuralFullPlateReport";
import { makeSyntheticSignal } from "./_fixtures";

function makeWell(key, baseline) {
  const raw = makeSyntheticSignal({
    n: 800,
    baseline,
    noiseAmp: 0.3,
    spikes: [
      { center: 200, amplitude: 8, sigma: 3 },
      { center: 600, amplitude: 8, sigma: 3 },
    ],
  });
  const ind = {
    rawYs: raw.map((p) => p.y),
    rawData: raw,
    materializeRawData: jest.fn(() => raw),
    // Filtered twin returns the same samples here; the point is *which*
    // accessor the report calls, not the values.
    materializeFilteredData: jest.fn(() => raw),
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

const OPTIONS = {
  includeProcessedSignal: false,
  includePlateSummary: false,
  parameterMode: "defined",
};

async function generate(extraParams) {
  // Fresh wells per run so the materialize spies are isolated.
  const wells = [makeWell("A1", 100), makeWell("A2", 120)];
  const chunks = await GenerateFullPlateReport(
    null,
    wells,
    { ...baseParams, ...extraParams },
    OPTIONS
  );
  return { wells, csv: chunks.join("") };
}

// Pull the value out of a "Key,Value" CSV row.
function headerValue(csv, key) {
  const line = csv.split("\n").find((l) => l.startsWith(`${key},`));
  return line ? line.slice(key.length + 1).trim() : null;
}

describe("GenerateFullPlateReport — normalization wiring", () => {
  test("off → filtered source, native units in header", async () => {
    const { wells, csv } = await generate({
      neuralNormalizationEnabled: false,
    });

    expect(headerValue(csv, "NeuralNormalizationEnabled")).toBe("false");
    expect(headerValue(csv, "NormalizationUnits")).toBe("native");

    // Sourced the filtered signal, never the raw.
    for (const w of wells) {
      const ind = w.indicators[0];
      expect(ind.materializeFilteredData).toHaveBeenCalled();
      expect(ind.materializeRawData).not.toHaveBeenCalled();
    }
  });

  test("on + rescale → raw source, plate-median F₀, dFF0_x_medianFo units", async () => {
    const { wells, csv } = await generate({
      neuralNormalizationEnabled: true,
      neuralRescaleByMedianFo: true,
    });

    expect(headerValue(csv, "NeuralNormalizationEnabled")).toBe("true");
    expect(headerValue(csv, "NormalizationRescaleByMedianFo")).toBe("true");
    expect(headerValue(csv, "NormalizationUnits")).toBe("dFF0_x_medianFo");

    // Plate median F₀ = median of the two wells' raw medians (~100, ~120).
    const median = Number(headerValue(csv, "NormalizationPlateMedianFo"));
    expect(median).toBeGreaterThan(105);
    expect(median).toBeLessThan(115);

    expect(headerValue(csv, "NormalizationWellsSkippedNoFo")).toBe("0");

    // Sourced the raw signal, never the filtered.
    for (const w of wells) {
      const ind = w.indicators[0];
      expect(ind.materializeRawData).toHaveBeenCalled();
      expect(ind.materializeFilteredData).not.toHaveBeenCalled();
    }
  });

  test("on + rescale off → bare dFF0 units", async () => {
    const { csv } = await generate({
      neuralNormalizationEnabled: true,
      neuralRescaleByMedianFo: false,
    });
    expect(headerValue(csv, "NeuralNormalizationEnabled")).toBe("true");
    expect(headerValue(csv, "NormalizationRescaleByMedianFo")).toBe("false");
    expect(headerValue(csv, "NormalizationUnits")).toBe("dFF0");
  });
});
