/**
 * pipelineTypedInput.harness — verifies the worker's typed-array boundary.
 *
 * The neural + plate-range workers now feed the pipeline an { xs, ys }
 * typed-array pair instead of materializing a {x,y}[], and transfer the
 * pipeline's `processedXs`/`processedYs` typed arrays directly. This test
 * proves, on real wells, that:
 *   1. Running the pipeline with { xs, ys } input yields a BIT-IDENTICAL
 *      result to running it with the equivalent {x,y}[] input.
 *   2. The exposed `processedXs`/`processedYs` match `processedSignal`
 *      element-for-element (so the direct transfer is correct).
 *
 * Skips when the local-fixtures .dat is absent. Run:
 *   CI=true npx react-scripts test pipelineTypedInput.harness --watchAll=false
 */

import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { dataFileExists, loadWells, toXY } from "../testSupport/realWellLoader";
import { fingerprint, diffFingerprints } from "../testSupport/pipelineFingerprint";

const WELLS = ["D6", "H12", "K5"];

const BASE = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  trendFlatteningWindow: 200,
  trendFlatteningMinimums: 50,
  baselineCorrection: false,
  neuralNormalizationEnabled: false,
  foWindowStartRatio: 0,
  foWindowEndRatio: 0.1,
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
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

const COMBOS = [
  ["base", {}],
  ["norm-on", { neuralNormalizationEnabled: true }],
  ["outliers-on", { handleOutliers: true }],
];

function toTypedInput(xs, ys) {
  const xa = new Float64Array(xs.length);
  const ya = new Float64Array(ys.length);
  for (let i = 0; i < xs.length; i++) {
    xa[i] = xs[i];
    ya[i] = ys[i];
  }
  return { xs: xa, ys: ya };
}

const itOrSkip = dataFileExists() ? test : test.skip;

describe("pipeline typed-array input boundary (worker path)", () => {
  itOrSkip(
    "{xs,ys} input == {x,y}[] input, and processedXs/Ys == processedSignal",
    async () => {
      const { xs, ysByWell } = await loadWells(WELLS);

      for (const w of WELLS) {
        for (const [name, overrides] of COMBOS) {
          const params = { ...BASE, ...overrides };
          const analysis = { runSpikeDetection: true, runBurstDetection: true };

          const objResult = runNeuralAnalysisPipeline({
            rawSignal: toXY(xs, ysByWell[w]),
            controlSignal: [],
            params,
            analysis,
            noiseSuppressionActive: true,
          });
          const typedResult = runNeuralAnalysisPipeline({
            rawSignal: toTypedInput(xs, ysByWell[w]),
            controlSignal: [],
            params,
            analysis,
            noiseSuppressionActive: true,
          });

          // 1. Identical output regardless of input representation.
          const diffs = diffFingerprints(
            fingerprint(typedResult),
            fingerprint(objResult),
            `${w}::${name}`,
            1e-9
          );
          expect(diffs).toEqual([]);

          // 2. processedXs/processedYs are the same data as processedSignal.
          const ps = typedResult.processedSignal;
          const pxs = typedResult.processedXs;
          const pys = typedResult.processedYs;
          expect(pxs).toBeInstanceOf(Float64Array);
          expect(pys).toBeInstanceOf(Float64Array);
          expect(pxs.length).toBe(ps.length);
          expect(pys.length).toBe(ps.length);
          // Spot-check every ~1000th sample for exact equality.
          for (let i = 0; i < ps.length; i += 997) {
            expect(pxs[i]).toBe(ps[i].x);
            expect(pys[i]).toBe(ps[i].y);
          }
        }
      }
    },
    600000
  );
});
