/**
 * pipelineProfile.harness — headless per-stage profiler for the neural
 * pipeline, run on real wells from the gitignored local-fixtures/.dat.
 *
 * Enables the built-in perfLogger, runs runNeuralAnalysisPipeline() repeatedly
 * across stage-diverse param combos, parses the aggregated
 * `[perf] pipeline total=… { stage=ms … }` line each run emits, and reports
 * per-stage MEDIAN ms plus the worker materialize/flatten round-trip cost.
 *
 * Writes the medians to local-fixtures/pipelineProfile.<tag>.json so the
 * typed-array refactor can show a concrete before/after delta. Tag defaults
 * to "before"; set PROFILE_TAG=after (or anything) to capture a comparison.
 *
 * Diagnostic only — skips when the .dat is absent. Run:
 *   PROFILE_TAG=before CI=true npx react-scripts test pipelineProfile.harness --watchAll=false
 */

import fs from "fs";
import path from "path";
import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import { perf } from "../utilities/perfLogger";
import {
  DATA_FILE,
  dataFileExists,
  loadWells,
  toXY,
} from "../testSupport/realWellLoader";

const WELLS = ["D6", "D7", "H12"];
const REPS = 5; // repeats per (well, combo) to get a stable median

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
  ["local-noise-floor", { noiseWindowSize: 500, noiseFloorMultiplier: 2 }],
];

// Parse `[perf] pipeline total=123.4 ms { a=5 b=800 }` → {total, stages:{a:5,...}}
function parseGroupLine(line) {
  const m = /\[perf\] pipeline total=([\d.]+) ms \{ (.*) \}/.exec(line);
  if (!m) return null;
  const total = parseFloat(m[1]);
  const stages = {};
  for (const tok of m[2].trim().split(/\s+/)) {
    const [k, v] = tok.split("=");
    if (k) stages[k] = parseFloat(v);
  }
  return { total, stages };
}

function median(nums) {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const itOrSkip = dataFileExists() ? test : test.skip;

describe("neural pipeline per-stage profile", () => {
  itOrSkip(
    "reports per-stage median ms on real wells",
    async () => {
      const { xs, ysByWell } = await loadWells(WELLS);
      const n = xs.length;

      // Collect the pipeline group line each run emits, passing everything
      // else through to the real console.
      const realLog = console.log;
      const captured = [];
      console.log = (...args) => {
        const line = args.join(" ");
        if (line.startsWith("[perf] pipeline total=")) captured.push(line);
        else realLog(...args);
      };
      perf.setEnabled(true);

      // stage → [ms samples]; also 'total'
      const byCombo = {};
      try {
        for (const [name, overrides] of COMBOS) {
          const params = { ...BASE, ...overrides };
          const perStage = {};
          const totals = [];
          for (const w of WELLS) {
            const raw = toXY(xs, ysByWell[w]);
            for (let r = 0; r < REPS; r++) {
              captured.length = 0;
              runNeuralAnalysisPipeline({
                rawSignal: raw,
                controlSignal: [],
                params,
                analysis: { runSpikeDetection: true, runBurstDetection: true },
                noiseSuppressionActive: true,
              });
              const parsed = captured.length
                ? parseGroupLine(captured[captured.length - 1])
                : null;
              if (!parsed) continue;
              totals.push(parsed.total);
              for (const [stage, ms] of Object.entries(parsed.stages)) {
                (perStage[stage] || (perStage[stage] = [])).push(ms);
              }
            }
          }
          byCombo[name] = {
            totalMedian: median(totals),
            stages: Object.fromEntries(
              Object.entries(perStage).map(([k, v]) => [k, median(v)])
            ),
          };
        }
      } finally {
        perf.setEnabled(false);
        console.log = realLog;
      }

      // Pretty report.
      realLog(`\n[profile] ${n} samples/well, ${WELLS.length} wells × ${REPS} reps\n`);
      for (const [name, data] of Object.entries(byCombo)) {
        const rows = Object.entries(data.stages).sort((a, b) => b[1] - a[1]);
        realLog(`  ${name}  (total median ${data.totalMedian.toFixed(1)} ms)`);
        for (const [stage, ms] of rows) {
          realLog(`      ${stage.padEnd(22)} ${ms.toFixed(1)} ms`);
        }
        realLog("");
      }

      const tag = process.env.PROFILE_TAG || "before";
      const outFile = path.resolve(
        path.dirname(DATA_FILE),
        `pipelineProfile.${tag}.json`
      );
      fs.writeFileSync(
        outFile,
        JSON.stringify({ samples: n, wells: WELLS, reps: REPS, byCombo }, null, 2)
      );
      realLog(`[profile] wrote ${outFile}\n`);

      expect(Object.keys(byCombo).length).toBe(COMBOS.length);
    },
    600000
  );
});
