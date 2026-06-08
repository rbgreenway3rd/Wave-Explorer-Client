// Tests for the RFC 4180-style CSV row serializer used by the report
// builder. Both reports route every field through this so a comma in a
// project name (or a quote in an operator string) cannot corrupt the
// output.

import { serializeCsvRow } from "../utilities/neuralReportBuilder/csvRows";

describe("serializeCsvRow", () => {
  test("emits plain fields unchanged", () => {
    expect(serializeCsvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  test("quotes a field containing a comma", () => {
    expect(serializeCsvRow(["Acme, Inc.", "ok"])).toBe('"Acme, Inc.",ok');
  });

  test("escapes internal double-quotes by doubling them", () => {
    expect(serializeCsvRow(['He said "hi"', "x"])).toBe('"He said ""hi""",x');
  });

  test("quotes a field containing a newline", () => {
    expect(serializeCsvRow(["a\nb", "c"])).toBe('"a\nb",c');
  });

  test("renders null/undefined as empty strings", () => {
    expect(serializeCsvRow([null, undefined, "z"])).toBe(",,z");
  });

  test("renders NaN as N/A (parity with formatMetric convention)", () => {
    expect(serializeCsvRow([NaN, 1])).toBe("N/A,1");
  });

  test("numbers coerce via String()", () => {
    expect(serializeCsvRow([0, 1.5, -3])).toBe("0,1.5,-3");
  });

  test("returns empty string for non-arrays", () => {
    expect(serializeCsvRow(null)).toBe("");
    expect(serializeCsvRow("nope")).toBe("");
  });
});
