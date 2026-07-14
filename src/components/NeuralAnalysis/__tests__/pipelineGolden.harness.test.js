/**
 * pipelineGolden.harness — the correctness contract for the neural pipeline
 * efficiency refactor.
 *
 * Runs the ACTUAL runNeuralAnalysisPipeline() on real 250K-sample wells
 * (streamed from the gitignored local-fixtures/.dat) across a matrix of
 * representative param combos that exercise every stage, and fingerprints
 * the full result of each run (see helpers/pipelineFingerprint.js).
 *
 * First run (or `UPDATE_GOLDEN=1`) WRITES the snapshot next to the .dat
 * (gitignored — it is client-derived data). Later runs COMPARE against it at
 * the acceptance bar: identical spikes/metrics/counts, processedSignal within
 * ~1e-9. Any refactor that changes output fails loudly here.
 *
 * Skips automatically when the .dat is absent, so CI stays green.
 *
 * Capture / verify explicitly:
 *   CI=true npx react-scripts test pipelineGolden.harness --watchAll=false
 *   UPDATE_GOLDEN=1 CI=true npx react-scripts test pipelineGolden.harness --watchAll=false
 */

import fs from "fs";
import path from "path";
import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { computeFo, computePlateMedianFo } from "../utilities/neuralNormalization";
import {
  DATA_FILE,
  dataFileExists,
  loadWells,
  toXY,
} from "../testSupport/realWellLoader";
import {
  fingerprint,
  diffFingerprints,
} from "../testSupport/pipelineFingerprint";

const GOLDEN_FILE = path.resolve(
  path.dirname(DATA_FILE),
  "pipelineGolden.snapshot.json"
);

const WELLS = ["A1", "D6", "D7", "D8", "H12", "K5"];

// UI-valid base params (mirrors the modal's defaults / the diagnostic
// harness). Each combo overrides ONE axis so the matrix isolates the stage
// under test while covering the whole pipeline.
const BASE = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  trendFlatteningWindow: 200,
  trendFlatteningMinimums: 50,
  baselineCorrection: false,
  neuralNormalizationEnabled: false,
  foWindowStartRatio: 0,
  foWindowEndRatio: 0.1,
  rescaleByMedianFo: false,
  plateMedianFo: null,
  smoothingEnabled: true,
  smoothingWindow: 9,
  handleOutliers: false,
  outlierSensitivity: 5,
  spikeProminence: 0.1,
  spikeProminenceRelative: true,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  noiseFloorMultiplier: 0,
  noiseWindowSize: 0,
  baselineThresholdEnabled: false,
  baselineThresholdOffset: 0,
  activityThresholdEnabled: false,
  activityThresholdRatio: 0,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

// [name, param overrides, noiseSuppressionActive]. `plateMedianFo` is filled
// in at runtime for the rescale combo.
const COMBOS = [
  ["base", {}, true],
  ["norm-on", { neuralNormalizationEnabled: true }, true],
  ["norm-rescale", { neuralNormalizationEnabled: true, rescaleByMedianFo: true }, true],
  ["outliers-on", { handleOutliers: true, outlierSensitivity: 5 }, true],
  ["baseline-correction", { baselineCorrection: true }, true],
  ["smoothing-off", { smoothingEnabled: false }, true],
  ["local-noise-floor", { noiseWindowSize: 500, noiseFloorMultiplier: 2 }, true],
  [
    "activity+baseline-threshold",
    {
      activityThresholdEnabled: true,
      activityThresholdRatio: 0.3,
      baselineThresholdEnabled: true,
      baselineThresholdOffset: 2,
    },
    true,
  ],
  ["raw-detection", {}, false],
];

// JSON that survives NaN/±Infinity round-trips (plain JSON nulls them).
function stableStringify(obj) {
  return JSON.stringify(
    obj,
    (_k, v) => {
      if (typeof v === "number" && !Number.isFinite(v)) {
        return Number.isNaN(v) ? "__NaN__" : v > 0 ? "__Inf__" : "__-Inf__";
      }
      return v;
    },
    0
  );
}
function stableParse(text) {
  return JSON.parse(text, (_k, v) => {
    if (v === "__NaN__") return NaN;
    if (v === "__Inf__") return Infinity;
    if (v === "__-Inf__") return -Infinity;
    return v;
  });
}

const itOrSkip = dataFileExists() ? test : test.skip;

describe("neural pipeline golden-output contract", () => {
  itOrSkip(
    "matches the golden snapshot across wells × param combos",
    async () => {
      const { xs, ysByWell } = await loadWells(WELLS);
      // eslint-disable-next-line no-console
      console.log(
        `\n[golden] loaded ${xs.length} samples/well × ${WELLS.length} wells`
      );

      // Plate-median F₀ over the loaded wells (for the rescale combo) — a
      // real plate-wide scalar so the DFF0_x_medianFo unit path is exercised.
      const perWellFo = WELLS.map((w) => computeFo(ysByWell[w], {}));
      const { medianFo } = computePlateMedianFo(perWellFo);

      const snapshot = {};
      for (const w of WELLS) {
        const raw = toXY(xs, ysByWell[w]);
        for (const [name, overrides, nsa] of COMBOS) {
          const params = { ...BASE, ...overrides };
          if (params.rescaleByMedianFo) params.plateMedianFo = medianFo;
          const result = runNeuralAnalysisPipeline({
            rawSignal: raw,
            controlSignal: [],
            params,
            analysis: { runSpikeDetection: true, runBurstDetection: true },
            noiseSuppressionActive: nsa,
          });
          snapshot[`${w}::${name}`] = fingerprint(result);
        }
      }

      const updating = process.env.UPDATE_GOLDEN === "1";
      if (updating || !fs.existsSync(GOLDEN_FILE)) {
        fs.writeFileSync(GOLDEN_FILE, stableStringify(snapshot));
        // eslint-disable-next-line no-console
        console.log(
          `[golden] ${updating ? "UPDATED" : "WROTE"} snapshot (${
            Object.keys(snapshot).length
          } cases) → ${GOLDEN_FILE}`
        );
        expect(Object.keys(snapshot).length).toBe(WELLS.length * COMBOS.length);
        return;
      }

      const golden = stableParse(fs.readFileSync(GOLDEN_FILE, "utf8"));
      const allDiffs = [];
      for (const key of Object.keys(golden)) {
        if (!snapshot[key]) {
          allDiffs.push(`${key}: missing in current run`);
          continue;
        }
        allDiffs.push(
          ...diffFingerprints(snapshot[key], golden[key], key, 1e-9)
        );
      }

      if (allDiffs.length > 0) {
        // eslint-disable-next-line no-console
        console.error(
          `\n[golden] ${allDiffs.length} mismatch(es):\n` +
            allDiffs.slice(0, 40).join("\n") +
            (allDiffs.length > 40 ? `\n… +${allDiffs.length - 40} more` : "")
        );
      }
      expect(allDiffs).toEqual([]);
    },
    600000
  );
});
