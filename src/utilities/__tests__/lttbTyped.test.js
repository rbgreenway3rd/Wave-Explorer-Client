// Sanity tests for the typed-array LTTB helper. We don't pin down LTTB's
// exact triangle-area selections (V8's deterministic float math gives the
// same result run-to-run, but those choices are an implementation detail);
// instead we verify shape, endpoint preservation, and monotonic x.

const { lttbTyped } = require("../lttbTyped.js");

function makeSineFixture(n) {
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = i * 0.01;
    ys[i] = Math.sin(i * 0.1) + 0.3 * Math.cos(i * 0.07);
  }
  return { xs, ys };
}

describe("lttbTyped", () => {
  test("returns input as {x,y}[] when threshold >= n", () => {
    const { xs, ys } = makeSineFixture(50);
    const out = lttbTyped(xs, ys, 100);
    expect(out.length).toBe(50);
    expect(out[0]).toEqual({ x: xs[0], y: ys[0] });
    expect(out[49]).toEqual({ x: xs[49], y: ys[49] });
  });

  test("returns input as {x,y}[] when threshold < 3", () => {
    const { xs, ys } = makeSineFixture(50);
    const out = lttbTyped(xs, ys, 2);
    expect(out.length).toBe(50);
  });

  test("decimates to threshold count when threshold < n", () => {
    const { xs, ys } = makeSineFixture(2000);
    const out = lttbTyped(xs, ys, 80);
    expect(out.length).toBe(80);
  });

  test("preserves first and last points exactly", () => {
    const { xs, ys } = makeSineFixture(2000);
    const out = lttbTyped(xs, ys, 80);
    expect(out[0].x).toBe(xs[0]);
    expect(out[0].y).toBe(ys[0]);
    expect(out[out.length - 1].x).toBe(xs[xs.length - 1]);
    expect(out[out.length - 1].y).toBe(ys[ys.length - 1]);
  });

  test("output x values are monotonically non-decreasing", () => {
    const { xs, ys } = makeSineFixture(5000);
    const out = lttbTyped(xs, ys, 80);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].x).toBeGreaterThanOrEqual(out[i - 1].x);
    }
  });

  test("handles empty input", () => {
    const out = lttbTyped(new Float64Array(0), new Float64Array(0), 80);
    expect(out.length).toBe(0);
  });

  test("threshold 80 on 50000-point input runs in well under 50ms", () => {
    const n = 50000;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = i;
      ys[i] = Math.sin(i * 0.001);
    }
    const t0 = Date.now();
    const out = lttbTyped(xs, ys, 80);
    const elapsed = Date.now() - t0;
    expect(out.length).toBe(80);
    // Generous bound — typical local run is ~3-5ms.
    expect(elapsed).toBeLessThan(50);
  });
});
