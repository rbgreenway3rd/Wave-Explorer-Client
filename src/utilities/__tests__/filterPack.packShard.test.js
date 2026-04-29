// Phase D: pins packShard correctness — random ranges produce the same
// payload as the equivalent slice of packWellsToTypedArrays, and the
// resulting typed-array buffers are independent (transferable) copies of
// the source rawXs/rawYs.

const {
  packShard,
  packWellsToTypedArrays,
} = require("../filterPack.js");

function makeRawWells(numWells, numInds, n) {
  const wells = [];
  for (let w = 0; w < numWells; w++) {
    const indicators = [];
    for (let i = 0; i < numInds; i++) {
      const xs = new Float64Array(n);
      const ys = new Float64Array(n);
      for (let j = 0; j < n; j++) {
        xs[j] = j * 0.1;
        ys[j] = Math.sin(j * 0.05 + w + i);
      }
      indicators.push({ rawXs: xs, rawYs: ys });
    }
    wells.push({ id: `w${w}`, row: 0, col: w, indicators });
  }
  return wells;
}

function indYsArr(packed, w, i) {
  return Array.from(packed[w].indicators[i].ys);
}

describe("Phase D: packShard correctness", () => {
  test("packShard(arr, 0, n) deep-equals packWellsToTypedArrays(arr)", () => {
    const wells = makeRawWells(8, 2, 100);
    const fullPack = packWellsToTypedArrays(wells);
    const shardPack = packShard(wells, 0, wells.length);
    expect(shardPack.length).toBe(fullPack.length);
    for (let w = 0; w < shardPack.length; w++) {
      expect(shardPack[w].id).toBe(fullPack[w].id);
      expect(shardPack[w].indicators.length).toBe(fullPack[w].indicators.length);
      for (let i = 0; i < shardPack[w].indicators.length; i++) {
        expect(Array.from(shardPack[w].indicators[i].xs)).toEqual(
          Array.from(fullPack[w].indicators[i].xs)
        );
        expect(Array.from(shardPack[w].indicators[i].ys)).toEqual(
          Array.from(fullPack[w].indicators[i].ys)
        );
      }
    }
  });

  test("random ranges: packShard(arr, s, e) matches the equivalent slice of full pack", () => {
    const wells = makeRawWells(12, 2, 50);
    const fullPack = packWellsToTypedArrays(wells);
    const cases = [
      [0, 1],
      [0, 12],
      [3, 7],
      [11, 12], // single trailing well
      [5, 6], // single middle well
    ];
    for (const [s, e] of cases) {
      const shard = packShard(wells, s, e);
      expect(shard.length).toBe(e - s);
      for (let w = 0; w < shard.length; w++) {
        const expectedIdx = s + w;
        expect(shard[w].id).toBe(fullPack[expectedIdx].id);
        for (let i = 0; i < shard[w].indicators.length; i++) {
          expect(Array.from(shard[w].indicators[i].ys)).toEqual(
            indYsArr(fullPack, expectedIdx, i)
          );
        }
      }
    }
  });

  test("packShard buffers are independent of source rawXs/rawYs (transferable copies)", () => {
    const wells = makeRawWells(4, 2, 30);
    const shard = packShard(wells, 0, 4);
    for (let w = 0; w < shard.length; w++) {
      for (let i = 0; i < shard[w].indicators.length; i++) {
        // Different .buffer means a different ArrayBuffer — transferable
        // without disturbing the original rawXs/rawYs on main.
        expect(shard[w].indicators[i].xs.buffer).not.toBe(
          wells[w].indicators[i].rawXs.buffer
        );
        expect(shard[w].indicators[i].ys.buffer).not.toBe(
          wells[w].indicators[i].rawYs.buffer
        );
      }
    }
  });

  test("mutating the shard's ys does not affect rawYs", () => {
    const wells = makeRawWells(3, 1, 20);
    const originalY0 = wells[0].indicators[0].rawYs[0];
    const shard = packShard(wells, 0, wells.length);
    shard[0].indicators[0].ys[0] = 999;
    expect(wells[0].indicators[0].rawYs[0]).toBe(originalY0);
  });

  test("legacy {x,y}[] fallback path: packShard with rawData instead of rawXs/rawYs", () => {
    const wells = [
      {
        id: "w0",
        row: 0,
        col: 0,
        indicators: [
          {
            rawData: [
              { x: 0, y: 1 },
              { x: 1, y: 2 },
              { x: 2, y: 3 },
            ],
          },
        ],
      },
    ];
    const shard = packShard(wells, 0, 1);
    expect(Array.from(shard[0].indicators[0].xs)).toEqual([0, 1, 2]);
    expect(Array.from(shard[0].indicators[0].ys)).toEqual([1, 2, 3]);
  });

  test("empty range returns empty array", () => {
    const wells = makeRawWells(3, 1, 10);
    expect(packShard(wells, 1, 1)).toEqual([]);
  });
});
