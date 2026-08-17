/**
 * Template persistence for the neural settings added this cycle:
 *   - controlScalingEnabled / neuralNormalizationEnabled (PERSISTABLE_KEYS)
 *   - the control-well SET, stored as positional keys ("A1") at the top
 *     level (not in `settings`, which sanitizeSettings would strip).
 */

import {
  PERSISTABLE_KEYS,
  buildTemplatePayload,
  saveTemplate,
  getTemplate,
  deleteTemplate,
  importTemplateFromFile,
} from "../templateStorage";

describe("template persistence — new neural settings", () => {
  test("new toggles are in PERSISTABLE_KEYS", () => {
    expect(PERSISTABLE_KEYS).toContain("controlScalingEnabled");
    expect(PERSISTABLE_KEYS).toContain("neuralNormalizationEnabled");
  });

  test("buildTemplatePayload keeps the toggles + control well keys", () => {
    const settings = {
      controlScalingEnabled: true,
      neuralNormalizationEnabled: true,
      spikeProminence: 0.1, // fraction
      notAKnob: 999, // not persistable → stripped
    };
    const payload = buildTemplatePayload("t", settings, ["A1", "B2", 7]);
    expect(payload.settings.controlScalingEnabled).toBe(true);
    expect(payload.settings.neuralNormalizationEnabled).toBe(true);
    expect(payload.settings.spikeProminence).toBe(0.1);
    expect(payload.settings.notAKnob).toBeUndefined();
    // Control well keys live at the top level, sanitized to strings.
    expect(payload.controlWellKeys).toEqual(["A1", "B2"]);
  });

  test("saveTemplate → getTemplate round-trips control well keys", () => {
    saveTemplate("__rt_test__", { controlScalingEnabled: true }, ["C3", "C4"]);
    const t = getTemplate("__rt_test__");
    expect(t.settings.controlScalingEnabled).toBe(true);
    expect(t.controlWellKeys).toEqual(["C3", "C4"]);
    deleteTemplate("__rt_test__");
  });

  test("missing control well keys → empty array (back-compat)", () => {
    expect(buildTemplatePayload("t", {}).controlWellKeys).toEqual([]);
  });
});

// Fake picked file for importTemplateFromFile — only .name and .text() are
// consumed.
const fakeFile = (obj, name = "tpl.json") => ({
  name,
  text: async () => JSON.stringify(obj),
});

describe("template persistence — ROI list", () => {
  test("roiList lives at the top level, x-bounds only", () => {
    const payload = buildTemplatePayload("t", {}, [], [
      { xMin: 10, xMax: 20, yMin: 0.5, yMax: 3 },
      { xMin: 30.5, xMax: 40, yMin: null, yMax: null },
    ]);
    expect(payload.roiList).toEqual([
      { xMin: 10, xMax: 20 },
      { xMin: 30.5, xMax: 40 },
    ]);
    expect(payload.settings.roiList).toBeUndefined();
  });

  test("invalid ROIs are dropped, list capped at 6", () => {
    const good = Array.from({ length: 8 }, (_, i) => ({
      xMin: i * 10,
      xMax: i * 10 + 5,
    }));
    const payload = buildTemplatePayload("t", {}, [], [
      { xMin: 20, xMax: 10 }, // reversed
      { xMin: NaN, xMax: 5 }, // non-finite
      { xMin: "a", xMax: 5 }, // non-numeric
      null,
      ...good,
    ]);
    expect(payload.roiList).toEqual(good.slice(0, 6));
  });

  test("saveTemplate → getTemplate round-trips the ROI list", () => {
    saveTemplate("__rt_roi_test__", {}, [], [{ xMin: 12, xMax: 34 }]);
    const t = getTemplate("__rt_roi_test__");
    expect(t.roiList).toEqual([{ xMin: 12, xMax: 34 }]);
    deleteTemplate("__rt_roi_test__");
  });

  test("no ROIs at save time → roiList: [] (clears on apply)", () => {
    expect(buildTemplatePayload("t", {}).roiList).toEqual([]);
  });

  test("import: absent roiList stays absent (pre-feature templates must not clear ROIs)", async () => {
    const t = await importTemplateFromFile(fakeFile({ settings: {} }));
    expect("roiList" in t).toBe(false);
  });

  test("import: empty roiList survives as [] (distinguishable from absent)", async () => {
    const t = await importTemplateFromFile(
      fakeFile({ settings: {}, roiList: [] })
    );
    expect(t.roiList).toEqual([]);
  });

  test("import: roiList is sanitized", async () => {
    const t = await importTemplateFromFile(
      fakeFile({
        settings: {},
        roiList: [
          { xMin: 5, xMax: 15, yMin: 1, yMax: 2 },
          { xMin: 99, xMax: 1 },
        ],
      })
    );
    expect(t.roiList).toEqual([{ xMin: 5, xMax: 15 }]);
  });
});
