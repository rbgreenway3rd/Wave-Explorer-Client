// Deterministic test fixture generator shared by the baseline-capture test
// and the post-refactor golden test. No React, no DOM, no provider imports.

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NUM_ROWS = 2;
const NUM_COLS = 4;
const NUM_WELLS = NUM_ROWS * NUM_COLS;
const NUM_INDICATORS = 2;
const NUM_POINTS = 200;

function makeWellInput() {
  const rng = mulberry32(0x5eed);
  const wells = [];
  for (let w = 0; w < NUM_WELLS; w++) {
    const row = Math.floor(w / NUM_COLS);
    const col = w % NUM_COLS;
    const indicators = [];
    for (let i = 0; i < NUM_INDICATORS; i++) {
      const rawData = [];
      for (let j = 0; j < NUM_POINTS; j++) {
        const t = j * 0.1;
        const noise = (rng() - 0.5) * 0.5;
        const signal =
          Math.sin(t * 0.5 + i) + 0.3 * Math.cos(t * 0.7) + 5 + noise;
        const outlier = j === 50 && w === 3 ? 8 : 0;
        rawData.push({ x: t, y: signal + outlier });
      }
      indicators.push({
        rawData,
        filteredData: rawData.map((p) => ({ x: p.x, y: p.y })),
      });
    }
    wells.push({ id: `well_${w}`, row, col, indicators });
  }
  return wells;
}

function cloneWellsDeep(wells) {
  return wells.map((w) => ({
    ...w,
    indicators: w.indicators.map((ind) => ({
      rawData: ind.rawData.map((p) => ({ x: p.x, y: p.y })),
      filteredData: ind.rawData.map((p) => ({ x: p.x, y: p.y })),
    })),
  }));
}

function controlWells() {
  return [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ];
}

function applyWells() {
  return [
    { row: 0, col: 2 },
    { row: 0, col: 3 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
  ];
}

function flatFieldMatrix() {
  const m = [];
  for (let w = 0; w < NUM_WELLS; w++) m.push(0.9 + (w * 0.05));
  return m;
}

function summarizeWells(wells) {
  return wells.map((w) => ({
    id: w.id,
    indicators: w.indicators.map((ind) => ({
      filteredData: ind.filteredData.map((p) => [p.x, p.y]),
      length: ind.filteredData.length,
    })),
  }));
}

module.exports = {
  NUM_ROWS,
  NUM_COLS,
  NUM_WELLS,
  NUM_INDICATORS,
  NUM_POINTS,
  makeWellInput,
  cloneWellsDeep,
  controlWells,
  applyWells,
  flatFieldMatrix,
  summarizeWells,
};
