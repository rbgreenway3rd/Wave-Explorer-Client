// Streaming DAT parser correctness. Drives the parser via .feed() with
// chunks split at varying byte offsets so we exercise the chunk-boundary
// logic. No Web Worker, no FileReader — pure DatParser class.

const { DatParser, parseDatString } = require("../extractDatParser.js");

const FIXTURE = [
  "<HEADER>",
  "NumRows\t2",
  "NumCols\t2",
  "Operator\tOp\tAlice",
  "Project\tTestProject",
  "Date\t2025-01-01",
  "Time\t12:00:00",
  "Instrument\tTestInstr",
  "ProtocolName\tTestProto",
  "AssayPlateBarcode\tBC1",
  "AddPlateBarcode\tBC2",
  "Binning\t1",
  "Indicator1\tBlue\tExcit\t500\tEmit\t600\tExp\t100\tGain\t2",
  "Indicator2\tRed\tExcit\t550\tEmit\t650\tExp\t200\tGain\t3",
  "</HEADER>",
  "<INDICATOR_DATA\tBlue\t>",
  "Time\tA1\tA2\tB1\tB2",
  "0.0\t1\t2\t3\t4",
  "0.1\t5\t6\t7\t8",
  "0.2\t9\t10\t11\t12",
  "</INDICATOR_DATA>",
  "<INDICATOR_DATA\tRed\t>",
  "Time\tA1\tA2\tB1\tB2",
  "0.0\t100\t200\t300\t400",
  "0.1\t500\t600\t700\t800",
  "0.2\t900\t1000\t1100\t1200",
  "</INDICATOR_DATA>",
  "",
].join("\n");

const EXPECTED_BLUE_FLAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const EXPECTED_RED_FLAT = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
];
const EXPECTED_TIMES = [0, 0.1, 0.2];

function feedInChunks(parser, text, chunkSize) {
  for (let i = 0; i < text.length; i += chunkSize) {
    parser.feed(text.substring(i, Math.min(i + chunkSize, text.length)));
  }
}

function assertResultShape(result) {
  // Header metadata
  expect(result.extractedRows).toBe(2);
  expect(result.extractedColumns).toBe(2);
  expect(result.extractedProjectTitle).toBe("TestProject");
  expect(result.extractedProjectDate).toBe("2025-01-01");
  expect(result.extractedProjectTime).toBe("12:00:00");
  expect(result.extractedProjectInstrument).toBe("TestInstr");
  expect(result.extractedProjectProtocol).toBe("TestProto");
  expect(result.extractedAssayPlateBarcode).toBe("BC1");
  expect(result.extractedAddPlateBarcode).toBe("BC2");
  expect(result.extractedBinning).toBe("1");
  expect(result.extractedIndicatorConfigurations.length).toBe(2);
  expect(result.extractedIndicatorConfigurations[0].name).toBe("Blue");
  expect(result.extractedIndicatorConfigurations[1].name).toBe("Red");
  expect(result.rowLabels).toEqual(["A", "B"]);

  // Indicator names
  expect(result.extractedIndicators.length).toBe(2);
  expect(result.extractedIndicators[0].indicatorName).toBe("Blue");
  expect(result.extractedIndicators[1].indicatorName).toBe("Red");

  // analysisData typed arrays
  const blue = result.analysisData.Blue;
  const red = result.analysisData.Red;
  expect(blue).toBeInstanceOf(Float64Array);
  expect(red).toBeInstanceOf(Float64Array);
  expect(blue.length).toBe(EXPECTED_BLUE_FLAT.length);
  expect(red.length).toBe(EXPECTED_RED_FLAT.length);
  for (let i = 0; i < EXPECTED_BLUE_FLAT.length; i++) {
    expect(blue[i]).toBe(EXPECTED_BLUE_FLAT[i]);
    expect(red[i]).toBe(EXPECTED_RED_FLAT[i]);
  }

  // indicatorTimes typed arrays
  const tb = result.extractedIndicatorTimes.Blue;
  const tr = result.extractedIndicatorTimes.Red;
  expect(tb).toBeInstanceOf(Float64Array);
  expect(tr).toBeInstanceOf(Float64Array);
  expect(tb.length).toBe(EXPECTED_TIMES.length);
  for (let i = 0; i < EXPECTED_TIMES.length; i++) {
    expect(tb[i]).toBeCloseTo(EXPECTED_TIMES[i], 12);
    expect(tr[i]).toBeCloseTo(EXPECTED_TIMES[i], 12);
  }
}

describe("DatParser — single-chunk", () => {
  test("parses the fixture in one feed", () => {
    const p = new DatParser();
    p.feed(FIXTURE);
    const result = p.finalize();
    assertResultShape(result);
  });

  test("parseDatString helper produces identical output", () => {
    const result = parseDatString(FIXTURE);
    assertResultShape(result);
  });
});

describe("DatParser — chunk-boundary equivalence", () => {
  // Run the parser with progressively smaller chunk sizes — including sizes
  // that cut mid-line, mid-token, and mid-tab. Each must produce identical
  // output to the single-chunk parse.
  for (const chunkSize of [1, 7, 13, 64, 128, 1024]) {
    test(`identical to single-chunk at chunkSize=${chunkSize}`, () => {
      const p = new DatParser();
      feedInChunks(p, FIXTURE, chunkSize);
      const result = p.finalize();
      assertResultShape(result);
    });
  }
});

describe("DatParser — CRLF tolerance", () => {
  test("handles \\r\\n line endings", () => {
    const result = parseDatString(FIXTURE.replace(/\n/g, "\r\n"));
    assertResultShape(result);
  });
});

describe("DatParser — indicator block ordering and well-count detection", () => {
  test("wellCount inferred from header row, applies row-major flattening", () => {
    const result = parseDatString(FIXTURE);
    // wellCount = 4 (A1, A2, B1, B2), 3 timepoints → 12 floats per indicator
    expect(result.analysisData.Blue.length).toBe(12);
    // Row-major: row 0 has wells 1..4 → values 1,2,3,4
    expect(Array.from(result.analysisData.Blue.subarray(0, 4))).toEqual([
      1, 2, 3, 4,
    ]);
    expect(Array.from(result.analysisData.Blue.subarray(4, 8))).toEqual([
      5, 6, 7, 8,
    ]);
  });
});

describe("DatParser — buffer transferability", () => {
  test("Float64Array fields are backed by independent ArrayBuffers", () => {
    const result = parseDatString(FIXTURE);
    // Each indicator's analysisData.buffer is its own ArrayBuffer (so we
    // can transfer them all in postMessage's transfer list).
    expect(result.analysisData.Blue.buffer).not.toBe(
      result.analysisData.Red.buffer
    );
    expect(result.extractedIndicatorTimes.Blue.buffer).not.toBe(
      result.extractedIndicatorTimes.Red.buffer
    );
  });
});
