/**
 * realWellLoader — streams real wells out of the gitignored local-fixtures
 * .dat capture so the diagnostic + golden-regression harnesses can run the
 * ACTUAL pipeline on real 250K-sample traces headlessly.
 *
 * Lives under testSupport/ (not __tests__/) so CRA's jest does not try to run
 * it as a test suite; the harness tests import it. Kept in lockstep with the
 * parser in realData.harness.test.js — the golden contract is only meaningful
 * if every harness reads the input signal identically.
 */

import fs from "fs";
import path from "path";
import readline from "readline";

// The client's capture. Gitignored (271MB); harnesses skip when absent.
// Resolved from the project root (jest's cwd) so it's independent of this
// file's location.
export const DATA_FILE = path.resolve(
  process.cwd(),
  "local-fixtures/1 tip 6 1 add 7 20uL 10s+10min_Apr_28_26_111247.dat"
);

export function dataFileExists() {
  return fs.existsSync(DATA_FILE);
}

/**
 * Stream the requested well columns out of the .dat file.
 * @param {string[]} targetWells well labels (e.g. ["A1", "D6"])
 * @returns {Promise<{xs:number[], ysByWell:Record<string, number[]>}>}
 */
export async function loadWells(targetWells) {
  const stream = fs.createReadStream(DATA_FILE, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let colIndex = null; // well label -> column index
  let inIndicator = false; // past the <INDICATOR_DATA ...> marker?
  const xs = [];
  const ysByWell = {};
  for (const w of targetWells) ysByWell[w] = [];

  for await (const line of rl) {
    if (colIndex === null) {
      // The <HEADER> block also contains a "Time\t<timestamp>" line, so only
      // treat the FIRST "Time\t..." AFTER <INDICATOR_DATA> as the column header.
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
    for (const w of targetWells) {
      const idx = colIndex[w];
      ysByWell[w].push(idx != null ? parseFloat(parts[idx]) : NaN);
    }
  }
  return { xs, ysByWell };
}

/** Build the {x,y}[] object array the pipeline currently consumes. */
export function toXY(xs, ys) {
  const out = new Array(xs.length);
  for (let i = 0; i < xs.length; i++) out[i] = { x: xs[i], y: ys[i] };
  return out;
}
