/**
 * Real-data harness (manual / diagnostic — not a CI assertion).
 *
 * Streams a real .dat file from local-fixtures/ (gitignored, kept out of
 * public/ so the 271MB capture is never bundled into the build), pulls a
 * few wells, and
 * runs the ACTUAL pipeline functions on them so we can read real
 * input→output numbers headlessly (no browser):
 *   - raw baseline F₀ per well
 *   - ΔF/F₀ range with normalization on vs off (does it match the
 *     0–0.20 the user saw?)
 *   - control scale factor k over a control set (does it match k≈716,
 *     control-median≈0.14?)
 *
 * Skips automatically if the file isn't present, so CI stays green.
 * Run explicitly:
 *   CI=true npx react-scripts test realData.harness --watchAll=false
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { runNeuralAnalysisPipeline } from "../NeuralPipeline";
import {
  computeFo,
  UNIT_MODE,
} from "../utilities/neuralNormalization";
import { computeControlScaleFactor } from "../utilities/neuralReportBuilder/controlScaling";

const DATA_FILE = path.resolve(
  __dirname,
  "../../../../local-fixtures/1 tip 6 1 add 7 20uL 10s+10min_Apr_28_26_111247.dat"
);

// A spread of wells across the plate; we report each and pick the most
// active as the "selected" well, three others as the "control set".
const TARGET_WELLS = ["A1", "D6", "D7", "D8", "H12", "K5", "K6", "K7"];

const PARAMS = {
  subtractControl: false,
  trendFlatteningEnabled: true,
  trendFlatteningWindow: 200,
  trendFlatteningMinimums: 50,
  baselineCorrection: false,
  smoothingEnabled: true,
  smoothingWindow: 9,
  handleOutliers: false,
  spikeProminence: 0.1, // FRACTION of signal range (scale-invariant)
  spikeProminenceRelative: true,
  spikeWindow: 20,
  spikeMinWidth: 5,
  spikeMinDistance: 10,
  spikeMinProminenceRatio: 0.01,
  stdMultiplier: 1,
  maxInterSpikeInterval: 50,
  minSpikesPerBurst: 3,
};

function fmt(n) {
  if (n == null || !Number.isFinite(n)) return String(n);
  return Math.abs(n) >= 100 ? n.toFixed(1) : n.toPrecision(4);
}

async function loadWells() {
  const stream = fs.createReadStream(DATA_FILE, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let colIndex = null; // well label -> column index
  let inIndicator = false; // past the <INDICATOR_DATA ...> marker?
  const xs = [];
  const ysByWell = {}; // label -> number[]
  for (const w of TARGET_WELLS) ysByWell[w] = [];

  for await (const line of rl) {
    if (colIndex === null) {
      // The <HEADER> block also contains a "Time\t<timestamp>" line, so
      // only treat the FIRST "Time\t..." AFTER <INDICATOR_DATA> as the
      // column header.
      if (line.startsWith("<INDICATOR_DATA")) inIndicator = true;
      else if (inIndicator && line.startsWith("Time\t")) {
        const cols = line.split("\t");
        colIndex = {};
        for (let i = 1; i < cols.length; i++) colIndex[cols[i].trim()] = i;
      }
      continue;
    }
    if (line.startsWith("<") || line.trim() === "") continue; // </INDICATOR_DATA>
    const parts = line.split("\t");
    const t = parseFloat(parts[0]);
    if (Number.isNaN(t)) continue;
    xs.push(t);
    for (const w of TARGET_WELLS) {
      const idx = colIndex[w];
      ysByWell[w].push(idx != null ? parseFloat(parts[idx]) : NaN);
    }
  }
  return { xs, ysByWell };
}

function toXY(xs, ys) {
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) out[i] = { x: xs[i], y: ys[i] };
  return out;
}

function rangeOf(signal) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of signal) {
    if (p.y < min) min = p.y;
    if (p.y > max) max = p.y;
  }
  return { min, max };
}

const itOrSkip = fs.existsSync(DATA_FILE) ? test : test.skip;

describe("real-data harness", () => {
  itOrSkip(
    "runs the real pipeline on real wells (diagnostic output)",
    async () => {
      const { xs, ysByWell } = await loadWells();
      // eslint-disable-next-line no-console
      console.log(
        `\nLoaded ${xs.length} time points (${fmt(xs[0])}..${fmt(
          xs[xs.length - 1]
        )} s), dt≈${fmt(xs[1] - xs[0])} s\n`
      );

      const perWell = {};
      for (const w of TARGET_WELLS) {
        const raw = toXY(xs, ysByWell[w]);
        const fo = computeFo(ysByWell[w]); // raw median
        const off = runNeuralAnalysisPipeline({
          rawSignal: raw,
          controlSignal: [],
          params: { ...PARAMS, neuralNormalizationEnabled: false },
          analysis: { runSpikeDetection: true, runBurstDetection: false },
          noiseSuppressionActive: true,
        });
        const on = runNeuralAnalysisPipeline({
          rawSignal: raw,
          controlSignal: [],
          params: { ...PARAMS, neuralNormalizationEnabled: true },
          analysis: { runSpikeDetection: true, runBurstDetection: false },
          noiseSuppressionActive: true,
        });
        const rOff = rangeOf(off.processedSignal);
        const rOn = rangeOf(on.processedSignal);
        perWell[w] = {
          rawMin: rangeOf(raw).min,
          rawMax: rangeOf(raw).max,
          fo,
          detrendRange: `${fmt(rOff.min)}..${fmt(rOff.max)}`,
          normUnit: on.normalization.unitMode,
          normFo: on.normalization.thisWellFo,
          dff0Range: `${fmt(rOn.min)}..${fmt(rOn.max)}`,
          peaksOff: off.spikeResults.length,
          peaksOn: on.spikeResults.length,
        };
        // eslint-disable-next-line no-console
        console.log(
          `${w.padEnd(4)} raw≈${fmt(perWell[w].rawMin)}..${fmt(
            perWell[w].rawMax
          )}  F₀=${fmt(fo)}  detrend=${perWell[w].detrendRange}  ` +
            `ΔF/F₀=${perWell[w].dff0Range} (${perWell[w].normUnit})  ` +
            `peaks off/on=${perWell[w].peaksOff}/${perWell[w].peaksOn}`
        );
      }

      // Control-scale demo: use the first 3 targets as a control set, with
      // normalization ON (raw-sourced), mirroring the modal.
      const controlSet = TARGET_WELLS.slice(0, 3).map((w) => ({
        indicators: [
          {
            materializeRawData: () => toXY(xs, ysByWell[w]),
            materializeFilteredData: () => toXY(xs, ysByWell[w]),
          },
        ],
      }));
      const cs = computeControlScaleFactor(controlSet, {
        params: { ...PARAMS, neuralNormalizationEnabled: true },
        controlSignal: [],
        noiseSuppressionActive: true,
      });
      // eslint-disable-next-line no-console
      console.log(
        `\nControl set ${TARGET_WELLS.slice(0, 3).join(",")} (ΔF/F₀): ` +
          `control median peak = ${fmt(cs.controlMedian)}, k = ${fmt(
            cs.k
          )}, wells used = ${cs.usedWellCount}\n`
      );

      // Light sanity assertions so the harness fails loudly if parsing breaks.
      expect(xs.length).toBeGreaterThan(1000);
      const anyFo = TARGET_WELLS.some((w) => perWell[w].fo > 0);
      expect(anyFo).toBe(true);
      expect([UNIT_MODE.DFF0, UNIT_MODE.NATIVE]).toContain(
        perWell[TARGET_WELLS[0]].normUnit
      );
    },
    180000
  );
});
